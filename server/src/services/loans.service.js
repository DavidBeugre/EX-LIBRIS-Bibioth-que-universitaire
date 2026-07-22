import { query, pool } from "../db/pool.js";
import { ApiError } from "../utils/ApiError.js";
import { sendLoanConfirmation, sendLateReturnPenalty, sendReservationAvailable } from "./notification.service.js";

const PENALITE_PAR_JOUR = Number(process.env.PENALITE_PAR_JOUR || 0.5);

async function getAdherentOrThrow(client, adherentId) {
  const res = await client.query("SELECT * FROM adherents WHERE id = $1", [adherentId]);
  if (!res.rows[0]) throw ApiError.notFound("Adhérent introuvable.");
  return res.rows[0];
}

async function hasUnpaidPenalties(client, adherentId) {
  const res = await client.query(
    `SELECT COUNT(*) FROM penalites p
     JOIN emprunts e ON e.id = p.emprunt_id
     WHERE e.adherent_id = $1 AND p.statut_paiement = 'IMPAYEE'`,
    [adherentId]
  );
  return Number(res.rows[0].count) > 0;
}

/**
 * Enregistre un emprunt.
 * Règles : adhérent actif, pas de pénalité impayée, quota non atteint,
 * un exemplaire disponible doit exister pour l'ouvrage demandé.
 */
export async function borrowBook({ ouvrageId, adherentId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const adherent = await getAdherentOrThrow(client, adherentId);
    if (adherent.statut !== "ACTIF") {
      throw ApiError.forbidden("Le compte adhérent est suspendu.");
    }
    if (await hasUnpaidPenalties(client, adherentId)) {
      throw ApiError.forbidden("Des pénalités impayées bloquent tout nouvel emprunt.");
    }

    const enCoursRes = await client.query(
      `SELECT COUNT(*) FROM emprunts WHERE adherent_id = $1 AND date_retour_effective IS NULL`,
      [adherentId]
    );
    if (Number(enCoursRes.rows[0].count) >= adherent.quota_emprunt) {
      throw ApiError.forbidden(`Quota d'emprunt atteint (${adherent.quota_emprunt} ouvrages maximum).`);
    }

    // Verrouille un exemplaire disponible pour cet ouvrage
    const copyRes = await client.query(
      `SELECT * FROM exemplaires
       WHERE ouvrage_id = $1 AND statut = 'DISPONIBLE'
       ORDER BY code_barres LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [ouvrageId]
    );
    const copy = copyRes.rows[0];
    if (!copy) throw ApiError.conflict("Aucun exemplaire disponible pour cet ouvrage. Vous pouvez le réserver.");

    const loanRes = await client.query(
      `INSERT INTO emprunts (exemplaire_id, adherent_id, date_retour_prevue)
       VALUES ($1, $2, CURRENT_DATE + ($3 || ' days')::interval)
       RETURNING *`,
      [copy.id, adherentId, adherent.duree_jours]
    );

    await client.query("UPDATE exemplaires SET statut = 'EMPRUNTE' WHERE id = $1", [copy.id]);

    await client.query("COMMIT");

    // Notification (hors transaction : ne doit pas faire échouer l'emprunt)
    try {
      const infoRes = await query(
        `SELECT u.email, u.prenom, o.titre
         FROM adherents a JOIN utilisateurs u ON u.id = a.utilisateur_id
         JOIN exemplaires ex ON ex.id = $1
         JOIN ouvrages o ON o.id = ex.ouvrage_id
         WHERE a.id = $2`,
        [copy.id, adherentId]
      );
      const info = infoRes.rows[0];
      if (info) {
        await sendLoanConfirmation({
          to: info.email,
          prenom: info.prenom,
          titre: info.titre,
          dateRetour: new Date(loanRes.rows[0].date_retour_prevue).toLocaleDateString("fr-FR"),
        });
      }
    } catch (e) {
      console.error("Notification emprunt échouée (non bloquant) :", e.message);
    }

    return loanRes.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Enregistre le retour d'un exemplaire.
 * Calcule une pénalité si retard, et honore la prochaine réservation en file
 * en passant l'exemplaire à RESERVE plutôt que DISPONIBLE si une réservation existe.
 */
export async function returnBook(empruntId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const loanRes = await client.query("SELECT * FROM emprunts WHERE id = $1 FOR UPDATE", [empruntId]);
    const loan = loanRes.rows[0];
    if (!loan) throw ApiError.notFound("Emprunt introuvable.");
    if (loan.date_retour_effective) throw ApiError.conflict("Cet emprunt a déjà été clôturé.");

    await client.query(
      "UPDATE emprunts SET date_retour_effective = CURRENT_DATE WHERE id = $1",
      [empruntId]
    );

    const lateDaysRes = await client.query(
      "SELECT GREATEST(0, (CURRENT_DATE - date_retour_prevue))::int AS jours FROM emprunts WHERE id = $1",
      [empruntId]
    );
    const lateDays = lateDaysRes.rows[0].jours;

    let penalite = null;
    if (lateDays > 0) {
      const montant = (lateDays * PENALITE_PAR_JOUR).toFixed(2);
      const penRes = await client.query(
        `INSERT INTO penalites (emprunt_id, montant) VALUES ($1, $2) RETURNING *`,
        [empruntId, montant]
      );
      penalite = penRes.rows[0];
    }

    // Vérifie s'il existe une réservation en attente pour cet ouvrage
    const copyRes = await client.query("SELECT * FROM exemplaires WHERE id = $1", [loan.exemplaire_id]);
    const copy = copyRes.rows[0];

    const reservationRes = await client.query(
      `SELECT * FROM reservations
       WHERE ouvrage_id = $1 AND statut = 'EN_ATTENTE'
       ORDER BY date_reservation ASC LIMIT 1 FOR UPDATE`,
      [copy.ouvrage_id]
    );
    const reservation = reservationRes.rows[0];

    if (reservation) {
      await client.query("UPDATE exemplaires SET statut = 'RESERVE' WHERE id = $1", [copy.id]);
      await client.query("UPDATE reservations SET statut = 'HONOREE' WHERE id = $1", [reservation.id]);
    } else {
      await client.query("UPDATE exemplaires SET statut = 'DISPONIBLE' WHERE id = $1", [copy.id]);
    }

    await client.query("COMMIT");

    // Notifications (hors transaction)
    try {
      const infoRes = await query(
        `SELECT u.email, u.prenom, o.titre
         FROM emprunts e
         JOIN adherents a ON a.id = e.adherent_id
         JOIN utilisateurs u ON u.id = a.utilisateur_id
         JOIN exemplaires ex ON ex.id = e.exemplaire_id
         JOIN ouvrages o ON o.id = ex.ouvrage_id
         WHERE e.id = $1`,
        [empruntId]
      );
      const info = infoRes.rows[0];
      if (info && penalite) {
        await sendLateReturnPenalty({ to: info.email, prenom: info.prenom, titre: info.titre, lateDays, montant: penalite.montant });
      }
      if (info && reservation) {
        const resInfoRes = await query(
          `SELECT u.email, u.prenom FROM adherents a JOIN utilisateurs u ON u.id = a.utilisateur_id WHERE a.id = $1`,
          [reservation.adherent_id]
        );
        const resInfo = resInfoRes.rows[0];
        if (resInfo) await sendReservationAvailable({ to: resInfo.email, prenom: resInfo.prenom, titre: info.titre });
      }
    } catch (e) {
      console.error("Notification retour échouée (non bloquant) :", e.message);
    }

    return { lateDays, penalite };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Prolonge un emprunt de la durée standard de l'adhérent, si non en retard et sans réservation concurrente. */
export async function renewLoan(empruntId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const loanRes = await client.query(
      `SELECT e.*, a.duree_jours FROM emprunts e
       JOIN adherents a ON a.id = e.adherent_id
       WHERE e.id = $1 FOR UPDATE`,
      [empruntId]
    );
    const loan = loanRes.rows[0];
    if (!loan) throw ApiError.notFound("Emprunt introuvable.");
    if (loan.date_retour_effective) throw ApiError.conflict("Cet emprunt est déjà clôturé.");

    const isLate = new Date(loan.date_retour_prevue) < new Date();
    if (isLate) throw ApiError.forbidden("Impossible de prolonger un emprunt en retard.");
    if (loan.prolongations >= 2) throw ApiError.forbidden("Nombre maximal de prolongations atteint.");

    const copyRes = await client.query("SELECT ouvrage_id FROM exemplaires WHERE id = $1", [loan.exemplaire_id]);
    const pendingRes = await client.query(
      "SELECT COUNT(*) FROM reservations WHERE ouvrage_id = $1 AND statut = 'EN_ATTENTE'",
      [copyRes.rows[0].ouvrage_id]
    );
    if (Number(pendingRes.rows[0].count) > 0) {
      throw ApiError.forbidden("Impossible de prolonger : une réservation est en attente sur cet ouvrage.");
    }

    const updated = await client.query(
      `UPDATE emprunts
       SET date_retour_prevue = date_retour_prevue + ($1 || ' days')::interval,
           prolongations = prolongations + 1
       WHERE id = $2 RETURNING *`,
      [loan.duree_jours, empruntId]
    );

    await client.query("COMMIT");
    return updated.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listLoans({ adherentId, statut }) {
  const conditions = [];
  const params = [];
  if (adherentId) {
    params.push(adherentId);
    conditions.push(`e.adherent_id = $${params.length}`);
  }
  if (statut === "en_cours") conditions.push("e.date_retour_effective IS NULL");
  if (statut === "retard") conditions.push("e.date_retour_effective IS NULL AND e.date_retour_prevue < CURRENT_DATE");

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query(
    `SELECT e.*, o.titre, o.auteur, o.categorie, ex.code_barres,
            u.nom, u.prenom, a.type_profil,
            (e.date_retour_effective IS NULL AND e.date_retour_prevue < CURRENT_DATE) AS en_retard
     FROM emprunts e
     JOIN exemplaires ex ON ex.id = e.exemplaire_id
     JOIN ouvrages o ON o.id = ex.ouvrage_id
     JOIN adherents a ON a.id = e.adherent_id
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     ${where}
     ORDER BY e.date_emprunt DESC`,
    params
  );
  return res.rows;
}

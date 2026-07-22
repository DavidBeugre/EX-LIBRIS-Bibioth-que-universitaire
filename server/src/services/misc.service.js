import { query } from "../db/pool.js";
import { ApiError } from "../utils/ApiError.js";

export async function listPenalties({ adherentId }) {
  const params = [];
  let where = "";
  if (adherentId) {
    params.push(adherentId);
    where = "WHERE e.adherent_id = $1";
  }
  const res = await query(
    `SELECT p.*, o.titre, u.nom, u.prenom
     FROM penalites p
     JOIN emprunts e ON e.id = p.emprunt_id
     JOIN exemplaires ex ON ex.id = e.exemplaire_id
     JOIN ouvrages o ON o.id = ex.ouvrage_id
     JOIN adherents a ON a.id = e.adherent_id
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     ${where}
     ORDER BY p.created_at DESC`,
    params
  );
  return res.rows;
}

export async function payPenalty(id) {
  const res = await query(
    `UPDATE penalites SET statut_paiement = 'PAYEE' WHERE id = $1 AND statut_paiement = 'IMPAYEE' RETURNING *`,
    [id]
  );
  if (!res.rows[0]) throw ApiError.notFound("Pénalité introuvable ou déjà payée.");
  return res.rows[0];
}

export async function listMembers({ search }) {
  const params = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE u.nom ILIKE $1 OR u.prenom ILIKE $1 OR u.email ILIKE $1`;
  }
  const res = await query(
    `SELECT a.id AS adherent_id, a.type_profil, a.quota_emprunt, a.statut,
            u.nom, u.prenom, u.email,
            (SELECT COUNT(*) FROM emprunts em WHERE em.adherent_id = a.id AND em.date_retour_effective IS NULL) AS emprunts_en_cours
     FROM adherents a
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     ${where}
     ORDER BY u.nom ASC`,
    params
  );
  return res.rows;
}

export async function dashboardStats() {
  const [enCours, retard, reservationsEnAttente, penalitesImpayees, topOuvrages] = await Promise.all([
    query("SELECT COUNT(*) FROM emprunts WHERE date_retour_effective IS NULL"),
    query("SELECT COUNT(*) FROM emprunts WHERE date_retour_effective IS NULL AND date_retour_prevue < CURRENT_DATE"),
    query("SELECT COUNT(*) FROM reservations WHERE statut = 'EN_ATTENTE'"),
    query("SELECT COALESCE(SUM(montant),0) AS total FROM penalites WHERE statut_paiement = 'IMPAYEE'"),
    query(
      `SELECT o.titre, COUNT(e.id) AS emprunts
       FROM emprunts e
       JOIN exemplaires ex ON ex.id = e.exemplaire_id
       JOIN ouvrages o ON o.id = ex.ouvrage_id
       GROUP BY o.titre ORDER BY emprunts DESC LIMIT 5`
    ),
  ]);

  return {
    empruntsEnCours: Number(enCours.rows[0].count),
    empruntsEnRetard: Number(retard.rows[0].count),
    reservationsEnAttente: Number(reservationsEnAttente.rows[0].count),
    penalitesImpayeesTotal: Number(penalitesImpayees.rows[0].total),
    topOuvrages: topOuvrages.rows,
  };
}

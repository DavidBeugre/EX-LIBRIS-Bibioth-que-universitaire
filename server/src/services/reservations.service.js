import { query, pool } from "../db/pool.js";
import { ApiError } from "../utils/ApiError.js";

export async function createReservation({ ouvrageId, adherentId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const availableRes = await client.query(
      "SELECT COUNT(*) FROM exemplaires WHERE ouvrage_id = $1 AND statut = 'DISPONIBLE'",
      [ouvrageId]
    );
    if (Number(availableRes.rows[0].count) > 0) {
      throw ApiError.badRequest("Cet ouvrage est disponible : empruntez-le directement plutôt que de le réserver.");
    }

    const dupRes = await client.query(
      `SELECT id FROM reservations WHERE ouvrage_id = $1 AND adherent_id = $2 AND statut = 'EN_ATTENTE'`,
      [ouvrageId, adherentId]
    );
    if (dupRes.rows[0]) throw ApiError.conflict("Vous avez déjà une réservation en attente pour cet ouvrage.");

    const res = await client.query(
      `INSERT INTO reservations (ouvrage_id, adherent_id) VALUES ($1,$2) RETURNING *`,
      [ouvrageId, adherentId]
    );

    await client.query("COMMIT");
    return res.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelReservation(id, adherentId, isStaff) {
  const params = isStaff ? [id] : [id, adherentId];
  const where = isStaff ? "id = $1" : "id = $1 AND adherent_id = $2";
  const res = await query(
    `UPDATE reservations SET statut = 'ANNULEE' WHERE ${where} AND statut = 'EN_ATTENTE' RETURNING *`,
    params
  );
  if (!res.rows[0]) throw ApiError.notFound("Réservation introuvable ou déjà traitée.");
  return res.rows[0];
}

export async function listReservations({ adherentId }) {
  const params = [];
  let where = "";
  if (adherentId) {
    params.push(adherentId);
    where = "WHERE r.adherent_id = $1";
  }
  const res = await query(
    `SELECT r.*, o.titre, o.auteur, o.categorie, u.nom, u.prenom
     FROM reservations r
     JOIN ouvrages o ON o.id = r.ouvrage_id
     JOIN adherents a ON a.id = r.adherent_id
     JOIN utilisateurs u ON u.id = a.utilisateur_id
     ${where}
     ORDER BY r.date_reservation ASC`,
    params
  );
  return res.rows;
}

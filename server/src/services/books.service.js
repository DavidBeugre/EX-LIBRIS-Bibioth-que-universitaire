import { query, pool } from "../db/pool.js";
import { ApiError } from "../utils/ApiError.js";

export async function listBooks({ search, categorie }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(o.titre ILIKE $${params.length} OR o.auteur ILIKE $${params.length} OR o.isbn ILIKE $${params.length})`);
  }
  if (categorie && categorie !== "Tous") {
    params.push(categorie);
    conditions.push(`o.categorie = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query(
    `SELECT o.*,
            COUNT(e.id) AS total_exemplaires,
            COUNT(e.id) FILTER (WHERE e.statut = 'DISPONIBLE') AS exemplaires_disponibles
     FROM ouvrages o
     LEFT JOIN exemplaires e ON e.ouvrage_id = o.id
     ${where}
     GROUP BY o.id
     ORDER BY o.titre ASC`,
    params
  );
  return res.rows;
}

export async function getBook(id) {
  const bookRes = await query("SELECT * FROM ouvrages WHERE id = $1", [id]);
  const book = bookRes.rows[0];
  if (!book) throw ApiError.notFound("Ouvrage introuvable.");

  const copiesRes = await query(
    "SELECT * FROM exemplaires WHERE ouvrage_id = $1 ORDER BY code_barres ASC",
    [id]
  );
  return { ...book, exemplaires: copiesRes.rows };
}

export async function createBook({ titre, auteur, isbn, editeur, categorie, resume, nombreExemplaires = 1 }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bookRes = await client.query(
      `INSERT INTO ouvrages (titre, auteur, isbn, editeur, categorie, resume)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [titre, auteur, isbn, editeur ?? null, categorie, resume ?? null]
    );
    const book = bookRes.rows[0];

    for (let i = 0; i < nombreExemplaires; i++) {
      const codeBarres = `${isbn}-${String(i + 1).padStart(3, "0")}`;
      await client.query(
        "INSERT INTO exemplaires (ouvrage_id, code_barres) VALUES ($1,$2)",
        [book.id, codeBarres]
      );
    }
    await client.query("COMMIT");
    return getBook(book.id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateBook(id, fields) {
  const allowed = ["titre", "auteur", "isbn", "editeur", "categorie", "resume"];
  const set = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      params.push(fields[key]);
      set.push(`${snakeCase(key)} = $${params.length}`);
    }
  }
  if (!set.length) throw ApiError.badRequest("Aucun champ à mettre à jour.");
  params.push(id);
  const res = await query(
    `UPDATE ouvrages SET ${set.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!res.rows[0]) throw ApiError.notFound("Ouvrage introuvable.");
  return res.rows[0];
}

export async function deleteBook(id) {
  const res = await query("DELETE FROM ouvrages WHERE id = $1 RETURNING id", [id]);
  if (!res.rows[0]) throw ApiError.notFound("Ouvrage introuvable.");
}

export async function addCopy(ouvrageId, codeBarres) {
  const res = await query(
    "INSERT INTO exemplaires (ouvrage_id, code_barres) VALUES ($1,$2) RETURNING *",
    [ouvrageId, codeBarres]
  );
  return res.rows[0];
}

function snakeCase(str) {
  return str.replace(/[A-Z]/g, (l) => "_" + l.toLowerCase());
}

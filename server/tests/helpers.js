import { pool } from "../src/db/pool.js";
import bcrypt from "bcryptjs";

export async function resetDb() {
  await pool.query("TRUNCATE penalites, emprunts, reservations, exemplaires, ouvrages, adherents, utilisateurs CASCADE");
}

export async function closeDb() {
  await pool.end();
}

const QUOTAS = { ETUDIANT: 3, ENSEIGNANT_CHERCHEUR: 8, PERSONNEL_ADMINISTRATIF: 5 };
const DUREES = { ETUDIANT: 21, ENSEIGNANT_CHERCHEUR: 60, PERSONNEL_ADMINISTRATIF: 30 };

export async function createUser({ nom = "Test", prenom = "User", email, role = "ADHERENT", typeProfil = "ETUDIANT", password = "password123" }) {
  const hash = await bcrypt.hash(password, 4); // coût réduit pour accélérer les tests
  const userRes = await pool.query(
    `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [nom, prenom, email, hash, role]
  );
  const userId = userRes.rows[0].id;

  let adherentId = null;
  if (role === "ADHERENT") {
    const adhRes = await pool.query(
      `INSERT INTO adherents (utilisateur_id, type_profil, quota_emprunt, duree_jours) VALUES ($1,$2,$3,$4) RETURNING id`,
      [userId, typeProfil, QUOTAS[typeProfil], DUREES[typeProfil]]
    );
    adherentId = adhRes.rows[0].id;
  }
  return { userId, adherentId, email, password };
}

export async function createBook({ titre = "Livre de test", auteur = "Auteur Test", isbn, categorie = "Informatique", copies = 1 }) {
  const bookRes = await pool.query(
    `INSERT INTO ouvrages (titre, auteur, isbn, categorie) VALUES ($1,$2,$3,$4) RETURNING id`,
    [titre, auteur, isbn, categorie]
  );
  const bookId = bookRes.rows[0].id;
  for (let i = 0; i < copies; i++) {
    await pool.query(`INSERT INTO exemplaires (ouvrage_id, code_barres) VALUES ($1,$2)`, [bookId, `${isbn}-${i + 1}`]);
  }
  return bookId;
}

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query, pool } from "../db/pool.js";
import { ApiError } from "../utils/ApiError.js";

function signToken(user, adherentId) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, adherentId: adherentId ?? null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

export async function register({ nom, prenom, email, motDePasse, role, typeProfil }) {
  const existing = await query("SELECT id FROM utilisateurs WHERE email = $1", [email]);
  if (existing.rows.length) throw ApiError.conflict("Un compte existe déjà avec cet email.");

  const hash = await bcrypt.hash(motDePasse, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userRes = await client.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, prenom, email, role`,
      [nom, prenom, email, hash, role]
    );
    const user = userRes.rows[0];

    let adherentId = null;
    if (role === "ADHERENT") {
      const quotas = { ETUDIANT: 3, ENSEIGNANT_CHERCHEUR: 8, PERSONNEL_ADMINISTRATIF: 5 };
      const durees = { ETUDIANT: 21, ENSEIGNANT_CHERCHEUR: 60, PERSONNEL_ADMINISTRATIF: 30 };
      const adhRes = await client.query(
        `INSERT INTO adherents (utilisateur_id, type_profil, quota_emprunt, duree_jours)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [user.id, typeProfil, quotas[typeProfil] ?? 3, durees[typeProfil] ?? 21]
      );
      adherentId = adhRes.rows[0].id;
    }

    await client.query("COMMIT");
    return { user, token: signToken(user, adherentId) };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function login({ email, motDePasse }) {
  const res = await query("SELECT * FROM utilisateurs WHERE email = $1", [email]);
  const user = res.rows[0];
  if (!user) throw ApiError.unauthorized("Identifiants incorrects.");

  const valid = await bcrypt.compare(motDePasse, user.mot_de_passe_hash);
  if (!valid) throw ApiError.unauthorized("Identifiants incorrects.");

  let adherentId = null;
  if (user.role === "ADHERENT") {
    const adh = await query("SELECT id FROM adherents WHERE utilisateur_id = $1", [user.id]);
    adherentId = adh.rows[0]?.id ?? null;
  }

  const safeUser = { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role };
  return { user: safeUser, token: signToken(safeUser, adherentId) };
}

import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

const BOOKS = [
  { titre: "Structures de données avancées", auteur: "M. Delcourt", isbn: "9782100812341", editeur: "Dunod", categorie: "Informatique", resume: "Panorama des structures de données modernes et de leur complexité.", copies: 3 },
  { titre: "Les Fleurs du mal", auteur: "C. Baudelaire", isbn: "9782070403811", editeur: "Gallimard", categorie: "Littérature", resume: "Édition annotée du recueil de 1857.", copies: 2 },
  { titre: "Histoire de la Méditerranée", auteur: "F. Braudel", isbn: "9782080811124", editeur: "Flammarion", categorie: "Histoire", resume: "Synthèse des échanges économiques du bassin méditerranéen.", copies: 2 },
  { titre: "Thermodynamique statistique", auteur: "R. Feynman", isbn: "9782759802347", editeur: "EDP Sciences", categorie: "Sciences", resume: "Introduction à la physique statistique.", copies: 4 },
  { titre: "Droit constitutionnel comparé", auteur: "L. Favoreu", isbn: "9782247184523", editeur: "Dalloz", categorie: "Droit", resume: "Analyse comparative des régimes constitutionnels.", copies: 3 },
  { titre: "Micro-économie appliquée", auteur: "H. Varian", isbn: "9782807304519", editeur: "De Boeck", categorie: "Économie", resume: "Théorie du consommateur et défaillances de marché.", copies: 4 },
];

const USERS = [
  { nom: "Admin", prenom: "Système", email: "admin@universite.ci", role: "ADMINISTRATEUR" },
  { nom: "Kouadio", prenom: "Aya", email: "bibliothecaire@universite.ci", role: "BIBLIOTHECAIRE" },
  { nom: "Kouassi", prenom: "Lassina", email: "etudiant@universite.ci", role: "ADHERENT", typeProfil: "ETUDIANT" },
  { nom: "Beugre", prenom: "David", email: "beugredavid639@gmail.com", role: "ADHERENT", typeProfil: "ETUDIANT" },
  { nom: "Traoré", prenom: "Awa", email: "enseignant@universite.ci", role: "ADHERENT", typeProfil: "ENSEIGNANT_CHERCHEUR" },
];
const MOT_DE_PASSE_DEMO = "password123";

async function seed() {
  const client = await pool.connect();
  try {
    console.log("→ Nettoyage des tables…");
    await client.query("TRUNCATE penalites, emprunts, reservations, exemplaires, ouvrages, adherents, utilisateurs CASCADE");

    console.log("→ Création des utilisateurs de démonstration…");
    const hash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 10);
    const quotas = { ETUDIANT: 3, ENSEIGNANT_CHERCHEUR: 8, PERSONNEL_ADMINISTRATIF: 5 };
    const durees = { ETUDIANT: 21, ENSEIGNANT_CHERCHEUR: 60, PERSONNEL_ADMINISTRATIF: 30 };

    const adherentIds = {};
    for (const u of USERS) {
      const res = await client.query(
        `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [u.nom, u.prenom, u.email, hash, u.role]
      );
      if (u.role === "ADHERENT") {
        const adhRes = await client.query(
          `INSERT INTO adherents (utilisateur_id, type_profil, quota_emprunt, duree_jours) VALUES ($1,$2,$3,$4) RETURNING id`,
          [res.rows[0].id, u.typeProfil, quotas[u.typeProfil], durees[u.typeProfil]]
        );
        adherentIds[u.email] = adhRes.rows[0].id;
      }
    }

    console.log("→ Création du catalogue…");
    for (const b of BOOKS) {
      const res = await client.query(
        `INSERT INTO ouvrages (titre, auteur, isbn, editeur, categorie, resume) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [b.titre, b.auteur, b.isbn, b.editeur, b.categorie, b.resume]
      );
      for (let i = 1; i <= b.copies; i++) {
        await client.query(
          `INSERT INTO exemplaires (ouvrage_id, code_barres) VALUES ($1,$2)`,
          [res.rows[0].id, `${b.isbn}-${String(i).padStart(3, "0")}`]
        );
      }
    }

    console.log("✓ Seed terminé.");
    console.log("\nComptes de démonstration (mot de passe : " + MOT_DE_PASSE_DEMO + ") :");
    USERS.forEach((u) => console.log(`  - ${u.role.padEnd(15)} ${u.email}`));
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => {
  console.error("✗ Échec du seed :", e);
  process.exit(1);
});

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  console.log("→ Application du schéma sur la base de données…");
  await pool.query(sql);
  console.log("✓ Schéma appliqué avec succès.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("✗ Échec de la migration :", err.message);
  process.exit(1);
});

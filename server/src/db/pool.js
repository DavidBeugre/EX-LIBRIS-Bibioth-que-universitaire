import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Erreur inattendue du pool PostgreSQL", err);
  process.exit(1);
});

export async function query(text, params) {
  return pool.query(text, params);
}

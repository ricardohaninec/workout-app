import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
});

await pool.query(`
  ALTER TABLE workout_item ADD COLUMN IF NOT EXISTS note TEXT;
`);

console.log("Migration complete: added note column to workout_item.");
await pool.end();

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
});

await pool.query(`
  ALTER TABLE workout_item_set
  ADD COLUMN IF NOT EXISTS rest_seconds INTEGER NOT NULL DEFAULT 60;
`);

console.log("Migration complete: rest_seconds column added to workout_item_set.");
await pool.end();

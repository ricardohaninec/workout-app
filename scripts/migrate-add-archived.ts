import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL?.includes("localhost") ||
    process.env.DATABASE_URL?.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});

await pool.query(`
  ALTER TABLE workout ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_workout_is_archived ON workout(user_id, is_archived);
`);

console.log("Migration complete: is_archived column added to workout.");
await pool.end();

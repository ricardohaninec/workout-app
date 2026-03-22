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
  ALTER TABLE workout_in_progress_set
    DROP CONSTRAINT workout_in_progress_set_workout_item_id_fkey,
    ADD CONSTRAINT workout_in_progress_set_workout_item_id_fkey
      FOREIGN KEY (workout_item_id) REFERENCES workout_item(id) ON DELETE CASCADE;
`);

console.log("Migration complete: workout_in_progress_set.workout_item_id now cascades on delete.");
await pool.end();

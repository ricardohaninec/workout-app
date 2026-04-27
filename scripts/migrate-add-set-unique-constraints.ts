import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
});

// Deduplicate workout_item_set — keep the row with the greatest id per (workout_item_id, position)
await pool.query(`
  DELETE FROM workout_item_set a
  USING workout_item_set b
  WHERE a.workout_item_id = b.workout_item_id
    AND a.position = b.position
    AND a.id < b.id;
`);

await pool.query(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'uq_workout_item_set_item_position'
    ) THEN
      ALTER TABLE workout_item_set ADD CONSTRAINT uq_workout_item_set_item_position UNIQUE (workout_item_id, position);
    END IF;
  END $$;
`);

// Deduplicate workout_in_progress_set — keep the row with the greatest id per (wip_id, item_id, position)
await pool.query(`
  DELETE FROM workout_in_progress_set a
  USING workout_in_progress_set b
  WHERE a.workout_in_progress_id = b.workout_in_progress_id
    AND a.workout_item_id = b.workout_item_id
    AND a.position = b.position
    AND a.id < b.id;
`);

await pool.query(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'uq_wip_set_session_item_position'
    ) THEN
      ALTER TABLE workout_in_progress_set ADD CONSTRAINT uq_wip_set_session_item_position UNIQUE (workout_in_progress_id, workout_item_id, position);
    END IF;
  END $$;
`);

console.log("Migration complete: unique constraints added to workout_item_set and workout_in_progress_set.");
await pool.end();

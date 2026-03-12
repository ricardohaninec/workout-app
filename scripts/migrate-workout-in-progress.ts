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
  CREATE TABLE IF NOT EXISTS workout_in_progress (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (workout_id) REFERENCES workout(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user"(id)
  );

  CREATE TABLE IF NOT EXISTS workout_in_progress_set (
    id TEXT PRIMARY KEY,
    workout_in_progress_id TEXT NOT NULL,
    workout_item_id TEXT NOT NULL,
    reps INTEGER NOT NULL DEFAULT 1,
    weight REAL NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (workout_in_progress_id) REFERENCES workout_in_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (workout_item_id) REFERENCES workout_item(id)
  );

  CREATE INDEX IF NOT EXISTS idx_wip_workout_id ON workout_in_progress(workout_id);
  CREATE INDEX IF NOT EXISTS idx_wip_user_id ON workout_in_progress(user_id);
  CREATE INDEX IF NOT EXISTS idx_wip_is_active ON workout_in_progress(is_active);
  CREATE INDEX IF NOT EXISTS idx_wip_set_wip_id ON workout_in_progress_set(workout_in_progress_id);
  CREATE INDEX IF NOT EXISTS idx_wip_set_item_id ON workout_in_progress_set(workout_item_id);
`);

console.log("Migration complete: workout_in_progress tables added.");
await pool.end();

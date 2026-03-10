import { Database } from "bun:sqlite";

const db = new Database("./data/app.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS exercise_set (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 1,
    weight REAL NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_exercise_set_exercise_id ON exercise_set(exercise_id);
`);

// Migrate existing exercises that have sets/weights data
const exercises = db
  .prepare("SELECT id, sets, weights FROM exercise WHERE sets > 0 OR weights > 0")
  .all() as { id: string; sets: number; weights: number }[];

const existing = db
  .prepare("SELECT exercise_id FROM exercise_set")
  .all() as { exercise_id: string }[];
const alreadyMigrated = new Set(existing.map((r) => r.exercise_id));

const insert = db.prepare(
  "INSERT INTO exercise_set (id, exercise_id, sets, weight, position) VALUES (?, ?, ?, ?, 0)"
);

let migrated = 0;
for (const ex of exercises) {
  if (alreadyMigrated.has(ex.id)) continue;
  insert.run(crypto.randomUUID(), ex.id, ex.sets, ex.weights);
  migrated++;
}

console.log(
  `Migration complete. exercise_set table ready. Migrated ${migrated} exercises.`
);
db.close();

import { Database } from "bun:sqlite";

const db = new Database("./data/app.db");
db.exec("PRAGMA foreign_keys = OFF;");

db.exec(`
  CREATE TABLE IF NOT EXISTS workout_item (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workout_id) REFERENCES workout(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercise(id)
  );

  CREATE TABLE IF NOT EXISTS workout_item_set (
    id TEXT PRIMARY KEY,
    workout_item_id TEXT NOT NULL,
    reps INTEGER NOT NULL DEFAULT 1,
    weight REAL NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (workout_item_id) REFERENCES workout_item(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_workout_item_workout_id ON workout_item(workout_id);
  CREATE INDEX IF NOT EXISTS idx_workout_item_exercise_id ON workout_item(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_workout_item_set_workout_item_id ON workout_item_set(workout_item_id);
`);

// Migrate each (workout_id, exercise_id) row from workout_exercise → workout_item
type WE = { workout_id: string; exercise_id: string };
const workoutExercises = db.prepare("SELECT workout_id, exercise_id FROM workout_exercise").all() as WE[];

for (let i = 0; i < workoutExercises.length; i++) {
  const { workout_id, exercise_id } = workoutExercises[i];
  const itemId = crypto.randomUUID();

  db.prepare(
    "INSERT OR IGNORE INTO workout_item (id, workout_id, exercise_id, position) VALUES (?, ?, ?, ?)"
  ).run(itemId, workout_id, exercise_id, i);

  // Migrate exercise_sets for this exercise into workout_item_sets
  type ES = { sets: number; weight: number; position: number };
  const sets = db.prepare(
    "SELECT sets, weight, position FROM exercise_set WHERE exercise_id = ? ORDER BY position ASC"
  ).all(exercise_id) as ES[];

  for (const set of sets) {
    db.prepare(
      "INSERT INTO workout_item_set (id, workout_item_id, reps, weight, position) VALUES (?, ?, ?, ?, ?)"
    ).run(crypto.randomUUID(), itemId, set.sets, set.weight, set.position);
  }
}

db.exec("PRAGMA foreign_keys = ON;");
console.log(`Migrated ${workoutExercises.length} workout_exercise rows → workout_item`);
db.close();

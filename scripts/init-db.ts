import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";

mkdirSync("./data", { recursive: true });
const db = new Database("./data/app.db");

db.exec(`
  -- better-auth tables
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expiresAt TEXT NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES user(id)
  );

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    accessToken TEXT,
    refreshToken TEXT,
    accessTokenExpiresAt TEXT,
    refreshTokenExpiresAt TEXT,
    scope TEXT,
    idToken TEXT,
    password TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES user(id)
  );

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- App tables
  CREATE TABLE IF NOT EXISTS workout (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    public_slug TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES user(id)
  );

  CREATE TABLE IF NOT EXISTS exercise (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 0,
    weights REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES user(id)
  );

  CREATE TABLE IF NOT EXISTS exercise_set (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 1,
    weight REAL NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workout_exercise (
    workout_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    PRIMARY KEY (workout_id, exercise_id),
    FOREIGN KEY (workout_id) REFERENCES workout(id),
    FOREIGN KEY (exercise_id) REFERENCES exercise(id)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_workout_user_id ON workout(user_id);
  CREATE INDEX IF NOT EXISTS idx_workout_title ON workout(title);
  CREATE INDEX IF NOT EXISTS idx_workout_created_at ON workout(created_at);
  CREATE INDEX IF NOT EXISTS idx_exercise_user_id ON exercise(user_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_title ON exercise(title);
  CREATE INDEX IF NOT EXISTS idx_workout_exercise_workout_id ON workout_exercise(workout_id);
  CREATE INDEX IF NOT EXISTS idx_workout_exercise_exercise_id ON workout_exercise(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_set_exercise_id ON exercise_set(exercise_id);
`);

console.log("Database initialised at ./data/app.db");
db.close();

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
  CREATE TABLE IF NOT EXISTS hand_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    hand_length_cm DECIMAL(5,2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_hand_references_user_id ON hand_references(user_id);
`);

console.log("Migration complete: hand_references table created.");
await pool.end();

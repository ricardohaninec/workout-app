import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
});

try {
  const result = await pool.query("SELECT NOW() as time");
  console.log("Connected! Server time:", result.rows[0].time);
} catch (err) {
  console.error("Connection failed:", err);
} finally {
  await pool.end();
}

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import BetterSQLite from "better-sqlite3";
import { mkdirSync } from "fs";

mkdirSync("./data", { recursive: true });

export const auth = betterAuth({
  database: new BetterSQLite("./data/app.db"),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});

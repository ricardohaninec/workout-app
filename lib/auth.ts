import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import BetterSQLite from "better-sqlite3";
import { mkdirSync } from "fs";

mkdirSync("./data", { recursive: true });

const MAX_USERS = 20;

const db = new BetterSQLite("./data/app.db");

export const auth = betterAuth({
  database: db,
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const row = db.prepare("SELECT COUNT(*) as count FROM user").get() as { count: number };
      if (row.count >= MAX_USERS) {
        throw new APIError("FORBIDDEN", { message: "Registration is currently closed." });
      }
    }),
  },
});

import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { pool } from "@/lib/db";

const MAX_USERS = 20;

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const result = await pool.query('SELECT COUNT(*) as count FROM "user"');
      const count = Number(result.rows[0].count);
      if (count >= MAX_USERS) {
        throw new APIError("FORBIDDEN", { message: "Registration is currently closed." });
      }
    }),
  },
});

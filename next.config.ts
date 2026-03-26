import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [],
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "bun:sqlite"],
};

export default withSerwist(nextConfig);

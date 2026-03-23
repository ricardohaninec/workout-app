import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "bun:sqlite"],
  webpack(config) {
    config.output.hashFunction = "sha256";
    return config;
  },
};

export default withSerwist(nextConfig);

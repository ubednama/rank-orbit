import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from "path";

// Load api-gateway .env first (contains DATABASE_URL and DIRECT_URL)
dotenv.config({ path: path.resolve(__dirname, "../../apps/api-gateway/.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// drizzle-kit push/generate requires the direct connection (bypasses PGBouncer)
// Use DIRECT_URL if set, otherwise fall back to DATABASE_URL
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set");

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});

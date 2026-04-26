/**
 * Migration runner for Supabase / Postgres.
 * Applies every SQL file under libs/db/drizzle/ in order, tracked via the
 * `__drizzle_migrations` bookkeeping table that drizzle-orm's migrator manages.
 *
 * Usage (from repo root):
 *   node libs/db/run-migration.mjs
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const dotenv = require("dotenv");
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from the gateway's .env (where DATABASE_URL/DIRECT_URL live)
dotenv.config({ path: path.resolve(__dirname, "../../apps/api-gateway/.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Prefer DATABASE_URL (transaction pooler) — drizzle migrator works fine over it
// and Supabase's free-tier session pooler can sometimes reject the project-scoped
// "postgres.<project>" username. DIRECT_URL is still preferred when present.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL or DATABASE_URL must be set in apps/api-gateway/.env");
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false, ssl: "require" });
const db = drizzle(client);

try {
  console.log("Running migrations from libs/db/drizzle/ ...");
  await migrate(db, { migrationsFolder: path.join(__dirname, "drizzle") });
  console.log("✅ Migrations applied.");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

/**
 * Manual migration runner for Supabase
 * Run: node libs/db/run-migration.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Pool } = require("pg");
const path = require("path");
const dotenv = require("dotenv");

// Load env
dotenv.config({ path: path.resolve(process.cwd(), "apps/api-gateway/.env") });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Parse manually — pg URL parser strips the project ref (e.g. postgres.xxxxx) from username
const parsed = new URL(rawUrl);
const pool = new Pool({
  host: parsed.hostname,
  port: parseInt(parsed.port) || 5432,
  user: decodeURIComponent(parsed.username), // preserves "postgres.ajaaxqxejnkvdxpmqrxt"
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const sql = `
CREATE TABLE IF NOT EXISTS "Audit" (
  "id" text PRIMARY KEY NOT NULL,
  "url" text NOT NULL,
  "metadata" jsonb NOT NULL,
  "lighthouse_metrics" jsonb NOT NULL,
  "technical_analysis" jsonb NOT NULL,
  "readability_analysis" jsonb NOT NULL,
  "ai_analysis" jsonb NOT NULL,
  "contentHash" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audits_url_created_idx" ON "Audit" USING btree ("url","createdAt");

CREATE TABLE IF NOT EXISTS "AuditUsage" (
  "identifier" text NOT NULL,
  "period" text NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "AuditUsage_identifier_period_pk" PRIMARY KEY("identifier","period")
);
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log("Running migrations...");
    await client.query(sql);
    console.log("✅ Migrations applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

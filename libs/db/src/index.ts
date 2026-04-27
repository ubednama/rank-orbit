import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export * from "drizzle-orm";

const url = process.env["DATABASE_URL"];
if (!url) throw new Error("DATABASE_URL is not set");

// `prepare: false` is required for Supabase Transaction Pool mode.
// `ssl: 'require'` is needed when DATABASE_URL doesn't include ?sslmode=require —
// Supabase's pooler rejects unencrypted connections.
const client = postgres(url, { prepare: false, ssl: "require" });

export const db = drizzle(client, { schema });

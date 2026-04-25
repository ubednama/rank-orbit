import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export * from "drizzle-orm";

const url = process.env["DATABASE_URL"];
if (!url) throw new Error("DATABASE_URL is not set");

// `prepare: false` is required for Supabase Transaction Pool mode
const client = postgres(url, { prepare: false });

export const db = drizzle(client, { schema });

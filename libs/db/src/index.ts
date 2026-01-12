import { PrismaClient } from "./generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

export * from "./generated/client";

const url = process.env["DATABASE_URL"];
const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool);

export const db = new PrismaClient({ adapter });

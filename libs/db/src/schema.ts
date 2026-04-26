import {
  pgTable,
  text,
  jsonb,
  timestamp,
  index,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const audits = pgTable(
  "Audit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    url: text("url").notNull(),
    metadata: jsonb("metadata").notNull(),
    lighthouse_metrics: jsonb("lighthouse_metrics").notNull(),
    technical_analysis: jsonb("technical_analysis").notNull(),
    readability_analysis: jsonb("readability_analysis").notNull(),
    ai_analysis: jsonb("ai_analysis").notNull(),
    contentHash: text("contentHash"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("audits_url_created_idx").on(table.url, table.createdAt)],
);

/**
 * DIY JWT auth users (per ADR 002 + handbook/03-system-design.md).
 * Phase 1: email + password only. email_verified_at and refresh_tokens land in v3 / phase 2.
 */
export const users = pgTable(
  "User",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

/**
 * Tracks AI audit usage for rate limiting.
 * - identifier: IP address (anonymous) or Clerk userId (signed-in)
 * - period: "anon" for lifetime anonymous limit, "YYYY-MM" for monthly signed-in limit
 * - count: number of AI insights consumed
 */
export const auditUsage = pgTable(
  "AuditUsage",
  {
    identifier: text("identifier").notNull(),
    period: text("period").notNull(),
    count: integer("count").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.period] })],
);

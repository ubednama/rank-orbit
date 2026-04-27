import {
  pgTable,
  text,
  jsonb,
  timestamp,
  index,
  integer,
  primaryKey,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

/**
 * DIY JWT auth users (per ADR 002 + handbook/03-system-design.md).
 * Phase 1: email + password only. email_verified_at lands in v3.
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
 * Refresh tokens (Phase 2 of ADR 002).
 *
 * - `tokenHash` is SHA-256 of the raw token; raw token only ever lives in the
 *   client's HttpOnly cookie. Hashing means a DB leak alone can't be replayed.
 * - On every successful /auth/refresh call we ROTATE: insert a new row,
 *   set the old row's `revokedAt`, and store the new id in `replacedBy`.
 * - Reuse of a revoked token is treated as a compromise signal (revoke the
 *   whole chain — handler responsibility).
 * - `userAgent` / `ip` are stored for the future "active sessions" UI; they
 *   are NOT trust signals (mobile users hop networks).
 */
export const refreshTokens = pgTable(
  "RefreshToken",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("tokenHash").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    replacedBy: text("replacedBy"),
    userAgent: text("userAgent"),
    ip: text("ip"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("refresh_tokens_hash_unique").on(table.tokenHash),
    index("refresh_tokens_user_idx").on(table.userId, table.expiresAt),
  ],
);

/**
 * Audit lifecycle status:
 * - crawling     → row inserted; awaiting crawler results
 * - ai_running   → crawler done, lighthouse + metadata saved; awaiting AI
 * - complete     → both stages saved; serveable from cache
 * - failed       → crawler or AI threw; do not serve from cache
 */
export const auditStatusEnum = pgEnum("audit_status", [
  "crawling",
  "ai_running",
  "complete",
  "failed",
]);

/**
 * Single-table staged audit persistence (per ADR 014 — to be written).
 *
 * Save-then-respond at every stage:
 *   1. INSERT { url, user_id, status: 'crawling' }
 *   2. Run crawler → UPDATE crawler fields, status = 'ai_running' → emit `crawler` SSE
 *   3. Run AI → UPDATE ai fields, status = 'complete' → emit `ai` SSE
 *
 * Cache lookup: WHERE url = ? AND status = 'complete' AND updated_at > now() - 30d.
 *
 * Each re-audit creates a NEW row (history accumulates for the Phase-2 dashboard).
 * Drop old rows manually if volume ever justifies it.
 */
export const audits = pgTable(
  "Audit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    url: text("url").notNull(),
    userId: text("userId").references(() => users.id, { onDelete: "set null" }),
    status: auditStatusEnum("status").notNull().default("crawling"),

    // Crawler stage — populated when crawl completes
    metadata: jsonb("metadata"),
    lighthouse_metrics: jsonb("lighthouse_metrics"),
    technical_analysis: jsonb("technical_analysis"),
    readability_analysis: jsonb("readability_analysis"),
    contentHash: text("contentHash"),

    // AI stage — populated when AI completes
    ai_analysis: jsonb("ai_analysis"),
    aiScore: integer("aiScore"),

    // Failure detail (status = 'failed')
    errorMessage: text("errorMessage"),
    errorStage: text("errorStage"), // 'crawler' | 'ai'

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    crawlCompletedAt: timestamp("crawlCompletedAt"),
    aiCompletedAt: timestamp("aiCompletedAt"),
  },
  (table) => [
    index("audits_url_status_updated_idx").on(table.url, table.status, table.updatedAt),
    index("audits_user_created_idx").on(table.userId, table.createdAt),
    index("audits_status_idx").on(table.status),
  ],
);

/**
 * Tracks AI audit usage for rate limiting.
 * - identifier: IP address (anonymous) or user_id (signed-in)
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

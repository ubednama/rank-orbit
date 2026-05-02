import { db, auditUsage, eq, and } from "@db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

// Quota config. Both env-tunable so we can ratchet limits later without a
// code change. `0` means "unlimited" (skip quota check entirely).
//
// Today we run anon = unlimited because the product is in early-portfolio
// mode — funnelling first-time visitors through a signup wall before they've
// seen the value is bad conversion. Re-enable an anon cap when we either
// (a) hit cost pressure on the AI budget, or (b) start tracking anon→signup
// conversion and want the wall back.
const parseLimit = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

export const AI_LIMITS = {
  // 0 = unlimited (no quota check). Tune via ANON_AUDIT_LIMIT.
  anonymous: parseLimit(process.env.ANON_AUDIT_LIMIT, 0),
  // Monthly limit for signed-in free users. Tune via FREE_AUDIT_LIMIT.
  free: parseLimit(process.env.FREE_AUDIT_LIMIT, 3),
} as const;

logger.info(
  `[RateLimit] limits — anonymous=${
    AI_LIMITS.anonymous === 0 ? "unlimited" : AI_LIMITS.anonymous
  }, free(monthly)=${AI_LIMITS.free}`,
);

/**
 * Returns the current period key:
 * - "anon" for anonymous users (lifetime, no reset)
 * - "YYYY-MM" for signed-in users (resets monthly)
 */
export function getPeriod(isAnonymous: boolean): string {
  if (isAnonymous) return "anon";
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export class RateLimitService {
  /**
   * Check whether the given identifier has exceeded their AI quota.
   * Returns true if ALLOWED (under quota), false if BLOCKED (quota exceeded).
   */
  async checkQuota(
    identifier: string,
    isAnonymous: boolean,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const limit = isAnonymous ? AI_LIMITS.anonymous : AI_LIMITS.free;

    // 0 = unlimited. Skip the DB round-trip entirely.
    if (limit === 0) {
      return { allowed: true, remaining: Number.POSITIVE_INFINITY };
    }

    const period = getPeriod(isAnonymous);

    try {
      const rows = await db
        .select()
        .from(auditUsage)
        .where(and(eq(auditUsage.identifier, identifier), eq(auditUsage.period, period)))
        .limit(1);

      const current = rows[0]?.count ?? 0;
      const remaining = Math.max(0, limit - current);
      return { allowed: current < limit, remaining };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`RateLimitService.checkQuota failed: ${msg}`);
      // Fail open — don't block users if DB is down
      return { allowed: true, remaining: 1 };
    }
  }

  /**
   * Increment the usage count for the given identifier.
   * Uses an upsert so it's safe to call concurrently.
   */
  async incrementUsage(identifier: string, isAnonymous: boolean): Promise<void> {
    const limit = isAnonymous ? AI_LIMITS.anonymous : AI_LIMITS.free;
    // 0 = unlimited. No need to track usage we'll never check.
    if (limit === 0) return;

    const period = getPeriod(isAnonymous);

    try {
      await db
        .insert(auditUsage)
        .values({ identifier, period, count: 1, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [auditUsage.identifier, auditUsage.period],
          set: {
            count: sql<number>`${auditUsage.count} + 1` as unknown as number,
            updatedAt: new Date(),
          },
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`RateLimitService.incrementUsage failed: ${msg}`);
    }
  }
}

import { db, auditUsage, eq, and } from "@db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

export const AI_LIMITS = {
  anonymous: 1, // lifetime limit (period = "anon")
  free: 3, // monthly limit for signed-in free users
} as const;

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
    const period = getPeriod(isAnonymous);
    const limit = isAnonymous ? AI_LIMITS.anonymous : AI_LIMITS.free;

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

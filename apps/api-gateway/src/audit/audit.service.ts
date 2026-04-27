import axios from "axios";
import { db, audits, users, eq, and, gt, desc } from "@db";
import crypto from "crypto";
import {
  CrawlResponse,
  AiAnalysisResponse,
  CrawlRequestDto,
  AiCrawlResponse,
  SeoMetadata,
  LighthouseMetrics,
  TechnicalAnalysis,
  ReadabilityStats,
  AIAnalysis,
} from "@shared/types";
import { AnalyzeRequestDto } from "./dto/analyze-request.dto";
import { RateLimitService } from "./rate-limit.service";
import { publishAnalysisJob } from "../worker";
import { enqueueAuditCompleteEmail } from "../emails/notifications.worker";
import { logger } from "../logger";

const APP_URL = process.env.APP_URL || "http://localhost:5000";

export type AuditStreamPayload =
  | { type: "status"; message: string }
  | { type: "crawler"; data: CrawlResponse }
  | { type: "ai"; data: AiAnalysisResponse }
  | { type: "error"; message: string }
  | { type: "sanitized"; data: { originalUrl: string; sanitizedUrl: string } }
  | { type: "complete" };

export interface AuditStreamEvent {
  data: AuditStreamPayload;
}

const CRAWLER_URL = process.env.CRAWLER_SERVICE_URL || "http://localhost:3001";

// Cache freshness window for `status = 'complete'` rows. Older rows are treated
// as a miss; they remain in the table as history but a fresh re-audit overwrites
// nothing — it INSERTs a new row.
const CACHE_FRESHNESS_DAYS = 30;
const CACHE_FRESHNESS_MS = CACHE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;

export class AuditService {
  private readonly rateLimitService = new RateLimitService();

  /** Called by the route HEAD handler to pre-check quota without starting a stream. */
  async hasUsedAiQuota(identifier: string, isAnonymous: boolean): Promise<boolean> {
    const { allowed } = await this.rateLimitService.checkQuota(identifier, isAnonymous);
    return !allowed;
  }

  async crawl(dto: CrawlRequestDto): Promise<AiCrawlResponse> {
    try {
      logger.info(`Sending crawl request to: ${CRAWLER_URL}/api/crawl`);
      const response = await axios.post<AiCrawlResponse>(`${CRAWLER_URL}/api/crawl`, dto, {
        timeout: 30000,
      });
      return response.data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Crawl failed (URL: ${CRAWLER_URL}): ${msg}`);
      const errObj = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        errObj.response?.data?.message || errObj.message || "Failed to crawl website";
      throw new Error(`Crawl failed: ${errorMessage}`, { cause: error });
    }
  }

  async analyze(dto: AnalyzeRequestDto): Promise<AiAnalysisResponse> {
    try {
      return await publishAnalysisJob(dto);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`AI Analysis Queue failed: ${msg}`);
      throw new Error(`AI Analysis failed: ${msg}`, { cause: error });
    }
  }

  private async validateAndSanitize(
    originalUrl: string,
  ): Promise<{ sanitizedUrl: string; isSanitized: boolean }> {
    try {
      const parsedUrl = new URL(originalUrl);
      const searchParams = new URLSearchParams(parsedUrl.search);
      const keysToRemove: string[] = [];
      searchParams.forEach((value, key) => {
        if (key.startsWith("utm_") || key === "fbclid" || key === "gclid") {
          keysToRemove.push(key);
        }
      });

      let isSanitized = false;
      if (keysToRemove.length > 0) {
        keysToRemove.forEach((k) => searchParams.delete(k));
        parsedUrl.search = searchParams.toString();
        isSanitized = true;
      }

      const sanitizedUrl = parsedUrl.toString();

      await axios.head(sanitizedUrl, {
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RankOrbitBot/1.0; +http://rank-orbit.com/bot)",
        },
      });

      return { sanitizedUrl, isSanitized };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid or unreachable URL: ${msg}`, { cause: error });
    }
  }

  /**
   * Look up the user's email and enqueue an audit-complete notification.
   * Best-effort; quietly skips if user/email is missing.
   */
  private async sendAuditCompleteEmail(
    userId: string,
    auditId: string,
    url: string,
    aiAnalysis: AIAnalysis | null,
  ): Promise<void> {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user?.email) return;

    const seoScore = typeof aiAnalysis?.seo_score === "number" ? aiAnalysis.seo_score : null;
    const summary = aiAnalysis?.summary ?? "Your audit is complete.";

    await enqueueAuditCompleteEmail({
      to: user.email,
      url,
      seoScore,
      summary: summary.slice(0, 500),
      reportUrl: `${APP_URL}/seo/${auditId}`,
    });
  }

  /**
   * Mark an in-flight audit row as failed. Best-effort; swallows DB errors
   * because the response path doesn't depend on this succeeding.
   */
  private async markFailed(
    auditId: string,
    stage: "crawler" | "ai",
    error: unknown,
  ): Promise<void> {
    try {
      const message = error instanceof Error ? error.message : String(error);
      await db
        .update(audits)
        .set({
          status: "failed",
          errorStage: stage,
          errorMessage: message.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(audits.id, auditId));
    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      logger.warn(`Failed to mark audit ${auditId} as failed: ${msg}`);
    }
  }

  streamAudit(
    url: string,
    onEvent: (event: AuditStreamEvent) => void,
    onComplete: () => void,
    options: { ip: string; isAnonymous: boolean; userId?: string } = {
      ip: "unknown",
      isAnonymous: true,
    },
  ) {
    const { ip, isAnonymous, userId } = options;
    // Rate-limit identifier: userId for signed-in users, IP for anonymous
    const identifier = isAnonymous ? ip : (userId ?? ip);

    const execute = async () => {
      let auditId: string | null = null;

      try {
        logger.info(`Starting execution for: ${url}`);
        onEvent({ data: { type: "status", message: "Validating URL..." } });

        const { sanitizedUrl, isSanitized } = await this.validateAndSanitize(url);

        if (isSanitized) {
          onEvent({
            data: {
              type: "status",
              message: `URL sanitized: ${sanitizedUrl}. Tracking parameters removed.`,
            },
          });
          onEvent({ data: { type: "sanitized", data: { originalUrl: url, sanitizedUrl } } });
        }

        // ---- Cache lookup: only `complete` rows within the freshness window ----
        try {
          const freshThreshold = new Date(Date.now() - CACHE_FRESHNESS_MS);
          const [cached] = await db
            .select()
            .from(audits)
            .where(
              and(
                eq(audits.url, sanitizedUrl),
                eq(audits.status, "complete"),
                gt(audits.updatedAt, freshThreshold),
              ),
            )
            .orderBy(desc(audits.updatedAt))
            .limit(1);

          if (cached) {
            logger.info(
              `Serving from cache: ${sanitizedUrl} (age within ${CACHE_FRESHNESS_DAYS}d)`,
            );
            onEvent({
              data: { type: "status", message: "Retrieved cached report from database." },
            });
            onEvent({
              data: {
                type: "crawler",
                data: {
                  metadata: cached.metadata as SeoMetadata,
                  lighthouse_metrics: cached.lighthouse_metrics as LighthouseMetrics,
                  technical_analysis: cached.technical_analysis as TechnicalAnalysis,
                  readability_analysis: cached.readability_analysis as ReadabilityStats,
                },
              },
            });
            onEvent({
              data: { type: "ai", data: { ai_analysis: cached.ai_analysis as AIAnalysis } },
            });
            onEvent({ data: { type: "complete" } });
            onComplete();
            return;
          }
        } catch (dbError: unknown) {
          // Fail open on cache lookup errors — proceed to fresh audit.
          const msg = dbError instanceof Error ? dbError.message : String(dbError);
          logger.error(`Cache lookup failed: ${msg}`);
        }

        // ---- Quota check BEFORE creating an audit row or doing any work ----
        const { allowed, remaining } = await this.rateLimitService.checkQuota(
          identifier,
          isAnonymous,
        );
        if (!allowed) {
          const msg = isAnonymous
            ? "You've used your free AI insight. Sign up for 3 free insights/month!"
            : "Monthly AI limit reached (3/month). Upgrade for unlimited access!";
          logger.info(
            `[RateLimit] Quota exceeded for ${identifier} (period: ${
              isAnonymous ? "anon" : "monthly"
            })`,
          );
          onEvent({ data: { type: "status", message: msg } });
          onEvent({ data: { type: "complete" } });
          onComplete();
          return;
        }

        // ---- Stage 0: INSERT a 'crawling' row so the audit is tracked from t=0 ----
        try {
          const [inserted] = await db
            .insert(audits)
            .values({
              url: sanitizedUrl,
              userId: isAnonymous ? null : (userId ?? null),
              status: "crawling",
            })
            .returning({ id: audits.id });
          auditId = inserted.id;
        } catch (dbError: unknown) {
          // Without a row we can't track the audit; surface the error to the client.
          const msg = dbError instanceof Error ? dbError.message : String(dbError);
          logger.error(`Failed to insert audit row: ${msg}`);
          throw new Error(`Could not start audit: database unavailable`, { cause: dbError });
        }

        logger.info(`Starting fresh audit (auditId=${auditId}) for ${sanitizedUrl}`);
        onEvent({ data: { type: "status", message: "Starting audit..." } });

        // ---- Stage 1: Crawl ----
        let crawlResponse: AiCrawlResponse;
        try {
          crawlResponse = await this.crawl({ url: sanitizedUrl });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("ECONNREFUSED") || msg.includes("502") || msg.includes("503")) {
            await this.markFailed(auditId, "crawler", e);
            throw new Error("Crawler Service Unavailable. Please try again later.", { cause: e });
          }
          await this.markFailed(auditId, "crawler", e);
          throw e;
        }

        const pageContent = crawlResponse.page_content || "";
        const newHash = crypto.createHash("sha256").update(pageContent).digest("hex");

        // ---- SAVE crawler results to DB BEFORE emitting `crawler` event ----
        try {
          await db
            .update(audits)
            .set({
              metadata: crawlResponse.metadata,
              lighthouse_metrics: crawlResponse.lighthouse_metrics,
              technical_analysis: crawlResponse.technical_analysis,
              readability_analysis: crawlResponse.readability_analysis,
              contentHash: newHash,
              status: "ai_running",
              crawlCompletedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(audits.id, auditId));
        } catch (dbError: unknown) {
          const msg = dbError instanceof Error ? dbError.message : String(dbError);
          logger.error(`Failed to save crawler results (auditId=${auditId}): ${msg}`);
          // Continue — the user still gets the data even if we couldn't persist.
        }

        // Now emit the crawler event (data is already persisted)
        onEvent({
          data: {
            type: "crawler",
            data: {
              metadata: crawlResponse.metadata,
              lighthouse_metrics: crawlResponse.lighthouse_metrics,
              technical_analysis: crawlResponse.technical_analysis,
              readability_analysis: crawlResponse.readability_analysis,
            },
          },
        });

        // ---- Stage 2: AI (with content-hash reuse from prior complete audit) ----
        logger.info(
          `[RateLimit] ${identifier} has ${remaining - 1} AI insights remaining after this one`,
        );

        let aiResult: AiAnalysisResponse;

        // Optimisation: if a prior complete audit for this URL has the same content
        // hash, reuse its AI analysis (saves a Gemini call). Cheap query — the
        // (url, status, updatedAt) index covers it.
        const [priorComplete] = await db
          .select()
          .from(audits)
          .where(
            and(
              eq(audits.url, sanitizedUrl),
              eq(audits.status, "complete"),
              eq(audits.contentHash, newHash),
            ),
          )
          .orderBy(desc(audits.updatedAt))
          .limit(1)
          .catch(() => [] as Array<typeof audits.$inferSelect>);

        if (priorComplete && priorComplete.ai_analysis) {
          logger.info(`Content unchanged for ${sanitizedUrl}. Reusing stored AI analysis.`);
          onEvent({
            data: { type: "status", message: "Content unchanged. Retrieving existing insights..." },
          });
          aiResult = { ai_analysis: priorComplete.ai_analysis as AIAnalysis };
        } else {
          logger.info(`Queueing AI insights (auditId=${auditId})`);
          onEvent({ data: { type: "status", message: "Added to Analysis Queue..." } });

          try {
            aiResult = await this.analyze({
              page_content: crawlResponse.page_content,
              metadata: crawlResponse.metadata,
              lighthouse_metrics: crawlResponse.lighthouse_metrics,
            });
            await this.rateLimitService.incrementUsage(identifier, isAnonymous);
            logger.info(`[RateLimit] Usage incremented for ${identifier}`);
          } catch (aiError: unknown) {
            // Per audit 🔴 #3: do NOT persist a synthetic AI failure response.
            // Mark the row failed and tell the client.
            await this.markFailed(auditId, "ai", aiError);
            const msg = aiError instanceof Error ? aiError.message : String(aiError);
            logger.error(`AI Service unavailable: ${msg}`);
            onEvent({
              data: {
                type: "error",
                message: "AI Service unavailable. Please try again in a moment.",
              },
            });
            onEvent({ data: { type: "complete" } });
            onComplete();
            return;
          }
        }

        // ---- SAVE AI results to DB BEFORE emitting `ai` event ----
        try {
          const seoScore =
            typeof aiResult.ai_analysis?.seo_score === "number"
              ? aiResult.ai_analysis.seo_score
              : null;

          await db
            .update(audits)
            .set({
              ai_analysis: aiResult.ai_analysis,
              aiScore: seoScore,
              status: "complete",
              aiCompletedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(audits.id, auditId));
        } catch (dbError: unknown) {
          const msg = dbError instanceof Error ? dbError.message : String(dbError);
          logger.error(`Failed to save AI result (auditId=${auditId}): ${msg}`);
          // Continue — emit the result anyway.
        }

        onEvent({ data: { type: "ai", data: aiResult } });
        onEvent({ data: { type: "complete" } });
        onComplete();

        // Notification email — signed-in users only. Fire and forget; failure
        // is non-fatal for the audit. The notifications worker handles its own
        // retry + DLQ via BullMQ (per ADR 013).
        if (!isAnonymous && userId) {
          this.sendAuditCompleteEmail(userId, auditId, sanitizedUrl, aiResult.ai_analysis).catch(
            (err) => {
              logger.warn(`Failed to enqueue audit-complete email: ${err.message}`);
            },
          );
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("Audit stream failed", { error: msg, auditId });
        // If we created a row but didn't already mark it failed, do so now.
        if (auditId) {
          await this.markFailed(auditId, "crawler", error);
        }
        onEvent({ data: { type: "error", message: msg } });
        onComplete();
      }
    };

    execute();
  }
}

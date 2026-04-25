import axios from "axios";
import { db, audits, eq, desc } from "@db";
import crypto from "crypto";
import Redis from "ioredis";
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
import { logger } from "../logger";

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

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CRAWLER_URL = process.env.CRAWLER_SERVICE_URL || "http://localhost:3001";

// Redis with graceful degradation — cache is skipped when Redis is unavailable
let isRedisAvailable = false;

const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 2000, 30000); // back off up to 30s
    return delay;
  },
});

redisClient.on("connect", () => {
  isRedisAvailable = true;
  logger.info("Redis connected — caching enabled");
});
redisClient.on("ready", () => {
  isRedisAvailable = true;
});
redisClient.on("error", (err) => {
  if (isRedisAvailable) {
    logger.warn(`Redis unavailable: ${err.message} — caching disabled, proceeding without cache`);
  }
  isRedisAvailable = false;
});
redisClient.on("close", () => {
  isRedisAvailable = false;
});

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
    // Rate limit identifier: userId for signed-in users, IP for anonymous
    const identifier = isAnonymous ? ip : (userId ?? ip);
    const execute = async () => {
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

        const cacheKey = `audit:${sanitizedUrl}`;
        let cached: { crawlResponse: AiCrawlResponse; aiResult: AiAnalysisResponse } | null = null;

        try {
          if (isRedisAvailable) {
            const cachedString = await redisClient.get(cacheKey);
            if (cachedString) {
              cached = JSON.parse(cachedString);
            }
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn(`Redis Cache Error: ${msg}. Proceeding to DB fallback.`);
          isRedisAvailable = false;
        }

        if (cached) {
          logger.info(`Serving from cache: ${sanitizedUrl}`);
          onEvent({ data: { type: "status", message: "Found cached report. Loading..." } });
          const clientData: CrawlResponse = {
            metadata: cached.crawlResponse.metadata,
            lighthouse_metrics: cached.crawlResponse.lighthouse_metrics,
            technical_analysis: cached.crawlResponse.technical_analysis,
            readability_analysis: cached.crawlResponse.readability_analysis,
          };
          onEvent({ data: { type: "crawler", data: clientData } });
          onEvent({ data: { type: "ai", data: cached.aiResult } });
          onEvent({ data: { type: "complete" } });
          onComplete();
          return;
        }

        try {
          const latestAudits = await db
            .select()
            .from(audits)
            .where(eq(audits.url, sanitizedUrl))
            .orderBy(desc(audits.createdAt))
            .limit(1);
          const latestAudit = latestAudits[0];

          if (latestAudit) {
            logger.info(`Serving from DB fallback: ${sanitizedUrl}`);
            onEvent({
              data: { type: "status", message: "Retrieved existing report from database." },
            });

            const clientData: CrawlResponse = {
              metadata: latestAudit.metadata as SeoMetadata,
              lighthouse_metrics: latestAudit.lighthouse_metrics as LighthouseMetrics,
              technical_analysis: latestAudit.technical_analysis as TechnicalAnalysis,
              readability_analysis: latestAudit.readability_analysis as ReadabilityStats,
            };

            const aiResult: AiAnalysisResponse = {
              ai_analysis: latestAudit.ai_analysis as AIAnalysis,
            };

            onEvent({ data: { type: "crawler", data: clientData } });
            onEvent({ data: { type: "ai", data: aiResult } });
            onEvent({ data: { type: "complete" } });
            onComplete();
            return;
          }
        } catch (dbError: unknown) {
          const msg = dbError instanceof Error ? dbError.message : String(dbError);
          logger.error(`DB Fallback lookup failed: ${msg}`);
        }

        logger.info(`Starting fresh audit (Crawl + DB Parallel)...`);
        onEvent({ data: { type: "status", message: "Starting audit..." } });

        const crawlPromise = this.crawl({ url: sanitizedUrl }).catch((e) => {
          if (
            e.message.includes("ECONNREFUSED") ||
            e.message.includes("502") ||
            e.message.includes("503")
          ) {
            throw new Error("Crawler Service Unavailable. Please try again later.");
          }
          throw e;
        });

        const dbLookupPromise = db
          .select()
          .from(audits)
          .where(eq(audits.url, sanitizedUrl))
          .orderBy(desc(audits.createdAt))
          .limit(1)
          .catch(() => []);

        const [crawlResponse, latestAuditsDb] = await Promise.all([crawlPromise, dbLookupPromise]);
        const latestAudit = latestAuditsDb[0];

        const clientCrawlData: CrawlResponse = {
          metadata: crawlResponse.metadata,
          lighthouse_metrics: crawlResponse.lighthouse_metrics,
          technical_analysis: crawlResponse.technical_analysis,
          readability_analysis: crawlResponse.readability_analysis,
        };

        onEvent({ data: { type: "crawler", data: clientCrawlData } });

        const pageContent = crawlResponse.page_content || "";
        const newHash = crypto.createHash("sha256").update(pageContent).digest("hex");

        // Rate limiting: check DB quota before running AI
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
        logger.info(
          `[RateLimit] ${identifier} has ${remaining - 1} AI insights remaining after this one`,
        );

        let aiResult: AiAnalysisResponse;

        if (latestAudit && latestAudit.contentHash === newHash && latestAudit.ai_analysis) {
          logger.info(`Content unchanged for ${sanitizedUrl}. Reusing stored AI analysis.`);
          onEvent({
            data: { type: "status", message: "Content unchanged. Retrieving existing insights..." },
          });
          aiResult = {
            ai_analysis: latestAudit.ai_analysis as AIAnalysis,
          };
        } else {
          logger.info("Queueing AI insights");
          onEvent({ data: { type: "status", message: "Added to Analysis Queue..." } });

          try {
            aiResult = await this.analyze({
              page_content: crawlResponse.page_content,
              metadata: crawlResponse.metadata,
              lighthouse_metrics: crawlResponse.lighthouse_metrics,
            });

            // Increment usage count in DB after successful AI
            await this.rateLimitService.incrementUsage(identifier, isAnonymous);
            logger.info(`[RateLimit] Usage incremented for ${identifier}`);
          } catch (aiError: unknown) {
            const msg = aiError instanceof Error ? aiError.message : String(aiError);
            logger.error(`AI Service unavailable: ${msg}`);
            onEvent({
              data: {
                type: "status",
                message: "AI Service unavailable. Generating partial report...",
              },
            });
            aiResult = {
              ai_analysis: {
                summary: "AI Service Unavailable",
                action_plan: ["**Service Issue**: The AI analysis service is currently down."],
                detailed_report:
                  "# Service Notice\n\nWe could not generate AI insights at this time.",
                seo_score: 0,
                score_rationale: "Service Unavailable",
                keyword_analysis: "N/A",
              },
            };
          }
        }

        onEvent({ data: { type: "ai", data: aiResult } });

        try {
          await db.insert(audits).values({
            url: sanitizedUrl,
            metadata: crawlResponse.metadata,
            lighthouse_metrics: crawlResponse.lighthouse_metrics,
            technical_analysis: crawlResponse.technical_analysis,
            readability_analysis: crawlResponse.readability_analysis,
            ai_analysis: aiResult.ai_analysis,
            contentHash: newHash,
            updatedAt: new Date(),
          });
        } catch (dbError: unknown) {
          const msg = dbError instanceof Error ? dbError.message : String(dbError);
          logger.error(`Failed to save to DB: ${msg}`);
        }

        if (isRedisAvailable) {
          try {
            await redisClient.set(
              cacheKey,
              JSON.stringify({ crawlResponse, aiResult }),
              "EX",
              86400,
            );
          } catch (cacheError: unknown) {
            const msg = cacheError instanceof Error ? cacheError.message : String(cacheError);
            logger.warn(`Failed to write to Redis cache: ${msg}`);
          }
        }

        onEvent({ data: { type: "complete" } });
        onComplete();
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("Audit stream failed", { error: msg });
        onEvent({ data: { type: "error", message: msg } });
        onComplete();
      }
    };

    execute();
  }
}

import { Injectable, Logger, Inject } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom, Observable } from "rxjs";
import { AnalyzeRequestDto } from "./dto/analyze-request.dto";
import { CrawlResponse, AiAnalysisResponse, CrawlRequestDto, AiCrawlResponse } from "@shared/types";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { db } from "@db";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

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

/**
 * Service responsible for orchestrating SEO audits
 * Coordinates between crawler, AI analysis, and caching layers
 * Implements content-based deduplication to optimize AI API usage
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private crawlerUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue("ai-analysis") private aiQueue: Queue,
  ) {
    this.crawlerUrl = this.configService.getOrThrow<string>("CRAWLER_SERVICE_URL");
  }

  /**
   * Delegates crawling to the dedicated crawler microservice
   * @param dto - URL and crawl configuration
   * @returns Comprehensive crawl results including lighthouse metrics and parsed content
   */
  async crawl(dto: CrawlRequestDto): Promise<AiCrawlResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<AiCrawlResponse>(`${this.crawlerUrl}/api/crawl`, dto),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Crawl failed: ${error.message}`, error.stack);

      const errorMessage = error.response?.data || "Failed to crawl website";
      throw new Error(`Crawl failed: ${errorMessage}`);
    }
  }

  /**
   * Requests AI-powered SEO analysis via Queue
   * @param dto - Page content and metadata for analysis
   * @returns AI-generated insights, recommendations, and keyword analysis
   */
  async analyze(dto: AnalyzeRequestDto): Promise<AiAnalysisResponse> {
    try {
      // Add to Queue
      const job = await this.aiQueue.add("analyze", dto);

      // Await result (Queue handles concurrency)
      // job.finished() returns the result of the processor
      const result = await job.finished();
      return result as AiAnalysisResponse;
    } catch (error) {
      this.logger.error(`AI Analysis Queue failed: ${error.message}`, error.stack);
      throw new Error(`AI Analysis failed: ${error.message}`);
    }
  }

  /**
   * Validates URL accessibility and removes tracking parameters
   * Sanitizes URLs by stripping utm_*, fbclid, and gclid parameters
   * @param originalUrl - User-provided URL to validate and clean
   * @returns Sanitized URL and flag indicating if modifications occurred
   * @throws Error if URL is malformed or unreachable
   */
  private async validateAndSanitize(
    originalUrl: string,
  ): Promise<{ sanitizedUrl: string; isSanitized: boolean }> {
    try {
      const parsedUrl = new URL(originalUrl);
      // Remove common tracking parameters to normalize cache keys
      const searchParams = new URLSearchParams(parsedUrl.search);
      const keysToRemove = [];
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

      // Verify URL is accessible before proceeding with expensive crawl operation
      await firstValueFrom(this.httpService.head(sanitizedUrl, { timeout: 10000 }));

      return { sanitizedUrl, isSanitized };
    } catch (error) {
      throw new Error(`Invalid or unreachable URL: ${error.message}`);
    }
  }

  /**
   * Streams real-time audit progress via Server-Sent Events
   * Implements intelligent caching and content-based deduplication:
   * 1. URL validation and sanitization
   * 2. Redis cache lookup for instant results
   * 3. Parallel crawl + database hash lookup
   * 4. SHA-256 content comparison to detect unchanged pages
   * 5. Conditional AI analysis (only if content changed)
   * 6. Persistent storage and cache update
   *
   * @param url - Target URL to audit
   * @returns Observable stream of audit events (status, crawler data, AI insights, errors)
   */
  streamAudit(url: string): Observable<AuditStreamEvent> {
    return new Observable((subscriber) => {
      const execute = async () => {
        try {
          // Step 1: Validate URL format and accessibility, sanitize tracking parameters
          subscriber.next({ data: { type: "status", message: "Validating URL..." } });
          const { sanitizedUrl, isSanitized } = await this.validateAndSanitize(url);

          if (isSanitized) {
            subscriber.next({
              data: {
                type: "status",
                message: `URL sanitized: ${sanitizedUrl}. Tracking parameters removed.`,
              },
            });
            // Also imply to frontend that original URL was different via a custom event if needed,
            // but status message covers requirements for now.
            // We could emit a specific 'sanitized' event type if the frontend needs to handle state strictly.
            subscriber.next({
              data: { type: "sanitized", data: { originalUrl: url, sanitizedUrl } },
            });
          }

          const cacheKey = `audit:${sanitizedUrl}`;

          // Step 2: Attempt cache retrieval for instant results
          const cached = await this.cacheManager.get<{
            crawlResponse: AiCrawlResponse;
            aiResult: AiAnalysisResponse;
          }>(cacheKey);
          if (cached) {
            this.logger.log(`Serving from cache: ${sanitizedUrl}`);
            subscriber.next({
              data: { type: "status", message: "Found cached report. Loading..." },
            });

            const clientData: CrawlResponse = {
              metadata: cached.crawlResponse.metadata,
              lighthouse_metrics: cached.crawlResponse.lighthouse_metrics,
              technical_analysis: cached.crawlResponse.technical_analysis,
              readability_analysis: cached.crawlResponse.readability_analysis,
            };
            subscriber.next({ data: { type: "crawler", data: clientData } });
            subscriber.next({ data: { type: "ai", data: cached.aiResult } });
            subscriber.next({ data: { type: "complete" } });
            subscriber.complete();
            return;
          }

          subscriber.next({ data: { type: "status", message: "Starting audit..." } });

          // Step 3: Execute crawl and database lookup in parallel for optimal performance
          const crawlDto: CrawlRequestDto = { url: sanitizedUrl };
          const crawlPromise = this.crawl(crawlDto).catch((e) => {
            console.error("DEBUG: Crawl Promise Rejected", e);
            if (
              e.message.includes("ECONNREFUSED") ||
              e.message.includes("502") ||
              e.message.includes("503")
            ) {
              throw new Error("Crawler Service Unavailable. Please try again later.");
            }
            throw e;
          });
          const dbLookupPromise = db.audit
            .findFirst({
              where: { url: sanitizedUrl },
              orderBy: { createdAt: "desc" },
            })
            .catch((e) => {
              console.error("DEBUG: DB Promise Rejected (Non-fatal)", e);
              return null;
            });

          const [crawlResponse, latestAudit] = await Promise.all([crawlPromise, dbLookupPromise]);

          const clientCrawlData: CrawlResponse = {
            metadata: crawlResponse.metadata,
            lighthouse_metrics: crawlResponse.lighthouse_metrics,
            technical_analysis: crawlResponse.technical_analysis,
            readability_analysis: crawlResponse.readability_analysis,
          };
          subscriber.next({ data: { type: "crawler", data: clientCrawlData } });

          if (subscriber.closed) {
            this.logger.warn("Audit cancelled by client");
            return;
          }

          // Step 4: Generate SHA-256 hash to detect content changes since last audit
          const crypto = await import("crypto");
          const pageContent = crawlResponse.page_content || "";
          const newHash = crypto.createHash("sha256").update(pageContent).digest("hex");

          let aiResult: AiAnalysisResponse;

          if (latestAudit && latestAudit.contentHash === newHash && latestAudit.ai_analysis) {
            // Content unchanged: reuse existing AI analysis to save API costs and time
            this.logger.log(`Content unchanged for ${sanitizedUrl}. Reusing stored AI analysis.`);
            subscriber.next({
              data: {
                type: "status",
                message: "Content unchanged. Retrieving existing insights...",
              },
            });
            aiResult = {
              ai_analysis: latestAudit.ai_analysis as unknown as AiAnalysisResponse["ai_analysis"],
            };
          } else {
            // Content modified or first audit: generate fresh AI insights
            this.logger.debug("Queueing AI insights");
            subscriber.next({ data: { type: "status", message: "Added to Analysis Queue..." } });

            const analyzeDto = {
              page_content: crawlResponse.page_content,
              metadata: crawlResponse.metadata,
              lighthouse_metrics: crawlResponse.lighthouse_metrics,
            };

            // This will block until the queued job finishes
            try {
              aiResult = await this.analyze(analyzeDto);
            } catch (aiError) {
              this.logger.error(`AI Service unavailable: ${aiError.message}`);
              subscriber.next({
                data: {
                  type: "status",
                  message: "AI Service unavailable. Generating partial report...",
                },
              });

              // Fallback dummy response
              aiResult = {
                ai_analysis: {
                  summary: "AI Service Unavailable",
                  action_plan: ["**Service Issue**: The AI analysis service is currently down."],
                  detailed_report:
                    "# Service Notice\n\nWe could not generate AI insights at this time because the AI Service is unresponsive.\n\nPlease try again later.",
                  seo_score: 0,
                  score_rationale: "Service Unavailable",
                  keyword_analysis: "N/A",
                  technical_analysis: {},
                },
              };
            }

            this.logger.debug("AI insights generated (or fallback used)");
          }

          subscriber.next({ data: { type: "ai", data: aiResult } });

          // Step 5: Persist audit results for history and future deduplication
          try {
            this.logger.debug("Saving to DB");
            /* eslint-disable @typescript-eslint/no-explicit-any */
            await db.audit.create({
              data: {
                url: sanitizedUrl,
                metadata: crawlResponse.metadata as any,
                lighthouse_metrics: crawlResponse.lighthouse_metrics as any,
                technical_analysis: crawlResponse.technical_analysis as any,
                readability_analysis: crawlResponse.readability_analysis as any,
                ai_analysis: aiResult.ai_analysis as any,
                contentHash: newHash,
              },
            });
            /* eslint-enable @typescript-eslint/no-explicit-any */
          } catch (dbError) {
            this.logger.error(`Failed to save to DB: ${dbError.message}`);
          }

          // Cache results for 24 hours to serve subsequent requests instantly
          this.logger.debug("Caching result");
          await this.cacheManager.set(cacheKey, { crawlResponse, aiResult }, 86400 * 1000);

          subscriber.next({ data: { type: "complete" } });
          subscriber.complete();
        } catch (error) {
          console.error("DEBUG: Main Execute Catch Info:", error);
          this.logger.error(`Audit stream failed: ${error.message}`, error.stack);
          subscriber.next({ data: { type: "error", message: error.message || String(error) } });
          subscriber.complete();
        }
      };

      execute();
    });
  }
}

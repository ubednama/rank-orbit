import { Injectable, Logger, Inject } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom, Observable } from "rxjs";
import { AnalyzeRequestDto } from "./dto/analyze-request.dto";
import { CrawlResponse, AiAnalysisResponse, CrawlRequestDto, AiCrawlResponse } from "@shared/types";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { db } from "@db";

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

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private crawlerUrl: string;
  private aiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.crawlerUrl = this.configService.getOrThrow<string>("CRAWLER_SERVICE_URL");
    this.aiUrl = this.configService.getOrThrow<string>("AI_SERVICE_URL");
  }

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

  async analyze(dto: AnalyzeRequestDto): Promise<AiAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<AiAnalysisResponse>(`${this.aiUrl}/analyze`, dto),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`AI Analysis failed: ${error.message}`, error.stack);
      const errorMessage = error.response?.data || "Failed to analyze content";
      throw new Error(`AI Analysis failed: ${errorMessage}`);
    }
  }

  private async validateAndSanitize(
    originalUrl: string,
  ): Promise<{ sanitizedUrl: string; isSanitized: boolean }> {
    try {
      const parsedUrl = new URL(originalUrl);
      // Strip tracking parameters
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

      // Validate reachability with HEAD request
      await firstValueFrom(this.httpService.head(sanitizedUrl, { timeout: 5000 }));

      return { sanitizedUrl, isSanitized };
    } catch (error) {
      throw new Error(`Invalid or unreachable URL: ${error.message}`);
    }
  }

  streamAudit(url: string): Observable<AuditStreamEvent> {
    return new Observable((subscriber) => {
      const execute = async () => {
        try {
          // 1. Validate & Sanitize
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

          // 2. Check Cache
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

          // 3. Parallel Execution: Crawl + DB Lookup
          const crawlDto: CrawlRequestDto = { url: sanitizedUrl };
          const crawlPromise = this.crawl(crawlDto).catch((e) => {
            console.error("DEBUG: Crawl Promise Rejected", e);
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

          // 4. Content Hashing & Comparison
          const crypto = await import("crypto");
          const pageContent = crawlResponse.page_content || "";
          const newHash = crypto.createHash("sha256").update(pageContent).digest("hex");

          let aiResult: AiAnalysisResponse;

          if (latestAudit && latestAudit.contentHash === newHash && latestAudit.ai_analysis) {
            // MATCH: Reuse AI
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
            // MISMATCH: Generate AI
            this.logger.debug("Generating AI insights");
            subscriber.next({ data: { type: "status", message: "Generating AI insights..." } });
            const analyzeDto = {
              page_content: crawlResponse.page_content,
              metadata: crawlResponse.metadata,
              lighthouse_metrics: crawlResponse.lighthouse_metrics,
            };
            aiResult = await this.analyze(analyzeDto);
            this.logger.debug("AI insights generated");
          }

          subscriber.next({ data: { type: "ai", data: aiResult } });

          // 5. Save and Cache
          try {
            this.logger.debug("Saving to DB");
            await db.audit.create({
              data: {
                url: sanitizedUrl,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                metadata: crawlResponse.metadata as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lighthouse_metrics: crawlResponse.lighthouse_metrics as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                technical_analysis: crawlResponse.technical_analysis as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                readability_analysis: crawlResponse.readability_analysis as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ai_analysis: aiResult.ai_analysis as any,
                contentHash: newHash,
              },
            });
          } catch (dbError) {
            this.logger.error(`Failed to save to DB: ${dbError.message}`);
          }

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

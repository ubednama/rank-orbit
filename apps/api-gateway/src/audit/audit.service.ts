import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom, Observable } from "rxjs";
import { AnalyzeRequestDto } from "./dto/analyze-request.dto";
import { CrawlResult, AiAnalysisResponse, CrawlRequestDto } from "@shared/types";

export type AuditStreamPayload =
  | { type: "status"; message: string }
  | { type: "crawler"; data: CrawlResult }
  | { type: "ai"; data: AiAnalysisResponse }
  | { type: "error"; message: string }
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
  ) {
    this.crawlerUrl = this.configService.get<string>(
      "CRAWLER_SERVICE_URL",
      "http://localhost:3001",
    );
    this.aiUrl = this.configService.get<string>("AI_SERVICE_URL", "http://localhost:8000/api");
  }

  async crawl(dto: CrawlRequestDto): Promise<CrawlResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<CrawlResult>(`${this.crawlerUrl}/api/crawl`, dto),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Crawl failed: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || "Failed to crawl website",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throw new HttpException(
        error.response?.data || "Failed to generate AI insights",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  streamAudit(url: string): Observable<AuditStreamEvent> {
    return new Observable((subscriber) => {
      const execute = async () => {
        try {
          // 1. Notify Start
          subscriber.next({ data: { type: "status", message: "Starting audit..." } });

          // 2. Perform Crawl
          const crawlDto: CrawlRequestDto = { url };
          const crawlResult = await this.crawl(crawlDto);

          subscriber.next({ data: { type: "crawler", data: crawlResult } });

          // Ghost Job Check: If client disconnected, stop before expensive AI call
          if (subscriber.closed) {
            this.logger.warn('Audit cancelled by client');
            return;
          }

          // 3. Perform AI Analysis
          subscriber.next({ data: { type: "status", message: "Generating AI insights..." } });

          // Prepare AI Loop Payload
          const analyzeDto = {
            page_content: crawlResult.page_content,
            metadata: crawlResult.metadata,
            lighthouse_metrics: crawlResult.lighthouse_metrics,
          };

          const aiResult = await this.analyze(analyzeDto);
          subscriber.next({ data: { type: "ai", data: aiResult } });

          // 4. Complete
          subscriber.next({ data: { type: "complete" } });
          subscriber.complete();
        } catch (error) {
          this.logger.error(`Audit stream failed: ${error.message}`);
          // Send error as event so client can handle it gracefully.
          // We emit the error as a data event so EventSource on client doesn't just error out generically.
          subscriber.next({ data: { type: "error", message: error.message || String(error) } });
          subscriber.complete();
        }
      };

      execute();
    });
  }
}

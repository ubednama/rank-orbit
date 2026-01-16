import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { AiAnalysisResponse } from "@shared/types";
import { AnalyzeRequestDto } from "./dto/analyze-request.dto";
import { Logger } from "@nestjs/common";

@Processor("ai-analysis")
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);
  private aiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiUrl = this.configService.getOrThrow<string>("AI_SERVICE_URL");
  }

  @Process("analyze")
  async handleAnalysis(job: Job<AnalyzeRequestDto>): Promise<AiAnalysisResponse> {
    this.logger.debug(`Processing AI analysis job ${job.id}`);
    try {
      const response = await firstValueFrom(
        this.httpService.post<AiAnalysisResponse>(`${this.aiUrl}/analyze`, job.data),
      );
      this.logger.debug(`AI analysis job ${job.id} completed`);
      return response.data;
    } catch (error) {
      this.logger.error(`AI Analysis job failed: ${error.message}`, error.stack);
      // Fail the job so the caller knows
      throw error;
    }
  }
}

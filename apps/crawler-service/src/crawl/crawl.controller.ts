import { Controller, Post, Body, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { CrawlService } from "./crawl.service";
import { CrawlRequestDto, AiCrawlResponse } from "@shared/types";

@Controller("crawl")
export class CrawlController {
  private readonly logger = new Logger(CrawlController.name);

  constructor(private readonly crawlService: CrawlService) {}

  @Post()
  async crawl(@Body() dto: CrawlRequestDto): Promise<AiCrawlResponse> {
    const { url } = dto;

    try {
      const { page_content, metadata, readability_analysis } =
        await this.crawlService.extractMetadata(url);
      const lighthouse_metrics = await this.crawlService.runLighthouse(url);
      const technical_analysis = this.crawlService.calculateTechnicalAnalysis(lighthouse_metrics);

      return {
        page_content,
        metadata,
        lighthouse_metrics,
        readability_analysis,
        technical_analysis,
      };
    } catch (error) {
      this.logger.error(`Crawl Error for ${url}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : "Failed to crawl website",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

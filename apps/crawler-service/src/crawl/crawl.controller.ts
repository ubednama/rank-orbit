import { Controller, Post, Body, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { CrawlService } from "./crawl.service";
import { CrawlRequestDto, CrawlResponse } from "@shared/types";

@Controller("crawl")
export class CrawlController {
  private readonly logger = new Logger(CrawlController.name);

  constructor(private readonly crawlService: CrawlService) {}

  @Post()
  async crawl(@Body() dto: CrawlRequestDto): Promise<CrawlResponse> {
    const { url } = dto;

    try {
      const { page_content, metadata } = await this.crawlService.extractMetadata(url);
      const lighthouse_metrics = await this.crawlService.runLighthouse(url);

      return {
        page_content,
        metadata,
        lighthouse_metrics,
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

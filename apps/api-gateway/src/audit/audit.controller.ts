import { Controller, Post, Body, Sse, MessageEvent, Query } from "@nestjs/common";
import { Observable } from "rxjs";
import { AuditService } from "./audit.service";
import { AnalyzeRequestDto } from "./dto/analyze-request.dto";
import { CrawlRequestDto } from "@shared/types";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Audit")
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post("/crawl")
  @ApiOperation({ summary: "Crawl a website and extract metadata/metrics" })
  @ApiResponse({ status: 201, description: "Crawl successful." })
  async crawl(@Body() dto: CrawlRequestDto) {
    return this.auditService.crawl(dto);
  }

  @Post("/analyze")
  @ApiOperation({ summary: "Generate AI insights from crawl data" })
  @ApiResponse({ status: 201, description: "Analysis generated." })
  async analyze(@Body() dto: AnalyzeRequestDto) {
    return this.auditService.analyze(dto);
  }

  @Sse("/stream")
  @ApiOperation({ summary: "Stream audit results via SSE" })
  @ApiResponse({
    status: 200,
    description: "Returns a stream of events: status, crawl_result, ai_analysis, error, complete.",
  })
  stream(@Query("url") url: string): Observable<MessageEvent> {
    return this.auditService.streamAudit(url);
  }
}

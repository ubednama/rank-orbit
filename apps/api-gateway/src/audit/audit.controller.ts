import { Controller, Post, Body, Sse, MessageEvent, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditService } from './audit.service';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { CrawlRequestDto } from '@shared/types';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('/crawl')
  async crawl(@Body() dto: CrawlRequestDto) {
    return this.auditService.crawl(dto);
  }

  @Post('/analyze')
  async analyze(@Body() dto: AnalyzeRequestDto) {
    return this.auditService.analyze(dto);
  }

  @Sse('/stream')
  stream(@Query('url') url: string): Observable<MessageEvent> {
    return this.auditService.streamAudit(url);
  }
}

import { Module } from '@nestjs/common';
import { CrawlModule } from '../crawl/crawl.module';
import { HealthController } from './health.controller';

@Module({
  imports: [CrawlModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

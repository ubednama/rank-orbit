import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CrawlModule } from "../crawl/crawl.module";
import { HealthController } from "./health.controller";
import { validate } from "./env.validation";
import { LoggingModule } from "../logging/logging.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggingModule,
    CrawlModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

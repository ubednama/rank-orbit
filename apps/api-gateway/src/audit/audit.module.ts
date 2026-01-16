import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { BullModule } from "@nestjs/bull";
import { AuditProcessor } from "./audit.processor";

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: "ai-analysis",
      limiter: {
        max: 1, // Max 1 job processed
        duration: 2000, // per 2 seconds (Generous safety for Gemini) to ensure we don't hit rate limits
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 1000,
        timeout: 60000, // 60s timeout for AI analysis
      },
    }),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditProcessor],
})
export class AuditModule {}

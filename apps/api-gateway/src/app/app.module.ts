import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { HealthController } from "../health/health.controller";
import { validate } from "./env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

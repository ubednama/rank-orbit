import { Module, OnModuleInit, Inject, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { HealthController } from "../health/health.controller";
import { validate } from "./env.validation";
import { CacheModule, CACHE_MANAGER } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";
import { LoggingModule } from "../logging/logging.module";
import { Cache } from "cache-manager";
import { db } from "@db";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const url = configService.get("REDIS_URL") || "redis://localhost:6379";
        const isTls = url.startsWith("rediss://");
        return {
          store: redisStore,
          url,
          ttl: 86400, // 24 hours
          // Upstash/TLS support
          ...(isTls && {
            tls: {
              rejectUnauthorized: false,
            },
          }),
        };
      },
      inject: [ConfigService],
    }),
    AuditModule,
    LoggingModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleInit() {
    // Redis Connection Logging
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (this.cacheManager as any).store;
      if (store && typeof store.getClient === "function") {
        const client = store.getClient();
        if (client) {
          client.on("connect", () => {
            this.logger.log("✅ Redis connected");
          });
          client.on("error", (error) => {
            this.logger.error(`❌ Redis failed: ${error}`);
          });
          this.logger.log("✅ Redis client initialized");
        }
      } else {
        this.logger.warn("⚠️  Redis store not available - caching will use in-memory fallback");
      }
    } catch (error) {
      this.logger.error(`❌ Redis setup error: ${error}`);
    }

    // Database Logging
    try {
      await db.$connect();
      this.logger.log("✅ Database connected");
    } catch (error) {
      this.logger.error(`❌ Database failed: ${error}`);
    }
  }
}

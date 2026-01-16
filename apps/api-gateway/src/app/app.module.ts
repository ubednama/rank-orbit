import { Module, OnModuleInit, Inject, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { HealthController } from "../health/health.controller";
import { validate } from "./env.validation";
import { CacheModule, CACHE_MANAGER } from "@nestjs/cache-manager";
import { LoggingModule } from "../logging/logging.module";
import { Cache } from "cache-manager";
import { db } from "@db";
import KeyvRedis from "@keyv/redis";
import Keyv from "keyv";
import { CacheableMemory } from "cacheable";
import { createClient } from "redis";
import { AuthModule } from "../auth/auth.module";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { APP_GUARD, Reflector } from "@nestjs/core";

import { ThrottlerBehindProxyGuard } from "../guards/throttler-behind-proxy.guard";

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
        let url = configService.get("REDIS_URL") || "redis://localhost:6379";
        if (url.includes("upstash") && url.startsWith("redis://")) {
          url = url.replace("redis://", "rediss://");
        }
        const client = createClient({
          url,
          socket: {
            tls: url.startsWith("rediss://"),
            rejectUnauthorized: false,
          },
        });
        client.on("error", (err) => console.error("Redis Client Error", err));
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            new KeyvRedis(client),
          ],
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        let url = configService.get("REDIS_URL") || "redis://localhost:6379";
        // Bull uses ioredis, which handles rediss:// automatically usually, but let's be safe
        if (url.includes("upstash") && url.startsWith("redis://")) {
          url = url.replace("redis://", "rediss://");
        }
        return {
          url,
          redis: {
            tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        let url = config.get("REDIS_URL") || "redis://localhost:6379";
        // Throttler Redis storage also uses ioredis or similar
        if (url.includes("upstash") && url.startsWith("redis://")) {
          url = url.replace("redis://", "rediss://");
        }
        return {
          throttlers: [{ limit: 3, ttl: 2592000000 }], // Defaults, overridden by Guard
          storage: new ThrottlerStorageRedisService(url),
        };
      },
    }),
    AuthModule,
    AuditModule,
    LoggingModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    Reflector,
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Redis/Cache Functional Test
    try {
      const testKey = "redis_connection_test";
      const testValue = "test_value_" + Date.now();

      await this.cacheManager.set(testKey, testValue, 10000);
      const retrieved = await this.cacheManager.get(testKey);

      if (retrieved === testValue) {
        this.logger.log("✅ Cache functionality test passed (Redis/Keyv)");
      } else {
        this.logger.error(
          `❌ Cache functionality test failed: Expected ${testValue}, got ${retrieved}`,
        );
      }
    } catch (error) {
      this.logger.error(`❌ Cache setup/connection error: ${error}`);
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

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

        // Upstash requires TLS, but sometimes provides redis:// URL.
        // node-redis throws if tls:true is used with redis:// scheme.
        if (url.includes("upstash") && url.startsWith("redis://")) {
          url = url.replace("redis://", "rediss://");
        }

        const client = createClient({
          url,
          // When url is rediss://, tls is implied. We just need rejectUnauthorized: false for some setups if needed.
          socket: {
            tls: url.startsWith("rediss://"),
            rejectUnauthorized: false,
          },
        });
        // Handle error events to prevent crashing
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
    AuditModule,
    LoggingModule,
  ],
  controllers: [HealthController],
  providers: [],
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

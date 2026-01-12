/**
 * Rank Orbit Crawler Service
 */
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
    const configService = app.get(ConfigService);

    /**
     * Request Validation Pipeline
     * Automatically transforms and validates incoming DTOs
     * Strips non-whitelisted properties for security
     */
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    // Configure API prefix for consistent routing with gateway
    const globalPrefix = "api";
    app.setGlobalPrefix(globalPrefix);

    const port = configService.get<number>("CRAWLER_PORT", 3001);

    await app.listen(port);
    Logger.log(`🚀 Crawler Service running on: http://localhost:${port}/${globalPrefix}`);
  } catch (error) {
    Logger.error("Failed to start Crawler Service", error);
    process.exit(1);
  }
}

bootstrap();

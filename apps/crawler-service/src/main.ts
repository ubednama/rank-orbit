/**
 * Rank Orbit Crawler Service
 */
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    // Global configuration
    const globalPrefix = "api";
    app.setGlobalPrefix(globalPrefix);
    
    const port = configService.get<number>('CRAWLER_PORT', 3001);

    await app.listen(port);
    Logger.log(`🚀 Crawler Service running on: http://localhost:${port}/${globalPrefix}`);
  } catch (error) {
    Logger.error("Failed to start Crawler Service", error);
    process.exit(1);
  }
}

bootstrap();

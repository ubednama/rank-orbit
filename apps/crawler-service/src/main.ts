/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    const globalPrefix = "api";
    app.setGlobalPrefix(globalPrefix);
    const port = process.env.PORT || 3001;
    Logger.log(`Attempting to start Crawler Service on port: ${port}`);
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  } catch (error) {
    Logger.error("Failed to start Crawler Service", error);
    process.exit(1);
  }
}

bootstrap();

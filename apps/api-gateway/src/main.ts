/**
 * Rank Orbit API Gateway
 */

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as bodyParser from "body-parser";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Winston logger for centralized logging across all modules
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const configService = app.get(ConfigService);

  // CORS Configuration
  app.enableCors({
    origin: [
      "http://localhost:4200",
      "http://localhost:3000",
      "http://localhost:5000",
      "https://rank-orbit.vercel.app",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  /**
   * Body Parser Configuration
   * Increased payload limits to support large SEO audit responses
   * containing comprehensive lighthouse metrics and HTML content
   */
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

  // Configure global API prefix for versioning and route organization
  const globalPrefix = "api";
  app.setGlobalPrefix(globalPrefix);

  const port = configService.get<number>("API_GATEWAY_PORT", 3333);

  /**
   * Global Middleware Configuration
   * - Validation: Automatically sanitizes and validates incoming DTOs
   * - Exception Filter: Provides consistent error response formatting
   */
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle("Rank Orbit API")
    .setDescription("SEO Audit and Crawler Service API")
    .setVersion("1.0")
    .addServer(`http://localhost:${port}`)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port);
  Logger.log(`🚀 API Gateway running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();

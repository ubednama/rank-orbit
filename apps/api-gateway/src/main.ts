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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // CORS Configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:4200,http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(',').map(origin => origin.trim()),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Body parser configuration for large SEO payloads
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
  
  // Global configuration
  const globalPrefix = "api";
  app.setGlobalPrefix(globalPrefix);
  
  const port = configService.get<number>('API_GATEWAY_PORT', 3333);
  
  // Global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API Documentation
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

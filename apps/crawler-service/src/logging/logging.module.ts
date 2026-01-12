import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import { getLogFilePath } from "@shared/utils";

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ms }) => {
              return `${timestamp} [${context || "CrawlerService"}] ${level}: ${message} ${ms}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: getLogFilePath("crawler-service", "combined"),
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new winston.transports.File({
          filename: getLogFilePath("crawler-service", "error"),
          level: "error",
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggingModule {}

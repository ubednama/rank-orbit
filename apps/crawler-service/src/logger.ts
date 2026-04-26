import { createLogger, format, transports } from "winston";

const { combine, timestamp, colorize, printf, errors } = format;

const logFormat = printf(({ level, message, timestamp, service, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "crawler-service" },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    colorize(),
    logFormat,
  ),
  transports: [new transports.Console()],
});

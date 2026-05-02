import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

// Routes we don't want spamming the log every probe interval.
const QUIET_PATHS = new Set<string>(["/api/health"]);

/**
 * Structured access log: one line per completed request with method, path,
 * status, latency, request-id, and (when populated) the auth subject.
 *
 * Logs on `res.on('finish')` so we capture the actual outbound status —
 * including ones produced by the global error handler.
 *
 * Skips health-check noise (Fly probes /api/health every few seconds).
 * Logs at `warn` for 4xx and `error` for 5xx so they stand out without
 * needing a separate alert pipeline.
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    if (QUIET_PATHS.has(req.path)) return;

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const status = res.statusCode;

    const meta = {
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      durationMs: Math.round(durationMs * 100) / 100,
      requestId: req.id,
      ...(req.user?.sub ? { userId: req.user.sub } : {}),
    };

    if (status >= 500) {
      logger.error("request", meta);
    } else if (status >= 400) {
      logger.warn("request", meta);
    } else {
      logger.info("request", meta);
    }
  });

  next();
};

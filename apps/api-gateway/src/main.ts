import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { routes } from "./routes";
import { logger } from "./logger";
import { startWorker } from "./worker";
import { startNotificationsWorker } from "./emails/notifications.worker";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware";

// Fail fast on missing or weak JWT_SECRET — auth is security-critical.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET env var must be set and at least 32 characters");
}

startWorker();
startNotificationsWorker();

const app = express();
const port = parseInt(process.env.API_GATEWAY_PORT || "3333", 10);

// Single source of truth for the public client URL: APP_URL.
// Used both as the CORS origin and in email template links. Required.
const APP_URL = process.env.APP_URL;
if (!APP_URL) {
  throw new Error("APP_URL env var must be set (used for CORS + email links)");
}
logger.info(`CORS origin: ${APP_URL}`);

// Body size cap. Default 1mb is plenty for our routes — the audit DTO is
// well under 1kb, even react-email payloads we generate internally are tiny.
// Tunable via BODY_LIMIT for future endpoints if needed; the cap protects
// the gateway from a misbehaving client OOM'ing the JSON parser.
const BODY_LIMIT = process.env.BODY_LIMIT || "1mb";

// Middleware (order matters):
//   1. request-id — first, so every subsequent log/error carries the id
//   2. helmet     — security headers
//   3. cors       — origin check (sets Access-Control-Allow-Origin)
//   4. cookies    — parses Set-Cookie for refresh-token route
//   5. body parsers — capped at BODY_LIMIT
//   6. request log — logs every request on `finish`
app.use(requestIdMiddleware);
app.use(helmet());
app.use(
  cors({
    origin: APP_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));
app.use(requestLoggerMiddleware);

// Health Check (logger skips this path so Fly probes don't spam logs).
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", routes);

// Global Error Handler.
//
// Sanitises 5xx responses: we log the full error server-side (with the
// request-id) and only return a generic message + the request-id to the
// client. Internals (stack traces, ORM error text, file paths) must never
// leak through here.
//
// 4xx errors are intentional API contract responses — we pass them through
// verbatim so callers can act on the message. Body-parser raises 413 with
// the original error class, which we handle the same way.
app.use(
  (
    err: { status?: number; statusCode?: number; message?: string; name?: string; type?: string },
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = err.status || err.statusCode || 500;
    const requestId = req.id;

    if (status >= 500) {
      // Log everything we know — this is the only place internals are recorded.
      logger.error("unhandled error", {
        requestId,
        path: req.originalUrl || req.url,
        method: req.method,
        name: err.name,
        message: err.message,
        // err is unknown shape; winston serialises stack via its `errors` format.
        err,
      });
      res.status(500).json({
        message: "Internal Server Error",
        requestId,
      });
      return;
    }

    // Body-parser size error — surface a clear message rather than letting
    // its ad-hoc HTML response leak through.
    if (err.type === "entity.too.large") {
      res.status(413).json({
        message: `Request body too large. Limit is ${BODY_LIMIT}.`,
        requestId,
      });
      return;
    }

    // 4xx pass-through. Don't leak the error class name (some libraries put
    // sensitive internals in `name`); just the message.
    res.status(status).json({
      message: err.message || "Bad Request",
      requestId,
    });
  },
);

// Bind explicitly to 0.0.0.0 so Fly's proxy (on a separate IPv4-mapped interface
// inside the Firecracker VM) can reach us. Without an explicit host, Node's
// default bind on some container runtimes leaves the IPv4 interface unreachable
// and Fly errors with "[PM05] failed to connect to machine".
app.listen(port, "0.0.0.0", () => {
  logger.info(`🚀 API Gateway listening on 0.0.0.0:${port}`);
});

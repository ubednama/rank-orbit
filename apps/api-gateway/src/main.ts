import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { routes } from "./routes";
import { logger } from "./logger";
import { startWorker } from "./worker";
import { startNotificationsWorker } from "./emails/notifications.worker";

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

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: APP_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", routes);

// Global Error Handler
app.use(
  (
    err: { status?: number; message?: string; name?: string },
    req: express.Request,
    res: express.Response,

    _next: express.NextFunction,
  ) => {
    logger.error("Express Global Error:", err);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
      error: err.name || "Error",
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

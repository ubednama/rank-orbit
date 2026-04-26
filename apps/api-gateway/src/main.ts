// dotenv must load BEFORE any module that reads process.env at import time
// (e.g., libs/db reads DATABASE_URL when imported).
import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { routes } from "./routes";
import { logger } from "./logger";
import { startWorker } from "./worker";

// Fail fast on missing or weak JWT_SECRET — auth is security-critical.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET env var must be set and at least 32 characters");
}

startWorker();

const app = express();
const port = parseInt(process.env.API_GATEWAY_PORT || "3333", 10);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:4200",
      "http://localhost:3000",
      "http://localhost:5000",
      "https://rank-orbit.vercel.app",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  }),
);
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

app.listen(port, () => {
  logger.info(`🚀 API Gateway running on: http://localhost:${port}/api`);
});

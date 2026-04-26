import { Router, Request, Response } from "express";
import { AuditService } from "./audit.service";
import { CrawlRequestDto } from "@shared/types";
import { AnalyzeRequestDto } from "./dto/analyze-request.dto";
import { optionalAuthMiddleware } from "../middleware/auth.middleware";
import { issueSseToken, consumeSseToken } from "./sse-token.service";
import { logger } from "../logger";

export const auditRouter = Router();
const auditService = new AuditService();

// Hard cap on a single SSE stream. Reduced from 5min in phase 0; phase 1 will
// audit timeouts end-to-end (per handbook/06-phases.md).
const STREAM_TIMEOUT_MS = 5 * 60 * 1000;

function getIdentity(req: Request): { identifier: string; isAnonymous: boolean } {
  if (req.user?.sub) {
    return { identifier: req.user.sub, isAnonymous: false };
  }
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return { identifier: ip, isAnonymous: true };
}

auditRouter.post("/crawl", async (req: Request, res: Response) => {
  try {
    const dto = req.body as CrawlRequestDto;
    const result = await auditService.crawl(dto);
    res.status(201).json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: msg });
  }
});

auditRouter.post("/analyze", async (req: Request, res: Response) => {
  try {
    const dto = req.body as AnalyzeRequestDto;
    const result = await auditService.analyze(dto);
    res.status(201).json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: msg });
  }
});

/**
 * Authenticates (optional Bearer), validates URL, checks quota, issues an SSE token.
 * Client opens GET /audit/stream?sse_token=<token> next.
 */
auditRouter.post(
  "/start",
  optionalAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!url) {
      res.status(400).json({ message: "URL is required" });
      return;
    }

    const { identifier, isAnonymous } = getIdentity(req);
    const exceeded = await auditService.hasUsedAiQuota(identifier, isAnonymous);
    if (exceeded) {
      res.status(429).json({
        message: isAnonymous
          ? "You've used your free audit. Sign in to run more (3/month)."
          : "Monthly audit limit reached (3/month). Upgrade for more.",
        code: "QUOTA_EXCEEDED",
        requiresSignIn: isAnonymous,
      });
      return;
    }

    try {
      const { token, expiresAt } = await issueSseToken({ identifier, isAnonymous, url });
      res.status(201).json({ sse_token: token, expires_at: expiresAt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to issue sse_token: ${msg}`);
      res.status(503).json({ message: "Audit service temporarily unavailable" });
    }
  },
);

/**
 * Backward-compat HEAD probe. Honors Bearer if sent so signed-in users see their tier.
 * Prefer POST /audit/start in new clients.
 */
auditRouter.head(
  "/stream",
  optionalAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { identifier, isAnonymous } = getIdentity(req);
    const exceeded = await auditService.hasUsedAiQuota(identifier, isAnonymous);
    if (exceeded) {
      res.status(429).set("X-Rate-Limited", "ai-quota").end();
    } else {
      res.status(200).end();
    }
  },
);

auditRouter.get("/stream", async (req: Request, res: Response): Promise<void> => {
  const sseToken = typeof req.query.sse_token === "string" ? req.query.sse_token : "";
  if (!sseToken) {
    res.status(401).json({ message: "sse_token required" });
    return;
  }

  const payload = await consumeSseToken(sseToken);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired sse_token" });
    return;
  }

  const { identifier, isAnonymous, url } = payload;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 20000);

  const timeout = setTimeout(() => {
    res.write(
      `retry: 3000\ndata: ${JSON.stringify({
        type: "error",
        message: "Request timed out after 5 minutes.",
      })}\n\n`,
    );
    res.end();
  }, STREAM_TIMEOUT_MS);

  const cleanup = () => {
    clearInterval(keepAlive);
    clearTimeout(timeout);
  };

  const sendEvent = (event: { data: unknown }) => {
    res.write(`retry: 3000\ndata: ${JSON.stringify(event.data)}\n\n`);
  };

  const onComplete = () => {
    cleanup();
    res.end();
  };

  auditService.streamAudit(url, sendEvent, onComplete, {
    ip: isAnonymous ? identifier : "n/a",
    isAnonymous,
    userId: isAnonymous ? undefined : identifier,
  });

  req.on("close", () => {
    cleanup();
    logger.info(`Stream connection closed for: ${url}`);
  });
});

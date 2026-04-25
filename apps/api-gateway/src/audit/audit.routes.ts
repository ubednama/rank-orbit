import { Router, Request, Response } from "express";
import { AuditService } from "./audit.service";
import { CrawlRequestDto } from "@shared/types";
import { AnalyzeRequestDto } from "./dto/analyze-request.dto";
import { logger } from "../logger";

export const auditRouter = Router();
const auditService = new AuditService();

// Hard cap on a single SSE stream. Reduced from 5min in phase 0; phase 1 will
// audit timeouts end-to-end (per handbook/06-phases.md).
const STREAM_TIMEOUT_MS = 5 * 60 * 1000;

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

// HEAD probe: client uses this to pre-check 429 before opening EventSource.
// Anonymous-only until phase 2 DIY JWT (auth was removed during the v2 rebuild).
auditRouter.head("/stream", async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const exceeded = await auditService.hasUsedAiQuota(ip, true);
  if (exceeded) {
    res.status(429).set("X-Rate-Limited", "ai-quota").end();
  } else {
    res.status(200).end();
  }
});

auditRouter.get("/stream", async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ message: "URL is required" });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";

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
    ip,
    isAnonymous: true,
  });

  req.on("close", () => {
    cleanup();
    logger.info(`Stream connection closed for: ${url}`);
  });
});

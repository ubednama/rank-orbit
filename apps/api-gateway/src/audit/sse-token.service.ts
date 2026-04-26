import Redis from "ioredis";
import crypto from "crypto";
import { logger } from "../logger";

// SSE auth token (per handbook/03-system-design.md "sse_token pattern").
// Browser EventSource cannot send Authorization headers, so the gateway issues a
// short-lived single-use token after authenticating the POST /audit/start request.
// The token is the only thing on the SSE URL — the user's JWT never enters the URL.

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const TOKEN_TTL_SECONDS = 60;

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on("error", (err) => {
  logger.warn(`SSE-token Redis error: ${err.message}`);
});

export interface SseTokenPayload {
  identifier: string;
  isAnonymous: boolean;
  url: string;
}

export async function issueSseToken(
  payload: SseTokenPayload,
): Promise<{ token: string; expiresAt: number }> {
  const token = crypto.randomBytes(32).toString("hex");
  await redis.set(`sse_token:${token}`, JSON.stringify(payload), "EX", TOKEN_TTL_SECONDS);
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return { token, expiresAt };
}

/**
 * Atomically reads + deletes the token. Single-use.
 * Returns null if token is missing, expired, or already consumed.
 */
export async function consumeSseToken(token: string): Promise<SseTokenPayload | null> {
  if (!token || typeof token !== "string") return null;
  const data = await redis.getdel(`sse_token:${token}`);
  if (!data) return null;
  try {
    return JSON.parse(data) as SseTokenPayload;
  } catch {
    return null;
  }
}

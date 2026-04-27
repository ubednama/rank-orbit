import { Resend } from "resend";
import sgMail from "@sendgrid/mail";
import { render } from "@react-email/render";
import Redis from "ioredis";
import type { ReactElement } from "react";
import { logger } from "../logger";

/**
 * Two-provider email sender with a Redis-backed circuit breaker.
 *
 * Try Resend first. On 5xx / network failure, set
 * `email:provider-down:resend` in Redis (5-min TTL) and fall back to
 * SendGrid. While the flag is set, all sends route directly to SendGrid
 * — no wasted requests to a known-down provider.
 *
 * No periodic health checks: real send errors set the flag, the TTL
 * clears it, the next send retries Resend organically.
 *
 * Per ADR 013: Resend primary (3k/month free), SendGrid fallback
 * (100/day free, no credit card). EMAIL_FROM is required.
 */

const RESEND_DOWN_KEY = "email:provider-down:resend";
const RESEND_DOWN_TTL_SECONDS = 5 * 60;

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  lazyConnect: false,
});
redis.on("error", (err) => {
  logger.warn(`Email circuit-breaker Redis error: ${err.message}`);
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Rank Orbit <noreply@rank-orbit.local>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
if (SENDGRID_API_KEY) sgMail.setApiKey(SENDGRID_API_KEY);

export interface SendEmailInput {
  to: string;
  subject: string;
  template: ReactElement;
  /** Optional plain-text fallback. If omitted, the rendered HTML is used. */
  text?: string;
}

export interface SendEmailResult {
  provider: "resend" | "sendgrid";
  messageId?: string;
}

class EmailDeliveryError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

async function isResendDown(): Promise<boolean> {
  try {
    return Boolean(await redis.get(RESEND_DOWN_KEY));
  } catch {
    return false; // Redis down → don't pretend Resend is down
  }
}

async function markResendDown(): Promise<void> {
  try {
    await redis.set(RESEND_DOWN_KEY, "1", "EX", RESEND_DOWN_TTL_SECONDS);
    logger.warn(
      `Email circuit breaker tripped — routing to SendGrid for ${RESEND_DOWN_TTL_SECONDS}s`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to set circuit-breaker flag: ${msg}`);
  }
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<SendEmailResult> {
  if (!resend) throw new EmailDeliveryError("RESEND_API_KEY not configured", false);
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
  if (result.error) {
    // Resend returns 4xx for permanent issues, 5xx via thrown errors typically
    const status = (result.error as { statusCode?: number }).statusCode ?? 0;
    const retryable = status >= 500 || status === 429;
    throw new EmailDeliveryError(`Resend error ${status}: ${result.error.message}`, retryable);
  }
  return { provider: "resend", messageId: result.data?.id };
}

async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<SendEmailResult> {
  if (!SENDGRID_API_KEY) throw new EmailDeliveryError("SENDGRID_API_KEY not configured", false);
  const [response] = await sgMail.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
  return { provider: "sendgrid", messageId: response.headers["x-message-id"] as string };
}

/**
 * Send an email using the active provider. Throws on permanent failure;
 * retryable failures are surfaced to the caller (BullMQ will retry).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const html = await render(input.template);
  const text = input.text ?? (await render(input.template, { plainText: true }));

  // Quick path: known-down → straight to SendGrid
  if (await isResendDown()) {
    logger.info(`[email] Resend marked down, using SendGrid → ${input.to}`);
    return sendViaSendGrid(input.to, input.subject, html, text);
  }

  // Try Resend
  try {
    const result = await sendViaResend(input.to, input.subject, html, text);
    logger.info(`[email] Sent via ${result.provider} → ${input.to}`);
    return result;
  } catch (err) {
    const isRetryable = err instanceof EmailDeliveryError ? err.retryable : true; // network errors are retryable
    if (!isRetryable) {
      // Permanent (e.g., misconfigured API key, blocked sender) — don't fall back.
      throw err;
    }

    // Trip the breaker and fall back
    await markResendDown();
    logger.warn(
      `[email] Resend failed (${err instanceof Error ? err.message : err}) — falling back to SendGrid`,
    );
    return sendViaSendGrid(input.to, input.subject, html, text);
  }
}

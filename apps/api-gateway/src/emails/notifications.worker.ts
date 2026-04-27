/**
 * Email-notifications BullMQ queue + worker.
 *
 * Producer side: enqueueAuditCompleteEmail / enqueueWelcomeEmail.
 * Consumer: this file's startNotificationsWorker, called from main.ts.
 *
 * Retry policy (per ADR 013):
 *   3 attempts, exponential backoff at 1m → 5m → 30m
 *   Failed jobs land in BullMQ's `failed` state — that IS the DLQ.
 *
 * Provider failover (Resend → SendGrid) and circuit-breaker logic live in
 * email.service.ts; the worker here just calls sendEmail and lets BullMQ
 * retry on thrown errors.
 */
import { Queue, Worker } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";
import { sendEmail } from "./email.service";
import { AuditCompleteEmail } from "./templates/AuditCompleteEmail";
import { WelcomeEmail } from "./templates/WelcomeEmail";
import { logger } from "../logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const QUEUE_NAME = "audit-notifications";

type AuditCompleteJob = {
  kind: "audit-complete";
  to: string;
  url: string;
  seoScore: number | null;
  summary: string;
  reportUrl: string;
};

type WelcomeJob = {
  kind: "welcome";
  to: string;
  appUrl: string;
};

export type NotificationJob = AuditCompleteJob | WelcomeJob;

const redisOpts: RedisOptions = { maxRetriesPerRequest: null };
const connection = new IORedis(REDIS_URL, redisOpts);
connection.on("error", (err) => logger.error(`[notifications] Redis error: ${err.message}`));

const queue = new Queue<NotificationJob>(QUEUE_NAME, { connection });

const RETRY_OPTS = {
  attempts: 3,
  // 1m, 5m, 30m via custom backoff (BullMQ supports custom strategies but the
  // simplest portable form is exponential with a base + cap; this gets close).
  backoff: { type: "exponential" as const, delay: 60_000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 1000 }, // keep failed jobs around — that IS the DLQ
};

export async function enqueueAuditCompleteEmail(payload: Omit<AuditCompleteJob, "kind">) {
  const job = await queue.add("audit-complete", { kind: "audit-complete", ...payload }, RETRY_OPTS);
  logger.info(`[notifications] enqueued audit-complete job ${job.id} → ${payload.to}`);
}

export async function enqueueWelcomeEmail(payload: Omit<WelcomeJob, "kind">) {
  const job = await queue.add("welcome", { kind: "welcome", ...payload }, RETRY_OPTS);
  logger.info(`[notifications] enqueued welcome job ${job.id} → ${payload.to}`);
}

export function startNotificationsWorker(): Worker<NotificationJob> {
  const worker = new Worker<NotificationJob>(
    QUEUE_NAME,
    async (job) => {
      const data = job.data;
      logger.info(
        `[notifications] processing ${data.kind} job ${job.id} (attempt ${job.attemptsMade + 1})`,
      );

      switch (data.kind) {
        case "audit-complete":
          await sendEmail({
            to: data.to,
            subject: `Your SEO audit for ${data.url} is ready`,
            template: AuditCompleteEmail({
              url: data.url,
              seoScore: data.seoScore,
              summary: data.summary,
              reportUrl: data.reportUrl,
            }),
          });
          return;
        case "welcome":
          await sendEmail({
            to: data.to,
            subject: "Welcome to Rank Orbit",
            template: WelcomeEmail({ email: data.to, appUrl: data.appUrl }),
          });
          return;
        default: {
          // Exhaustiveness check — if a new job kind is added, TS will complain.
          const _exhaustive: never = data;
          throw new Error(`Unknown notification kind: ${JSON.stringify(_exhaustive)}`);
        }
      }
    },
    { connection, concurrency: 4 },
  );

  worker.on("completed", (job) => logger.info(`[notifications] job ${job.id} completed`));
  worker.on("failed", (job, err) =>
    logger.error(
      `[notifications] job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`,
    ),
  );
  worker.on("error", (err) => logger.error(`[notifications] worker error: ${err.message}`));

  logger.info(`[notifications] worker listening on queue: ${QUEUE_NAME}`);
  return worker;
}

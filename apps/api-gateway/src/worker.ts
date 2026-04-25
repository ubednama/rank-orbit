import { Queue, QueueEvents, Worker } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";
import axios from "axios";
import type { AiAnalysisResponse } from "@shared/types";
import type { AnalyzeRequestDto } from "./audit/dto/analyze-request.dto";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000/api";
const QUEUE_NAME = "ai-analysis";
const JOB_WAIT_TIMEOUT_MS = 60_000;
const AXIOS_TIMEOUT_MS = 50_000;

// BullMQ requires `maxRetriesPerRequest: null` on the connection used for blocking ops.
const redisOpts: RedisOptions = { maxRetriesPerRequest: null };
const connection = new IORedis(REDIS_URL, redisOpts);

connection.on("error", (err) => logger.error(`[Redis/BullMQ] connection error: ${err.message}`));

export const aiQueue = new Queue<AnalyzeRequestDto, AiAnalysisResponse>(QUEUE_NAME, { connection });
const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

/** Publish an AI analysis job and wait for the worker to finish it. */
export async function publishAnalysisJob(data: AnalyzeRequestDto): Promise<AiAnalysisResponse> {
  const job = await aiQueue.add("analyze", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  });

  logger.info(`[BullMQ] enqueued ai-analysis job ${job.id}`);
  return await job.waitUntilFinished(queueEvents, JOB_WAIT_TIMEOUT_MS);
}

/**
 * Start the worker that consumes ai-analysis jobs and calls the AI service over HTTP.
 *
 * Phase 0: producer + consumer co-located in the gateway process (mirrors the legacy
 * RabbitMQ-RPC topology). Per ADR 003 implementation note, moving the consumer into
 * ai-service (so the worker IS the AI service) is a future cleanup if HF Spaces' single-
 * process deploy model can be worked around.
 */
export function startWorker(): Worker<AnalyzeRequestDto, AiAnalysisResponse> {
  const worker = new Worker<AnalyzeRequestDto, AiAnalysisResponse>(
    QUEUE_NAME,
    async (job) => {
      logger.info(`[BullMQ] processing job ${job.id} (attempt ${job.attemptsMade + 1})`);
      const response = await axios.post<AiAnalysisResponse>(`${AI_SERVICE_URL}/analyze`, job.data, {
        timeout: AXIOS_TIMEOUT_MS,
      });
      return response.data;
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", (job) => logger.info(`[BullMQ] job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`[BullMQ] job ${job?.id} failed: ${err.message}`));
  worker.on("error", (err) => logger.error(`[BullMQ] worker error: ${err.message}`));

  logger.info(`[BullMQ] worker listening on queue: ${QUEUE_NAME}`);
  return worker;
}

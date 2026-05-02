import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { crawlRoutes } from "./crawl/crawl.routes";
import { logger } from "./logger";

// Disable Fastify's built-in pino logger — use shared Winston logger instead
const server = Fastify({ logger: false });

// Configure Zod for validation
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Middleware
server.register(cors, {
  origin: ["http://localhost:4200", "http://localhost:5000"],
  credentials: true,
});
server.register(helmet);

// Hook Fastify lifecycle into Winston
server.addHook("onRequest", (request, reply, done) => {
  logger.info(`--> ${request.method} ${request.url}`);
  done();
});

server.addHook("onResponse", (request, reply, done) => {
  logger.info(`<-- ${request.method} ${request.url} ${reply.statusCode}`);
  done();
});

server.addHook("onError", (request, reply, error, done) => {
  logger.error(`[Fastify Error] ${request.method} ${request.url}: ${error.message}`);
  done();
});

// Global Prefix
server.register(
  async (api) => {
    // Health Check
    api.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    // Routes
    api.register(crawlRoutes, { prefix: "/crawl" });
  },
  { prefix: "/api" },
);

const start = async () => {
  try {
    // Default 4000 locally (conventional Node.js dev port — Apollo Server,
    // Phoenix). Production binds via fly.toml internal_port.
    const port = parseInt(process.env.CRAWLER_PORT || "4000");
    await server.listen({ port, host: "0.0.0.0" });
    logger.info(`🚀 Crawler Service running on: http://localhost:${port}/api`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to start Crawler Service: ${msg}`);
    process.exit(1);
  }
};

start();

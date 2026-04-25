# api-gateway

Express 5 service that fronts the audit pipeline. Receives URLs from the client, calls the crawler, queues AI work via BullMQ, and streams results back via SSE.

See [../../handbook/02-architecture.md](../../handbook/02-architecture.md) for placement in the system.

## Status

- **Ported from legacy 2026-04-25** (Phase 0 / v2 rebuild). Clerk removed (anonymous-only until phase 2 DIY JWT). RabbitMQ replaced with BullMQ on Upstash Redis (ADR 003). NxAppWebpackPlugin replaced with raw webpack.
- Auth is **stubbed** — `/api/auth/me` returns 501. `optionalAuthMiddleware` is a no-op pass-through. Phase 2 will implement real DIY JWT per [../../handbook/03-system-design.md](../../handbook/03-system-design.md#auth--diy-with-jsonwebtoken).
- Go migration is phase 3 per ADR 001.

## Quickstart

```sh
make install     # via workspace root pnpm install
cp .env.example .env.local   # then fill in REDIS_URL + DATABASE_URL
make dev         # tsx watch src/main.ts (no build step in dev)
make build       # webpack bundle to ../../dist/apps/api-gateway
make start       # node main.js (after build)
```

## Endpoints

- `GET /api/health` → `{ status, timestamp }`
- `GET /api/auth/me` → 501 (phase 2)
- `POST /api/audit/crawl` → orchestrates crawler call
- `POST /api/audit/analyze` → enqueues AI job, awaits result
- `HEAD /api/audit/stream?url=...` → 200 / 429 (rate-limit pre-check)
- `GET /api/audit/stream?url=...` → SSE stream of audit events

## Phase 1 follow-ups (per [06-phases.md](../../handbook/06-phases.md#phase-1--mvp-launch-on-free-tier))

- SSRF guards on URL inputs
- Body size limits (50mb → 100kb)
- Tighten timeout cascade (gateway 30s → crawler 25s → Browserless 20s; gateway-AI 60s → ai-service 50s → Gemini 45s)
- AbortController propagated through SSE → crawler axios call → BullMQ job
- `sse_token` pattern (replaces JWT-in-querystring even for anon)
- Single-flight lock for duplicate concurrent requests on same URL
- Negative cache for failed/4xx URLs (1h TTL)
- Skip persisting synthetic AI failure responses (don't pollute DB)
- Generic error responses (no `err.message` verbatim); request-id in every response
- Explicit helmet + CORS configs (not defaults)
- Internal `X-Internal-Token` HMAC between gateway → crawler and gateway → ai-service
- Per-operation try/catch on Redis (replace sticky `isRedisAvailable` flag)

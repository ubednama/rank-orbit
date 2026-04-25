# 07 — v2 TODO

Things intentionally dropped during the NestJS → Express refactor (and other shortcuts), to be restored in phase 1 or 2 unless otherwise noted.

For each: **what was dropped**, **why**, **cost**, **when to restore**.

---

## From the NestJS → Express refactor

### env validation

- **Was**: `apps/api-gateway/src/app/env.validation.ts` with class-validator decorators
- **Why dropped**: speed; direct `process.env` reads are simpler for now
- **Cost**: typo'd env var = silent runtime failure; no fail-fast on boot
- **Restore in**: phase 2, with Zod (not class-validator). One `env.ts` per service that exports a typed, validated config object. App refuses to boot if invalid.

### Request logging middleware

- **Was**: `apps/api-gateway/src/logging/logging.module.ts`
- **Why dropped**: speed; ad-hoc Winston calls in handlers were enough to ship
- **Cost**: no per-request log line with method/path/status/duration; debugging requires reading multiple log lines
- **Restore in**: phase 2, with `pino-http` (Node) and `structlog` (Python). Include `X-Request-Id`.

### Centralized exception filter

- **Was**: `apps/api-gateway/src/common/filters/http-exception.filter.ts`
- **Why dropped**: replaced with a 13-line global Express handler in [main.ts:39-53](../apps/api-gateway/src/main.ts#L39-L53)
- **Cost**: error responses can leak `err.message` verbatim (Step 2 finding 🔴 #6)
- **Restore in**: **phase 1** (this is critical). Sanitize messages, attach request-id, never leak stack/path.

### Throttler decorator

- **Was**: `@nestjs/throttler` with `@Throttle()` per route
- **Why dropped**: replaced with service-layer `RateLimitService` for AI quota only
- **Cost**: no per-route HTTP rate limit; the only limit is the AI quota check (Step 2 finding 🟡 — HEAD endpoint unrate-limited)
- **Restore in**: phase 2, as Express middleware (`express-rate-limit` backed by Redis) with per-route configs.

### Module structure

- **Was**: NestJS modules (AuditModule, AuthModule, etc.)
- **Why dropped**: Express doesn't have a module system; flat folder per concern is simpler
- **Cost**: nothing structural — Express idioms work fine
- **Restore in**: never (Express); design proper packages in Go gateway (phase 3)

---

## Other deferrals

### Request correlation ID

- **Why deferred**: tied to observability work
- **Cost**: can't trace a single audit across services in logs
- **Restore in**: phase 2 (with logs/Sentry/uptime work)

### Structured JSON logs

- **Why deferred**: stdout strings work for dev; Better Stack parsing needed first
- **Cost**: production logs hard to query
- **Restore in**: phase 2

### Tests

- **Why deferred**: shipping speed; tests for unstable architecture get rewritten anyway
- **Cost**: regressions ship; bug-then-fix cycle longer
- **Restore in**: phase 2, target 30% coverage on critical paths (auth, SSRF, rate limit, JSON repair)

### ~~Schema drift fix (`technical_analysis`)~~ ✅ DONE 2026-04-25

- **Why deferred**: noticed late in the refactor
- **Cost**: contract incoherent; client may render stale field
- **Restored in**: phase 0 — Python `AIResponse` and TS `AIAnalysis` already excluded the field; removed from ai_service.py error returns + dropped misleading prompt instruction; refactored client `AIInsightsSection` to take `technicalAnalysis` as a separate prop sourced from the crawler payload (per ADR 006)

### SSRF guards

- **Why deferred**: shipping the cool flow first
- **Cost**: 🔴 cloud-credential exfil risk if deployed on AWS/GCP/Azure
- **Restore in**: **phase 1** (must ship before public deploy)

### Body size limits

- **Why deferred**: copy-pasted 50mb from a tutorial
- **Cost**: 🔴 trivial OOM DoS
- **Restore in**: **phase 1**

### Generic error responses

- **Why deferred**: see "centralized exception filter" above
- **Cost**: 🔴 leaks internals
- **Restore in**: **phase 1**

### Redis fallback strategy

- **Why deferred**: `isRedisAvailable` flag was a quick hack
- **Cost**: 🔴 sticky-false bug; silent slowdown
- **Restore in**: **phase 1**; replace with per-operation try/catch

### Tighter timeout cascade

- **Why deferred**: each timeout was set in isolation
- **Cost**: 🟡 wasted compute on abandoned requests
- **Restore in**: **phase 1**

### SSE retry semantics

- **Why deferred**: `retry: 3000` was copy-paste from MDN
- **Cost**: 🟡 client auto-reconnects after a permanent failure, looks broken
- **Restore in**: **phase 1**

### SSE cleanup on client disconnect

- **Why deferred**: fire-and-forget was easier; not noticed until audit
- **Cost**: 🔴 every leaked stream pins resources (timers, axios, queue consumers, AI work)
- **Restore in**: **phase 1** (AbortController throughout)

### unit + integration tests

- See "Tests" above

---

## Pre-launch checklist (separate from phases — do before going public)

- [ ] Rotate all credentials that have ever appeared in `.env`, in chats, or in commits (Supabase DB URL + direct URL, any LLM keys, Clerk keys — Clerk is now fully removed)
- [ ] Set up GitHub Environments with prod secrets (see [11-deployment.md](11-deployment.md#secrets-management))
- [ ] Verify nothing sensitive in [data/](../data/) (Postman collection is fine if no creds inside)
- [ ] Public README on GitHub repo (project description, demo URL, screenshots, tech stack)
- [ ] Status page link in client footer
- [ ] Privacy/Terms pages (if collecting user emails for accounts)
- [ ] Run [11-deployment.md](11-deployment.md) end-to-end against a fresh laptop
- [ ] Confirm Browserless free-tier alarm is set (1k units/mo)

---

## How to use this doc

When you defer something during a session:

1. Add an entry here with **what / why / cost / restore-in**
2. Mention it in the SESSION_LOG entry
3. If it's 🔴, also add it to the next-phase checklist in [06-phases.md](06-phases.md)

When you restore something:

1. Strike through here (don't delete — record that it was once a known gap)
2. Mention in SESSION_LOG

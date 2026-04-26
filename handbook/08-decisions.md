# 08 — Decisions (ADRs)

Append-only architectural decision records. Each ADR has: **date, status, context, decision, consequences, alternatives**.

When superseding an old ADR, add a new ADR linking back; do not edit the old one.

---

## ADR 001 — Express now, Go later (gateway runtime)

**Date**: 2026-04-25
**Status**: Accepted

### Context

Gateway was NestJS; user is mid-refactor to Express to "build fast"; user plans to rewrite in Go for the portfolio narrative and performance.

### Decision

- Phase 0–2: Express 5 (current state)
- Phase 3+: Go (chi router, fresh design — not a line-by-line port)

### Consequences

- Phase 2 work invests in Express patterns that will be rewritten in Go. Acceptable: same patterns (auth middleware, rate limit, SSE cleanup) are easier to design twice and get right than to over-design in TS for portability.
- v2 TODO items (env validation, request logging, exception filter, throttler) are restored in Express in phase 2 and re-implemented in Go in phase 3 with idioms native to each.

### Alternatives considered

- **Skip Express, go straight to Go**: phase 1 would slip 2–3 weeks; not worth it. The Express version is already mostly working.
- **Stay on Express forever**: loses the portfolio "I migrated to Go" story; misses the chance to demonstrate Go competence.

---

## ADR 002 — DIY JWT (drop managed auth provider)

**Date**: 2026-04-25
**Status**: Accepted

### Context

Project was previously mid-refactor to Clerk; user prefers no managed identity provider — wants to own the auth code as a portfolio piece.

### Decision

Use `jsonwebtoken` (Node) / `golang-jwt/jwt/v5` (Go) directly. No auth provider, no Lucia, no better-auth.

- Phase 1: simple login (access token only, 30min)
- Phase 2: access (15min) + refresh (30 days, rotated, HttpOnly cookie)
- Password: argon2id, min 12 chars

### Consequences

- Carries security responsibility — every common auth mistake (timing attacks, password requirements, token revocation, session fixation, CSRF on refresh) must be handled.
- Self-checklist required for any auth-touching PR (see [00-prerequisites.md](00-prerequisites.md)).
- Demonstrates real understanding of auth fundamentals (portfolio positive).
- Self-imposed rule: no auth-related code merged without re-reading [03-system-design.md](03-system-design.md) auth section.

### Alternatives considered

- **Lucia** (lightweight, you own the schema) — would save weeks of work; looks "you built it" from the outside. Rejected: user wants the discipline.
- **better-auth** — newer, batteries included. Rejected for same reason.
- **Stay on Clerk** — proven, secure. Rejected: portfolio narrative.

### Hard rules (binding)

1. JWT never appears in URL query strings (use `sse_token` pattern for SSE)
2. Refresh tokens always rotated on use
3. Refresh tokens stored hashed in DB (never plaintext)
4. Password reset (when v3) uses single-use HMAC tokens, not JWTs
5. No "remember me" longer than refresh-token TTL

---

## ADR 003 — BullMQ on Upstash (drop RabbitMQ)

**Date**: 2026-04-25
**Status**: Accepted

### Context

Current: RabbitMQ via amqplib in an RPC pattern (per-request exclusive reply queue). Findings (Step 2 🔴 #2) showed reply-queue + consumer leaks.

### Decision

- Drop `amqplib` + RabbitMQ
- Use BullMQ on Upstash Redis (same Upstash account that handles cache)
- Pattern: `queue.add` + `job.waitUntilFinished` (replaces RPC reply queue)
- Phase 3 Go gateway: `hibiken/asynq` (Go-native BullMQ-equivalent on Redis)

### Consequences

- One fewer free tier to manage (no CloudAMQP)
- Native retries with backoff, DLQ, job priorities
- Wire-format mismatch when gateway moves to Go (asynq ≠ BullMQ wire format) — solution: standardize on asynq when phase 3 lands; AI worker keeps Python via the asynq Redis protocol (or a small adapter)

### Alternatives considered

- **CloudAMQP free tier**: 1M msg/mo + 20 connections — works but adds another vendor
- **Cloudflare Queues**: forces AI into Workers (Python doesn't run there)
- **No queue, direct HTTP gateway → ai-service**: simpler but loses retry/DLQ semantics; gateway hangs on AI slowness

### Implementation note

For phase 0, the BullMQ producer + consumer can both live in the gateway process (mirroring today's gateway-worker pattern, just with BullMQ instead of amqplib). Gateway worker pulls jobs from BullMQ and calls ai-service over HTTP. Moving the consumer into ai-service itself (so ai-service is a BullMQ worker, not an HTTP server) is a future cleanup if HF Spaces' single-process model can be worked around (supervisord, etc.) — defer to phase 2 minimum.

---

## ADR 004 — Drop Nx; use pnpm workspaces + Makefile

**Date**: 2026-04-25
**Status**: Accepted

### Context

Repo uses Nx 22.6.1. Three services in three runtimes (Node, Python, Go-future). Nx is JS-first; Python and Go are driven by `nx:run-commands` shelling out — defeats the point of Nx (no caching, no graph awareness for non-JS).

### Decision

- Drop `@nx/*` deps, `nx.json`, `.nx/`
- Keep pnpm workspaces (already configured) for JS apps + libs
- Add root `Makefile` as build entrypoint:
  - `make install` — pnpm install + per-service install (uv sync, go mod tidy)
  - `make build` — builds all services
  - `make build-<service>` — builds one service
  - `make test`, `make lint`, `make ci` — equivalents
- Per-app `Makefile` includes language-native commands (uvicorn for Python, `go build` for Go, `next build` for client)
- CI: single `make ci` step

### Consequences

- Lose Nx's affected-only builds. With 3 services this is fine.
- Lose Nx's dependency graph viz. Replace with the Mermaid diagram in [02-architecture.md](02-architecture.md).
- Saves ~150MB of `node_modules` and the `.nx/` cache directory.
- Recruiter-recognizable: pnpm + Make is how every multi-language project I'd want to work at is structured.
- Trade-off: per-service `project.json` files get replaced with per-service `Makefile`. Cleaner.

### Alternatives considered

- **Turborepo**: same JS-first problem
- **Moon (moonrepo)**: best polyglot story, language-aware caching. Rejected for recognition (Nx > Moon in recruiter eyes; if dropping recognition, Make is even more universal)
- **Bazel**: massive overkill for 3 services
- **Stay on Nx**: rejected per above

---

## ADR 005 — Browserless.io for Puppeteer

**Date**: 2026-04-25
**Status**: Accepted

### Context

crawler-service runs Puppeteer + Lighthouse locally. Puppeteer + Chromium needs ~512MB; free-tier hosts (Render 512MB, Fly 256MB shared) struggle. Concurrency cap is unbounded — DoS vector.

### Decision

- Migrate crawler-service to a thin Fastify wrapper around Browserless.io WebSocket API
- Free tier: 1k units/mo (≈ 1 audit each)
- Lighthouse runs on Browserless side
- Crawler-service still extracts metadata (cheerio) and computes readability stats

### Consequences

- Removes the hardest hosting problem (Chromium RAM)
- Per-page billing means missing `page.close()` (Step 2 finding 🔴) becomes financially relevant — fix in phase 1
- 1k/mo free quota covers portfolio traffic; alarm at 80% via Better Stack monitor
- SSRF guards still required at gateway and crawler — Browserless will navigate where you tell it (does not validate)

### Alternatives considered

- **Self-host on Fly with paid scale-to-zero machine**: $5+/mo; defeats free-tier goal
- **Render 512MB free**: works but cold starts; OOM under any concurrency
- **Vercel + @sparticuz/chromium**: Vercel function = 10s timeout; Lighthouse runs longer

---

## ADR 006 — `technical_analysis` from crawler only (resolve schema drift)

**Date**: 2026-04-25
**Status**: Accepted

### Context

Three-way drift: ai-service `AIResponse` schema removed `technical_analysis`; crawler-service still emits it; gateway persists it; client may consume it. User asked which way is industry-standard.

### Decision

- `technical_analysis` is a derived view of Lighthouse metrics (Performance, Accessibility, LCP, CLS, TBT, FCP, Speed Index → each `{ value, status }`)
- Crawler computes it from the Lighthouse report, returns it in `CrawlResponse`
- AI never receives it as input (it can read the raw `lighthouse_metrics` if needed; the derived view is for UI rendering)
- AI never produces it (the AI's role is interpretation, not measurement)
- Single source of truth: crawler

### Consequences

- ai-service schema modification (remove `technical_analysis` from `AIResponse`) is correct
- Update `apps/ai-service/app/services/ai_service.py` — also drop `technical_analysis` from the prompt input shape
- Update `libs/shared/types/src/lib/crawler.interface.ts` — `AIAnalysis` should not have a `technical_analysis` field; only `CrawlResponse` (or a sub-type used by it)
- Gateway persists `technical_analysis` from the crawler payload, not the AI payload
- Client reads it from the `crawler` SSE event, not the `ai` event

### Industry-standard rationale

Separation of measurement from interpretation is a core principle (think: instruments vs. doctors). Lighthouse is the instrument; AI is the interpreter. Mixing them invites the AI to fabricate metric values, which kills audit trustworthiness.

---

## ADR 007 — Postgres + Drizzle (no Mongo, no Prisma return)

**Date**: 2026-04-25
**Status**: Accepted

### Context

User asked SQL vs NoSQL. Repo just migrated Prisma → Drizzle.

### Decision

- Stay on Postgres (Supabase free tier)
- Stay on Drizzle for Node services
- Use pgx + sqlc for the Go gateway in phase 3 (consume Drizzle's generated SQL migrations — single source of schema truth)

### Consequences

- JSONB columns handle the document-heavy fields (`metadata`, `lighthouse_metrics`, etc.) without giving up relational integrity
- Phase 2 auth (users + refresh tokens) is naturally relational
- Drizzle migrations + sqlc means schema is owned in one place (TypeScript) and consumed in two (TS via Drizzle, Go via sqlc-generated types)

### Alternatives considered

- **MongoDB**: doc-heavy schema fits, but the relational story for auth is awkward; Atlas free tier silently throttles
- **Prisma return**: cold-start heavy, just left it
- **Kysely**: lighter than Drizzle but adds churn; Drizzle is fine

---

## ADR 008 — Hugging Face Spaces for ai-service

**Date**: 2026-04-25
**Status**: Accepted

### Context

Need free hosting for FastAPI + LangChain + Gemini. Render 512MB cold-starts. Fly.io needs Dockerfile + paid scale-to-zero for true idle.

### Decision

- Deploy ai-service to HF Spaces (Docker SDK)
- Public URL — protect with `X-Internal-Token` HMAC (gateway/worker only)

### Consequences

- HF Spaces stays warm (no cold start)
- Public URL means auth on `/api/analyze` is mandatory (Step 2 finding 🔴 #1)
- Free tier: 16GB RAM, 2 vCPU shared, persistent (within reason)
- Failure mode: Space sleeps after long inactivity; first request wakes it (~30s)

### Alternatives considered

- **Render free**: cold starts hurt; ephemeral logs
- **Fly.io free**: needs Docker; auto-stop machines have wake latency
- **Modal**: pay-per-use; free credits run out

---

## ADR 009 — Vercel for client

**Date**: 2026-04-25
**Status**: Accepted (status quo)

### Context

Already on Vercel.

### Decision

Stay on Vercel. Project envs for `NEXT_PUBLIC_GATEWAY_URL` and any client-safe vars.

### Consequences

- Vercel's edge cache handles `Cache-Control` on static assets and ISR routes
- SSR pages run on Vercel functions (10s timeout — fine, we don't SSR audit pages)
- Free tier: 100GB bandwidth, 6000 build minutes/mo

### Alternatives considered

- **Cloudflare Pages**: cheaper at scale but Next.js App Router support has rough edges
- **Netlify**: similar to Vercel, less mindshare for Next.js

---

## ADR 010 — Better Stack + Sentry for observability

**Date**: 2026-04-25
**Status**: Accepted

### Context

Currently zero observability. Free tier required.

### Decision

- **Logs**: Better Stack tail (3GB/mo free) — JSON to stdout from each service, Better Stack ingests
- **Errors**: Sentry (5k errors/mo free) — SDK in each service with PII scrubbing
- **Uptime**: Better Stack monitors (10 monitors free) — `/api/health` per service
- **Status page**: Better Stack (free tier includes 1)
- **Tracing**: deferred to phase 3+ (Grafana Cloud Tempo free tier)

### Consequences

- Free-tier limits will bite at scale (3GB/mo is ~30M log lines — sufficient for portfolio)
- Sentry 5k errors/mo means PII scrubbing is critical (don't burn quota on noisy errors)

### Alternatives considered

- **Grafana Cloud free**: more generous logs (50GB/mo) but harder UI; tracing is its strength, not logs
- **Axiom free**: 0.5GB/mo — too tight
- **Self-host Loki + Grafana**: defeats free-tier+managed goal

---

## ADR 011 — Conventional commits, no Co-Authored-By

**Date**: 2026-04-25
**Status**: Accepted

### Context

Personal portfolio project; AI assistance is a tool, not a co-author.

### Decision

- All commits use Conventional Commits format
- **No `Co-Authored-By:` lines, ever** — not for AI, not for anyone
- Commit author is the human pushing the commit
- See [00-prerequisites.md](00-prerequisites.md) for full git rules

### Consequences

- AI tools that auto-add Co-Author lines must be configured to not do so
- Git history reads as solo work (because it is — AI is augmentation, not authorship)

---

## ADR 012 — Postgres-only audit cache with 30-day stale-read re-trigger

**Date**: 2026-04-26
**Status**: Accepted

### Context

The `Audit` table in Postgres already persists every audit, but the read path also kept a Redis copy with a 1-day TTL ([apps/api-gateway/src/audit/audit.service.ts](../apps/api-gateway/src/audit/audit.service.ts) before this ADR). Two issues with the dual-store design:

- **Two sources of truth.** The Redis copy and the Postgres row could disagree — particularly around `updatedAt` and the AI failure re-write rule (🔴 #3 from the Phase-0 audit).
- **TTL economics.** Each cached audit is ~50–300 KB (lighthouse + AI JSON). A 1-month Redis TTL would burn the Upstash 256 MB free tier on the first ~1k unique URLs. A 1-day TTL is too short for the user's stated UX goal ("serve cache for a month").
- **Hot-path latency isn't actually hot.** Audits aren't requested at sub-millisecond cadence — one user, one URL, one click. Postgres on Supabase with a `(url, updated_at)` index returns in <10 ms, well below SSE perception thresholds.

### Decision

- **Postgres is the only audit-result cache.** Drop Redis from the result-caching path entirely.
- **Freshness window: 30 days.** Cache key is the sanitized URL; a row is "fresh" iff `updated_at > now() - interval '30 days'`. Older rows are treated as a cache miss.
- **Stale-read trigger: re-run.** A miss-on-stale triggers the full crawl + AI pipeline. The new result is INSERTed as a new row. The previous row is left in place (free history for the Phase-2 dashboard; we can prune later if it ever matters).
- **Redis stays** for: BullMQ transport ([apps/api-gateway/src/worker.ts](../apps/api-gateway/src/worker.ts)), the future single-flight lock (Phase 1), and any future short-TTL coordination state. Not for audit results.

### Consequences

- Cache invalidation has one source of truth (the `updated_at` column).
- Free-tier Upstash usage drops to whatever BullMQ + future single-flight needs (~few MB).
- Read path is one DB query instead of `Redis.get → fallback → DB.select`. Code is ~70 lines shorter.
- The `auditUsage` quota check still hits Postgres; that's fine — quota is billing-adjacent and Postgres is the right home.
- **History accumulates.** Each re-audit creates a new `Audit` row. At one audit per URL per month, this is ~12 rows/URL/year — trivial. If volume grows, add a TTL pruner.
- **No Redis fallback for cache hits.** If Postgres is down, audits fail end-to-end. Acceptable for free-tier hosting where the gateway is also down with the DB.

### Alternatives considered

- **UNIQUE on `audits.url` + UPSERT on every write.** Cleaner "one row per URL" semantics. Rejected: schema migration with backfill needed; loses the implicit history that Phase 2's dashboard wants.
- **Redis as primary cache, Postgres as cold tier.** Two-store complexity for marginal latency gain; doesn't fit the user's "1-month cache" intent without a fat Upstash bill.
- **Cache JSON in `text` blob in Postgres.** No real benefit over the existing `jsonb` columns; loses query-ability.

### Hard rules (binding)

1. The audit-result cache lives in Postgres only. Adding a Redis layer requires a new ADR.
2. Freshness threshold lives in `CACHE_FRESHNESS_DAYS` in audit.service.ts; changing it requires a session-log entry stating the new value and the reason.
3. AI failure responses must NOT be persisted (per audit 🔴 #3) — this stays true after this ADR.

---

## How to add an ADR

1. Increment number (next is 013)
2. Use the template above
3. Status options: `Proposed`, `Accepted`, `Superseded by ADR XXX`, `Deprecated`
4. Never edit an Accepted ADR — supersede with a new one
5. Update [05-tech-stack.md](05-tech-stack.md) if the ADR changes the locked stack
6. Mention in [SESSION_LOG.md](SESSION_LOG.md)

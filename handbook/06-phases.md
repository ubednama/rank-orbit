# 06 — Phases

Build plan. Phase 0 is the unblocker; subsequent phases ship features.

Each phase has: **Goal**, **Scope** (with checkboxes — tick as you ship), **Done when**, **Out of scope (defer to later phase)**.

---

## Phase 0 — Stabilize and prep (~3–5 days)

**Goal**: clean up the in-flight refactor; establish the new infra primitives so phase 1 can move fast.

**Note on credentials**: Rotation is deferred to the [pre-launch checklist in 07-v2-todo.md](07-v2-todo.md#pre-launch-checklist--separate-from-phases--do-before-going-public) per user direction (rotate at end of project, not now).

**Scope**:

- [x] Delete `crawler_crash.log` (178 KB local artifact) — done 2026-04-25
- [x] Add `*.log` and `crawler_crash.log` to [.gitignore](../.gitignore) — done 2026-04-25 (data/ kept tracked; only the Postman collection lives there)
- [x] Fix `DIRECT_URL` to port 5432 (not 6543) in `apps/api-gateway/.env.example`; also fixed `PORT` → `API_GATEWAY_PORT` to match code — done 2026-04-25
- [x] Bump CI pnpm to v10 to match `package.json` — done 2026-04-25 (also bumped action-setup to v4)
- [x] Resolve `technical_analysis` schema drift (per ADR 006): pydantic `AIResponse` already excluded it; removed it from the two error-path returns in `ai_service.py` and dropped misleading prompt instruction — done 2026-04-25
- [x] Rewrite stale `apps/api-gateway-e2e` test to hit `/api/health` (the route that actually exists) — done 2026-04-25
- [x] Write Dockerfile for ai-service (HF Spaces requirement) — done 2026-04-25
- [x] Pin `requirements.txt` versions in ai-service — done 2026-04-25 (manual pin from venv inspection; `uv pip compile` migration in Phase 1)
- [x] Drop Nx (per ADR 004): wrote root `Makefile`, per-app `Makefile`, removed `nx.json`, `.nx/`, all `@nx/*` deps; CI uses `make` — done 2026-04-25 via v2 rebuild
- [x] Migrate RabbitMQ → BullMQ (per ADR 003): rewrote `apps/api-gateway/src/worker.ts` as a BullMQ Queue + Worker on ioredis; removed `amqplib` — done 2026-04-25
- [x] Remove `@clerk/*` from gateway and client (per ADR 002): clerk.service.ts deleted, auth middleware no-op, auth.routes.ts `/me` returns 501, ClerkProvider removed from layout, /login + /signup pages stubbed, useSEOAudit drops Clerk imports, /api/token deleted — done 2026-04-25
- [x] **Bonus**: full v2 rebuild — clean monorepo with no Nx, no Clerk, no RabbitMQ, raw webpack for Node services, raw `next dev/build` for client, post-Nx eslint flat config, per-app jest configs without preset. Replaced surgical-cleanup-of-legacy with parallel-rebuild-then-swap. Old tree deleted.

**Done when**: `make ci` is green locally; all four services build and start; client renders without errors against the new gateway; no mention of NestJS, Clerk, RabbitMQ in source. **✓ All four apps build clean as of 2026-04-25 (api-gateway 52.8 KiB, crawler-service 7.79 KiB, ai-service Python imports OK, client 9 routes generated).**

**Out of scope**: SSRF, DIY auth, observability, deployment.

---

## Phase 1 — MVP launch on free tier (~1–2 weeks)

**Goal**: ship the anonymous-audit experience to production on free hosting.

**Scope**:

- [ ] **SSRF guards** (per [03-system-design.md](03-system-design.md#ssrf-mitigation)) in gateway and crawler
- [ ] Crawler-service migration to **Browserless.io** (per ADR 005); gateway → crawler → Browserless WS
- [ ] **Body size limits**: gateway 100kb (was 50mb); ai-service 1mb (was unlimited)
- [ ] **Timeout cascade fix**: gateway-axios 30s → crawler 25s → Browserless 20s; gateway-AI 60s → ai-service 50s → Gemini 45s
- [ ] **SSE cleanup**: AbortController propagated through gateway; cancellation cancels in-flight crawler call + BullMQ job
- [ ] **sse_token pattern** for SSE auth (replaces JWT-in-querystring even for anon — gateway issues a short-lived signed token)
- [ ] **Single-flight lock** for duplicate concurrent requests on same URL
- [ ] **Negative cache** for failed/4xx URLs (1h TTL)
- [ ] **No synthetic AI persistence** on AI failure (per Step 2 finding); emit error, don't pollute DB
- [ ] **Generic error responses** to client (no `err.message` verbatim); request-id in every response for support
- [ ] **Helmet + CORS** explicit configs (not defaults) per service
- [ ] Internal `X-Internal-Token` HMAC between gateway → crawler and gateway → ai-service
- [ ] Deploy: client → Vercel, gateway → Fly.io, crawler → Fly.io, ai-service → HF Spaces, DB → Supabase, cache+queue → Upstash, browserless → managed (see [11-deployment.md](11-deployment.md))
- [ ] Set up **GitHub Environments** with prod secrets (see [11-deployment.md](11-deployment.md#secrets-management))
- [x] Write deployment guide — done 2026-04-25, see [11-deployment.md](11-deployment.md)

**Done when**: a fresh laptop can navigate to the public URL, paste a URL, and get an audit. End-to-end. Free tier holds up to ~100 audits/day.

**Out of scope**: user accounts, audit history, observability beyond stdout logs, paid tier.

---

## Phase 2 — Auth, history, observability (~2 weeks)

**Goal**: signed-in experience with persistent audit history; production-grade observability.

**Scope**:

- [ ] **DIY auth phase 1** (login only — see [03-system-design.md](03-system-design.md#auth--diy-with-jsonwebtoken))
  - [ ] `users` + `refresh_tokens` tables (drizzle migration)
  - [ ] argon2id password hashing
  - [ ] `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`
  - [ ] Auth middleware that verifies JWT and populates `req.user`
  - [ ] Rate limit on `/auth/login` (5/15min per IP+email)
- [ ] **DIY auth phase 2** (refresh tokens with rotation) — same window, mostly additive
  - [ ] `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/sessions`
  - [ ] HttpOnly cookie handling
  - [ ] Client interceptor for auto-refresh on 401
- [ ] **Audit history**: `GET /audits` (paginated by user); client dashboard at `/dashboard`
- [ ] **Tier enforcement**: signed-in users → 3/month limit (per `auditUsage`); UI shows quota remaining
- [ ] **Restore the v2 TODO items** from [07-v2-todo.md](07-v2-todo.md):
  - [ ] env validation (Zod) per service
  - [ ] request logging middleware (pino-http on Node, structlog on Python)
  - [ ] centralized exception filter (sanitized responses, request-id)
  - [ ] global rate-limit middleware (per-IP sanity cap)
  - [ ] structured JSON logs to stdout
- [ ] **Observability**:
  - [ ] Better Stack tail for logs
  - [ ] Sentry SDK in all three services with PII scrubbing
  - [ ] Uptime monitors on `/api/health` for each service
  - [ ] Status page (Better Stack)
- [ ] **Tests** (start writing, target 30% coverage on critical paths):
  - [ ] gateway: auth, rate limit, SSRF
  - [ ] crawler: URL validation
  - [ ] ai-service: JSON parser, prompt template

**Done when**: a user can sign up, log in, run audits, see history, log out; observability dashboards show live traffic; SLO of 99% uptime.

**Out of scope**: Go migration, multi-page audits, exports.

---

## Phase 3 — Go gateway migration (~3 weeks)

**Goal**: rewrite api-gateway in Go; both implementations in production behind a feature flag during cutover.

**Scope**:

- [ ] Scaffold `apps/api-gateway-go/` (or `apps/api-gateway/` with the Express version archived)
- [ ] Stack: Go 1.22+, chi router, pgx + sqlc (consuming Drizzle's generated migrations), `golang-jwt/jwt/v5`, `hibiken/asynq` (Go-native BullMQ-equivalent — or use BullMQ wire protocol via `go-bull`)
- [ ] Port routes incrementally:
  - [ ] `/api/health`
  - [ ] `/auth/*` (signup, login, me, refresh, logout)
  - [ ] `/audit/start`, `/audit/stream` (SSE — Go's `net/http` + `http.Flusher`)
- [ ] Side-by-side: route by `?go=1` query flag during cutover; flip default after a soak week
- [ ] Restore everything from v2 TODO that didn't make it
- [ ] OpenTelemetry tracing exported to Grafana Cloud Tempo
- [ ] Load test: gateway should handle 100 RPS sustained on a single Fly.io shared-cpu-1x

**Done when**: Express version retired; Go gateway handling 100% of traffic; tracing dashboards green.

**Out of scope**: ai-service rewrite (stays Python — Gemini ecosystem is Python-first), crawler rewrite (stays Node — Browserless SDK is JS).

---

## Phase 4 — Multi-page + scheduled audits (~3+ weeks)

**Goal**: audit a whole site (sitemap-driven), schedule re-audits, diff results over time.

**Scope** (rough — re-plan when phase 3 lands):

- [ ] Sitemap parser
- [ ] Multi-page audit job (BullMQ batch)
- [ ] Diff view (compare two audits side-by-side)
- [ ] Cron-scheduled re-audits (Cloudflare Cron Triggers free tier)
- [ ] Email notifications on score regression
- [ ] PDF / JSON export (R2 for storage)
- [ ] Stripe paid tier

**Done when**: TBD — re-plan at start of phase 4.

---

## Tracking

End each phase by:

1. Closing all phase checkboxes (or moving incompletes to next phase)
2. Writing a SESSION_LOG entry summarizing the phase
3. Tagging git: `v0.1.0` for end of phase 0, `v0.2.0` for phase 1, etc.

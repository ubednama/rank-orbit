# Session Log

Append-only. Newest entry at the top.

Format:

```markdown
## YYYY-MM-DD — <one-line title>

**Done:** what was completed this session
**Decided:** new ADRs (link to 08-decisions.md)
**Deferred:** anything pushed to 07-v2-todo.md
**Next:** what the next session should pick up
**Open questions:** anything unresolved
```

---

## 2026-04-26 — Anon-quota signin gate + SSE sse_token pattern

The branch that finally makes the auth useful: paste URL → if anon quota exceeded → redirect to /login → after sign-in, signed-in 3/month tier kicks in.

**Done**:

- **Backend** (api-gateway):
  - New [`POST /audit/start`](../apps/api-gateway/src/audit/audit.routes.ts) — runs through `optionalAuthMiddleware`, validates URL, pre-checks quota, issues a single-use `sse_token` (60s TTL) stored in Redis. Returns `{ sse_token, expires_at }` on success, or 429 with `requiresSignIn: true` for anon over quota.
  - [`GET /audit/stream`](../apps/api-gateway/src/audit/audit.routes.ts) now consumes `?sse_token=<token>` instead of taking `url` directly. Token is atomically read+deleted via `redis.getdel` (single-use). The stored payload carries `identifier`, `isAnonymous`, and `url` — the user's JWT never enters the URL (per ADR 002 hard rule #1).
  - [`HEAD /audit/stream`](../apps/api-gateway/src/audit/audit.routes.ts) kept for backward-compat; now routes through `optionalAuthMiddleware` so signed-in users see their tier.
  - `getIdentity()` helper centralizes the "userId for signed-in, IP for anon" logic. `streamAudit` is called with `{ ip, isAnonymous, userId }` mapped from that.
  - [sse-token.service.ts](../apps/api-gateway/src/audit/sse-token.service.ts) — `issueSseToken` (32-byte random hex, Redis EX 60) + `consumeSseToken` (atomic getdel). Own ioredis client; doesn't touch the audit-result cache (which is Postgres-only per ADR 012).
- **Client** (Next.js):
  - [useSEOAudit.ts](../apps/client/src/hooks/useSEOAudit.ts) rewrite: drops the `HEAD /audit/stream` pre-check, instead does `POST /audit/start` with optional Bearer header, then opens `EventSource` with `?sse_token=<token>`. On 429 with `requiresSignIn: true`, redirects to `/login?redirect_to=<current path>` (the login page already supports this query param from the previous PR).

**Decided**: no new ADRs. ADR 002's hard rule #1 ("JWT never appears in URL query strings") is now actually satisfied — sse_token is opaque, not a JWT.

**Deferred**:

- HMAC-signed sse_tokens (handbook design uses `HMAC(user_id, ip, expires_at)`). Current implementation uses opaque random tokens stored in Redis — same single-use + TTL semantics, simpler ops, no key management. Revisit if Redis becomes a single point of failure.
- IP-binding the sse_token (handbook design ties token to client IP). Skipped because mobile users hop networks; the 60s TTL + single-use already constrain replay risk.
- AbortController propagation through the gateway (Phase 1 todo, separate concern).

**Verification status**:

- `make build` clean across all four apps.
- api-gateway `pnpm exec tsc --noEmit` exits 0.
- Pre-existing client test-spec error (`@testing-library/react` missing in `apps/client/specs/index.spec.tsx`) unrelated to this PR — already on the v2 todo backlog.
- **Not browser-tested** — the migration from PR #2 still needs to be applied to Supabase before E2E works (`node libs/db/run-migration.mjs`).

**Next session**:

1. Branch `feat/email-notifications` — `audit-notifications` BullMQ queue + worker, react-email templates (`AuditCompleteEmail`, `WelcomeEmail`), Resend primary + SendGrid fallback with circuit breaker (Redis flag, 5min TTL, no periodic health checks). Write [ADR 013](08-decisions.md).
2. Apply migration `0002_add_users.sql` to Supabase. Browser smoke the full E2E: anon paste URL → 1st audit succeeds → 2nd attempt redirects to /login → signup → audit succeeds with signed-in tier.

**Open questions**: none new.

---

## 2026-04-26 — DIY JWT auth (backend + minimal client)

Pulled "DIY auth phase 1" forward from Phase 2 because the user's E2E target requires sign-in to gate the second-and-beyond audit for anonymous users.

**Done**:

- **Schema**: added [`users` table](../libs/db/src/schema.ts) (id, email unique-indexed, password_hash, email_verified_at nullable, timestamps). Generated migration [`0002_add_users.sql`](../libs/db/drizzle/0002_add_users.sql). `refresh_tokens` intentionally not added — Phase 2 work.
- **Backend** (api-gateway):
  - [auth.service.ts](../apps/api-gateway/src/auth/auth.service.ts) — `signup`, `login` (with constant-time-ish dummy-hash on missing user), `getById`, `verifyAccessToken`. argon2id hashing per ADR 002 (`@node-rs/argon2`, memoryCost 64 MB / timeCost 3 / parallelism 1). HS256 JWT, 30-min access TTL, no refresh.
  - [auth.routes.ts](../apps/api-gateway/src/auth/auth.routes.ts) — `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` (gated by `requireAuth`), `POST /auth/logout` (stateless 204). Zod validation on signup (12+ char password) + login.
  - [auth.middleware.ts](../apps/api-gateway/src/middleware/auth.middleware.ts) — `optionalAuthMiddleware` (populates `req.user` if Bearer token valid; never rejects) + `requireAuth` (401 on missing/invalid).
  - Fail-fast `JWT_SECRET` check in [main.ts](../apps/api-gateway/src/main.ts) (must be ≥32 chars).
  - Updated [.env.example](../apps/api-gateway/.env.example) — `JWT_SECRET` is now required (was commented out).
  - Installed `@node-rs/argon2` + `zod` in api-gateway.
- **Client** (Next.js):
  - [UserContext.tsx](../apps/client/src/providers/UserContext.tsx) — real implementation: hydrates from `/auth/me` on mount, exposes `login` / `signup` / `logout` / `getAccessToken`. Token persisted in `localStorage` for Phase 1 simplicity (Phase 2 moves to memory + HttpOnly refresh cookie per ADR 002). Dropped the legacy Clerk-shaped `firstName` / `fullName` / `primaryEmailAddress` fields — the new shape is `{ id, email, createdAt }`.
  - [login page](../apps/client/src/app/login/[[...rest]]/page.tsx) + [signup page](../apps/client/src/app/signup/[[...rest]]/page.tsx) — real forms, redirect-after-success, `?redirect_to=` query param, error display.
  - [NavBar.tsx](../apps/client/src/components/ui/Layout/NavBar.tsx) — switched from `user.firstName` / `user.fullName` to `user.email`.

**Decided**:

- No new ADRs. ADR 002's Phase 1 design implemented as-spec. ADR 002's Phase 2 (refresh tokens, HttpOnly cookies) intentionally deferred.
- Token storage: `localStorage` for Phase 1. **Reason**: simplest persistence across page reloads; ADR 002 hard rule against localStorage applies to the Phase 2 design (which adds refresh tokens + cookies). Phase 2 will move to memory-only + HttpOnly cookie.

**Deferred**:

- `refresh_tokens` table + rotation flow → Phase 2
- HttpOnly cookie auth → Phase 2
- `/auth/sessions` for "log out other devices" → Phase 2
- Rate limit on `/auth/login` (5/15min) → Phase 1 follow-up
- Wiring audit endpoints to `req.user` so signed-in users hit the 3/month tier → next branch `feat/anon-quota-signin-gate`
- `sse_token` pattern for SSE auth → next branch (audit SSE doesn't currently auth)

**Verification status**:

- `make build` clean across all four apps (api-gateway, client, crawler-service, ai-service).
- `pnpm exec tsc --noEmit` exits 0 in api-gateway and client.
- **Migration not applied to Supabase yet** — run `node libs/db/run-migration.mjs` (or merge a follow-up that calls drizzle-kit push) before testing E2E. Local `.env` has a generated 32-byte `JWT_SECRET`.
- **Not browser-tested**: would require running gateway + client + DB + Redis simultaneously; build + typecheck stand in for now. Real end-to-end smoke happens after the next branch wires audit-to-auth.

**Next session**:

1. Branch `feat/anon-quota-signin-gate` — wire `audit.routes.ts` to use `req.user` (when present) for the signed-in identifier; client modal on 429 redirecting to `/login?redirect_to=<current>`; SSE auth via `sse_token` pattern (POST `/audit/start` returns short-lived signed token; SSE GET uses it as query param). Run the migration as part of this branch's verification.
2. Branch `feat/email-notifications` — `audit-notifications` BullMQ queue, react-email templates, Resend+SendGrid failover with circuit breaker. Write ADR 013.

**Open questions**: same as previous (BullMQ consumer location).

---

## 2026-04-26 — Phase 1: 30-day audit cache freshness (Postgres-only)

**Done**:

- Implemented stale-read freshness check on the audit cache lookup at [apps/api-gateway/src/audit/audit.service.ts](../apps/api-gateway/src/audit/audit.service.ts): rows with `updatedAt <= now() - 30 days` are now treated as a cache miss and trigger a fresh crawl + AI re-run (which writes a new row).
- Removed the Redis audit-result cache layer entirely from audit.service.ts (deleted the `Redis` import, `redisClient` singleton, `isRedisAvailable` flag, the cache-read block, and the cache-write block — ~70 lines net deletion). Redis usage in api-gateway is now scoped to BullMQ only ([apps/api-gateway/src/worker.ts](../apps/api-gateway/src/worker.ts)).
- Added `CACHE_FRESHNESS_DAYS = 30` constant + `gt(updatedAt, freshThreshold)` predicate; ordered by `desc(updatedAt)` so the freshest row wins.
- Wrote [ADR 012](08-decisions.md#adr-012--postgres-only-audit-cache-with-30-day-stale-read-re-trigger) — Postgres-only audit cache; 30-day stale-read re-trigger; rationale + alternatives + hard rules.
- Ticked the new "30-day audit cache freshness" item under Phase 1 in [06-phases.md](06-phases.md).

**Decided**:

- [ADR 012](08-decisions.md#adr-012--postgres-only-audit-cache-with-30-day-stale-read-re-trigger) — Postgres is now the only audit-result cache (Accepted)

**Deferred**:

- ADR 013 (email stack) — write with `feat/email-notifications`
- Single-flight lock — Phase 1 todo, comes later (will use Redis again, just not for the result)
- Pruning old audit history rows — out of scope; not needed at portfolio volume

**Verification status**:

- `pnpm exec webpack --mode production` clean (api-gateway 52.8 KiB).
- `pnpm exec tsc --noEmit` exits 0 — no type errors.
- Pre-commit hook (eslint + prettier + black) clean. Husky environment uses brew-installed black.

**Next session** (still in this conversation):

1. Branch `feat/diy-jwt-auth` — `users` + `refresh_tokens` migrations, argon2id, `/auth/signup` `/auth/login` `/auth/me` `/auth/refresh` `/auth/logout`, gateway middleware that populates `req.user`, real `UserContext` on the client.
2. Branch `feat/anon-quota-signin-gate` — client modal on 429; signed-in users get 3/month per `auditUsage`.
3. Branch `feat/email-notifications` — `audit-notifications` BullMQ queue + react-email templates + Resend/SendGrid failover. Write ADR 013.

**Open questions**: same as previous (BullMQ consumer location).

---

## 2026-04-26 — v2 rebuild committed; managed-provider scrub; Phase 1 cache + email plan locked

**Done**:

- Committed and pushed the long-pending v2 rebuild (149 files) to `origin/main` as a single commit (`chore: complete v2 rebuild — drop nx/clerk/auth0/rabbitmq, swap to pnpm + make + bullmq`). `make build` verified green for all four apps before commit (api-gateway 52.8 KiB, crawler-service 7.79 KiB, ai-service Python imports OK, client 9 routes).
- Scrubbed all forward-looking Auth0 references from handbook (02, 03, 05, 06, 08) and notes/ARCHITECTURE.md per user request. Renamed [ADR 002](08-decisions.md) heading from "drop Auth0 and Clerk" to "drop managed auth provider"; updated cross-link in [02-architecture.md](02-architecture.md). The decision _not_ to use a managed identity service is still recorded — only the brand name is gone from forward-looking text.
- Audited current MVP state vs user's end-to-end target (paste URL → sanitize → SEO+AI → cache 30d → re-run after stale → anon-1-free → sign-in gated). Findings: URL sanitize ✅, SEO+AI orchestration via SSE+BullMQ ✅, anon quota ✅, but **30-day freshness check** missing and **DIY JWT** still stubbed.

**Decided** (forthcoming ADRs to be written alongside their implementation commits):

- **Caching**: Postgres-only result cache. Redis stays _only_ for BullMQ transport, single-flight lock, and the anon quota counter — drop the original 1-month-Redis-TTL idea (256MB Upstash free tier won't hold a month of audits, and two-store cache invalidation isn't worth the complexity). Cache key is the sanitized URL. → ADR 012 to be written with [feat/audit-cache-30day-freshness](../apps/api-gateway/src/audit/audit.service.ts).
- **30-day freshness**: stale-read triggers re-analysis (overwrite the row); no time-based eviction. Implemented as `WHERE updated_at > now() - interval '30 days'` in the cache lookup.
- **Email stack**: Resend primary + SendGrid fallback (chose SendGrid over AWS SES because AWS requires full account + sandbox approval; SendGrid 100/day free forever, no card). [react-email](https://react.email/) for templates rendered server-side in Node. BullMQ retries (1m → 5m → 30m, 3 attempts) + `failed`-state DLQ. Circuit-breaker via Redis flag `email:provider-down:resend` (5min TTL) — driven by real send errors, not periodic health checks. → ADR 013 to be written with [feat/email-notifications](../apps/api-gateway).
- **Auth**: DIY JWT confirmed (ADR 002 stands). The three "Auth0 authentication" commits in `git log` (`239df07`, `4a95824`, `c87956d`) are pre-v2 NestJS history; current working code is the stub from the v2 swap. No Auth0 code in working state.
- **Branch naming**: descriptive (`feat/audit-cache-30day-freshness`, `feat/diy-jwt-auth`, …), no "phase" prefix; one commit per branch.

**Deferred**:

- ADR 012 (Postgres-only cache) — write with `feat/audit-cache-30day-freshness`
- ADR 013 (email stack: Resend + SendGrid + react-email + circuit breaker) — write with `feat/email-notifications`
- Bring [SESSION_LOG.md](SESSION_LOG.md) entry up to date at end of each phase commit

**Verification status**:

- All four apps build clean (`make build` ✓ pre-commit).
- Husky pre-commit hook (lint-staged: eslint --fix + prettier --write) ran during the commit; no manual formatting needed.

**Next session**:

1. Branch `feat/audit-cache-30day-freshness` — add stale-read check at [apps/api-gateway/src/audit/audit.service.ts:200](../apps/api-gateway/src/audit/audit.service.ts:200) (`updated_at < now() - 30d` → treat as miss → re-run → overwrite). Drop Redis caching layer for the audit result. Write ADR 012. Commit + push.
2. Branch `feat/diy-jwt-auth` — `users` + `refresh_tokens` migrations, argon2id, `/auth/signup` `/auth/login` `/auth/me` `/auth/refresh` `/auth/logout`, middleware that populates `req.user`, real `UserContext.tsx` on the client. Login modal triggered on 429 from anon quota.
3. Branch `feat/anon-quota-signin-gate` — frontend modal + signed-in tier (3/month) wired to `auditUsage`.
4. Branch `feat/email-notifications` — `audit-notifications` BullMQ queue + worker, react-email templates (`AuditCompleteEmail`, `WelcomeEmail`, `PasswordResetEmail` for v3), Resend+SendGrid failover with circuit breaker. Write ADR 013.

**Open questions**: same as previous (BullMQ consumer location: keep in gateway `worker.ts` per ADR 003; revisit at HF Spaces deploy).

---

## 2026-04-25 — Doc cleanup + known-issues + deployment guide

Continuation of the same calendar day, after the v2 swap.

**Done**:

- **Deleted** `PORTING_GUIDE.md` (job done — v2 swap complete) and `RANK_ORBIT_MASTER_GUIDE.md` (stale interview-prep doc that described the legacy NestJS/Clerk/RabbitMQ/Prisma stack — superseded by the handbook on every axis)
- **Updated [README.md](../README.md)** — dropped "v2 rebuild tree" language, removed "[pending port]" notes against the four apps, expanded Quickstart with all four `make dev-*` targets, pointed at the new 10/11 handbook docs
- **Updated [handbook/06-phases.md](06-phases.md)** — marked the three remaining Phase 0 items (drop Nx, RabbitMQ→BullMQ, drop Clerk) as `[x] DONE 2026-04-25 via v2 rebuild`; added a "**Bonus**" line summarising the v2 rebuild scope; marked the Phase 1 "write deployment guide" task as `[x]`
- **Updated [handbook/07-v2-todo.md](07-v2-todo.md)** — struck through the schema-drift item (`~~text~~ ✅ DONE`); enriched the pre-launch checklist with two new items (run deploy guide e2e on a fresh laptop; Browserless quota alarm)
- **Updated [handbook/README.md](README.md)** — added entries for new 10/11 docs to the deep-dives section
- **Created [handbook/10-known-issues.md](10-known-issues.md)** — outstanding bugs/security/perf concerns (10 🔴, 16+ 🟡, 5 🟢) plus 20+ feature ideas grouped by leverage. Cross-references file:LN for every concrete claim.
- **Created [handbook/11-deployment.md](11-deployment.md)** — end-to-end deployment guide. Per-service (Vercel client, Fly.io gateway+crawler, HF Spaces ai-service); managed deps (Supabase, Upstash, Browserless, Gemini); observability setup (Sentry + Better Stack); CI/CD (GH Actions); secrets management; pre-launch checklist; rollback procedures; cost projections per free-tier ceiling. Includes ready-to-paste fly.toml + Dockerfile + HF Space README frontmatter snippets.

**Decided**: no new ADRs

**Deferred**: nothing new. Existing pending items (Phase 1 + Phase 2 + Phase 3 + Phase 4) tracked in [06-phases.md](06-phases.md) and [10-known-issues.md](10-known-issues.md)

**Verification status**: doc-only changes. No code touched. Handbook still loads cleanly (markdown lint fixed inline).

**Next session**: pick up Phase 1 — recommended order:

1. SSRF guards (small, contained, immediately useful — fixes 🔴 #1)
2. Body limits + generic error responses (🔴 #2 + #4)
3. Internal-token HMAC between gateway ↔ crawler ↔ ai-service (🔴 #3, also unblocks public deploy of ai-service to HF Spaces)
4. Then deployment per [11-deployment.md](11-deployment.md)

**Open questions**: same as previous entry (BullMQ consumer location; eslint-config-next peer-dep mismatch).

---

## 2026-04-25 — v2 rebuild complete + swapped to root

Same calendar day as the audit + handbook + v2 scaffold session below. This entry records the end-to-end v2 port and the swap.

**Done**:

- Verified v2 root `pnpm install` (456 packages, 3 min) and `ai-service` Python install + import-check
- Bumped Python target to 3.13 (was 3.11; system was 3.9.6); installed via `brew install python@3.13`; updated Makefile, Dockerfile, pyproject.toml, handbook/00-prerequisites.md
- Regenerated `apps/ai-service/requirements.txt` via `pip freeze` against Python 3.13 (61 lines, full transitive lockdown)
- **Ported api-gateway**: copied from legacy, deleted `clerk.service.ts`, stubbed `auth.middleware.ts` and `auth.routes.ts` (no-op + 501 for `/me`), removed all Clerk JWT resolution from `audit.routes.ts` (anonymous-only until phase 2 DIY JWT), rewrote `worker.ts` using BullMQ on ioredis (`Queue` + `QueueEvents` + `Worker`), replaced `NxAppWebpackPlugin` with raw webpack (ts-loader + webpack-node-externals), updated jest.config.cts (no preset), updated express.d.ts to local `AuthUser` type, added Makefile + .env.example, package.json: dropped `@clerk/backend`+`amqplib`, added `bullmq`+`jsonwebtoken`+`@types/jsonwebtoken`+`tsx`+webpack devDeps. Webpack bundle: 52.8 KiB.
- **Ported client**: copied from legacy (excluding node_modules, .next, dist), deleted `proxy.ts` + `app/api/token/` + `app/api/token-debug/`, stubbed `UserContext.tsx` (Clerk-shaped null user for type compat), stubbed `/login/[[...rest]]/page.tsx` and `/signup/[[...rest]]/page.tsx`, rewrote `useSEOAudit.ts` to drop Clerk imports (anon SSE), removed ClerkProvider from `layout.tsx`, replaced `next.config.js` with raw Next.js config (no @nx/next), added Makefile, package.json: dropped `@clerk/nextjs`, raw `next dev/build` scripts. **Fixed**: `lucide-react@1.x` no longer exports brand icons (Twitter, Linkedin, Github) — swapped to FontAwesome `faGithub`/`faLinkedin`/`faXTwitter` (already in deps); `Activity`+`Badge` imports added to `AIInsightsSection.tsx`; per ADR 006, `technical_analysis` is now a separate prop on `AIInsightsSection` (sourced from crawler payload, not AI). Next build green: 9 routes generated.
- **Ported crawler-service**: copied from legacy, removed `reproduce_lighthouse.mjs` debug script, replaced `NxAppWebpackPlugin` with raw webpack + a small `CopyAssetsPlugin` for `src/assets` (lighthouse worker), added Makefile + .env.example, package.json: added `zod`+`tsx`+webpack devDeps. Webpack bundle: 7.79 KiB.
- **Cleaned libs/**: removed Nx `project.json` files, replaced `libs/db/.eslintrc.json` (deleted, conflicted with flat config) and rewrote `libs/db/eslint.config.mjs` to extend root flat config (dropped `@nx/dependency-checks` rule), rewrote `libs/db/jest.config.cts` and `apps/client/jest.config.cts` to drop the `jest.preset.js` Nx-only preset
- **The swap (Phase G)**: deleted legacy at root (`apps/`, `libs/`, `data/`, `dist/`, `logs/`, `tmp/`, `.nx/`, `.github/`, `node_modules/`, plus 11 root config files: `.editorconfig`, `.gitignore`, `.npmrc`, `.prettierrc`, `.prettierignore`, `README.md`, `eslint.config.mjs`, `jest.config.ts`, `migration.sql`, `nx.json`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vercel.json`); moved everything from `v2/` (apps, libs, handbook, data, dist, node_modules, all dotfiles, all root configs, .github) into the repo root; removed empty `v2/`. Preserved at root: `.git`, `.env`, `.husky`, `.vscode`, `RANK_ORBIT_MASTER_GUIDE.md` (gitignored), `notes/`.
- Verified post-swap: `apps/api-gateway` and `apps/crawler-service` still webpack-build clean from the new root.

**Decided**: no new ADRs (all 11 from earlier in the day still apply, now living at handbook/08-decisions.md after the swap)

**Deferred** (Phase 1 work, see [06-phases.md](06-phases.md#phase-1--mvp-launch-on-free-tier)):

- SSRF guards (gateway + crawler)
- Crawler rewrite to Browserless.io WS API per ADR 005
- Body size limits (gateway 50mb→100kb; ai-service add cap)
- Timeout cascade reconciliation (currently mismatched legacy values)
- AbortController propagation through SSE
- `sse_token` pattern for SSE auth
- Single-flight lock + negative cache
- Skip persisting synthetic AI failure responses
- Generic error responses + request-id
- Explicit helmet + CORS configs
- Internal `X-Internal-Token` HMAC between services
- Per-operation Redis try/catch (replace sticky `isRedisAvailable` flag)
- Multiple-lockfile warning on `next build`: leftover legacy `pnpm-workspace.yaml` was deleted as part of the swap, so this should now be clean — verify on next `next build`.
- Peer-dep warnings: `eslint-config-next` 16.2.4 wants eslint v8/9 but root ships eslint 10.2.1. Either downgrade eslint or wait for an eslint-config-next bump.

**Verification status**:

- All four apps build clean from the new root (verified webpack for api-gateway + crawler-service post-swap; ai-service Python imports cleanly; client Next build was green just before swap).
- **Not yet committed.** Per user instruction "we don't push anything until we get v2 back to root" — that condition is now satisfied. Recommended commit: `chore: rebuild repo as v2 (drop Nx, drop Clerk, BullMQ on Upstash, raw webpack, pnpm+make)` with no `Co-Authored-By` line per ADR 011.
- Husky pre-commit hook exists at `.husky/pre-commit` (runs `npx lint-staged`). On first commit it'll run lint-staged; the `.husky/_/` directory should be regenerated by `pnpm install` if missing.

**Next session**:

1. Run `make install && make build` from the new root to confirm everything still works after a fresh shell.
2. Run `git add -A && git status` to review the diff. It will be enormous (legacy deleted, v2 added). Consider committing in two passes: first the deletions, then the additions.
3. Begin Phase 1 work — start with SSRF guards (small, contained, immediately useful).

**Open questions**:

- Whether to put the BullMQ consumer inside ai-service (cleaner) or keep it in gateway worker.ts (current — simpler for HF Spaces single-process model). ADR 003 implementation note defers to "keep in gateway for phase 0/1".
- `eslint-config-next` peer-dep mismatch: live with the warning or downgrade eslint to v9? Phase 1 decision.

---

## 2026-04-25 — Audit + handbook + Phase 0a/b/c + pivot to v2/ rebuild

**Done**:

- Repository reconnaissance (Step 1 of audit): mapped Nx workspace, three backend services (api-gateway Express, crawler-service Fastify+Puppeteer, ai-service FastAPI+LangChain+Gemini) plus Next.js client, Drizzle on Supabase Postgres, ioredis cache, RabbitMQ-RPC queue, Clerk auth (mid-refactor from prior managed provider)
- Per-service findings (Step 2 of audit): identified 7 🔴 / 9 🟡 / 3 🟢 in api-gateway, 6 🔴 / 4 🟡 / 3 🟢 in crawler-service, 7 🔴 / 7 🟡 / 3 🟢 in ai-service, plus 3 cross-service findings (schema drift, pnpm version drift, zero observability)
- Architectural decisions captured as ADRs 001–011
- Handbook scaffolded: 11 files in [handbook/](.) covering prerequisites, product, architecture, system design, low-level flows, tech stack, phases, v2 TODO, decisions, glossary, this log
- **Phase 0a** (safe stabilization items):
  - Deleted [crawler_crash.log](../crawler_crash.log) (178 KB build/source-map noise)
  - Updated [.gitignore](../.gitignore): added `*.log` and `crawler_crash.log` (kept `data/` tracked — only contains the Postman collection)
  - Fixed [apps/api-gateway/.env.example](../apps/api-gateway/.env.example): renamed `PORT` → `API_GATEWAY_PORT` (matches main.ts), changed `DIRECT_URL` to port 5432 without `pgbouncer=true` (was incorrectly set to pooler), removed stale `RABBITMQ_URL` line, added `LOG_LEVEL`
  - Cleaned [apps/client/.env.example](../apps/client/.env.example): removed dangling `MATCH_ME_URL` (legacy managed-provider leftover); flagged remaining Clerk vars for Phase 0e removal
  - Bumped [.github/workflows/ci.yml](../.github/workflows/ci.yml): `pnpm/action-setup@v2` + `version: 9` → `@v4` + `version: 10` (matches package.json's pnpm@10.23.0)
  - Rewrote [apps/api-gateway-e2e/src/api-gateway/api-gateway.spec.ts](../apps/api-gateway-e2e/src/api-gateway/api-gateway.spec.ts) to test `GET /api/health` (the route that exists) instead of the deleted `GET /api`
- **Phase 0b** (schema drift fix per ADR 006):
  - Removed `technical_analysis: {}` from both error-path returns in [apps/ai-service/app/services/ai_service.py](../apps/ai-service/app/services/ai_service.py)
  - Removed misleading prompt instruction "5. 'technical_analysis': This field is NOT needed in your output" (was redundant with the schema definition above it)
  - Verified `AIResponse` pydantic model and TS `AIAnalysis` interface already exclude the field — drift is fully resolved
- **Phase 0c** (containerize ai-service):
  - Pinned [apps/ai-service/requirements.txt](../apps/ai-service/requirements.txt) to exact versions inspected from venv (fastapi 0.128.0, uvicorn 0.40.0, pydantic 2.12.5, pydantic-settings 2.12.0, python-dotenv 1.2.1, langchain 1.2.8, langchain-google-genai 4.2.0, beautifulsoup4 4.14.3, black 26.1.0)
  - Wrote [apps/ai-service/Dockerfile](../apps/ai-service/Dockerfile): python:3.11-slim base, `uv pip install --system`, `${PORT:-7860}` for HF Spaces compatibility

**Decided**:

- ADR 001 — Express now, Go phase 3+
- ADR 002 — DIY JWT (drop managed auth provider)
- ADR 003 — BullMQ on Upstash (drop RabbitMQ)
- ADR 004 — Drop Nx, use pnpm + Makefile
- ADR 005 — Browserless.io for crawler
- ADR 006 — `technical_analysis` is crawler-owned (resolve schema drift)
- ADR 007 — Postgres + Drizzle (don't switch)
- ADR 008 — HF Spaces for ai-service
- ADR 009 — Vercel for client (status quo)
- ADR 010 — Better Stack + Sentry for observability
- ADR 011 — Conventional commits, no Co-Authored-By

**Deferred**:

- Credential rotation moved out of Phase 0 into the pre-launch checklist (user will rotate at end of project)
- See [07-v2-todo.md](07-v2-todo.md) for the full list of intentional drops

**Pivoted strategy mid-session**: surgical Nx/Clerk/RabbitMQ removal from the legacy tree was 30+ file changes per concern with eslint flat-config rewrite — too much to verify safely in a marathon. Switched to a clean `v2/` rebuild instead. Old `apps/` and `libs/` stay as reference + rollback. After all four apps are ported and verified, swap is `git mv apps apps-legacy && git mv v2/* . && rmdir v2`. Full porting checklist in [../PORTING_GUIDE.md](../PORTING_GUIDE.md).

**v2/ scaffolded** (this session):

- Root: [package.json](../package.json) (pnpm workspaces, no Nx, minimal devDeps), [pnpm-workspace.yaml](../pnpm-workspace.yaml), [tsconfig.base.json](../tsconfig.base.json), [eslint.config.mjs](../eslint.config.mjs) (typescript-eslint flat config, no `@nx/*`), [jest.config.ts](../jest.config.ts) (manual project list), [Makefile](../Makefile) (auto-discovers ported apps via `apps/*/Makefile`), [.gitignore](../.gitignore), [.prettierrc](../.prettierrc), [.prettierignore](../.prettierignore), [.editorconfig](../.editorconfig), [.npmrc](../.npmrc), [.nvmrc](../.nvmrc) (Node 20)
- [.github/workflows/ci.yml](../.github/workflows/ci.yml) — `make install / lint / typecheck / test / build`, pnpm 10, Python 3.11
- [README.md](../README.md) + [PORTING_GUIDE.md](../PORTING_GUIDE.md)
- **handbook/** moved into v2/ (so it survives the "delete everything outside v2/" swap)
- **apps/ai-service/** — full port: copied (minus `venv/`, `__pycache__/`, `logs/`, `project.json`, `.env`), Dockerfile + pinned requirements.txt + Makefile + README + .env.example
- **apps/api-gateway/, crawler-service/, client/** — README stubs only; each documents the per-app porting checklist
- **libs/** — copied (db + shared/types + shared/utils); `project.json` files removed, `node_modules` cleaned

**Verification status**:

- Phase 0a/b/c file edits to legacy tree are still in place but will be moot once v2 swap happens — v2/apps/ai-service has the same fixes baked in
- v2/ root config files were not test-installed from this session. **Run `cd v2 && pnpm install` to verify pnpm-workspace globs and devDeps resolve.** If pnpm install fails on `apps/*` glob (because api-gateway/crawler-service/client have no package.json yet, only README stubs), comment those out of `pnpm-workspace.yaml` until the first one is ported.

**Next session**:

1. `cd v2 && pnpm install` — verify root deps resolve. Fix any version conflicts before porting.
2. `cd v2/apps/ai-service && make install && make dev` — verify ai-service stands up against the pinned requirements.
3. Pick ONE app to port next. Recommended order: **api-gateway → client → crawler-service**.
   - api-gateway is the most central; getting it working unblocks the SSE flow
   - client is high surface but mostly mechanical (drop Clerk wiring)
   - crawler-service is small and the Browserless rewrite is contained
4. For each port, follow the checklist in [../PORTING_GUIDE.md](../PORTING_GUIDE.md). Run `pnpm dev` after every meaningful change.
5. Once all four apps are ported and `make ci` is green, perform the swap per the bottom of PORTING_GUIDE.md.
6. **Don't commit yet** — wait until v2/ is at least minimally working (pnpm install + ai-service running) so the commit includes a known-good state. Then commit as `chore: scaffold v2 rebuild tree (no Nx, no Clerk, BullMQ-ready)` with no `Co-Authored-By` line per ADR 011.

**Open questions**:

- Whether to put the BullMQ consumer inside ai-service (cleaner) or keep it in gateway worker.ts (simpler for HF Spaces single-process model). ADR 003 implementation note defers to "keep in gateway for phase 0/1".
- Whether to keep `libs/db/run-migration.mjs` (legacy migration script) or replace with `drizzle-kit push` in the Makefile. Decide when first running migrations against v2.
- Per-lib `eslint.config.mjs` files in `v2/libs/` were copied as-is and may import from `@nx/eslint-plugin` — check and replace with project-local extends of root v2/eslint.config.mjs when first running `make lint`.
- Per-lib `tsconfig.spec.json` and `jest.config.cts` files were copied as-is and may reference `../../jest.preset.js` (Nx-only) — fix at first `make test`.

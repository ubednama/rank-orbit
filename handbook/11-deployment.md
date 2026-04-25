# 11 — Deployment Guide

End-to-end deployment for Phase 1 launch. All services on free tiers. Reference the deployed-services columns in [05-tech-stack.md](05-tech-stack.md).

> **Pre-launch**: complete the [pre-launch checklist in 07-v2-todo.md](07-v2-todo.md#pre-launch-checklist--separate-from-phases--do-before-going-public) before flipping any DNS.

---

## Topology

```mermaid
graph LR
  Browser((User Browser))
  Browser --> Vercel[Vercel<br/>Next.js client]
  Vercel -- "SSE / fetch" --> Fly1[Fly.io<br/>api-gateway]

  Fly1 -- HTTP --> Fly2[Fly.io<br/>crawler-service]
  Fly2 -- WS --> BL[(Browserless.io<br/>Chromium)]

  Fly1 -- HTTP --> HF[HF Spaces<br/>ai-service]
  HF -- HTTPS --> Gemini[(Google Gemini API)]

  Fly1 -- TLS --> Upstash[(Upstash Redis<br/>cache + BullMQ)]
  Fly1 -- TLS --> Supabase[(Supabase<br/>Postgres)]

  Fly1 -. errors .-> Sentry[(Sentry)]
  Fly2 -. errors .-> Sentry
  HF -. errors .-> Sentry
  Vercel -. errors .-> Sentry

  Fly1 -. logs .-> BetterStack[(Better Stack<br/>logs + uptime)]
  Fly2 -. logs .-> BetterStack
  HF -. logs .-> BetterStack
```

---

## Per-service deployment

### Client → Vercel

**Free tier**: 100 GB bandwidth/mo, 6000 build-min/mo, unlimited deploys, automatic SSL.

**Failure mode**: bandwidth exceeded → 429s; build minutes exceeded → builds blocked.

#### Steps

1. Go to <https://vercel.com> → Add New Project → Import the GitHub repo.
2. **Root Directory**: `apps/client` (very important for the monorepo).
3. **Framework Preset**: Next.js (auto-detected).
4. **Build Command**: leave default (`next build`) — overrides aren't needed since the per-app `package.json` already has the right script.
5. **Install Command**: override to `cd ../.. && pnpm install --frozen-lockfile` (Vercel needs the workspace root for pnpm to resolve `@db` / `@shared/*`).
6. **Env vars** (Production):
   - `NEXT_PUBLIC_GATEWAY_URL` = `https://<api-gateway-fly-app>.fly.dev`
7. Deploy. Vercel auto-deploys on every push to `main`.

#### Custom domain

Add a domain in the Vercel dashboard → set the apex/CNAME records at your registrar → Vercel provisions the SSL cert automatically.

#### vercel.json (already in repo)

[../vercel.json](../vercel.json) sets the buildCommand explicitly — verify on first deploy that Vercel's Root Directory + this file don't conflict; if they do, delete `vercel.json` and rely on the dashboard config alone.

---

### api-gateway → Fly.io

**Free tier**: 3× shared-cpu-1x VMs, 256 MB RAM each (can scale to 1 GB on credit). 160 GB egress/mo. Auto-stop machines when idle.

**Failure mode**: OOM → machine restart; exceeds 256 MB → set `auto_stop_machines=false` and pay for memory.

#### Prerequisites

- `flyctl` installed (`brew install flyctl`)
- `fly auth login`
- Account funded (free, but Fly requires a credit card on file even for free tier)

#### Files to add (one-time)

Create [apps/api-gateway/fly.toml](../apps/api-gateway/fly.toml):

```toml
app = "rank-orbit-api-gateway"  # change to your unique app name
primary_region = "iad"           # match Supabase region for low latency

[build]
  dockerfile = "Dockerfile"      # to be added in Phase 1

[env]
  NODE_ENV = "production"
  API_GATEWAY_PORT = "3333"

[http_service]
  internal_port = 3333
  force_https = true
  auto_stop_machines = "stop"   # save free-tier compute when idle
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/api/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

Create [apps/api-gateway/Dockerfile](../apps/api-gateway/Dockerfile):

```dockerfile
# Multi-stage build keeps the runtime image small.
FROM node:20-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY libs/db/package.json ./libs/db/
COPY libs/shared/types/package.json ./libs/shared/types/
COPY libs/shared/utils/package.json ./libs/shared/utils/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/api-gateway ./apps/api-gateway
COPY libs ./libs
RUN cd apps/api-gateway && pnpm exec webpack --mode production

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/dist/apps/api-gateway/main.js ./main.js
COPY --from=deps /repo/node_modules ./node_modules
EXPOSE 3333
CMD ["node", "main.js"]
```

#### First deploy

```sh
cd apps/api-gateway
fly launch --no-deploy --copy-config   # creates the app from fly.toml
fly secrets set \
  REDIS_URL="rediss://default:...@host:6379" \
  DATABASE_URL="postgresql://...@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" \
  DIRECT_URL="postgresql://...@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  CRAWLER_SERVICE_URL="https://rank-orbit-crawler-service.fly.dev" \
  AI_SERVICE_URL="https://<hf-username>-rank-orbit-ai.hf.space/api" \
  INTERNAL_TOKEN_SECRET="$(openssl rand -hex 32)" \
  LOG_LEVEL=info
fly deploy
```

#### Re-deploy

```sh
cd apps/api-gateway && fly deploy
```

CI integration: add a workflow step (Phase 2) that runs `flyctl deploy --remote-only` on push to main, with `FLY_API_TOKEN` from GitHub Secrets.

---

### crawler-service → Fly.io

Same approach as api-gateway. Different fly.toml (port 3001) + Dockerfile.

After the **Browserless rewrite** (Phase 1, ADR 005), the crawler is a thin Fastify wrapper — no local Chromium — so a 256 MB Fly machine is plenty.

#### apps/crawler-service/fly.toml

```toml
app = "rank-orbit-crawler-service"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  CRAWLER_PORT = "3001"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  path = "/api/health"
  interval = "30s"
  timeout = "5s"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

#### Secrets

```sh
fly secrets set \
  BROWSERLESS_TOKEN="..." \
  BROWSERLESS_URL="wss://chrome.browserless.io" \
  INTERNAL_TOKEN_SECRET="$(matches gateway value)"
```

> **Important**: `INTERNAL_TOKEN_SECRET` must be the same value on api-gateway and crawler-service (HMAC verification needs the shared secret).

---

### ai-service → Hugging Face Spaces

**Free tier**: 16 GB RAM, 2 vCPU shared, persistent (keeps warm). Public URL: `https://<user>-<space>.hf.space`.

**Failure mode**: long inactivity → Space sleeps → first request wakes it (~30s cold start).

#### Steps

1. Create HF account at <https://huggingface.co> (free).
2. Create a new Space → choose **Docker** SDK, blank template.
3. The Space is a separate Git repo; clone it locally:

   ```sh
   git clone https://huggingface.co/spaces/<user>/<space-name> hf-ai-service
   cd hf-ai-service
   ```

4. Copy `apps/ai-service/*` into the Space's repo root:

   ```sh
   cp -R /path/to/rank-orbit/apps/ai-service/{Dockerfile,app,requirements.txt,pyproject.toml} .
   ```

5. Add an HF Space `README.md` with frontmatter (HF needs this metadata):

   ```markdown
   ---
   title: Rank Orbit AI Service
   emoji: 🛰️
   colorFrom: indigo
   colorTo: purple
   sdk: docker
   app_port: 7860
   pinned: false
   ---

   # Rank Orbit AI Service

   FastAPI + LangChain + Gemini. See [main repo](https://github.com/<you>/rank-orbit).
   ```

6. Set Space secrets in the HF dashboard (Settings → Variables and secrets):
   - `GOOGLE_API_KEY` (from Google AI Studio — see [Gemini](#gemini))
   - `INTERNAL_TOKEN_SECRET` (matches api-gateway)
   - `MODEL_NAME` = `gemini-2.5-flash`

7. Push:

   ```sh
   git add -A && git commit -m "deploy" && git push
   ```

   Space starts building automatically. Watch logs in the dashboard. First build is slow (~5 min); subsequent builds reuse layer cache.

#### Public URL

`https://<user>-<space-name>.hf.space` — use this as `AI_SERVICE_URL` (with `/api` suffix per the FastAPI router prefix) in api-gateway secrets.

#### Sync strategy

The HF Space repo is separate from the main monorepo. Options:

- **Manual** (Phase 1): copy + push when ai-service changes
- **Automated** (Phase 2): GitHub Actions workflow that pushes `apps/ai-service` contents to the HF Space repo on every change to that subdirectory

---

## Managed dependencies

### Supabase (Postgres)

**Free tier**: 500 MB storage, 5 GB bandwidth/mo, paused after 7 days inactivity (resumes on next request, ~30s wake).

#### Steps

1. Create project at <https://supabase.com> → choose region close to Fly.io primary region.
2. **Settings → Database → Connection string**:
   - **Transaction Pooler** (port 6543): use as `DATABASE_URL` for runtime (Drizzle queries via the gateway). Add `?pgbouncer=true` if connection limits become an issue.
   - **Session/Direct** (port 5432): use as `DIRECT_URL` for migrations. Required because pgbouncer doesn't support prepared statements.

3. Run the initial migration locally:

   ```sh
   cd libs/db
   # Set DIRECT_URL in .env.local first
   pnpm exec drizzle-kit push
   ```

   Verify in Supabase dashboard → Tables → `audits` and `auditUsage` exist.

4. (Phase 2) Schedule cleanup of audits > 90 days:

   ```sql
   -- Run as a Supabase Edge Function or pg_cron job
   DELETE FROM audits WHERE created_at < NOW() - INTERVAL '90 days';
   ```

#### Failure mode

Project paused → first request times out → wakes up → subsequent requests fast. Set Better Stack to ping `/api/health` (which hits the DB) every 5 min to keep it warm.

---

### Upstash (Redis)

**Free tier**: 10 000 commands/day, 256 MB storage, single region.

#### Steps

1. Create account at <https://upstash.com> → Create Database.
2. Choose **Global** (multi-region) or single-region matching your Fly.io location.
3. Enable **TLS** (required by BullMQ on Upstash).
4. Copy the **Redis URL with TLS** (`rediss://...`); use as `REDIS_URL` for both api-gateway and crawler-service.

#### Failure mode

Daily command limit exceeded → Upstash starts rejecting writes; reads continue. Move to paid ($0.20/100k commands) when traffic exceeds free tier.

---

### Browserless.io

**Free tier**: 1 000 units/mo, 1 concurrent session, no persistent profiles.

#### Steps

1. Create account at <https://browserless.io>.
2. Get the API token from the dashboard.
3. Set in crawler-service secrets:
   - `BROWSERLESS_TOKEN` = `<your-token>`
   - `BROWSERLESS_URL` = `wss://chrome.browserless.io` (or your dedicated subdomain)

4. **Important**: Browserless does not validate URLs — SSRF guards must live in the gateway + crawler before requests are dispatched (per [03-system-design.md](03-system-design.md#ssrf-mitigation)).

#### Failure mode

Quota exhausted (1k units/mo) → 402 responses. Set up a Better Stack monitor on the crawler that alerts at 80% quota.

---

### Gemini

**Free tier**: see Google AI Studio — currently 15 RPM / 1500 RPD on `gemini-2.5-flash` (subject to change).

#### Steps

1. Go to <https://aistudio.google.com> → Get API key.
2. Set in ai-service Space secrets: `GOOGLE_API_KEY`.

#### Failure mode

429 with "quota exceeded" or "resource exhausted" — handled in `_clean_and_parse_json` error path (returns `error_code: quota_exceeded`).

---

## Observability (Phase 2 — but configure URLs now so you can ship the SDK calls)

### Sentry

**Free tier**: 5 000 errors/mo, 1 user, 30-day retention.

#### Steps

1. <https://sentry.io> → Create projects per service (Node, Node, Python, Next.js — 4 total).
2. Copy each DSN.
3. Set per service:
   - api-gateway: `SENTRY_DSN_GATEWAY`
   - crawler-service: `SENTRY_DSN_CRAWLER`
   - ai-service: `SENTRY_DSN_AI`
   - client (Vercel env): `NEXT_PUBLIC_SENTRY_DSN`

4. **Critical**: configure PII scrubbing in Sentry project settings. Don't send body/headers/URLs to Sentry — they may contain Auth tokens.

### Better Stack

**Free tier**: 3 GB log ingest/mo, 10 monitors, 1 status page.

#### Logs

1. Create a Source per service.
2. Get the Source token + endpoint.
3. In each service, configure the logger to ship to Better Stack (HTTPS POST per log line — most Node loggers have a Better Stack transport).

#### Uptime monitors

- One per `/api/health` endpoint per service.
- Check interval: 5 min (free tier limit).
- Alert: email or Slack.

#### Status page

- Free tier: 1 public status page.
- Add to client footer: `<a href="https://status.<your-domain>">Status</a>`.

---

## CI/CD

[.github/workflows/ci.yml](../.github/workflows/ci.yml) already runs `make install / lint / typecheck / test / build` on every PR + push to main.

### Phase 2 — auto-deploy on tag

Add a deploy workflow that runs on `git tag v*`:

```yaml
# .github/workflows/deploy.yml (Phase 2)
name: Deploy
on:
  push:
    tags: ["v*"]
jobs:
  deploy-gateway:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@v1
      - run: flyctl deploy --remote-only --config apps/api-gateway/fly.toml
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
  # similar for crawler
```

For ai-service: a separate workflow that pushes `apps/ai-service/` contents to the HF Space's git remote on tag.

For client: Vercel auto-deploys; no GH Action needed.

---

## Secrets management

| Where                  | What                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Local dev              | `.env.local` per app (gitignored)                                                                                  |
| GitHub Actions         | GitHub Environments → `production` env → secrets: `FLY_API_TOKEN`, `HF_TOKEN`, `VERCEL_TOKEN`, `SENTRY_AUTH_TOKEN` |
| Production (Fly.io)    | `fly secrets set KEY=value`                                                                                        |
| Production (HF Spaces) | dashboard → Settings → Variables and secrets                                                                       |
| Production (Vercel)    | dashboard → Project Settings → Environment Variables                                                               |

### Generating secrets

```sh
# Internal-token HMAC (32 bytes hex)
openssl rand -hex 32

# JWT secret (Phase 2 — DIY auth)
openssl rand -hex 64
```

---

## Pre-launch checklist

(Mirror of [07-v2-todo.md → Pre-launch checklist](07-v2-todo.md#pre-launch-checklist--separate-from-phases--do-before-going-public))

- [ ] Rotate any credentials ever pasted into chats/commits
- [ ] All four services deployed + reachable
- [ ] `curl https://<gateway>/api/health` returns `{ status: "ok" }`
- [ ] `curl https://<crawler>/api/health` returns `{ status: "ok" }`
- [ ] `curl https://<ai>/api/health` returns `{ status: "ok" }`
- [ ] Client at production URL can run an audit end-to-end
- [ ] SSRF guards active (try `curl -X POST .../api/audit/start -d '{"url":"http://169.254.169.254/"}'` → expect rejection)
- [ ] Body limits active (try POST with 10 MB JSON → 413)
- [ ] Sentry receiving error events from all services
- [ ] Better Stack uptime monitors green for 24h
- [ ] Status page link in client footer
- [ ] Domain SSL cert valid (`curl -I https://<domain>` returns `HTTP/2 200`)
- [ ] Robots.txt + sitemap.xml on the client
- [ ] Privacy + Terms pages (only if Phase 2 auth is live and you collect user emails)

---

## Rollback

### Vercel

Dashboard → Deployments → previous green deploy → "Promote to Production". Atomic.

### Fly.io

```sh
fly releases       # list recent releases
fly releases rollback <version>
```

### HF Spaces

Push the previous commit:

```sh
cd hf-ai-service
git revert HEAD && git push
# OR
git reset --hard <previous-sha> && git push --force  # destructive
```

### Database migrations

Drizzle migrations are forward-only. For Phase 1 (small schema), reverse manually with SQL. For Phase 2+, write a `down.sql` for every migration and keep them in source control.

---

## Cost projections (free tier ceiling)

| Service       | Free ceiling                              | What hits it first                                      |
| ------------- | ----------------------------------------- | ------------------------------------------------------- |
| Vercel        | 100 GB bw/mo                              | Image-heavy landing pages with traffic > ~10k visits/mo |
| Fly.io        | 3× shared-1x VMs                          | Concurrent traffic > ~10 RPS sustained per service      |
| HF Spaces     | 16 GB RAM (overprovisioned for our needs) | N/A — but Space sleeps after inactivity                 |
| Supabase      | 500 MB DB / 5 GB bw/mo                    | After ~50k audits stored (each ~10 KB)                  |
| Upstash       | 10k cmd/day                               | After ~500 cache reads/day per audit + queue ops        |
| Browserless   | 1k units/mo                               | After ~1000 audits/mo                                   |
| Gemini (free) | 1500 req/day                              | After ~1500 unique audits/day                           |
| Sentry        | 5k events/mo                              | If any service has a noisy bug                          |
| Better Stack  | 3 GB log/mo                               | Verbose logging at >50 RPS sustained                    |

**Rough first-hard-limit ranking** (most-likely-to-bite-first → least): Browserless 1k/mo → Gemini 1.5k/day → Upstash 10k/day. Plan a spend ceiling of ~$30/mo for the first paid tier of all three.

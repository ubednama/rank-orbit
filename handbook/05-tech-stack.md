# 05 — Tech Stack (Locked Decisions)

Quick-reference table. For the _why_ behind each, see [08-decisions.md](08-decisions.md).

## Core

| Concern                       | Choice                         | Notes                              |
| ----------------------------- | ------------------------------ | ---------------------------------- |
| Monorepo                      | **pnpm workspaces + Makefile** | Dropping Nx (ADR 004)              |
| Package manager (JS)          | pnpm 10.x                      | Enforced via preinstall            |
| Package manager (Python)      | uv                             | Replaces pip; lockfile = `uv.lock` |
| Package manager (Go, phase 3) | Go modules                     | Standard                           |

## Frontend

| Concern      | Choice                                        |
| ------------ | --------------------------------------------- |
| Framework    | Next.js 16 (App Router)                       |
| UI           | React 19 + Shadcn/UI (Radix) + Tailwind 4     |
| Server state | TanStack React Query                          |
| Auth client  | Custom hook over `fetch` (no third-party SDK) |
| Local cache  | localStorage with TTL wrapper                 |
| Streaming    | EventSource (with sse_token pattern, see 03)  |
| Hosting      | Vercel                                        |

## Backend

| Service                 | Framework              | Hosting            |
| ----------------------- | ---------------------- | ------------------ |
| api-gateway (phase 1–2) | Express 5              | Fly.io             |
| api-gateway (phase 3+)  | Go + chi router        | Fly.io             |
| crawler-service         | Fastify (thin wrapper) | Fly.io             |
| ai-service              | FastAPI + LangChain    | HF Spaces (Docker) |

## Data

| Concern               | Choice                                              |
| --------------------- | --------------------------------------------------- |
| Primary DB            | Supabase Postgres                                   |
| ORM (Node)            | Drizzle                                             |
| ORM/SQL (Go, phase 3) | pgx + sqlc (consume Drizzle migrations)             |
| ORM (Python)          | None — ai-service is stateless                      |
| Cache                 | Upstash Redis                                       |
| Queue                 | BullMQ on Upstash Redis                             |
| Object storage        | Cloudflare R2 (only when needed, e.g., PDF exports) |

## Browser automation

| Concern          | Choice                             |
| ---------------- | ---------------------------------- |
| Headless browser | Browserless.io (WS protocol)       |
| Lighthouse       | Browserless built-in               |
| Local fallback   | Puppeteer (dev only, not deployed) |

## AI

| Concern           | Choice                                                   |
| ----------------- | -------------------------------------------------------- |
| LLM provider      | Google Gemini                                            |
| Default model     | `gemini-2.5-flash`                                       |
| Framework         | LangChain (`langchain-google-genai`)                     |
| JSON repair       | `json-repair` (PyPI) — replaces hand-rolled regex        |
| Prompt versioning | Prompts in `apps/ai-service/app/prompts/`, semver-tagged |

## Auth

| Concern                  | Choice                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| Provider                 | **None** — DIY (ADR 002)                                                   |
| JWT lib                  | `jsonwebtoken` (Node) / `golang-jwt/jwt/v5` (Go)                           |
| Password hash            | `argon2id` (`@node-rs/argon2` in Node, `golang.org/x/crypto/argon2` in Go) |
| Token storage (client)   | Access: in-memory; Refresh: HttpOnly Secure SameSite=Strict cookie         |
| Session storage (server) | Postgres `refresh_tokens` table with rotation                              |

## Observability

| Concern | Choice                                            |
| ------- | ------------------------------------------------- |
| Logs    | Better Stack (free tail, 3GB/mo) — JSON to stdout |
| Errors  | Sentry (free 5k errors/mo)                        |
| Uptime  | Better Stack monitors                             |
| Tracing | OpenTelemetry → Grafana Cloud Tempo (phase 3+)    |
| Metrics | (deferred to phase 3+)                            |

## CI/CD

| Concern         | Choice                                 |
| --------------- | -------------------------------------- |
| CI              | GitHub Actions                         |
| CD (client)     | Vercel git integration                 |
| CD (gateway)    | `flyctl deploy` from GH Actions on tag |
| CD (crawler)    | same                                   |
| CD (ai-service) | HF Spaces git push                     |

## Secrets

| Where                   | What                                  |
| ----------------------- | ------------------------------------- |
| Local dev               | `.env.local` per app (gitignored)     |
| CI                      | GitHub Environments (per-env secrets) |
| Prod (gateway, crawler) | Fly.io secrets                        |
| Prod (ai-service)       | HF Spaces secrets                     |
| Prod (client)           | Vercel project envs                   |

## Tooling (per language)

| Lang   | Linter           | Formatter   | Type check    | Test                    |
| ------ | ---------------- | ----------- | ------------- | ----------------------- |
| TS/JS  | ESLint 10 (flat) | Prettier    | tsc           | Jest (v1) → Vitest (v2) |
| Python | Ruff             | Ruff format | mypy (strict) | pytest                  |
| Go     | golangci-lint    | gofumpt     | (built-in)    | testing + testify       |

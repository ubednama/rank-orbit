# Rank Orbit

SaaS SEO analyzer. Paste a URL, get Lighthouse metrics + AI-generated insights streamed live via Server-Sent Events.

## Read this first

The full architectural spec lives in [handbook/](handbook/). Start with:

1. [handbook/00-prerequisites.md](handbook/00-prerequisites.md) — git rules, tooling, session discipline
2. [handbook/01-product.md](handbook/01-product.md) — what we're building
3. [handbook/05-tech-stack.md](handbook/05-tech-stack.md) — locked technical decisions
4. [handbook/SESSION_LOG.md](handbook/SESSION_LOG.md) — what happened last session

For deployment, see [handbook/11-deployment.md](handbook/11-deployment.md).
For the current bug/feature backlog, see [handbook/10-known-issues.md](handbook/10-known-issues.md).

## Quickstart

```sh
make install          # pnpm install + per-service installs (Python venv, etc.)
make dev-ai-service   # run ai-service locally (http://localhost:8000)
make dev-api-gateway  # run api-gateway locally (http://localhost:3333)
make dev-crawler-service # run crawler-service (http://localhost:3001)
make dev-client       # run Next.js client (http://localhost:5000)
make build            # build all
make ci               # what CI runs: install + lint + typecheck + test + build
```

See [Makefile](Makefile) for all targets.

## Layout

```
.
├── handbook/                   # spec — read at session start
├── apps/
│   ├── ai-service/             # Python FastAPI + LangChain + Gemini
│   ├── api-gateway/            # Express 5 (Go phase 3)
│   ├── crawler-service/        # Fastify (Browserless rewrite in Phase 1)
│   └── client/                 # Next.js 16 App Router
├── libs/
│   ├── db/                     # Drizzle schema + Postgres client
│   └── shared/types/           # Cross-service TS interfaces
├── package.json                # pnpm workspaces (no Nx — see ADR 004)
├── pnpm-workspace.yaml
├── Makefile                    # build entrypoint
├── tsconfig.base.json, eslint.config.mjs, jest.config.ts
└── .github/workflows/ci.yml
```

## Tech stack at a glance

- **Frontend**: Next.js 16, React 19, Shadcn/UI, Tailwind 4, TanStack Query
- **Backend**: Express 5 (gateway, → Go phase 3); Fastify (crawler); FastAPI + LangChain (AI)
- **Data**: Postgres (Supabase), Drizzle ORM, Redis (Upstash), BullMQ
- **Browser automation**: Browserless.io (planned — Phase 1)
- **Auth**: DIY JWT with `jsonwebtoken` + `argon2id` (Phase 2)
- **Hosting**: Vercel (client), Fly.io (gateway, crawler), HF Spaces (ai-service)
- **Observability**: Better Stack + Sentry (Phase 2)

Full rationale in [handbook/08-decisions.md](handbook/08-decisions.md).

## License

MIT

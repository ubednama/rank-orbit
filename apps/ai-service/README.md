---
title: Rank Orbit AI Service
emoji: 🚀
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: SEO insights via LangChain + Google Gemini for the rank-orbit gateway
---

# ai-service

Stateless Python FastAPI service that takes crawler output (HTML + metadata + Lighthouse metrics) and returns AI-generated SEO insights via Google Gemini (`langchain-google-genai`).

> **Hugging Face Spaces note**: the YAML frontmatter above is read by the HF Spaces UI when this directory is pushed as a Space repo. The `app_port: 7860` matches what `Dockerfile` exposes by default. Set `GOOGLE_API_KEY` (and later `INTERNAL_TOKEN_SECRET`) in **Settings → Repository secrets** of the Space.

See [../../handbook/02-architecture.md](../../handbook/02-architecture.md) for how this service fits into the system, and [../../handbook/03-system-design.md](../../handbook/03-system-design.md#auth--diy-with-jsonwebtoken) for the trust boundary (gateway-only via `X-Internal-Token` HMAC, phase 1).

## Quickstart

```sh
make install     # create venv + install pinned deps
cp .env.example .env.local   # then fill in GOOGLE_API_KEY
make dev         # uvicorn --reload on http://localhost:8000
```

## Endpoints

- `GET /api/health` → `{ status, service, timestamp }`
- `POST /api/analyze` → `{ ai_analysis: AIResponse }`

Schema: [app/models/schemas.py](app/models/schemas.py). Per [ADR 006](../../handbook/08-decisions.md#adr-006), `technical_analysis` is **not** part of `AIResponse` — it's owned by the crawler.

## Deploy

Target: Hugging Face Spaces (Docker SDK). See [Dockerfile](Dockerfile).

```sh
make dockerbuild
make dockerrun
```

For HF Spaces:

1. Create a new Space (Docker SDK)
2. Push this directory as the Space's repo (just `apps/ai-service/` — Spaces are single-app repos)
3. Set `GOOGLE_API_KEY` and `INTERNAL_TOKEN_SECRET` (phase 1) in Space secrets

## Files

- [app/main.py](app/main.py) — FastAPI app, router registration, startup hook
- [app/api/routes.py](app/api/routes.py) — endpoint handlers
- [app/services/ai_service.py](app/services/ai_service.py) — LangChain pipeline + JSON repair
- [app/models/schemas.py](app/models/schemas.py) — pydantic request/response models
- [app/core/config.py](app/core/config.py) — settings loaded from .env via pydantic-settings
- [app/core/logging_config.py](app/core/logging_config.py) — Winston-style structured logging (will move to JSON in phase 2 per ADR 010)

## Phase 1 follow-ups

See [../../handbook/06-phases.md](../../handbook/06-phases.md#phase-1--mvp-launch-on-free-tier):

- Internal-token HMAC auth on `/analyze`
- Body size limit
- LangChain timeout
- Replace JSON-repair regex with [`json-repair`](https://pypi.org/project/json-repair/) PyPI package
- Generic error responses (no operational state in response body)

## Phase 2 follow-ups

- CORS, GZip, exception handler middleware
- Structured JSON logs to stdout (drop file-based logging — HF Spaces filesystem is ephemeral)
- pytest suite (start with JSON parser + prompt template)
- Switch to uv lockfile (`uv.lock`)
- Move black to `requirements-dev.txt`; add ruff + mypy

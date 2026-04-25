# 00 — Prerequisites

Rules of engagement. Read once; revisit when in doubt.

## Tooling versions

| Tool   | Version | Notes                                                                                         |
| ------ | ------- | --------------------------------------------------------------------------------------------- |
| Node   | 20 LTS  | Pin via `.nvmrc` (add in phase 0)                                                             |
| pnpm   | 10.x    | Enforced via `preinstall: npx only-allow pnpm` in root package.json                           |
| Python | 3.13+   | For `ai-service`; venv per app. macOS install: `brew install python@3.13`                     |
| uv     | latest  | Use instead of pip for Python deps (faster, lockfile). `pipx install uv` or `brew install uv` |
| Go     | 1.22+   | Phase 3 onward (gateway rewrite)                                                              |
| Make   | any     | Root Makefile is the build entrypoint after Nx is dropped (ADR 004)                           |
| Docker | latest  | Local dev optional; required for HF Spaces deploy of ai-service                               |

## Repo layout

```
rank-orbit/
├── apps/
│   ├── api-gateway/       # Express today; Go in phase 3
│   ├── ai-service/        # Python FastAPI
│   ├── crawler-service/   # Fastify (thin wrapper around Browserless after phase 1)
│   └── client/            # Next.js
├── libs/
│   ├── db/                # Drizzle schema + client
│   └── shared/types/      # Cross-service TS interfaces
├── handbook/              # This folder — source of truth for intent
├── Makefile               # Root build entrypoint (post-Nx, phase 0)
└── pnpm-workspace.yaml
```

## Git conventions

### Commits

- **NEVER add `Co-Authored-By:` lines.** Not for AI assistants, not for anyone. The commit author is the human pushing the commit. (See ADR 011.)
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `perf:`, `ci:`, `build:`
- One concern per commit. If you can't summarize in 70 chars, split.
- Body explains _why_, not _what_. The diff is the _what_.
- No "WIP" / "fix typo" commits on `main`; squash before merge.

### Branches

- `main` — always deployable. CI green, no broken builds.
- `feat/<short-name>` — features
- `fix/<short-name>` — bug fixes
- `chore/<short-name>` — tooling, deps, docs
- `migration/<from>-to-<to>` — large structural moves (e.g. `migration/nx-to-make`)

### PR template

```
## Summary
1–3 bullets on what changed and why.

## Test plan
- [ ] manual checks
- [ ] automated tests (v2+)

## Handbook updates
- [ ] ADR added/updated (if architectural change)
- [ ] SESSION_LOG entry written
- [ ] v2-todo updated (if anything was deferred)
```

## Secrets

- `.env` files NEVER committed. Tracked: `.env.example` per app.
- Production secrets: GitHub Environments (CI), Fly.io secrets (gateway, crawler), HF Spaces secrets (ai-service), Vercel project envs (client).
- Rotate any credential ever pasted into a chat or commit.

## Session discipline (this is the most important rule)

For chat-session continuity, every session follows this loop:

1. **At session start**: read [SESSION_LOG.md](SESSION_LOG.md) latest entry. Catch up on what was done, what's pending, what was decided.
2. **During session**: when an architectural decision is made, write the ADR immediately to [08-decisions.md](08-decisions.md). Don't trust memory across sessions.
3. **At session end**: append a new SESSION_LOG entry. Format:

   ```
   ## YYYY-MM-DD — <one-line title>

   **Done:** what was completed
   **Decided:** any new ADRs (link to 08-decisions.md)
   **Deferred:** anything pushed to 07-v2-todo.md
   **Next:** what the next session should pick up
   **Open questions:** anything unresolved
   ```

## Code review (self-checklist for security-sensitive changes)

Solo project — formal review not required. But for security-sensitive changes (auth, SSRF, body parsers, CORS, rate limits), use this checklist:

- [ ] Input validated at boundary (Zod / pydantic)?
- [ ] Output sanitized (no stack traces, no internal paths in client responses)?
- [ ] Body size capped?
- [ ] Timeout set on every external call (axios, fetch, DB, Redis, Gemini)?
- [ ] Rate limit appropriate for the route?
- [ ] Logged with `request_id` (when phase 2 observability lands)?
- [ ] No secrets/JWTs in URLs?

## Working with AI assistants

If using Claude / Cursor / Copilot:

- AI gets the same git rules: **no `Co-Authored-By`**. AI is a tool, not a co-author.
- Always have AI read [SESSION_LOG.md](SESSION_LOG.md) before working.
- Always have AI write a SESSION_LOG entry before ending the session.
- AI is not authoritative; verify against the code.
- If AI proposes a change that contradicts an ADR, the ADR wins unless the user explicitly chooses to add a new ADR superseding it.

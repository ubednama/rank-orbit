# Rank Orbit Handbook

Source of truth for this project. If a chat session loses context or hallucinates, point a fresh session here.

## Reading order for a new session

1. **[00-prerequisites.md](00-prerequisites.md)** — rules of engagement (git, tooling, commit conventions, no co-author)
2. **[01-product.md](01-product.md)** — what we're building and for whom
3. **[05-tech-stack.md](05-tech-stack.md)** — locked technical decisions (skip the _why_; that's in 08)
4. **[SESSION_LOG.md](SESSION_LOG.md)** — what happened last session, what's pending

For deep dives:

- **[02-architecture.md](02-architecture.md)** — service map and high-level data flow (Mermaid diagrams)
- **[03-system-design.md](03-system-design.md)** — SSE, queue, cache, auth, trust boundaries, SSRF, rate limit, observability
- **[04-low-level-flows.md](04-low-level-flows.md)** — sequence diagrams for every user-facing flow
- **[06-phases.md](06-phases.md)** — phased build plan (Phase 0 → 4) with checkboxes
- **[07-v2-todo.md](07-v2-todo.md)** — intentionally deferred work, with rationale
- **[08-decisions.md](08-decisions.md)** — ADRs (why we chose X over Y)
- **[09-glossary.md](09-glossary.md)** — domain terms
- **[10-known-issues.md](10-known-issues.md)** — outstanding bugs, security gaps, perf concerns + feature ideas backlog
- **[11-deployment.md](11-deployment.md)** — per-service deployment guide (HF Spaces, Fly.io, Vercel, Supabase, Upstash, Browserless)

## How to update this handbook

- **Decisions** → append a new ADR to [08-decisions.md](08-decisions.md) (date + rationale; never edit old ADRs, supersede)
- **Session work** → append a new entry to [SESSION_LOG.md](SESSION_LOG.md) (date + what changed + what's next + open questions)
- **Deferred work** → add to [07-v2-todo.md](07-v2-todo.md) with the reason it's deferred
- **Phase progress** → tick boxes in [06-phases.md](06-phases.md)
- **Don't delete content** — supersede instead, link the old

## How NOT to use this handbook

- This is the **product** handbook. Personal/contextual notes go elsewhere.
- This handbook describes _intent and decisions_. The code is authoritative for _behavior_ — when they disagree, fix the handbook or the code, don't ignore the divergence.
- Don't paste secrets, credentials, or anything that shouldn't be public. This folder is committed to git.

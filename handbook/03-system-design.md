# 03 — System Design

Detailed design of cross-cutting concerns. Code-level shape; not copy-paste implementations.

## Server-Sent Events (SSE)

### Why SSE, not WebSocket

- Audit data flow is unidirectional (server → client)
- SSE is HTTP — works through every proxy and CDN with zero special config
- Browser auto-reconnect with `Last-Event-ID` is built in (we _don't_ use it — see retry semantics)
- Lighter than WebSocket: no upgrade handshake, no ping/pong protocol to manage

### Event types

| Type        | Payload                         | When emitted                  | Client action                              |
| ----------- | ------------------------------- | ----------------------------- | ------------------------------------------ |
| `status`    | `{ message: string }`           | At each phase boundary        | Toast (info)                               |
| `sanitized` | `{ originalUrl, sanitizedUrl }` | When tracking params stripped | Toast (success)                            |
| `crawler`   | full `CrawlResponse`            | After crawler returns         | Render Lighthouse + metadata sections      |
| `ai`        | `{ ai_analysis: AIResponse }`   | After AI returns              | Render insights section                    |
| `error`     | `{ message, code }`             | On any failure                | Show error UI                              |
| `complete`  | `{}`                            | At very end                   | Close EventSource, persist to localStorage |

### Lifecycle (post-phase-1)

1. Client `POST /audit/start` (Bearer JWT or anon) → server returns `{ sse_token, expires_at }`. Token is single-use, IP-bound, 60s TTL, HMAC-signed by gateway.
2. Client `GET /audit/stream?sse_token=…` → server validates HMAC, IP match, expiry, single-use; opens SSE.
3. **The user JWT never enters the URL.**

### Keepalive + timeout

- `: ping\n\n` every 20s (prevents idle timeout in Cloudflare/Vercel proxies)
- Hard timeout: 90s for the whole audit (was 5min in v0 — too long; reduce in phase 1)

### Cleanup on client disconnect

This is the bug surfaced in Step 2 audit (🔴 #1). The fix is mandatory in phase 1.

- On `req.close`: gateway must propagate cancellation to in-flight crawler call + BullMQ job
- Express phase 1: `AbortController` passed through every awaited call
- Go phase 3: `context.Context` from `r.Context()` propagated everywhere

### Retry semantics

- On gateway-side error: emit `error` event, then `complete`, then `res.end()`. **Do not** include `retry: <ms>` directive — the audit failed; we don't want EventSource auto-reconnecting to retry the same operation.

### Single-flight per sanitized URL

- When request A and request B arrive for the same URL within ~1s, only A executes; B subscribes to A's stream.
- Implement via Redis `SET NX` lock keyed `sse:lock:<sanitized_url>` with TTL = SSE timeout.

## Queueing — BullMQ on Upstash

### Why this stack (vs RabbitMQ, vs no queue)

- **vs RabbitMQ** — same Upstash account already used for cache → no second free tier to manage; BullMQ is the de-facto Node queue, recruiter-recognizable
- **vs no queue** — queue gives us retries with backoff, DLQ for poisoned jobs, job priorities (paid tier > free in v4), and `job.waitUntilFinished()` for the SSE await pattern
- **vs Cloudflare Queues** — would force AI worker into Cloudflare Workers (Python doesn't run there)

### Queues

| Name          | Producer | Consumer          | Concurrency   | Retry | Backoff                       |
| ------------- | -------- | ----------------- | ------------- | ----- | ----------------------------- |
| `ai-analysis` | gateway  | ai-service worker | 1 (free tier) | 3     | exponential, base 2s, max 30s |

### Job lifecycle

```
gateway: queue.add('analyze', { page_content, metadata, lighthouse }, { jobId, attempts: 3 })
       ↓
       await job.waitUntilFinished(events, 60_000)
       ↓
ai-service worker: queue.process('analyze', async job => { …; return result })
       ↓
gateway: receives result, emits 'ai' SSE event
```

### Failure modes

- **Worker timeout** — Gemini hangs → worker job times out (set in worker config to 50s) → BullMQ retries with backoff up to 3 attempts → final failure → moved to `ai-analysis:failed` (DLQ)
- **Worker crash** — BullMQ stalled-job recovery picks it up after lock TTL (30s)
- **Gateway crash** — job continues; result is dropped (no consumer waiting). Acceptable; user can retry.

### Migration from current RabbitMQ-RPC

Per ADR 003 — see Phase 0 in [06-phases.md](06-phases.md) for the swap checklist.

## Caching — layered

### Layers (read order)

1. **Client localStorage** (24h TTL) — keyed by URL and sanitized URL (dual-key)
2. **Gateway Redis** (24h TTL) — `audit:<sanitized_url>` → full audit JSON
3. **Postgres `audits` table** (durable) — read by `(url, createdAt DESC LIMIT 1)`
4. **Content-hash dedup for AI** — when crawler returns, hash HTML; if a row exists with same `contentHash` and AI was run, reuse the AI result without re-calling Gemini

### Write strategy

- After full audit completes: write Postgres row first, then Redis cache (Redis can fail; DB is source of truth)
- Single-flight lock prevents thundering-herd on cache miss
- Negative cache: 4xx responses from crawler cached for 1h (`audit:neg:<sanitized_url>`) to avoid hammering broken links

### Eviction

- Redis: TTL only, no manual eviction
- Postgres: cron job (Supabase `pg_cron`) deletes audits > 90 days old (phase 2)
- localStorage: per-key TTL check on read

### Anti-patterns to avoid

- Don't write to Redis on cache miss until the audit succeeds (avoid caching partial state)
- Don't use Redis as the source of truth for quota — use Postgres `auditUsage` table (Redis can lose data; quota is billing-adjacent)
- Don't cache AI failures with `seo_score: 0` (the v0 bug, Step 2 🔴 #3)

## Auth — DIY with `jsonwebtoken`

Per ADR 002 — no managed auth provider, no Lucia, no better-auth.

### Phase 1 (v2 launch): simple login

Stack: `argon2id` for passwords, `jsonwebtoken` for JWTs, Postgres `users` table.

#### Tables (additions to libs/db/src/schema.ts)

```ts
users: {
  id: uuid (pk),
  email: text (unique, indexed, lowercased),
  password_hash: text,
  email_verified_at: timestamp (nullable; v3 feature),
  created_at, updated_at
}
```

#### Endpoints

- `POST /auth/signup` `{ email, password }` → 201 `{ user_id }`. Sends verification email in v3.
- `POST /auth/login` `{ email, password }` → 200 `{ access_token, expires_at }`. Token in body, not cookie (phase 1 simple).
- `GET /auth/me` (Bearer token) → 200 `{ id, email, created_at }`
- `POST /auth/logout` → 204 (phase 1 stateless: client just discards token; no server-side blacklist yet)

#### Token shape

```json
{
  "sub": "<user_id>",
  "iat": <unix>,
  "exp": <unix + 30min>,
  "type": "access"
}
```

Signed HS256 with `JWT_SECRET` env var (32+ random bytes). Verified on every protected request via middleware that calls `jsonwebtoken.verify`.

#### Password rules

- Min 12 chars (no other complexity rules — length > entropy)
- Hash with `argon2id` (memory cost ~64MB, time cost 3, parallelism 1)
- Constant-time comparison built in (`@node-rs/argon2`)

### Phase 2: refresh tokens with auto-refresh

Add to `users` flow:

- Login returns BOTH access (15min) and refresh (30 days) tokens
- Refresh token stored server-side in `refresh_tokens` table (id, user_id, token_hash, expires_at, revoked_at, replaced_by) — rotated on every use; old token marked `replaced_by`
- Access token in `Authorization` header (memory only on client; never localStorage)
- Refresh token in `HttpOnly Secure SameSite=Strict` cookie (path `/auth/refresh` only)
- Client interceptor: on 401 from any endpoint, call `POST /auth/refresh`; on success, retry original request; on failure, redirect to login
- Logout: revoke refresh token in DB + clear cookie

#### Endpoints (added in phase 2)

- `POST /auth/refresh` (cookie) → 200 new `{ access_token }` + sets new refresh cookie
- `POST /auth/logout` (cookie) → 204 + revokes refresh + clears cookie
- `POST /auth/sessions` (Bearer) → 200 list of active refresh tokens (for "log out other devices")
- `DELETE /auth/sessions/:id` → 204 revoke

### SSE auth (the `sse_token` pattern)

Browser `EventSource` cannot set headers, so the JWT can't ride in `Authorization`.

1. Client `POST /audit/start` with `Authorization: Bearer <jwt>` → server returns `{ sse_token, expires_at }`
2. `sse_token` is HMAC over `(user_id, ip, expires_at)`, 60s TTL, single-use (server marks it consumed in Redis on first read)
3. Client `GET /audit/stream?sse_token=<sse_token>` → server validates HMAC, IP match, expiry, single-use; opens SSE
4. The user's actual JWT never enters the URL

## Trust boundaries

| Caller       | Callee                 | Mechanism                                                                                           |
| ------------ | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Internet     | Gateway                | DIY JWT (phase 2+); rate limit by IP (phase 1 anon)                                                 |
| Gateway      | Crawler                | Shared secret in `X-Internal-Token` header (HMAC of `body+timestamp`; rotates monthly)              |
| Gateway      | AI worker (via BullMQ) | Job authority is implicit (only gateway can publish to `ai-analysis` — Redis is private to Upstash) |
| AI worker    | Gemini                 | API key (env var, never logged)                                                                     |
| Crawler      | Browserless            | API token in WS connect URL                                                                         |
| All services | Postgres               | Connection string (env var)                                                                         |
| All services | Redis                  | Connection string with `tls=true` (env var)                                                         |

## SSRF mitigation

Defense in depth — both gateway and crawler validate.

### Algorithm

```
function isAllowedUrl(input: string): { ok: true } | { ok: false, reason: string } {
  // 1. Scheme check
  url = new URL(input)
  if (!['http:', 'https:'].includes(url.protocol)) return { ok: false, reason: 'scheme' }

  // 2. Resolve hostname to IP
  ip = await dns.lookup(url.hostname)

  // 3. Block private/link-local/loopback ranges
  if (isPrivateIP(ip) || isLoopback(ip) || isLinkLocal(ip) || isReserved(ip))
    return { ok: false, reason: 'private_ip' }

  // 4. Block hostnames that look like cloud metadata
  if (BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase()))
    return { ok: false, reason: 'metadata_host' }

  return { ok: true }
}
```

### What to block

- IPv4: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `224.0.0.0/4`, `240.0.0.0/4`
- IPv6: `::/128`, `::1/128`, `fc00::/7`, `fe80::/10`, `ff00::/8`
- Hostnames: `metadata.google.internal`, `metadata`, `_metadata`, anything ending `.internal`

### Defense against redirects

- Crawler instructs Browserless to revalidate every redirect hop (Browserless allows request interception). Reject if any hop resolves to a blocked IP.
- DNS rebinding: pin the resolved IP at validation time, then make the actual request to that IP (with `Host` header set to original hostname). Browserless makes this awkward — alternative is short DNS TTL caching + revalidate before each connect.

### Library suggestions

- Node: `ipaddr.js` for range checks, `dns/promises` for resolution
- Go: `net.IP.IsPrivate()` + `IsLoopback()` etc., `net.LookupIP`

## Rate limiting

| Tier                   | Limit      | Window         | Storage                | Key        |
| ---------------------- | ---------- | -------------- | ---------------------- | ---------- |
| Anonymous              | 1 audit    | lifetime       | Postgres `auditUsage`  | IP         |
| Authenticated free     | 3 audits   | calendar month | Postgres `auditUsage`  | userId     |
| HEAD `/audit/stream`   | 10 probes  | minute         | Redis (sliding window) | IP         |
| `POST /auth/login`     | 5 attempts | 15min          | Redis                  | IP + email |
| All endpoints (sanity) | 100 req    | minute         | Redis                  | IP         |

Middleware order: global-IP → auth-specific → endpoint-specific.

## Observability (phase 2)

### Request correlation

- Every inbound HTTP request gets `X-Request-Id: <uuid>` (echo client's if provided, else generate)
- ID propagated to crawler call (`X-Request-Id` header), to BullMQ job (in payload), to Postgres (audit row column), to all log lines (Winston/pino default field)

### Logs

- Structured JSON to stdout
- Fields: `ts, level, service, request_id, user_id, msg, ...context`
- Shipping: Better Stack tail
- Retention: 3 days on Better Stack free tier

### Errors

- Sentry SDK in every service (Node, Python, Go)
- DSN per service in env
- PII scrubbing: never send body/headers to Sentry
- Release tagging from git SHA

### Uptime

- Better Stack monitor on `GET /api/health` for each service
- Alert on >2 failed checks in 5min
- Status page (Better Stack free tier includes one)

### Tracing (deferred to phase 3+)

- OpenTelemetry, exported to Grafana Cloud Tempo (free tier)
- Spans for crawler call, AI job lifecycle, DB calls

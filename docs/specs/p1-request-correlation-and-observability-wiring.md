# Spec: Request Correlation & Observability Wiring

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5 files modified, 1 new)

## Timeline

| Event                 | Date              | Agent/Session      | Commit |
| --------------------- | ----------------- | ------------------ | ------ |
| Created               | 2026-04-03 ~21:00 | Planner (Opus 4.6) |        |
| Status: ready         | 2026-04-03 ~21:00 | Planner (Opus 4.6) |        |
| Claimed (in-progress) |                   |                    |        |
| Spike completed       |                   |                    |        |
| Pre-flight passed     |                   |                    |        |
| Build completed       |                   |                    |        |
| Type check passed     |                   |                    |        |
| Build check passed    |                   |                    |        |
| Playwright verified   |                   |                    |        |
| Status: verified      |                   |                    |        |

---

## Developer Notes

### Raw Signal

The developer commissioned a full production system audit. The audit found that ChefFlow has a structured logger (`lib/logger.ts`) with a `requestId` field that nothing populates. Health checks generate UUIDs per request (`lib/health/public-health.ts:82`) but those IDs die in the response. Middleware sets `x-cf-*` auth context headers but no `X-Request-ID`. Sentry reporter accepts `traceId` via `AppError` but nothing generates one. The result: when something goes wrong in production, there is no way to follow a single user request through middleware, server actions, DB queries, and error reports. Every log line is an island.

The developer's instruction was: "Proceed with the most intelligent decisions on my behalf, in the correct order." The correlation ID system is the highest-leverage observability improvement because the entire logging and error reporting infrastructure already exists and has the right fields; it just needs a single source of truth for the request ID generated at the entry point.

### Developer Intent

- **Core goal:** Every request through the system carries a unique correlation ID from middleware entry to log output to error report to response header.
- **Key constraints:** Zero new dependencies. Build on existing `lib/logger.ts` and `lib/auth/request-auth-context.ts` patterns. Non-breaking (additive only). Must not slow down middleware.
- **Motivation:** Production debugging is currently impossible without reproducing the issue. A correlation ID lets the developer grep one UUID and see the entire request lifecycle.
- **Success from the developer's perspective:** After this ships, every structured log line includes `requestId`, every Sentry error includes `requestId` in tags, and every HTTP response has an `X-Request-ID` header that can be copied from browser DevTools.

---

## What This Does (Plain English)

After this is built, every HTTP request that passes through Next.js middleware gets assigned a UUID. That UUID appears in: (1) a response header (`X-Request-ID`) visible in browser DevTools, (2) every structured log entry emitted by `lib/logger.ts` for that request, and (3) every Sentry error reported during that request. The developer can copy the UUID from a failed request's response headers and search logs to see everything that happened.

---

## Why It Matters

The system has 12 scoped structured loggers and a Sentry reporter, but they are disconnected. A single request touches middleware, server actions, DB queries, and external services with no thread linking them. This makes production debugging require reproduction instead of investigation. One UUID wires the entire observability stack together.

---

## Files to Create

| File                              | Purpose                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `lib/observability/request-id.ts` | Generates, stores, and retrieves request IDs via AsyncLocalStorage |

---

## Files to Modify

| File                                | What to Change                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/auth/request-auth-context.ts`  | Add `REQUEST_ID_HEADER = 'x-request-id'` constant. Add it to the internal headers list so it gets stripped from inbound requests (defense-in-depth).                                                    |
| `middleware.ts`                     | Generate UUID via `crypto.randomUUID()`, set it on request headers as `x-request-id`, set it on response headers as `X-Request-ID`.                                                                     |
| `lib/logger.ts`                     | Import `getRequestId()` from `lib/observability/request-id.ts`. In `buildEntry()`, default `requestId` to `getRequestId()` when not explicitly provided.                                                |
| `lib/monitoring/sentry-reporter.ts` | Import `getRequestId()`. In `reportAppError()`, auto-attach `requestId` as a tag if available.                                                                                                          |
| `lib/health/public-health.ts`       | Replace `randomUUID()` call in `buildPublicHealthSnapshot()` with `getRequestId()` fallback to `randomUUID()` so health check responses share the same request ID when called within a request context. |

---

## Database Changes

None.

---

## Data Model

No new tables or columns. The request ID is ephemeral (lives for the duration of one HTTP request cycle in `AsyncLocalStorage`).

---

## Server Actions

No new server actions. This spec modifies infrastructure only.

---

## UI / Component Spec

No UI changes. The `X-Request-ID` response header is visible in browser DevTools Network tab.

### States

Not applicable (infrastructure-only change).

---

## Edge Cases and Error Handling

| Scenario                                           | Correct Behavior                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `AsyncLocalStorage` not available (Edge runtime)   | `getRequestId()` returns `undefined`. Logger and Sentry skip the field. No crash.                                 |
| Request bypasses middleware (static assets)        | No request ID generated. Logger entries have no `requestId`. This is correct (no value in tracing static assets). |
| Server action called without prior middleware pass | `getRequestId()` returns `undefined`. Existing behavior preserved (no regression).                                |
| Multiple requests in flight concurrently           | `AsyncLocalStorage` isolates per async context. Each request gets its own UUID. No cross-contamination.           |
| Health check endpoint                              | Gets a request ID from middleware like any other request. `buildPublicHealthSnapshot()` reuses it.                |

---

## Implementation Details

### `lib/observability/request-id.ts`

```typescript
import { AsyncLocalStorage } from 'async_hooks'

const requestIdStore = new AsyncLocalStorage<string>()

/**
 * Run a function with a request ID bound to the current async context.
 * Call this in middleware to establish the correlation ID for the request.
 */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return requestIdStore.run(requestId, fn)
}

/**
 * Get the current request's correlation ID, if available.
 * Returns undefined outside of a request context.
 */
export function getRequestId(): string | undefined {
  return requestIdStore.getStore()
}
```

### Middleware changes (pseudocode)

```typescript
// In middleware.ts, inside the auth() callback:
import { randomUUID } from 'crypto'

// At the top of the handler, before any logic:
const requestId = randomUUID()
requestHeaders.set('x-request-id', requestId)

// On every response (including redirects):
response.headers.set('X-Request-ID', requestId)
```

**Important:** The middleware runs in Next.js Edge Runtime. `AsyncLocalStorage` is available in Edge Runtime as of Node 18+, but the middleware callback is synchronous (no long-lived async context). The `x-request-id` header set on the request is what server components and server actions read via `headers()`. The `AsyncLocalStorage` approach is a secondary mechanism for code that runs in the Node.js runtime (server actions, API routes).

The builder must wire BOTH mechanisms:

1. **Header-based** (primary): middleware sets `x-request-id` on request headers. Server actions read it via `headers().get('x-request-id')`.
2. **AsyncLocalStorage-based** (secondary): for deep library code that doesn't have access to `headers()`.

### Logger changes

In `lib/logger.ts`, line 99, change:

```typescript
requestId: opts.requestId ?? defaultCtx.requestId,
```

to:

```typescript
requestId: opts.requestId ?? defaultCtx.requestId ?? getRequestId(),
```

This is a one-line change. If no explicit requestId is passed and no default context has one, it falls back to the AsyncLocalStorage store.

### Sentry reporter changes

In `lib/monitoring/sentry-reporter.ts`, `reportAppError()` at line 188, add after existing tag assignments:

```typescript
const currentRequestId = getRequestId()
if (currentRequestId) tags.request_id = currentRequestId
```

---

## Verification Steps

1. Start the dev server (`npm run dev`)
2. Open browser DevTools, Network tab
3. Navigate to any authenticated page (e.g., `/dashboard`)
4. Verify: response headers include `X-Request-ID` with a UUID value
5. Navigate to `/api/health/ping`
6. Verify: response headers include `X-Request-ID`
7. Check server console output for structured log lines
8. Verify: JSON log lines include `"requestId":"<same-uuid>"`
9. Trigger a server action error (e.g., navigate to a page that calls a server action with bad input)
10. Check Sentry (or console in dev) for the error report
11. Verify: error report includes `request_id` tag matching the response header

---

## Out of Scope

- Log aggregation (shipping logs to Axiom/Datadog/Logtail) - separate spec
- Persistent rate limiting or circuit breaker state - separate spec
- Client-side error correlation (adding request ID to client error reports) - follow-up
- OpenTelemetry spans or distributed tracing - follow-up
- Changing Sentry sample rate - config change, not a spec

---

## Notes for Builder Agent

1. **Edge Runtime compatibility:** `middleware.ts` runs in Edge Runtime. `crypto.randomUUID()` is available there. `AsyncLocalStorage` from `async_hooks` is available in Node.js runtime but NOT in Edge. The middleware approach must use the **header-based** pattern (set `x-request-id` on request headers). The `AsyncLocalStorage` wrapper in `lib/observability/request-id.ts` is for Node.js-only server action code.

2. **Do not import `async_hooks` in middleware.** The `lib/observability/request-id.ts` file should only be imported in server-side Node.js code (server actions, API routes), never in middleware or client components.

3. **Header propagation pattern:** Follow exactly how `lib/auth/request-auth-context.ts` works. It sets headers on the request in middleware, then downstream code reads them via `headers()`. Do the same for `x-request-id`.

4. **Existing `requestId` in `lib/logger.ts`:** The field already exists (line 25). The `LogContext` interface already has `requestId` (line 69). The `withContext()` method already merges it (line 156). The builder just needs to add the `getRequestId()` fallback at line 99.

5. **Do not modify the health check UUID generation** if `getRequestId()` returns `undefined`. The health check must always have a requestId. Use: `const requestId = getRequestId() ?? randomUUID()`.

6. **Defense-in-depth:** Add `'x-request-id'` to the `INTERNAL_REQUEST_HEADERS` array in `lib/auth/request-auth-context.ts` (line 9-19) so inbound `x-request-id` headers from external clients are stripped before the middleware generates a fresh one. This prevents request ID spoofing.

7. **Response headers on redirects:** When middleware returns `NextResponse.redirect()`, the response headers are a new object. The builder must set `X-Request-ID` on redirect responses too, not just `NextResponse.next()`.

8. **Test with `curl -v`:** The quickest verification is `curl -v http://localhost:3100/api/health/ping 2>&1 | grep -i x-request-id`.

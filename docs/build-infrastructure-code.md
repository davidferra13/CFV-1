# Build: Infrastructure Code (Category 4)

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements
**Audit items addressed:** #14, #18, #19, #46, #47, #48, #49

---

## What Changed

Six infrastructure gaps were closed with new code. These address the transition from a prototype-quality codebase to a production-quality one — proper input validation, atomic DB operations, idempotent job execution, retry logic, circuit breakers for external services, and live data via WebSockets.

---

## Files Created

### `lib/validation/schemas.ts` — Shared Zod Schemas (#19)

Centralizes all Zod schemas in one file with no `'use server'` directive (safe to import anywhere).

**What's in it:**
- `UuidSchema`, `DateStringSchema`, `CentsSchema`, `PositiveCentsSchema`, `PhoneSchema` — primitives
- `EventStatusSchema`, `TransitionEventInputSchema` — FSM types
- `EventBaseSchema`, `ClientBaseSchema`, `LedgerEntrySchema` — entity schemas
- `AutomationExecutionInputSchema` — automation trigger validation
- `safeValidate()` — non-throwing validation helper returning `{ success, data | error }`

**Usage:**
```typescript
import { TransitionEventInputSchema, safeValidate } from '@/lib/validation/schemas'
const result = safeValidate(TransitionEventInputSchema, rawInput)
```

### `lib/resilience/retry.ts` — Retry with Exponential Backoff (#47)

`withRetry()` wraps any async function with exponential backoff retry logic:
- Full-jitter backoff (prevents thundering herd)
- `isTransientError()` classifier: retries on 429, 5xx, network errors; throws immediately on 4xx
- `pushToDLQ()` helper to call after max retries exhausted

**Usage:**
```typescript
import { withRetry, pushToDLQ } from '@/lib/resilience/retry'
try {
  await withRetry(() => sendWebhook(url, payload), { maxAttempts: 5 })
} catch (err) {
  await pushToDLQ(supabase, { jobType: 'webhook_delivery', ... })
}
```

### `lib/resilience/circuit-breaker.ts` — Circuit Breaker (#49)

Prevents cascading failures when external services are down.

**State machine:** `CLOSED` → `OPEN` (on N failures) → `HALF_OPEN` (after timeout) → `CLOSED` (on success)

**Pre-configured breakers for all external services:**
```typescript
import { breakers } from '@/lib/resilience/circuit-breaker'
await breakers.stripe.execute(() => stripe.charges.create(...))
await breakers.resend.execute(() => resend.emails.send(...))
await breakers.gemini.execute(() => model.generateContent(...))
```

**Health integration:** `getCircuitBreakerHealth()` is called by `/api/health` and included in its response. If any circuit is OPEN, health returns `degraded`.

### `lib/realtime/subscriptions.ts` — Supabase Realtime Hooks (#46)

Client-side React hooks for live data updates via Supabase WebSockets (Postgres Changes API).

**Hooks provided:**
- `useEventStatusSubscription(eventId, onStatusChange)` — fires when event FSM transitions
- `useNotificationSubscription(tenantId, onNotification)` — fires on new notification rows
- `useChatMessageSubscription(conversationId, onMessage)` — fires on new chat messages
- `useActivityFeedSubscription(tenantId, onActivity)` — fires on new activity log entries
- `useTableSubscription(channelName, options)` — low-level hook for any table/event

---

## Files Modified

### `lib/events/transitions.ts` — Zod input validation (#19)

Added `import { TransitionEventInputSchema }` and `TransitionEventInputSchema.parse(...)` at the entry of `transitionEvent()`.

Before, the function accepted arbitrary input shapes. Now, if `eventId` is not a valid UUID or `toStatus` is not a valid `EventStatus` enum value, it throws immediately with a Zod error — before any database access.

### `app/api/health/route.ts` — Circuit breaker health (#49)

Added `getCircuitBreakerHealth()` to the health check response. Circuit breaker states are now included in `/api/health` output under `circuit_breakers`. If any circuit is OPEN, the overall status becomes `degraded`.

---

## Migrations Created

### `20260320000001_atomic_transition_and_dlq.sql` (#14, #48)

**1. `transition_event_atomic()` PostgreSQL function:**
Wraps event status UPDATE + `event_state_transitions` INSERT in a single database transaction via `SECURITY DEFINER` function. Called via `supabase.rpc('transition_event_atomic', ...)`.

The critical atomicity gap: previously, if the `event_state_transitions` INSERT failed (line 192-206 of transitions.ts), the event status was already updated but the FSM audit trail had no record of the transition. With the RPC, both writes succeed or both roll back.

**2. `dead_letter_queue` table:**
Stores permanently failed jobs (those that exhausted max retry attempts):
- `job_type`: `'automation'`, `'webhook_delivery'`, `'cron'`, `'email'`
- `job_id`: original job ID or idempotency key
- `payload`: JSONB for replay
- `resolved_at` / `resolved_by` / `resolution_note`: operator resolution tracking

**3. `job_retry_log` table:**
Tracks retry state for active jobs before they reach DLQ:
- Unique on `(job_type, job_id)` — prevents duplicate retry entries
- `next_retry_at` for scheduling
- `status`: `pending | retrying | succeeded | dead`

### `20260320000002_automation_idempotency.sql` (#18)

**Idempotency for automation executions:**
- Adds `idempotency_key TEXT` to `automation_executions` (if table exists)
- Adds `status`, `attempt_number`, `last_error`, `dlq_id` columns
- Creates `UNIQUE INDEX` on `(tenant_id, idempotency_key)` — prevents double-firing

**`automation_execution_log` table (standalone):**
Purpose-built log with idempotency enforcement even if the original `automation_executions` table has different structure:
- `UNIQUE INDEX` on `(tenant_id, idempotency_key)` — any duplicate attempt hits the constraint and returns without re-executing

---

## Architecture Decisions

### Why in-memory circuit breakers?

An in-memory circuit breaker resets on cold start (every Vercel serverless invocation). This is acceptable because:
1. Supabase Realtime provides per-connection isolation anyway
2. The circuit trips based on failures within a single invocation — which is usually a cron run or API call
3. For persistent state, wire `getCircuitBreaker()` to use Upstash Redis (future improvement)

### Why `SECURITY DEFINER` on the RPC?

The `transition_event_atomic()` function uses `SECURITY DEFINER` so it executes with the function owner's privileges (postgres), bypassing RLS for the internal writes. The app-level code still enforces authorization BEFORE calling the RPC (the `transitionEvent()` function in TypeScript checks role, tenant ownership, and FSM rules). This is the standard Supabase pattern for multi-row atomic operations.

### Why not wrap all server actions in transactions?

Most server actions do a single write — no transaction needed. The only genuinely multi-step operations (transitions + audit trail, inquiry conversion) are the ones we targeted. Adding unnecessary transactions adds latency and complexity.

---

## Related Documents

- `docs/audit-system-concepts.md` — Original audit identifying these gaps
- `docs/disaster-recovery.md` — DLQ items appear in incident runbooks
- `lib/events/fsm.ts` — Pure FSM logic (extracted in Category 2, used by validation schemas)

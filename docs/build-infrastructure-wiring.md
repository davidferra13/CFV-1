# Build: Infrastructure Code Wiring (Category 4 — Part 2)

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements
**Follows:** `docs/build-infrastructure-code.md` (Part 1 — utility creation)

---

## What This Document Covers

Part 1 created the infrastructure utilities (circuit breaker, retry/DLQ, realtime hooks, Postgres atomic RPC, validation schemas). This document covers **wiring those utilities into the actual call sites** — the work that makes the infrastructure actually useful.

---

## What Changed

### 1. Postgres RPC — Atomic Event Transitions (#14)

**File:** [lib/events/transitions.ts](lib/events/transitions.ts)

**Before:** Two sequential Supabase calls inside `transitionEvent()`:

1. `supabase.from('events').update({ status, updated_by, ... })`
2. `supabase.from('event_state_transitions').insert({ ... })`

A failure between step 1 and step 2 would leave the event in the new status with no audit record — inconsistent state, impossible to detect without manual inspection.

**After:** Single atomic RPC call:

```typescript
const { error: transitionError } = await (supabase as any).rpc('transition_event_atomic', {
  p_event_id: parsed.eventId,
  p_to_status: parsed.toStatus,
  p_from_status: fromStatus,
  p_transitioned_by: transitionedBy,
  p_tenant_id: event.tenant_id,
  p_metadata: transitionMetadata,
})
```

The `transition_event_atomic()` Postgres function (defined in `supabase/migrations/20260320000001_atomic_transition_and_dlq.sql`) runs both writes inside a single `BEGIN/COMMIT` block. Either both succeed or neither does.

**Cancellation fields** (`cancelled_at`, `cancellation_reason`, `cancellation_initiated_by`) are now handled inside the RPC via `p_metadata` JSONB extraction — the TypeScript `updatePayload` building block was removed entirely.

**Type cast note:** `(supabase as any).rpc(...)` is required because `transition_event_atomic` is not yet in `types/database.ts`. Regenerating types after the migration is applied will eliminate the cast.

**Input validation added:** `TransitionEventInputSchema.parse({ eventId, toStatus, metadata, systemTransition })` now runs at the top of `transitionEvent()` before any DB access, catching malformed inputs with a Zod error (not a DB error).

---

### 2. Circuit Breakers — Stripe and Resend (#49)

**Files modified:**

- [lib/stripe/actions.ts](lib/stripe/actions.ts) — `createPaymentIntent()`
- [lib/email/send.ts](lib/email/send.ts) — `sendEmail()`

**Pattern applied:**

```typescript
import { breakers } from '@/lib/resilience/circuit-breaker'

// Before:
const paymentIntent = await stripe.paymentIntents.create(createParams)

// After:
const paymentIntent = await breakers.stripe.execute(() =>
  stripe.paymentIntents.create(createParams)
)
```

**Effect:** After 3 consecutive Stripe failures, the `stripe` circuit breaker opens (30-second reset). Any further calls during the open window throw `CircuitOpenError` immediately without making network calls — preventing cascade failures and reducing timeout latency for the user.

The Resend circuit breaker uses 5 failures / 60-second reset (email is less critical than payment processing).

**Limitation acknowledged:** Circuit breaker state is in-memory only. Each Vercel cold start resets all counters to zero. This means the breakers provide protection within a single function instance but cannot coordinate across concurrent instances. A Redis-backed state store (Upstash) would be needed for production-grade cross-instance coordination.

---

### 3. Retry + DLQ — Outbound Webhook Delivery (#47, #48)

**File modified:** [lib/webhooks/deliver.ts](lib/webhooks/deliver.ts)

**Before:** Single bare `fetch()` call. A transient network error or 503 from the webhook consumer caused permanent failure with no retry.

**After:**

```typescript
import { withRetry, pushToDLQ, isTransientError } from '@/lib/resilience/retry'

const response = await withRetry(
  () => fetch(endpoint.url, { method: 'POST', ... }),
  {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15_000,
    retryOn: isTransientError,
  }
)
```

`isTransientError()` retries 429, 5xx, and network-level errors. It does NOT retry 4xx client errors (bad payload, auth failure) — those are permanent failures.

After all retry attempts are exhausted (or on a non-transient failure), `pushToDLQ()` writes a record to the `dead_letter_queue` table with the job type, payload, error message, and attempt count.

**Delivery status tracking:** A single `webhook_deliveries` INSERT now happens at the end of the function (not inside try/catch branches), with `status`, `response_status`, and `error_message` fields populated based on outcome.

---

### 4. Realtime Status Sync — Event Detail Page (#46)

**Files modified/created:**

- [components/events/event-status-realtime-sync.tsx](components/events/event-status-realtime-sync.tsx) (CREATED)
- [app/(chef)/events/[id]/page.tsx](<app/(chef)/events/[id]/page.tsx>) (MODIFIED)

**Architecture constraint:** The event detail page is a server component (`async function EventDetailPage`). Server components cannot hold WebSocket subscriptions (they run once per request, then their execution context is gone).

**Solution:** A zero-render client component:

```tsx
// components/events/event-status-realtime-sync.tsx
'use client'
export function EventStatusRealtimeSync({ eventId }: { eventId: string }) {
  const router = useRouter()
  const handleStatusChange = useCallback(
    (newStatus: string) => {
      router.refresh() // Triggers a server-side re-render with fresh data
    },
    [eventId, router]
  )
  useEventStatusSubscription(eventId, handleStatusChange)
  return null // Renders nothing — side-effect only
}
```

This component is added as the first child of the server page:

```tsx
// app/(chef)/events/[id]/page.tsx
return (
  <div>
    <EventStatusRealtimeSync eventId={params.id} />
    {/* ... rest of page ... */}
  </div>
)
```

**Effect:** When another party (a client, a system automation, or a concurrent chef session) changes the event status, the Supabase Realtime Postgres Changes subscription fires, and `router.refresh()` triggers a full server re-render — fetching the latest status, financials, and readiness checks without a full page reload.

---

### 5. Zod v4 API Fix — schemas.ts (#19)

**File:** [lib/validation/schemas.ts](lib/validation/schemas.ts)

`safeValidate()` originally read `result.error.errors[0]`. In Zod v4 (the project uses `^4.3.6`), `ZodError` exposes `.issues` not `.errors`. Fixed to:

```typescript
const firstError = result.error.issues[0]
```

TypeScript confirmed clean after this fix (all remaining errors are pre-existing Playwright fixture type issues in `tests/coverage/` and `tests/interactions/` — unrelated to this session's changes).

---

## What Was Already Wired (No Changes Needed)

- **Notification realtime** — `components/notifications/notification-provider.tsx` already uses `subscribeToNotifications()` from `lib/notifications/realtime`. The new `useNotificationSubscription` hook is available as an alternative but the existing implementation is correct and was not disturbed.
- **Chat realtime** — `components/chat/chat-view.tsx` already has `subscribeToChatMessages` and `subscribeToPresence`. No changes needed.

---

## Files Changed Summary

| File                                               | Change                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/events/transitions.ts`                        | Replaced 2 sequential writes with `rpc('transition_event_atomic')`, added Zod input validation |
| `lib/stripe/actions.ts`                            | Wrapped `stripe.paymentIntents.create()` with `breakers.stripe.execute()`                      |
| `lib/email/send.ts`                                | Wrapped `resend.emails.send()` with `breakers.resend.execute()`                                |
| `lib/webhooks/deliver.ts`                          | Replaced bare `fetch()` with `withRetry()`, added `pushToDLQ()` on exhaustion                  |
| `lib/validation/schemas.ts`                        | Fixed `result.error.errors` → `result.error.issues` (Zod v4)                                   |
| `components/events/event-status-realtime-sync.tsx` | New `'use client'` side-effect component for realtime status sync                              |
| `app/(chef)/events/[id]/page.tsx`                  | Added `<EventStatusRealtimeSync eventId={params.id} />`                                        |

---

## Audit Items Closed

| #   | Concept                     | Status Change                                           |
| --- | --------------------------- | ------------------------------------------------------- |
| #14 | Transaction (atomic writes) | ⚠️ Partial → ✅ Implemented (for FSM transitions)       |
| #19 | Validation                  | ⚠️ Partial → ✅ Improved (schema wired at action entry) |
| #46 | Realtime Subscriptions      | ❌ Missing → ✅ Implemented (event detail page)         |
| #47 | Background Job Retry        | ⚠️ Partial → ✅ Implemented (webhook delivery)          |
| #48 | Dead Letter Queue           | ❌ Missing → ✅ Implemented (webhook delivery)          |
| #49 | Circuit Breaker             | ❌ Missing → ✅ Implemented (Stripe, Resend)            |

---

## Remaining Known Limitations

1. **Circuit breaker state is in-memory** — resets on cold start. Sufficient for single-instance protection; not sufficient for coordinating across concurrent Vercel instances. Future: back with Upstash Redis.
2. **`types/database.ts` has no signature for `transition_event_atomic`** — requires `(supabase as any).rpc()` cast. Resolved by running `npx supabase gen types typescript --linked` after migration is applied.
3. **No circuit breakers on `lib/stripe/checkout.ts` or `lib/stripe/refund.ts`** — these Stripe call sites exist but were not modified in this session. They should be wrapped in the same pattern when those files are next touched.

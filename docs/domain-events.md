# Domain Event System Design — ChefFlow V1

**Last reviewed:** 2026-02-20
**Status:** Design document — current implementation is point-to-point; this documents the path to an event-driven architecture

---

## Current State (Point-to-Point)

ChefFlow's FSM transitions currently use **direct, sequential calls** to side effects. In `lib/events/transitions.ts`, after a status change is written, the function explicitly calls:

1. `postEventSystemMessage()` — chat system message
2. `createNotification()` — chef notification
3. `createClientNotification()` — client notification
4. Email sending (6 different cases)
5. `evaluateAutomations()` — automation rule engine
6. `autoCreateServiceLegs()` — travel plan creation
7. `autoPlacePrepBlocks()` — prep block scheduling
8. `syncEventToGoogleCalendar()` — calendar sync
9. `logChefActivity()` — activity log
10. `awardEventPoints()` — loyalty points (on complete)

**Problems with this approach:**

- Adding a new side effect requires modifying `transitionEvent()` directly
- 10+ sequential async operations slow the response path
- If one fails (even wrapped in try-catch), it blocks everything after it
- No way to add a new subscriber without touching the core FSM

---

## AI Policy Constraint

The AI Policy (`docs/AI_POLICY.md`) explicitly prohibits autonomous event creation and silent automation. This constraint must be preserved in any event-driven redesign:

> AI output requires explicit chef confirmation before becoming canonical.
> Hard restrictions: no lifecycle transitions, no ledger writes, no identity changes, no silent automation.

Any domain event emitted by the FSM must only trigger **reversible side effects** or **draft-and-approve** workflows. Domain events must not autonomously transition state or write to the ledger.

---

## Proposed Domain Event Design

### Event Schema

All domain events follow this shape:

```typescript
interface DomainEvent<T = Record<string, unknown>> {
  id: string // UUID — unique per event instance
  type: DomainEventType // e.g. 'event.status_changed'
  aggregateType: string // e.g. 'event', 'inquiry', 'client'
  aggregateId: string // UUID of the entity this event is about
  tenantId: string // Chef tenant ID
  occurredAt: string // ISO timestamp
  payload: T // Event-specific data
  source: 'user' | 'system' | 'webhook'
  actorId: string | null // User ID who caused this (null for system)
}
```

### Domain Event Types

| Type                   | Trigger                   | Payload                                     |
| ---------------------- | ------------------------- | ------------------------------------------- |
| `event.status_changed` | FSM transition            | `{ from, to, eventId, occasion, clientId }` |
| `event.created`        | New event created         | `{ eventId, occasion, clientId }`           |
| `event.completed`      | `in_progress → completed` | `{ eventId, totalRevenueCents }`            |
| `event.cancelled`      | Any → cancelled           | `{ eventId, reason, initiatedBy }`          |
| `inquiry.received`     | New inquiry submitted     | `{ inquiryId, clientId, source }`           |
| `quote.sent`           | Quote sent to client      | `{ quoteId, eventId, totalCents }`          |
| `quote.accepted`       | Client accepts quote      | `{ quoteId, eventId, clientId }`            |
| `payment.received`     | Stripe payment confirmed  | `{ eventId, amountCents, transactionRef }`  |
| `client.created`       | New client added          | `{ clientId, tenantId }`                    |
| `menu.approved`        | Client approves menu      | `{ menuId, eventId }`                       |

---

## Implementation Options

### Option A: In-Process Pub/Sub (Simple, No Infrastructure)

A lightweight in-process event emitter. Zero infrastructure. Works with Vercel serverless.

```typescript
// lib/events/event-bus.ts
type EventHandler<T> = (event: DomainEvent<T>) => Promise<void>
const handlers = new Map<string, EventHandler<unknown>[]>()

export function subscribe<T>(type: string, handler: EventHandler<T>) {
  const list = handlers.get(type) ?? []
  list.push(handler as EventHandler<unknown>)
  handlers.set(type, list)
}

export async function emit<T>(event: DomainEvent<T>): Promise<void> {
  const list = handlers.get(event.type) ?? []
  await Promise.allSettled(list.map((h) => h(event as DomainEvent<unknown>)))
}
```

Side effects register themselves at module init:

```typescript
// lib/notifications/subscribe.ts
import { subscribe } from '@/lib/events/event-bus'
subscribe('event.status_changed', async (event) => {
  await createNotification({ ... event.payload ... })
})
```

**Pros:** Zero infrastructure, familiar pattern, easy to test
**Cons:** Resets on cold start (handlers re-register each invocation — OK for serverless), no delivery guarantee

### Option B: Supabase Realtime Broadcast (Lightweight Async)

After writing the DB transition, publish a Realtime broadcast to a tenant-scoped channel:

```typescript
await supabase
  .channel(`events:${tenantId}`)
  .send({ type: 'broadcast', event: 'status_changed', payload: domainEvent })
```

Client-side listeners via `lib/realtime/subscriptions.ts` receive the event instantly.

**Best for:** UI updates (already implemented in Category 4)
**Not for:** Server-side side effects (broadcast doesn't trigger server code)

### Option C: Upstash QStash (Durable Async, HTTP-Based)

QStash is an HTTP-based message queue from Upstash. It delivers a webhook to your endpoint with retry logic.

```typescript
await qstash.publish({
  url: `${NEXT_PUBLIC_SITE_URL}/api/events/handle-domain-event`,
  body: JSON.stringify(domainEvent),
  retries: 3,
  delay: 0,
})
```

**Pros:** Durable delivery, retry included, works with Vercel serverless
**Cons:** Adds a paid dependency, network round-trip per event, debugging complexity

---

## Recommended Approach (Phased)

**Phase 1 (now):** Keep point-to-point calls. They work. This document is the design so we don't architect ourselves into a corner.

**Phase 2 (when 3+ new subscribers needed):** Implement Option A (in-process pub/sub). Refactor `transitionEvent()` to call `emit()` instead of each side effect directly. Side effects become subscribers.

**Phase 3 (when reliability is critical / async needed):** Migrate high-priority side effects to Option C (QStash). Keep lightweight notifications as Option A.

---

## Migration Path from Current Code

```typescript
// BEFORE (current — point-to-point):
try {
  await postEventSystemMessage(eventId, fromStatus, toStatus)
} catch (err) { console.error(...) }
try {
  await createNotification({ ... })
} catch (err) { console.error(...) }
// ... 8 more try-catch blocks

// AFTER (event-driven):
await emit({
  id: crypto.randomUUID(),
  type: 'event.status_changed',
  aggregateType: 'event',
  aggregateId: eventId,
  tenantId: event.tenant_id,
  occurredAt: new Date().toISOString(),
  payload: { from: fromStatus, to: toStatus, occasion: event.occasion, clientId: event.client_id },
  source: systemTransition ? 'system' : 'user',
  actorId: transitionedBy,
})
```

Subscribers are registered once at module init and handle their own failure/retry logic.

---

_Last updated: 2026-02-20_

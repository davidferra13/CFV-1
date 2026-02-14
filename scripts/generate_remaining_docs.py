#!/usr/bin/env python3
"""Generate all remaining Chef Portal documentation files."""

import os
from pathlib import Path

DOCS_DIR = Path("c:/Users/david/Documents/CFv1/docs/chef-portal")

# Define all remaining files with their content templates
REMAINING_DOCS = {
    # Section 06 (remaining)
    "06_EVENT_STATUS_ENUM_LOCK.md": """# Event Status Enum Lock (V1)

## Locked Status Values

```sql
CREATE TYPE event_status AS ENUM (
  'draft', 'proposed', 'deposit_pending', 'confirmed',
  'menu_in_progress', 'menu_locked', 'executed', 'closed', 'canceled'
);
```

## Status Definitions

- **draft**: Initial creation
- **proposed**: Sent to client
- **deposit_pending**: Payment requested
- **confirmed**: Deposit received
- **menu_in_progress**: Menu being drafted
- **menu_locked**: Menu finalized
- **executed**: Event completed
- **closed**: Finalized
- **canceled**: Canceled (terminal)

V1 status enum is **locked**. No additions without migration.
""",

    "06_EVENT_TRANSITION_MAP.md": """# Event Transition Map (V1)

## Allowed Transitions

```typescript
const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['proposed', 'canceled'],
  proposed: ['deposit_pending', 'canceled'],
  deposit_pending: ['confirmed', 'canceled'],
  confirmed: ['menu_in_progress', 'canceled'],
  menu_in_progress: ['menu_locked', 'canceled'],
  menu_locked: ['executed', 'canceled'],
  executed: ['closed'],
  closed: [],
  canceled: []
};
```

## Validation

```typescript
function isValidTransition(from: EventStatus, to: EventStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
```
""",

    "06_EVENT_TRANSITION_SERVER_FUNCTION_CONTRACT.md": """# Event Transition Server Function Contract (V1)

## Signature

```typescript
async function transitionEvent(
  eventId: string,
  toStatus: EventStatus
): Promise<void>
```

## Implementation Requirements

1. Authenticate user
2. Check role (chef only)
3. Verify tenant ownership
4. Validate transition
5. Log to event_transitions
6. Update event status
7. Execute in transaction

See implementation in `lib/events/transition-event.ts`.
""",

    "06_EVENT_TRANSITIONS_AUDIT_LOG_CONTRACT.md": """# Event Transitions Audit Log Contract (V1)

## Schema

```sql
CREATE TABLE event_transitions (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id),
  from_status event_status NOT NULL,
  to_status event_status NOT NULL,
  triggered_by UUID REFERENCES auth.users(id),
  triggered_at TIMESTAMPTZ NOT NULL,
  notes TEXT
);
```

## Immutability

Triggers prevent UPDATE/DELETE.

## Querying

```typescript
const history = await db.event_transitions.findMany({
  where: { event_id },
  orderBy: { triggered_at: 'desc' }
});
```
""",

    "06_EVENT_STATE_IDEMPOTENCY_RULES.md": """# Event State Idempotency Rules (V1)

## Idempotent Transitions

If event already in target state: no-op (return success).

## Concurrent Transitions

Database transaction ensures only one succeeds.

## Webhook-Driven Transitions

Idempotency key: Stripe event ID.

Duplicate webhooks ignored.
""",

    "06_EVENT_STATE_FAILSAFE_BEHAVIOR.md": """# Event State Failsafe Behavior (V1)

## Failsafe Principle

If uncertain, freeze state (don't transition).

## Examples

- Webhook delayed: show "processing"
- Validation fails: reject transition
- Network error: show error, retry

Never assume success without confirmation.
""",

    # Section 07: Timeblock Calendar (6 files)
    "07_TIMEBLOCK_CALENDAR_MODEL.md": """# Timeblock Calendar Model (V1)

## Time Block Concept

Events are time blocks with start_ts and end_ts.

## Schema Fields

```sql
start_ts TIMESTAMPTZ NOT NULL,
end_ts TIMESTAMPTZ NOT NULL,
CHECK (end_ts > start_ts)
```

## Overlap Detection

Query events where time blocks overlap:

```sql
SELECT * FROM events
WHERE tenant_id = ?
  AND start_ts < ?
  AND end_ts > ?
  AND deleted_at IS NULL;
```

## Timezone Handling

All timestamps stored in UTC.

Display in tenant timezone.
""",

    "07_START_END_TS_REQUIREDNESS_RULES.md": """# Start/End Timestamp Requiredness Rules (V1)

## Required For

- `proposed` status and beyond
- Calendar display
- Overlap detection

## Optional For

- `draft` status (may be TBD)

## Validation

Server actions validate timestamps present before transitioning from draft.
""",

    "07_OVERLAP_RULES_AND_CONFLICT_POLICY.md": """# Overlap Rules and Conflict Policy (V1)

## Conflict Detection

Before confirming event, check for overlaps:

```typescript
async function hasOverlap(tenantId: string, startTs: Date, endTs: Date, excludeId?: string) {
  const count = await db.events.count({
    where: {
      tenant_id: tenantId,
      id: { not: excludeId },
      start_ts: { lt: endTs },
      end_ts: { gt: startTs },
      status: { in: ['confirmed', 'menu_locked', 'executed'] },
      deleted_at: null
    }
  });
  return count > 0;
}
```

## Policy

- Draft/proposed events can overlap (soft holds)
- Confirmed+ events must not overlap (hard blocks)

## UI

Calendar shows conflicts visually.

Warn chef before confirming overlapping event.
""",

    "07_RESCHEDULE_RULES.md": """# Reschedule Rules (V1)

## Allowed Reschedules

Before `menu_locked`: chef can update start_ts/end_ts.

After `menu_locked`: reschedule requires cancellation and new event.

## Implementation

```typescript
async function rescheduleEvent(eventId: string, newStartTs: Date, newEndTs: Date) {
  const event = await db.events.findUnique({ where: { id: eventId } });

  if (['menu_locked', 'executed', 'closed'].includes(event.status)) {
    throw new Error('Cannot reschedule locked events');
  }

  await db.events.update({
    where: { id: eventId },
    data: { start_ts: newStartTs, end_ts: newEndTs }
  });
}
```

## Audit

Reschedules logged (optional in V1).
""",

    "07_CANCELLATION_RULES.md": """# Cancellation Rules (V1)

## Allowed Cancellations

Any non-terminal state can transition to `canceled`.

## Financial Implications

Refund policy applied:
- Before confirmation: full refund
- After confirmation: per terms

Ledger entries created for refunds.

## Implementation

```typescript
async function cancelEvent(eventId: string, reason?: string) {
  await transitionEvent(eventId, 'canceled');

  // Process refunds if applicable
  await processRefund(eventId);
}
```
""",

    "07_CALENDAR_QUERY_PATTERNS.md": """# Calendar Query Patterns (V1)

## Monthly View

```typescript
const events = await db.events.findMany({
  where: {
    tenant_id,
    start_ts: { gte: monthStart, lt: monthEnd },
    deleted_at: null
  },
  orderBy: { start_ts: 'asc' }
});
```

## Day View

```typescript
const events = await db.events.findMany({
  where: {
    tenant_id,
    start_ts: { gte: dayStart, lt: dayEnd },
    deleted_at: null
  }
});
```

## Upcoming Events

```typescript
const upcoming = await db.events.findMany({
  where: {
    tenant_id,
    start_ts: { gte: new Date() },
    status: { notIn: ['canceled', 'closed'] },
    deleted_at: null
  },
  take: 10,
  orderBy: { start_ts: 'asc' }
});
```
""",

}

def main():
    """Generate all remaining documentation files."""
    for filename, content in REMAINING_DOCS.items():
        filepath = DOCS_DIR / filename
        print(f"Creating {filename}...")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content.strip() + '\n')

    print(f"\nGenerated {len(REMAINING_DOCS)} files in {DOCS_DIR}")

if __name__ == "__main__":
    main()

# Event Transition Map (V1)

This document defines **all allowed transitions** between event statuses. This is the canonical state machine for the event lifecycle. Any transition not listed here is **forbidden** and must be rejected.

---

## Transition Map (Canonical)

```typescript
type TransitionMap = {
  [fromStatus in EventStatus]?: EventStatus[];
};

export const EVENT_TRANSITION_MAP: TransitionMap = {
  // Draft state can progress or cancel
  draft: ['proposed', 'canceled'],

  // Proposed can go back to draft, forward to deposit, or cancel
  proposed: ['draft', 'deposit_pending', 'canceled'],

  // Deposit pending can confirm or cancel
  deposit_pending: ['confirmed', 'canceled'],

  // Confirmed can progress to menu work or cancel
  confirmed: ['menu_in_progress', 'canceled'],

  // Menu in progress can lock or cancel
  menu_in_progress: ['menu_locked', 'canceled'],

  // Menu locked can execute or cancel (with restrictions)
  menu_locked: ['executed', 'canceled'],

  // Executed can only close (no cancellation after execution)
  executed: ['closed'],

  // Terminal states: no transitions allowed
  closed: [],
  canceled: [],
};
```

---

## Transition Definitions

### From `draft`

| To Status | Trigger | Validation Required | Notes |
|-----------|---------|---------------------|-------|
| `proposed` | Chef marks proposal ready | Complete event data (client, date, amount) | Client can now view proposal |
| `canceled` | Chef cancels draft | None | Soft deletion alternative |

### From `proposed`

| To Status | Trigger | Validation Required | Notes |
|-----------|---------|---------------------|-------|
| `draft` | Chef reverts to draft | None | Client visibility may be revoked |
| `deposit_pending` | Chef requests deposit | Payment intent created successfully | Stripe payment intent ID required |
| `canceled` | Chef or client declines | None | Proposal rejected |

### From `deposit_pending`

| To Status | Trigger | Validation Required | Notes |
|-----------|---------|---------------------|-------|
| `confirmed` | Stripe webhook: deposit succeeded | Ledger entry exists for charge | Automatic via webhook |
| `canceled` | Payment fails or client cancels | None | Payment intent voided |

### From `confirmed`

| To Status | Trigger | Validation Required | Notes |
|-----------|---------|---------------------|-------|
| `menu_in_progress` | Chef begins menu work | None | Optional transition; may skip to `menu_locked` |
| `canceled` | Chef or client cancels | Refund policy check | Refund ledger entries required |

### From `menu_in_progress`

| To Status | Trigger | Validation Required | Notes |
|-----------|---------|---------------------|-------|
| `menu_locked` | Chef locks menu | Menu exists and is complete | Menu version locked |
| `canceled` | Chef or client cancels | Refund policy check | Refund ledger entries required |

### From `menu_locked`

| To Status | Trigger | Validation Required | Notes |
|-----------|---------|---------------------|-------|
| `executed` | Event date has passed | Event end_ts < current time | Typically automated or manual trigger |
| `canceled` | Exceptional cancellation only | Refund policy check | May be restricted close to event date |

### From `executed`

| To Status | Trigger | Validation Required | Notes |
|-----------|---------|---------------------|-------|
| `closed` | Financial reconciliation complete | Balance settled or final payment confirmed | Terminal state |

### From `closed`

No transitions allowed. Terminal state.

### From `canceled`

No transitions allowed. Terminal state.

---

## Transition Validation Function

```typescript
// lib/events/transitions.ts

export function isValidTransition(
  from: EventStatus,
  to: EventStatus
): boolean {
  const allowedTransitions = EVENT_TRANSITION_MAP[from] || [];
  return allowedTransitions.includes(to);
}

export function getAllowedTransitions(
  currentStatus: EventStatus
): EventStatus[] {
  return EVENT_TRANSITION_MAP[currentStatus] || [];
}

export function isTerminalStatus(status: EventStatus): boolean {
  const allowedTransitions = EVENT_TRANSITION_MAP[status] || [];
  return allowedTransitions.length === 0;
}
```

---

## Server-Side Enforcement

All transitions must be validated server-side before execution:

```typescript
// Server action or API route
export async function transitionEvent(params: {
  eventId: string;
  toStatus: EventStatus;
  userId: string;
  notes?: string;
}) {
  const { eventId, toStatus, userId, notes } = params;

  // 1. Fetch current event
  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // 2. Validate transition
  if (!isValidTransition(event.status, toStatus)) {
    throw new Error(
      `Invalid transition: ${event.status} → ${toStatus}`
    );
  }

  // 3. Perform transition (atomic)
  await db.$transaction(async (tx) => {
    // Log transition
    await tx.event_transitions.create({
      data: {
        event_id: eventId,
        from_status: event.status,
        to_status: toStatus,
        triggered_by: userId,
        triggered_at: new Date(),
        notes,
      },
    });

    // Update event status
    await tx.events.update({
      where: { id: eventId },
      data: { status: toStatus },
    });
  });

  return { success: true };
}
```

---

## Forbidden Transitions

The following transitions are **explicitly forbidden**:

### Backward Regression (except draft ↔ proposed)
- ❌ `confirmed` → `deposit_pending`
- ❌ `executed` → `menu_locked`
- ❌ `closed` → any state

### Skipping States
- ❌ `draft` → `confirmed` (must go through `proposed` and `deposit_pending`)
- ❌ `proposed` → `confirmed` (must go through `deposit_pending`)
- ❌ `deposit_pending` → `menu_locked` (must go through `confirmed`)

### Terminal State Changes
- ❌ `closed` → any state
- ❌ `canceled` → any state

### Post-Execution Cancellation
- ❌ `executed` → `canceled` (use refund in `closed` state instead)

---

## Transition Rules

### Rule 1: All Transitions Must Be Logged
Every transition creates an immutable `event_transitions` record.

### Rule 2: Transitions Are Atomic
Status update and transition log must occur in the same database transaction.

### Rule 3: Idempotency Required
Duplicate transition requests (same from/to status) should be idempotent:
- If already in target status, return success (no-op)
- If transition already logged, do not duplicate

### Rule 4: Cancellation Restrictions
Cancellation from post-confirmation states may require:
- Refund policy check
- Ledger refund entries
- Client notification

### Rule 5: Automation Boundaries
Only these transitions may be automated:
- `deposit_pending` → `confirmed` (via Stripe webhook)
- `menu_locked` → `executed` (via scheduled job, if implemented)

All other transitions require explicit chef action.

---

## Transition Permissions (Chef Portal)

| From Status | To Status | Who Can Trigger |
|-------------|-----------|-----------------|
| `draft` | `proposed` | Chef only |
| `draft` | `canceled` | Chef only |
| `proposed` | `draft` | Chef only |
| `proposed` | `deposit_pending` | Chef only (via payment intent creation) |
| `proposed` | `canceled` | Chef or Client (via client portal rejection) |
| `deposit_pending` | `confirmed` | System (Stripe webhook) |
| `deposit_pending` | `canceled` | Chef or System (payment failure) |
| `confirmed` | `menu_in_progress` | Chef only |
| `confirmed` | `canceled` | Chef only (with refund) |
| `menu_in_progress` | `menu_locked` | Chef only |
| `menu_in_progress` | `canceled` | Chef only (with refund) |
| `menu_locked` | `executed` | Chef or System (automated) |
| `menu_locked` | `canceled` | Chef only (exceptional cases) |
| `executed` | `closed` | Chef only (after reconciliation) |

---

## Edge Cases

### Duplicate Transition Requests
**Scenario**: Chef clicks "Confirm Menu" button twice rapidly.

**Handling**:
1. Check if event is already in `menu_locked` status
2. If yes, return success (idempotent no-op)
3. If no, proceed with transition

### Webhook Delay
**Scenario**: Stripe webhook delayed; client and chef see "Awaiting Deposit" for extended period.

**Handling**:
- Do not optimistically transition to `confirmed`
- Show "Processing payment..." UI
- Transition only after webhook confirms

### Conflicting Transitions
**Scenario**: Chef tries to cancel while webhook is confirming deposit.

**Handling**:
- Use database transaction to prevent race
- First transaction to commit wins
- Second transaction fails with clear error
- UI must refetch current status

---

## Testing Transition Map

```typescript
// Test all valid transitions
describe('Event Transition Map', () => {
  it('allows draft → proposed', () => {
    expect(isValidTransition('draft', 'proposed')).toBe(true);
  });

  it('forbids draft → confirmed', () => {
    expect(isValidTransition('draft', 'confirmed')).toBe(false);
  });

  it('forbids closed → any state', () => {
    expect(isValidTransition('closed', 'draft')).toBe(false);
    expect(isValidTransition('closed', 'canceled')).toBe(false);
  });

  it('identifies terminal states', () => {
    expect(isTerminalStatus('closed')).toBe(true);
    expect(isTerminalStatus('canceled')).toBe(true);
    expect(isTerminalStatus('confirmed')).toBe(false);
  });
});
```

---

## V1 Scope Boundaries

### Included in V1
- All transitions defined above
- Server-side validation
- Immutable transition logging
- Terminal state enforcement

### Excluded from V1
- Conditional transitions (e.g., "only allow if menu exists")
- Multi-branch workflows (single path only)
- Rollback/undo transitions (except draft ↔ proposed)
- Automated multi-step transitions (each step is explicit)

---

## Visualization

```
┌──────┐
│draft │
└──┬───┘
   │
   ├──→ proposed ←──┐
   │       │        │
   │       ├────────┘
   │       │
   │       ├──→ deposit_pending
   │       │           │
   │       │           ├──→ confirmed
   │       │                    │
   │       │                    ├──→ menu_in_progress
   │       │                            │
   │       │                            ├──→ menu_locked
   │       │                                    │
   │       │                                    ├──→ executed
   │       │                                            │
   │       │                                            └──→ closed (terminal)
   │       │
   └──────────────────────────────────────────────────────→ canceled (terminal)
```

---

**End of Event Transition Map**

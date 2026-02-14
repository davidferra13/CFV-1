# Client Lifecycle State Machine

## Document Identity
- **File**: `CLIENT_LIFECYCLE_STATE_MACHINE.md`
- **Category**: Lifecycle System (22/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **formal state machine** for the ChefFlow V1 client lifecycle.

It specifies:
- Canonical state definitions
- Valid state transitions (edges)
- Transition validation rules
- Terminal states
- State machine enforcement mechanisms

---

## State Machine Definition

### States (Nodes)

The ChefFlow V1 event lifecycle contains **8 primary states** (database-enforced):

```sql
CREATE TYPE event_status AS ENUM (
  'draft',        -- Chef creating event
  'proposed',     -- Sent to client, awaiting response
  'accepted',     -- Client accepted, awaiting payment
  'paid',         -- Deposit/full payment received
  'confirmed',    -- Chef confirmed after payment
  'in_progress',  -- Event day
  'completed',    -- Event finished
  'cancelled'     -- Cancelled (with reason)
);
```

---

## Visual State Machine

```
┌──────────────────────────────────────────────────────────────────────┐
│                    EVENT LIFECYCLE STATE MACHINE                      │
└──────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │    draft     │ ← Initial state
                         └──────┬───────┘
                                │ (1) Chef proposes
                                ↓
                         ┌──────────────┐
                         │   proposed   │
                         └──────┬───────┘
                                │ (2) Client accepts
                                ↓
                         ┌──────────────┐
                         │   accepted   │
                         └──────┬───────┘
                                │ (3) Payment webhook
                                ↓
                         ┌──────────────┐
                         │     paid     │
                         └──────┬───────┘
                                │ (4) Chef confirms
                                ↓
                         ┌──────────────┐
                         │  confirmed   │
                         └──────┬───────┘
                                │ (5) Chef starts event
                                ↓
                         ┌──────────────┐
                         │ in_progress  │
                         └──────┬───────┘
                                │ (6) Chef completes
                                ↓
                         ┌──────────────┐
                         │  completed   │ ← Terminal state
                         └──────────────┘

     ┌────────────────────────────────────────────────────────┐
     │            Cancellation (from any state)                │
     │                         ↓                               │
     │                  ┌──────────────┐                       │
     │                  │  cancelled   │ ← Terminal state      │
     │                  └──────────────┘                       │
     └────────────────────────────────────────────────────────┘
```

---

## Valid Transitions (Edges)

### Forward Progression

| From State | To State | Edge ID | Trigger | Validation |
|-----------|----------|---------|---------|-----------|
| `draft` | `proposed` | E1 | Chef | Event must have pricing |
| `proposed` | `accepted` | E2 | Client | Client must own event |
| `accepted` | `paid` | E3 | System (Webhook) | Idempotent ledger append |
| `paid` | `confirmed` | E4 | Chef | Deposit paid (ledger check) |
| `confirmed` | `in_progress` | E5 | Chef | None (time-based optional) |
| `in_progress` | `completed` | E6 | Chef | None |

### Cancellation Transitions

| From State | To State | Edge ID | Trigger | Validation |
|-----------|----------|---------|---------|-----------|
| `draft` | `cancelled` | C1 | Chef | Cancellation reason required |
| `proposed` | `cancelled` | C2 | Chef | Cancellation reason required |
| `accepted` | `cancelled` | C3 | Chef | Cancellation reason required |
| `paid` | `cancelled` | C4 | Chef | Cancellation reason + refund initiated |
| `confirmed` | `cancelled` | C5 | Chef | Cancellation reason + refund initiated |
| `in_progress` | `cancelled` | C6 | Chef | Cancellation reason + refund initiated |

**Note**: `completed` and `cancelled` are **terminal states** (no outgoing edges).

---

## Invalid Transitions (Blocked)

The following transitions are **explicitly forbidden**:

| From State | To State | Why Blocked |
|-----------|----------|-------------|
| `draft` | `accepted` | Cannot skip proposal |
| `draft` | `paid` | Cannot skip proposal + acceptance |
| `proposed` | `paid` | Client must accept first |
| `accepted` | `confirmed` | Payment must clear first |
| `paid` | `in_progress` | Chef must confirm first |
| `completed` | `*` | Terminal state (no transitions) |
| `cancelled` | `*` | Terminal state (no transitions) |

**Server-Side Enforcement**: Transitions are validated by `transitionEventStatus()` function.

---

## State Definitions

### State: `draft`

**Definition**: Event is being created by chef, not yet sent to client.

| Property | Value |
|----------|-------|
| **Owner** | Chef |
| **Client Visibility** | ❌ No (not proposed yet) |
| **Mutations Allowed** | ✅ All fields (chef can edit) |
| **Financial State** | No payments expected |
| **Messages Allowed** | ❌ No (no thread created) |

**Exit Conditions**: Chef completes event details and proposes to client.

---

### State: `proposed`

**Definition**: Chef has sent proposal to client, awaiting client response.

| Property | Value |
|----------|-------|
| **Owner** | Chef (proposal) + Client (decision) |
| **Client Visibility** | ✅ Yes (client can see proposal) |
| **Mutations Allowed** | ❌ No (proposal is immutable once sent) |
| **Financial State** | No payments yet |
| **Messages Allowed** | ✅ Yes (client can ask questions) |

**Exit Conditions**: Client accepts proposal OR chef cancels.

---

### State: `accepted`

**Definition**: Client has accepted proposal, awaiting payment.

| Property | Value |
|----------|-------|
| **Owner** | System (awaiting webhook) |
| **Client Visibility** | ✅ Yes (can initiate payment) |
| **Mutations Allowed** | ❌ No (locked pending payment) |
| **Financial State** | Payment pending (Stripe checkout initiated) |
| **Messages Allowed** | ✅ Yes |

**Exit Conditions**: Payment webhook succeeds OR chef cancels.

---

### State: `paid`

**Definition**: Payment has been received (ledger confirms deposit or full amount).

| Property | Value |
|----------|-------|
| **Owner** | Chef (must confirm booking) |
| **Client Visibility** | ✅ Yes (payment receipt visible) |
| **Mutations Allowed** | ❌ No (locked after payment) |
| **Financial State** | Deposit paid (ledger entry exists) |
| **Messages Allowed** | ✅ Yes |

**Exit Conditions**: Chef confirms booking OR chef cancels (with refund).

---

### State: `confirmed`

**Definition**: Chef has confirmed booking after payment verification.

| Property | Value |
|----------|-------|
| **Owner** | Chef (manages event execution) |
| **Client Visibility** | ✅ Yes (booking confirmed) |
| **Mutations Allowed** | ⚠️ Limited (menu finalization, notes) |
| **Financial State** | Deposit paid, balance may be due |
| **Messages Allowed** | ✅ Yes |

**Exit Conditions**: Chef starts event on event day OR chef cancels (with refund).

---

### State: `in_progress`

**Definition**: Event is currently happening (event day).

| Property | Value |
|----------|-------|
| **Owner** | Chef (executing service) |
| **Client Visibility** | ✅ Yes (event in progress) |
| **Mutations Allowed** | ❌ No (locked during execution) |
| **Financial State** | Balance may be collected on-site |
| **Messages Allowed** | ⚠️ Limited (urgent only) |

**Exit Conditions**: Chef marks event complete OR chef cancels (emergency only).

---

### State: `completed`

**Definition**: Event has been successfully delivered. **Terminal state**.

| Property | Value |
|----------|-------|
| **Owner** | System (read-only historical record) |
| **Client Visibility** | ✅ Yes (historical view) |
| **Mutations Allowed** | ❌ No (immutable historical record) |
| **Financial State** | Fully settled (ledger reconciled) |
| **Messages Allowed** | ⚠️ Follow-up only |

**Exit Conditions**: **None** (terminal state).

---

### State: `cancelled`

**Definition**: Event was cancelled by chef. **Terminal state**.

| Property | Value |
|----------|-------|
| **Owner** | System (read-only historical record) |
| **Client Visibility** | ✅ Yes (cancellation notice) |
| **Mutations Allowed** | ❌ No (immutable) |
| **Financial State** | Refund processed (if payment made) |
| **Messages Allowed** | ❌ No (thread archived) |

**Exit Conditions**: **None** (terminal state).

---

## Transition Validation Rules

### Rule 1: No State Skipping

**Enforcement**: Server-side validation function.

```typescript
function isValidTransition(from: EventStatus, to: EventStatus): boolean {
  const validTransitions: Record<EventStatus, EventStatus[]> = {
    draft: ['proposed', 'cancelled'],
    proposed: ['accepted', 'cancelled'],
    accepted: ['paid', 'cancelled'],
    paid: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [], // Terminal
    cancelled: []  // Terminal
  };

  return validTransitions[from].includes(to);
}
```

**System Law Alignment**: Law 4 (finite lifecycle, server-enforced).

---

### Rule 2: Financial Consistency

**Enforcement**: Ledger checks before transition.

| Transition | Ledger Requirement |
|------------|-------------------|
| `accepted → paid` | `SUM(charge_succeeded) >= deposit_amount_cents` |
| `paid → confirmed` | Deposit paid (verified from ledger) |
| `in_progress → completed` | Balance settled OR marked as due |

**System Law Alignment**: Law 3 (ledger-first financial truth).

---

### Rule 3: Permission Checks

**Enforcement**: Role-based validation.

| Transition | Allowed Roles | Blocked Roles |
|------------|--------------|--------------|
| `draft → proposed` | Chef | Client, System |
| `proposed → accepted` | Client | Chef, System |
| `accepted → paid` | System (Webhook) | Chef, Client |
| `paid → confirmed` | Chef | Client, System |
| `confirmed → in_progress` | Chef | Client, System |
| `in_progress → completed` | Chef | Client, System |
| `* → cancelled` | Chef | Client, System |

**System Law Alignment**: Law 2 (authoritative role resolution).

---

### Rule 4: Audit Logging

**Enforcement**: Database trigger on `events` table.

```sql
CREATE OR REPLACE FUNCTION log_event_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO event_transitions (
      tenant_id,
      event_id,
      from_status,
      to_status,
      transitioned_by,
      metadata
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.updated_by,
      jsonb_build_object(
        'transitioned_at', now(),
        'event_date', NEW.event_date,
        'client_id', NEW.client_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_status_change_audit
AFTER UPDATE ON events
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_event_transition();
```

**System Law Alignment**: Law 4 (audit trail required), Law 17 (no silent transitions).

---

## Terminal States

### Characteristics

Terminal states have **no outgoing edges**:

| State | Terminal? | Reason |
|-------|----------|--------|
| `completed` | ✅ Yes | Event successfully delivered |
| `cancelled` | ✅ Yes | Event cancelled |
| All others | ❌ No | Can transition forward or cancel |

**Enforcement**: Transition validation blocks any transitions from terminal states.

---

## State Machine Enforcement Layers

### Layer 1: Database Enum

```sql
CREATE TYPE event_status AS ENUM (
  'draft', 'proposed', 'accepted', 'paid',
  'confirmed', 'in_progress', 'completed', 'cancelled'
);
```

**Protection**: Only valid states can be inserted.

---

### Layer 2: Application Validation

```typescript
// lib/events/transition-event-status.ts
export async function transitionEventStatus(
  eventId: string,
  toStatus: EventStatus,
  actorUserId: string
): Promise<void> {
  // Validate transition is allowed
  if (!isValidTransition(currentStatus, toStatus)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${toStatus}`);
  }

  // Validate role permissions
  if (!hasPermission(actorRole, currentStatus, toStatus)) {
    throw new Error(`Role ${actorRole} cannot transition ${currentStatus} → ${toStatus}`);
  }

  // Validate financial state (if applicable)
  if (requiresFinancialCheck(toStatus)) {
    const isValid = await validateFinancialState(eventId, toStatus);
    if (!isValid) {
      throw new Error(`Financial state invalid for transition to ${toStatus}`);
    }
  }

  // Perform transition
  await updateEventStatus(eventId, toStatus, actorUserId);
}
```

---

### Layer 3: Database Triggers

```sql
-- Prevent invalid terminal state mutations
CREATE OR REPLACE FUNCTION prevent_terminal_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'Cannot transition from terminal state: %', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_terminal_states
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION prevent_terminal_state_change();
```

**System Law Alignment**: Defense in depth (Law 7).

---

## State Machine Determinism

### Guarantees

| Guarantee | Enforcement |
|-----------|------------|
| **Finite states** | Database enum (8 states) |
| **Finite transitions** | Validation function (13 valid edges) |
| **No hidden states** | Enum is complete (no implicit states) |
| **Deterministic outcome** | Same input → same transition result |
| **Idempotent transitions** | Transitioning to current state = no-op |
| **Audit trail** | Every transition logged to `event_transitions` |

**System Law Alignment**: Law 4 (finite lifecycle), Law 17 (no silent transitions).

---

## State Machine Testing

### Test Cases

| Test Case | Setup | Action | Expected Result |
|-----------|-------|--------|----------------|
| **Valid forward transition** | Event in `draft` | Chef proposes | `draft → proposed` succeeds |
| **Invalid skip** | Event in `draft` | Chef marks paid | Transition blocked (error) |
| **Terminal state lock** | Event in `completed` | Chef tries to edit | Mutation blocked (error) |
| **Cancellation from active** | Event in `confirmed` | Chef cancels | `confirmed → cancelled` succeeds |
| **Cancellation from terminal** | Event in `completed` | Chef cancels | Transition blocked (error) |
| **Permission violation** | Event in `proposed` | Client confirms | Transition blocked (role error) |
| **Financial validation** | Event in `paid`, no deposit | Chef confirms | Transition blocked (ledger error) |

**Verification Script**: See `scripts/verify-lifecycle-transitions.sql`.

---

## Related Documents

- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)
- [CLIENT_LIFECYCLE_FAILURE_HANDLING.md](./CLIENT_LIFECYCLE_FAILURE_HANDLING.md)
- [CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md](./CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md)
- [CHEFFLOW_V1_SCOPE_LOCK.md](../../CHEFFLOW_V1_SCOPE_LOCK.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

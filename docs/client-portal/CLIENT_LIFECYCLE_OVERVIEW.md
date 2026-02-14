# Client Lifecycle Overview

## Document Identity
- **File**: `CLIENT_LIFECYCLE_OVERVIEW.md`
- **Category**: Lifecycle System (21/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document provides a **complete overview of the client lifecycle** in ChefFlow V1.

It defines:
- The complete lifecycle state machine for events
- High-level state transitions and ownership
- The relationship between client actions and lifecycle progression
- How lifecycle states relate to financial and messaging systems
- Lifecycle audit requirements

---

## The Client Lifecycle State Machine

The ChefFlow V1 client lifecycle consists of **9 primary states** that represent the journey from initial inquiry to repeat booking:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CLIENT LIFECYCLE STATES                        │
└─────────────────────────────────────────────────────────────────────┘

  1. Inquiry               ← Client initiates contact
        ↓
  2. Proposal              ← Chef submits proposal
        ↓
  3. Deposit Paid          ← Payment processed (webhook)
        ↓
  4. Confirmed             ← Chef confirms booking
        ↓
  5. Menu Finalized        ← Menu locked for event
        ↓
  6. Event Executed        ← Service delivered
        ↓
  7. Loyalty Awarded       ← Points computed from ledger
        ↓
  8. Follow-Up             ← Post-event engagement
        ↓
  9. Repeat Inquiry        ← Return to state 1 (cycle)
```

---

## Lifecycle vs Event Status

### Distinction

The **lifecycle** represents the **client-facing journey** through the booking process.

The **event status** (database enum) represents the **system-enforced state machine**.

| Lifecycle State | Event Status (DB) | Notes |
|----------------|------------------|-------|
| **Inquiry** | `draft` | Client submits request, chef drafts event |
| **Proposal** | `proposed` | Chef sends proposal to client |
| **Deposit Paid** | `paid` | Webhook transitions after payment success |
| **Confirmed** | `confirmed` | Chef confirms event after payment |
| **Menu Finalized** | `confirmed` | Menu locked, no status change |
| **Event Executed** | `completed` | Chef marks event complete |
| **Loyalty Awarded** | `completed` | Computed from ledger, no status change |
| **Follow-Up** | `completed` | Post-event engagement, no status change |
| **Repeat Inquiry** | `draft` | New event created |

**Key Insight**: Not all lifecycle states map 1:1 to event statuses. Some states are **derived**, **computed**, or **transient**.

---

## State Ownership and Transitions

### Who Controls Each Transition?

| Transition | Triggered By | Validation Required | System Law |
|------------|-------------|---------------------|------------|
| `null → Inquiry` | Client | Valid inquiry form | Law 4 |
| `Inquiry → Proposal` | Chef | Event must have pricing | Law 4 |
| `Proposal → Deposit Paid` | **System (Webhook)** | Idempotent ledger append | Law 3, Law 4 |
| `Deposit Paid → Confirmed` | Chef | Ledger confirms deposit | Law 3, Law 4 |
| `Confirmed → Menu Finalized` | Chef | Menu version locked | Law 4 |
| `Menu Finalized → Event Executed` | Chef | Event date passed | Law 4 |
| `Event Executed → Loyalty Awarded` | **System (Derived)** | Ledger settled | Law 3 |
| `Loyalty Awarded → Follow-Up` | **System (Time-based)** | 24h after execution | Law 17 |
| `Follow-Up → Repeat Inquiry` | Client | New inquiry submission | Law 4 |

**Critical**: Only **System (Webhook)** and **Chef** can transition states. Clients **cannot directly transition events**.

---

## Client Portal Actions per State

### What Can Clients Do?

| State | Client Actions | Read-Only Data | Mutations Allowed |
|-------|---------------|----------------|-------------------|
| **Inquiry** | Submit inquiry form | None (pre-event) | Create inquiry |
| **Proposal** | Accept/decline proposal | Event details, pricing | Accept proposal |
| **Deposit Paid** | View payment receipt | Ledger summary | None |
| **Confirmed** | Communicate via messages | Menu draft, event details | Send messages |
| **Menu Finalized** | View finalized menu PDF | Locked menu version | None |
| **Event Executed** | Pay balance (if due) | Event summary | Submit payment |
| **Loyalty Awarded** | View loyalty points | Points balance | None |
| **Follow-Up** | Rebook, provide feedback | Historical data | Submit feedback |
| **Repeat Inquiry** | Submit new inquiry | Past event history | Create new inquiry |

---

## Lifecycle Visibility Rules

### What Clients Can See

Clients can **only** see events where:

```sql
-- RLS policy on events table
SELECT * FROM events
WHERE client_id = get_current_client_id()
  AND tenant_id = get_current_tenant_id()
  AND (deleted_at IS NULL OR status = 'completed');
```

**Visibility Constraints**:
- ✅ Events where they are the `client_id`
- ✅ Events within their `tenant_id`
- ✅ Deleted events **only if** `status = 'completed'` (historical preservation)
- ❌ Draft events not yet proposed
- ❌ Other clients' events
- ❌ Cross-tenant events

---

## Financial Integration

### Ledger-Derived State

The lifecycle **depends on financial truth** from the `ledger_entries` table:

| Lifecycle State | Ledger Requirement | Validation |
|----------------|-------------------|------------|
| **Deposit Paid** | `SUM(charge_succeeded) >= deposit_amount_cents` | Computed from ledger |
| **Confirmed** | Deposit paid (ledger check) | Chef validates before confirming |
| **Event Executed** | Balance due = `total_amount_cents - collected_cents` | Ledger balance |
| **Loyalty Awarded** | `SUM(charge_succeeded WHERE event_id = ?)` | Settled charges only |

**Critical Rule**: Lifecycle transitions **MUST NOT proceed** if ledger state is inconsistent.

---

## Messaging Integration

### Thread Lifecycle

Messages are scoped to events, and thread visibility follows lifecycle state:

| State | Thread Status | Client Can Send? | Chef Can Send? |
|-------|--------------|-----------------|---------------|
| **Inquiry** | Not created | ❌ No | ✅ Yes (proposal message) |
| **Proposal** | Active | ✅ Yes (questions) | ✅ Yes |
| **Deposit Paid** | Active | ✅ Yes | ✅ Yes |
| **Confirmed** | Active | ✅ Yes | ✅ Yes |
| **Menu Finalized** | Active | ✅ Yes | ✅ Yes |
| **Event Executed** | Read-only | ❌ No (archived) | ❌ No (archived) |
| **Loyalty Awarded** | Read-only | ❌ No | ❌ No |
| **Follow-Up** | Follow-up only | ✅ Yes (feedback) | ✅ Yes |

**Archive Rule**: Threads become **read-only** after event execution, except for follow-up messages.

---

## Audit and Traceability

### Event Transitions Table

**Every lifecycle state change** is logged to `event_transitions`:

```sql
CREATE TABLE event_transitions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  from_status event_status,
  to_status event_status NOT NULL,
  transitioned_by UUID, -- NULL for system transitions
  transitioned_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);
```

**Immutability**: Enforced by database triggers (see System Law #4).

### Audit Requirements

| Transition | `transitioned_by` | `metadata` Required Fields |
|------------|------------------|---------------------------|
| `draft → proposed` | Chef auth_user_id | `{ "proposed_at": ISO8601 }` |
| `proposed → paid` | NULL (webhook) | `{ "stripe_event_id": "evt_...", "payment_intent_id": "pi_..." }` |
| `paid → confirmed` | Chef auth_user_id | `{ "confirmed_at": ISO8601 }` |
| `confirmed → in_progress` | Chef auth_user_id | `{ "event_started_at": ISO8601 }` |
| `in_progress → completed` | Chef auth_user_id | `{ "event_completed_at": ISO8601 }` |
| `* → cancelled` | Chef auth_user_id | `{ "cancellation_reason": "...", "cancelled_at": ISO8601 }` |

**System Law Alignment**: No silent transitions (Law 17).

---

## Failure Handling

### Lifecycle Freeze on Inconsistency

If the system detects inconsistency, it **freezes safely**:

| Inconsistency Detected | System Response |
|------------------------|----------------|
| **Deposit marked paid, but ledger says no** | Prevent `paid → confirmed` transition |
| **Event executed, but balance not settled** | Show balance due, block loyalty award |
| **Webhook delayed** | Event remains `accepted` until webhook processes |
| **Duplicate webhook** | Idempotency key prevents double ledger entry |

**System Law Alignment**: Fail-closed, not fail-open (Law 20).

---

## Lifecycle Repeatability

### How Clients Rebook

After an event reaches `completed` state:

1. Client views event in **Follow-Up** state
2. Client clicks "Book Again" button
3. System creates **new draft event** with:
   - Same `client_id`
   - Same `tenant_id`
   - **New** `event_id`
   - Pre-filled data from previous event (optional)
   - Status = `draft`
4. Lifecycle begins again at **Inquiry** state

**Critical**: Each booking is a **separate event**. Lifecycle does **not** reuse event IDs.

---

## Lifecycle Determinism

### Predictability Guarantees

The ChefFlow lifecycle is **deterministic**:

| Guarantee | Enforcement |
|-----------|------------|
| **Finite states** | Enum enforced in database |
| **Predictable transitions** | Server-side validation function |
| **No skipped states** | Transition validation blocks invalid paths |
| **No hidden states** | All states defined in System Laws |
| **Idempotent transitions** | Repeated calls have no effect |
| **Audit trail complete** | Every transition logged |

**System Law Alignment**: Law 4 (finite lifecycle), Law 17 (no silent transitions).

---

## Client-Facing Lifecycle Labels

### User-Friendly State Names

Clients see **friendly labels**, not technical statuses:

| DB Status | Lifecycle State | Client-Facing Label |
|-----------|----------------|---------------------|
| `draft` | Inquiry | "Request Submitted" |
| `proposed` | Proposal | "Awaiting Your Response" |
| `paid` | Deposit Paid | "Payment Received" |
| `confirmed` | Confirmed | "Booking Confirmed" |
| `confirmed` | Menu Finalized | "Menu Ready" |
| `in_progress` | Event In Progress | "Event Today" |
| `completed` | Event Executed | "Event Complete" |
| `completed` | Loyalty Awarded | "Points Earned" |
| `completed` | Follow-Up | "Share Your Experience" |
| `cancelled` | Cancelled | "Booking Cancelled" |

**Presentation Rule**: UI labels are **derived**, never stored.

---

## Lifecycle Performance

### Indexing for Lifecycle Queries

All lifecycle queries use indexes:

```sql
-- Event status queries
CREATE INDEX idx_events_status ON events(status);

-- Client-scoped queries
CREATE INDEX idx_events_client ON events(client_id);

-- Tenant-scoped queries
CREATE INDEX idx_events_tenant ON events(tenant_id);

-- Transition audit queries
CREATE INDEX idx_transitions_event ON event_transitions(event_id);
CREATE INDEX idx_transitions_date ON event_transitions(transitioned_at DESC);
```

**Performance Target**: Client dashboard loads in <200ms (P95).

---

## Lifecycle and Multi-Tenancy

### Tenant Isolation

Lifecycle state is **tenant-scoped**:

```sql
-- Clients cannot see events from other tenants
SELECT * FROM events
WHERE client_id = get_current_client_id()
  AND tenant_id = get_current_tenant_id();
```

**Critical**: Even if a client has profiles in multiple tenants, each tenant's events are **isolated**.

---

## Related Documents

- [CLIENT_LIFECYCLE_STATE_MACHINE.md](./CLIENT_LIFECYCLE_STATE_MACHINE.md)
- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)
- [CLIENT_INQUIRY_MODEL.md](./CLIENT_INQUIRY_MODEL.md)
- [CLIENT_PROPOSAL_MODEL.md](./CLIENT_PROPOSAL_MODEL.md)
- [CLIENT_DEPOSIT_STATE_RULES.md](./CLIENT_DEPOSIT_STATE_RULES.md)
- [CLIENT_EVENT_CONFIRMATION_RULES.md](./CLIENT_EVENT_CONFIRMATION_RULES.md)
- [CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md](./CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

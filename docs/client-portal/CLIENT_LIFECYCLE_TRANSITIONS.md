# Client Lifecycle Transitions

## Document Identity
- **File**: `CLIENT_LIFECYCLE_TRANSITIONS.md`
- **Category**: Lifecycle System (23/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **detailed transition rules** for the ChefFlow V1 lifecycle.

It specifies:
- Complete transition table with validation rules
- Pre-conditions and post-conditions for each transition
- Actor permissions for each transition
- Financial validation requirements
- Audit logging requirements
- Error handling for failed transitions

---

## Complete Transition Table

### Forward Transitions

| Edge | From | To | Actor | Pre-Conditions | Post-Conditions | Financial Check | Audit Required |
|------|------|-------|-------|---------------|----------------|-----------------|----------------|
| **E1** | `draft` | `proposed` | Chef | Event has pricing, client assigned | Proposal sent notification | None | ✅ Yes |
| **E2** | `proposed` | `accepted` | Client | Client owns event | Acceptance recorded | None | ✅ Yes |
| **E3** | `accepted` | `paid` | System | Webhook idempotency key valid | Ledger entry created | `deposit_amount_cents` | ✅ Yes |
| **E4** | `paid` | `confirmed` | Chef | Deposit verified in ledger | Confirmation sent | Ledger balance ≥ deposit | ✅ Yes |
| **E5** | `confirmed` | `in_progress` | Chef | None (optional: event date = today) | Event started | None | ✅ Yes |
| **E6** | `in_progress` | `completed` | Chef | None | Event marked complete | Balance settled or due | ✅ Yes |

### Cancellation Transitions

| Edge | From | To | Actor | Pre-Conditions | Post-Conditions | Financial Check | Audit Required |
|------|------|-------|-------|---------------|----------------|-----------------|----------------|
| **C1** | `draft` | `cancelled` | Chef | None | Cancellation recorded | None | ✅ Yes |
| **C2** | `proposed` | `cancelled` | Chef | None | Cancellation recorded | None | ✅ Yes |
| **C3** | `accepted` | `cancelled` | Chef | None | Cancellation recorded | None | ✅ Yes |
| **C4** | `paid` | `cancelled` | Chef | Refund policy check | Refund initiated in Stripe | Refund ledger entry | ✅ Yes |
| **C5** | `confirmed` | `cancelled` | Chef | Refund policy check | Refund initiated in Stripe | Refund ledger entry | ✅ Yes |
| **C6** | `in_progress` | `cancelled` | Chef | Emergency only | Refund initiated in Stripe | Full refund | ✅ Yes |

---

## Transition Details

### Transition E1: `draft → proposed`

**Triggered By**: Chef proposes event to client

#### Pre-Conditions

```typescript
interface E1PreConditions {
  event: {
    status: 'draft';
    client_id: string; // Must be set
    total_amount_cents: number; // Must be > 0
    deposit_amount_cents: number; // Must be > 0
    event_date: Date; // Must be future date
    title: string; // Must be non-empty
    location: string; // Must be non-empty
    guest_count: number; // Must be > 0
  };
  actor: {
    role: 'chef';
    tenant_id: string; // Must match event.tenant_id
  };
}
```

#### Validation Logic

```typescript
async function validateE1Transition(event: Event, actor: User): Promise<void> {
  // Check actor is chef
  if (actor.role !== 'chef') {
    throw new Error('Only chef can propose events');
  }

  // Check tenant match
  if (actor.tenant_id !== event.tenant_id) {
    throw new Error('Tenant ID mismatch');
  }

  // Check required fields
  if (!event.client_id) {
    throw new Error('Client must be assigned before proposing');
  }

  if (event.total_amount_cents <= 0) {
    throw new Error('Total amount must be greater than 0');
  }

  if (event.deposit_amount_cents <= 0) {
    throw new Error('Deposit amount must be greater than 0');
  }

  if (event.event_date <= new Date()) {
    throw new Error('Event date must be in the future');
  }

  // All validations passed
}
```

#### Post-Conditions

- Event status = `proposed`
- `status_changed_at` = now
- Audit entry created in `event_transitions`
- Client receives proposal notification (V1: manual, V2: automated email)

#### Audit Metadata

```json
{
  "transition": "draft_to_proposed",
  "proposed_at": "2026-02-14T10:30:00Z",
  "proposed_by": "auth_user_id",
  "client_id": "client_uuid",
  "total_amount_cents": 50000,
  "deposit_amount_cents": 10000
}
```

---

### Transition E2: `proposed → accepted`

**Triggered By**: Client accepts proposal

#### Pre-Conditions

```typescript
interface E2PreConditions {
  event: {
    status: 'proposed';
    client_id: string;
  };
  actor: {
    role: 'client';
    client_id: string; // Must match event.client_id
    tenant_id: string; // Must match event.tenant_id
  };
}
```

#### Validation Logic

```typescript
async function validateE2Transition(event: Event, actor: User): Promise<void> {
  // Check actor is client
  if (actor.role !== 'client') {
    throw new Error('Only client can accept proposals');
  }

  // Check client owns this event
  if (actor.client_id !== event.client_id) {
    throw new Error('Client does not own this event');
  }

  // Check tenant match
  if (actor.tenant_id !== event.tenant_id) {
    throw new Error('Tenant ID mismatch');
  }

  // All validations passed
}
```

#### Post-Conditions

- Event status = `accepted`
- `status_changed_at` = now
- Audit entry created in `event_transitions`
- Payment flow initiated (Stripe checkout session created)

#### Audit Metadata

```json
{
  "transition": "proposed_to_accepted",
  "accepted_at": "2026-02-14T11:00:00Z",
  "accepted_by": "client_auth_user_id",
  "stripe_checkout_session_id": "cs_test_..."
}
```

---

### Transition E3: `accepted → paid` (System Only)

**Triggered By**: Stripe webhook `payment_intent.succeeded`

#### Pre-Conditions

```typescript
interface E3PreConditions {
  event: {
    status: 'accepted';
  };
  webhook: {
    type: 'payment_intent.succeeded';
    data: {
      object: {
        id: string; // payment_intent_id
        amount: number; // Must match deposit or total
        metadata: {
          event_id: string; // Must match event.id
          tenant_id: string; // Must match event.tenant_id
        };
      };
    };
  };
  idempotency: {
    stripe_event_id: string; // Must not exist in ledger_entries
  };
}
```

#### Validation Logic

```typescript
async function validateE3Transition(
  event: Event,
  webhook: StripeWebhookEvent
): Promise<void> {
  // Check webhook is for this event
  const eventId = webhook.data.object.metadata.event_id;
  if (eventId !== event.id) {
    throw new Error('Event ID mismatch in webhook metadata');
  }

  // Check tenant match
  const tenantId = webhook.data.object.metadata.tenant_id;
  if (tenantId !== event.tenant_id) {
    throw new Error('Tenant ID mismatch in webhook metadata');
  }

  // Check amount matches deposit or total
  const amountCents = webhook.data.object.amount;
  const validAmount =
    amountCents === event.deposit_amount_cents ||
    amountCents === event.total_amount_cents;

  if (!validAmount) {
    throw new Error('Payment amount does not match deposit or total');
  }

  // Check idempotency (webhook not already processed)
  const exists = await ledgerEntryExists(webhook.id);
  if (exists) {
    // Already processed - return success (idempotent)
    return;
  }

  // All validations passed
}
```

#### Post-Conditions

- Event status = `paid`
- `status_changed_at` = now
- Ledger entry created with type `charge_succeeded`
- Audit entry created in `event_transitions` with `transitioned_by = NULL` (system)

#### Audit Metadata

```json
{
  "transition": "accepted_to_paid",
  "paid_at": "2026-02-14T11:05:00Z",
  "stripe_event_id": "evt_...",
  "stripe_payment_intent_id": "pi_...",
  "amount_cents": 10000,
  "transitioned_by": null
}
```

**System Law Alignment**: Law 3 (ledger-first), Law 4 (system-enforced transition).

---

### Transition E4: `paid → confirmed`

**Triggered By**: Chef confirms booking after payment verification

#### Pre-Conditions

```typescript
interface E4PreConditions {
  event: {
    status: 'paid';
    deposit_amount_cents: number;
  };
  actor: {
    role: 'chef';
    tenant_id: string; // Must match event.tenant_id
  };
  ledger: {
    collected_cents: number; // Must be >= deposit_amount_cents
  };
}
```

#### Validation Logic

```typescript
async function validateE4Transition(event: Event, actor: User): Promise<void> {
  // Check actor is chef
  if (actor.role !== 'chef') {
    throw new Error('Only chef can confirm bookings');
  }

  // Check tenant match
  if (actor.tenant_id !== event.tenant_id) {
    throw new Error('Tenant ID mismatch');
  }

  // Check ledger confirms deposit paid
  const ledgerSummary = await getEventFinancialSummary(event.id);
  if (ledgerSummary.collected_cents < event.deposit_amount_cents) {
    throw new Error('Deposit not yet paid according to ledger');
  }

  // All validations passed
}
```

#### Post-Conditions

- Event status = `confirmed`
- `status_changed_at` = now
- Audit entry created in `event_transitions`
- Confirmation notification sent to client (V1: manual)

#### Audit Metadata

```json
{
  "transition": "paid_to_confirmed",
  "confirmed_at": "2026-02-14T12:00:00Z",
  "confirmed_by": "chef_auth_user_id",
  "ledger_balance_cents": 10000
}
```

**System Law Alignment**: Law 3 (ledger verification required).

---

### Transition E5: `confirmed → in_progress`

**Triggered By**: Chef starts event (typically on event day)

#### Pre-Conditions

```typescript
interface E5PreConditions {
  event: {
    status: 'confirmed';
  };
  actor: {
    role: 'chef';
    tenant_id: string; // Must match event.tenant_id
  };
}
```

#### Validation Logic

```typescript
async function validateE5Transition(event: Event, actor: User): Promise<void> {
  // Check actor is chef
  if (actor.role !== 'chef') {
    throw new Error('Only chef can start events');
  }

  // Check tenant match
  if (actor.tenant_id !== event.tenant_id) {
    throw new Error('Tenant ID mismatch');
  }

  // Optional: Check event date is today (warning only)
  const today = new Date().toDateString();
  const eventDay = new Date(event.event_date).toDateString();
  if (today !== eventDay) {
    console.warn('Event started on non-event day');
  }

  // All validations passed
}
```

#### Post-Conditions

- Event status = `in_progress`
- `status_changed_at` = now
- Audit entry created in `event_transitions`

#### Audit Metadata

```json
{
  "transition": "confirmed_to_in_progress",
  "started_at": "2026-02-14T18:00:00Z",
  "started_by": "chef_auth_user_id",
  "event_date": "2026-02-14"
}
```

---

### Transition E6: `in_progress → completed`

**Triggered By**: Chef marks event complete after service delivery

#### Pre-Conditions

```typescript
interface E6PreConditions {
  event: {
    status: 'in_progress';
  };
  actor: {
    role: 'chef';
    tenant_id: string; // Must match event.tenant_id
  };
}
```

#### Validation Logic

```typescript
async function validateE6Transition(event: Event, actor: User): Promise<void> {
  // Check actor is chef
  if (actor.role !== 'chef') {
    throw new Error('Only chef can complete events');
  }

  // Check tenant match
  if (actor.tenant_id !== event.tenant_id) {
    throw new Error('Tenant ID mismatch');
  }

  // All validations passed
}
```

#### Post-Conditions

- Event status = `completed` (terminal state)
- `status_changed_at` = now
- Audit entry created in `event_transitions`
- Loyalty points calculated (if fully paid)
- Follow-up flow triggered (V2: automated)

#### Audit Metadata

```json
{
  "transition": "in_progress_to_completed",
  "completed_at": "2026-02-14T22:00:00Z",
  "completed_by": "chef_auth_user_id",
  "balance_due_cents": 0,
  "loyalty_points_awarded": 500
}
```

**System Law Alignment**: Law 3 (loyalty derived from ledger).

---

### Transition C1-C3: `* → cancelled` (Pre-Payment)

**Triggered By**: Chef cancels event before payment

#### Pre-Conditions

```typescript
interface C1_C3_PreConditions {
  event: {
    status: 'draft' | 'proposed' | 'accepted';
  };
  actor: {
    role: 'chef';
    tenant_id: string;
  };
  cancellation_reason: string; // Required
}
```

#### Validation Logic

```typescript
async function validateCancellationPrePayment(
  event: Event,
  actor: User,
  reason: string
): Promise<void> {
  // Check actor is chef
  if (actor.role !== 'chef') {
    throw new Error('Only chef can cancel events');
  }

  // Check tenant match
  if (actor.tenant_id !== event.tenant_id) {
    throw new Error('Tenant ID mismatch');
  }

  // Check cancellation reason provided
  if (!reason || reason.trim().length < 10) {
    throw new Error('Cancellation reason must be at least 10 characters');
  }

  // All validations passed
}
```

#### Post-Conditions

- Event status = `cancelled` (terminal state)
- `cancellation_reason` = reason
- `cancelled_at` = now
- `cancelled_by` = actor.auth_user_id
- Audit entry created in `event_transitions`
- No refund required (no payment made)

#### Audit Metadata

```json
{
  "transition": "draft_to_cancelled",
  "cancelled_at": "2026-02-14T10:00:00Z",
  "cancelled_by": "chef_auth_user_id",
  "cancellation_reason": "Client requested different date not available"
}
```

---

### Transition C4-C6: `* → cancelled` (Post-Payment)

**Triggered By**: Chef cancels event after payment received

#### Pre-Conditions

```typescript
interface C4_C6_PreConditions {
  event: {
    status: 'paid' | 'confirmed' | 'in_progress';
  };
  actor: {
    role: 'chef';
    tenant_id: string;
  };
  cancellation_reason: string; // Required
  refund_policy: {
    refund_percentage: number; // 0-100
  };
}
```

#### Validation Logic

```typescript
async function validateCancellationPostPayment(
  event: Event,
  actor: User,
  reason: string
): Promise<void> {
  // Check actor is chef
  if (actor.role !== 'chef') {
    throw new Error('Only chef can cancel events');
  }

  // Check tenant match
  if (actor.tenant_id !== event.tenant_id) {
    throw new Error('Tenant ID mismatch');
  }

  // Check cancellation reason provided
  if (!reason || reason.trim().length < 10) {
    throw new Error('Cancellation reason must be at least 10 characters');
  }

  // Check ledger state
  const ledgerSummary = await getEventFinancialSummary(event.id);
  if (ledgerSummary.collected_cents > 0) {
    // Refund will be required
    console.log('Refund will be initiated via Stripe');
  }

  // All validations passed
}
```

#### Post-Conditions

- Event status = `cancelled` (terminal state)
- `cancellation_reason` = reason
- `cancelled_at` = now
- `cancelled_by` = actor.auth_user_id
- Audit entry created in `event_transitions`
- **Refund initiated in Stripe** (webhook will create ledger entry)
- Ledger entry created with type `refund_created`

#### Audit Metadata

```json
{
  "transition": "confirmed_to_cancelled",
  "cancelled_at": "2026-02-14T15:00:00Z",
  "cancelled_by": "chef_auth_user_id",
  "cancellation_reason": "Chef emergency - unable to fulfill",
  "refund_initiated": true,
  "refund_amount_cents": 10000,
  "stripe_refund_id": "re_..."
}
```

**System Law Alignment**: Law 3 (refund via ledger).

---

## Transition Error Handling

### Error Categories

| Error Type | HTTP Status | Retry Safe? | Example |
|------------|------------|-------------|---------|
| **Validation Error** | 400 | ❌ No | "Event must have pricing before proposing" |
| **Permission Error** | 403 | ❌ No | "Only chef can confirm bookings" |
| **State Error** | 409 | ❌ No | "Cannot transition from completed state" |
| **Financial Error** | 402 | ⚠️ Maybe | "Deposit not yet paid according to ledger" |
| **System Error** | 500 | ✅ Yes | "Database connection failed" |

### Error Response Format

```typescript
interface TransitionError {
  error: {
    code: string;
    message: string;
    details: {
      current_status: EventStatus;
      attempted_status: EventStatus;
      validation_failures: string[];
    };
  };
}
```

**Example**:

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition from draft to confirmed",
    "details": {
      "current_status": "draft",
      "attempted_status": "confirmed",
      "validation_failures": [
        "Event must be proposed before confirmation",
        "Payment must be received before confirmation"
      ]
    }
  }
}
```

---

## Idempotent Transitions

### Safe Retry Behavior

Transitions must be **idempotent** (safe to retry):

| Scenario | Behavior |
|----------|----------|
| **Transition to current state** | No-op (return success) |
| **Duplicate webhook** | Check ledger idempotency key, skip if exists |
| **Concurrent transitions** | Database lock prevents race conditions |

### Implementation

```typescript
async function transitionEventStatus(
  eventId: string,
  toStatus: EventStatus,
  actorId: string
): Promise<void> {
  // Lock event row to prevent concurrent updates
  const event = await db.events.findUnique({
    where: { id: eventId },
    lock: 'UPDATE' // Postgres row lock
  });

  // If already in target state, return success (idempotent)
  if (event.status === toStatus) {
    return;
  }

  // Validate transition
  await validateTransition(event, toStatus, actorId);

  // Perform transition
  await db.events.update({
    where: { id: eventId },
    data: {
      status: toStatus,
      status_changed_at: new Date(),
      updated_by: actorId
    }
  });
}
```

**System Law Alignment**: Law 11 (idempotency required).

---

## Related Documents

- [CLIENT_LIFECYCLE_STATE_MACHINE.md](./CLIENT_LIFECYCLE_STATE_MACHINE.md)
- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_DEPOSIT_STATE_RULES.md](./CLIENT_DEPOSIT_STATE_RULES.md)
- [CLIENT_EVENT_CONFIRMATION_RULES.md](./CLIENT_EVENT_CONFIRMATION_RULES.md)
- [CLIENT_LIFECYCLE_FAILURE_HANDLING.md](./CLIENT_LIFECYCLE_FAILURE_HANDLING.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

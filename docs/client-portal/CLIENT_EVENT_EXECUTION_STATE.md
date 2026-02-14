# Client Event Execution State

## Document Identity
- **File**: `CLIENT_EVENT_EXECUTION_STATE.md`
- **Category**: Lifecycle System (29/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **event execution states** for ChefFlow V1.

It specifies:
- When and how events transition to execution
- In-progress state management
- Event completion criteria
- Balance payment collection during execution
- Client visibility during execution
- Execution audit trail

---

## Execution States

### Two Execution States

| State | Status | Meaning | Duration |
|-------|--------|---------|----------|
| **In Progress** | `in_progress` | Event is currently happening | Event day |
| **Completed** | `completed` | Event finished successfully | Permanent (terminal) |

---

## Starting an Event

### Transition: `confirmed → in_progress`

**Triggered By**: Chef (manual action)

**Typical Timing**: On event day, when chef arrives/begins service.

### Pre-Start Validation

```typescript
async function validateEventStart(
  eventId: string,
  chefUserId: string
): Promise<void> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Load event
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  // Check status
  if (event.status !== 'confirmed') {
    errors.push('Only confirmed events can be started');
  }

  // Check chef ownership
  const chef = await getCurrentChef(chefUserId);
  if (event.tenant_id !== chef.id) {
    errors.push('Chef does not own this event');
  }

  // Check event date (warning only)
  const today = new Date().toDateString();
  const eventDay = new Date(event.event_date).toDateString();

  if (today !== eventDay) {
    warnings.push('Starting event on non-event day');
  }

  // Check menus attached (warning only)
  const menusCount = await db.event_menus.count({
    where: { event_id: eventId }
  });

  if (menusCount === 0) {
    warnings.push('No menus attached to event');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  if (warnings.length > 0) {
    console.warn('Event start warnings:', warnings);
  }
}
```

---

## Start Event API

### Endpoint: Start Event

```typescript
POST /api/events/:eventId/start

// Request body (optional)
{
  "start_notes": "Arrived on time, setup complete"
}

// Response
{
  "event": {
    "id": "event_uuid",
    "status": "in_progress",
    "status_changed_at": "2026-03-15T18:00:00Z"
  }
}
```

### Server Implementation

```typescript
async function startEvent(
  eventId: string,
  chefUserId: string,
  notes?: string
): Promise<Event> {
  // Validate start requirements
  await validateEventStart(eventId, chefUserId);

  // Transition to in_progress
  const event = await db.events.update({
    where: { id: eventId },
    data: {
      status: 'in_progress',
      status_changed_at: new Date(),
      updated_by: chefUserId
    }
  });

  // Create audit entry
  await db.event_transitions.create({
    data: {
      tenant_id: event.tenant_id,
      event_id: eventId,
      from_status: 'confirmed',
      to_status: 'in_progress',
      transitioned_by: chefUserId,
      metadata: {
        started_at: new Date().toISOString(),
        start_notes: notes,
        event_date: event.event_date
      }
    }
  });

  return event;
}
```

---

## In-Progress State Characteristics

### What Happens During Execution

| Aspect | Behavior |
|--------|----------|
| **Event mutability** | ❌ Locked (no edits allowed) |
| **Menu mutability** | ❌ Finalized (no changes) |
| **Client visibility** | ✅ Can view event status |
| **Messaging** | ⚠️ Limited (urgent only) |
| **Balance payment** | ✅ Can be collected |
| **Cancellation** | ⚠️ Emergency only (rare) |

---

## Client View During Execution

### Client Portal Display

```
┌────────────────────────────────────────────────────┐
│         EVENT IN PROGRESS                           │
├────────────────────────────────────────────────────┤
│ 🎉 Your event is happening now!                    │
│                                                     │
│ Event: Birthday Party                               │
│ Date: March 15, 2026 at 6:00 PM                    │
│ Location: 123 Main St                               │
│ Chef: Chef Mario                                    │
│                                                     │
│ Status: In Progress                                 │
│ Started: 6:00 PM                                    │
│                                                     │
│ Balance Due: $2,000.00                              │
│ [Pay Balance Now]                                   │
│                                                     │
│ [View Menu]  [Urgent Message]                       │
└────────────────────────────────────────────────────┘
```

**Client Actions**:
- ✅ View event details (read-only)
- ✅ Pay balance (if due)
- ✅ Send urgent message to chef
- ❌ Edit event details
- ❌ Cancel event

---

## Balance Payment During Execution

### Collecting Balance

**Scenario**: Deposit already paid ($500), balance due ($2,000).

**V1 Flow**: Client can pay balance via Stripe checkout during `in_progress` state.

### Creating Balance Payment

```typescript
async function createBalanceCheckoutSession(
  event: Event
): Promise<Stripe.Checkout.Session> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Calculate balance due from ledger
  const ledgerSummary = await getEventFinancialSummary(event.id);
  const balanceCents = event.total_amount_cents - ledgerSummary.collected_cents;

  if (balanceCents <= 0) {
    throw new Error('No balance due');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: event.client.stripe_customer_id,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: balanceCents,
          product_data: {
            name: `Balance for ${event.title}`,
            description: `Event Date: ${event.event_date.toLocaleDateString()}`
          }
        },
        quantity: 1
      }
    ],
    payment_intent_data: {
      metadata: {
        event_id: event.id,
        tenant_id: event.tenant_id,
        client_id: event.client_id,
        payment_type: 'balance'
      }
    },
    success_url: `${process.env.APP_URL}/my-events/${event.id}?payment=success`,
    cancel_url: `${process.env.APP_URL}/my-events/${event.id}?payment=cancelled`
  });

  return session;
}
```

**Key Difference**: `metadata.payment_type = 'balance'` (not `'deposit'`).

---

## Balance Payment Webhook

### Handling Balance Payment Success

```typescript
async function handleBalancePayment(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const eventId = paymentIntent.metadata.event_id;
  const paymentType = paymentIntent.metadata.payment_type;

  if (paymentType !== 'balance') {
    return; // Not a balance payment
  }

  // Create ledger entry (idempotent)
  await createLedgerEntry({
    event_id: eventId,
    entry_type: 'charge_succeeded',
    amount_cents: paymentIntent.amount,
    stripe_event_id: paymentIntent.id,
    description: 'Balance payment via Stripe'
  });

  // No status transition (event stays in_progress or completed)
}
```

**Important**: Balance payment does **not** change event status.

---

## Completing an Event

### Transition: `in_progress → completed`

**Triggered By**: Chef (manual action)

**Typical Timing**: After service finished, chef cleaned up, left venue.

### Pre-Completion Validation

```typescript
async function validateEventCompletion(
  eventId: string,
  chefUserId: string
): Promise<void> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Load event
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  // Check status
  if (event.status !== 'in_progress') {
    errors.push('Only in-progress events can be completed');
  }

  // Check chef ownership
  const chef = await getCurrentChef(chefUserId);
  if (event.tenant_id !== chef.id) {
    errors.push('Chef does not own this event');
  }

  // Check balance paid (warning only)
  const ledgerSummary = await getEventFinancialSummary(eventId);
  const balanceDue = event.total_amount_cents - ledgerSummary.collected_cents;

  if (balanceDue > 0) {
    warnings.push(`Balance due: $${balanceDue / 100}. Mark as outstanding.`);
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  if (warnings.length > 0) {
    console.warn('Event completion warnings:', warnings);
  }
}
```

---

## Complete Event API

### Endpoint: Complete Event

```typescript
POST /api/events/:eventId/complete

// Request body (optional)
{
  "completion_notes": "Event went great! Client loved the food.",
  "mark_balance_as_outstanding": true // If balance unpaid
}

// Response
{
  "event": {
    "id": "event_uuid",
    "status": "completed",
    "status_changed_at": "2026-03-15T22:00:00Z"
  }
}
```

### Server Implementation

```typescript
async function completeEvent(
  eventId: string,
  chefUserId: string,
  options?: {
    completion_notes?: string;
    mark_balance_as_outstanding?: boolean;
  }
): Promise<Event> {
  // Validate completion requirements
  await validateEventCompletion(eventId, chefUserId);

  // Transition to completed
  const event = await db.events.update({
    where: { id: eventId },
    data: {
      status: 'completed',
      status_changed_at: new Date(),
      updated_by: chefUserId
    }
  });

  // Create audit entry
  await db.event_transitions.create({
    data: {
      tenant_id: event.tenant_id,
      event_id: eventId,
      from_status: 'in_progress',
      to_status: 'completed',
      transitioned_by: chefUserId,
      metadata: {
        completed_at: new Date().toISOString(),
        completion_notes: options?.completion_notes,
        balance_outstanding: options?.mark_balance_as_outstanding
      }
    }
  });

  // Calculate loyalty points (if fully paid)
  const ledgerSummary = await getEventFinancialSummary(eventId);
  if (ledgerSummary.is_fully_paid) {
    await awardLoyaltyPoints(eventId);
  }

  return event;
}
```

---

## Post-Completion State

### Completed Event Characteristics

| Aspect | Behavior |
|--------|----------|
| **Event status** | `completed` (terminal state) |
| **Mutability** | ❌ Locked (immutable historical record) |
| **Client visibility** | ✅ Yes (historical view) |
| **Balance payment** | ✅ Can still pay if due |
| **Loyalty points** | ✅ Awarded (if fully paid) |
| **Further transitions** | ❌ No (terminal state) |

---

## Client View After Completion

### Client Portal Display

```
┌────────────────────────────────────────────────────┐
│         EVENT COMPLETED                             │
├────────────────────────────────────────────────────┤
│ ✓ Event Completed (March 15, 2026)                 │
│                                                     │
│ Event: Birthday Party                               │
│ Date: March 15, 2026                                │
│ Chef: Chef Mario                                    │
│                                                     │
│ Payment Summary:                                    │
│ Total: $2,500.00                                    │
│ Paid: $2,500.00                                     │
│ Balance: $0.00                                      │
│                                                     │
│ 🎁 Loyalty Points Earned: 250 points               │
│                                                     │
│ [View Menu]  [Book Again]  [Leave Feedback]         │
└────────────────────────────────────────────────────┘
```

---

## Outstanding Balance After Completion

### Scenario: Balance Not Paid

If chef completes event with outstanding balance:

1. Event transitions to `completed`
2. Balance remains due (tracked in ledger)
3. Client can still pay balance after completion
4. Loyalty points **not awarded** until fully paid

**Display**:

```
┌────────────────────────────────────────────────────┐
│         EVENT COMPLETED - BALANCE DUE               │
├────────────────────────────────────────────────────┤
│ ✓ Event Completed (March 15, 2026)                 │
│                                                     │
│ ⚠️ Balance Due: $2,000.00                           │
│                                                     │
│ [Pay Balance Now]                                   │
│                                                     │
│ Loyalty points will be awarded after full payment.  │
└────────────────────────────────────────────────────┘
```

---

## Execution Timing Metrics

### Tracking Execution Performance

| Metric | Definition | V1 Support |
|--------|-----------|-----------|
| **Event Duration** | `completed_at - started_at` | ✅ Manual query |
| **On-Time Start** | Event started on event day | ✅ Manual query |
| **Balance Collection Rate** | % of events fully paid by completion | ✅ Manual query |

**Query Example**:

```sql
-- Average event duration (in hours)
SELECT
  AVG(
    EXTRACT(EPOCH FROM (completed.transitioned_at - started.transitioned_at)) / 3600
  ) AS avg_event_duration_hours
FROM event_transitions started
JOIN event_transitions completed ON completed.event_id = started.event_id
WHERE started.to_status = 'in_progress'
  AND completed.to_status = 'completed'
  AND started.tenant_id = 'tenant_uuid';
```

---

## Emergency Cancellation During Execution

### Transition: `in_progress → cancelled`

**Rare Scenario**: Chef must cancel event after it started (emergency).

**Process**:
1. Chef clicks "Emergency Cancel" button
2. System requires cancellation reason (min 50 chars)
3. System initiates full refund (deposit + any balance paid)
4. Event transitions to `cancelled`
5. Client notified immediately

**V1 Behavior**: Manual process (chef contacts client directly).

---

## Execution Audit Trail

### Audit Entries

All execution transitions logged:

```json
{
  "transition": "confirmed_to_in_progress",
  "event_id": "event_uuid",
  "from_status": "confirmed",
  "to_status": "in_progress",
  "transitioned_by": "chef_auth_user_id",
  "transitioned_at": "2026-03-15T18:00:00Z",
  "metadata": {
    "started_at": "2026-03-15T18:00:00Z",
    "start_notes": "Arrived on time",
    "event_date": "2026-03-15"
  }
}
```

```json
{
  "transition": "in_progress_to_completed",
  "event_id": "event_uuid",
  "from_status": "in_progress",
  "to_status": "completed",
  "transitioned_by": "chef_auth_user_id",
  "transitioned_at": "2026-03-15T22:00:00Z",
  "metadata": {
    "completed_at": "2026-03-15T22:00:00Z",
    "completion_notes": "Event went great",
    "balance_outstanding": false,
    "loyalty_points_awarded": 250
  }
}
```

---

## Execution Edge Cases

### Edge Case 1: Event Completed Without Starting

**Scenario**: Chef tries to transition `confirmed → completed` (skip in_progress).

**Behavior**: Blocked by validation.

**Rationale**: Must start event before completing.

---

### Edge Case 2: Multiple Start Attempts

**Scenario**: Chef clicks "Start Event" twice.

**Behavior**: Idempotent (second call returns success, no state change).

---

### Edge Case 3: Event Completed Before Event Date

**Scenario**: Chef completes event before scheduled date.

**Behavior**: Allowed with warning.

**Use Case**: Event rescheduled informally, chef forgot to update date.

---

## Related Documents

- [CLIENT_LIFECYCLE_STATE_MACHINE.md](./CLIENT_LIFECYCLE_STATE_MACHINE.md)
- [CLIENT_EVENT_CONFIRMATION_RULES.md](./CLIENT_EVENT_CONFIRMATION_RULES.md)
- [CLIENT_MENU_FINALIZATION_STATE.md](./CLIENT_MENU_FINALIZATION_STATE.md)
- [CLIENT_FOLLOWUP_STATE.md](./CLIENT_FOLLOWUP_STATE.md)
- [CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md](./CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

# Event State Idempotency Rules (V1)

This document defines idempotency requirements for event state transitions and operations. Idempotency ensures that duplicate requests (from retries, double-clicks, or webhook replays) produce the same result without creating duplicate effects.

---

## Core Principle

**An idempotent operation can be executed multiple times with the same parameters, and the system state will be identical to executing it once.**

---

## Idempotency Scope

### Operations That MUST Be Idempotent

1. **Event status transitions** (via `transitionEvent()`)
2. **Ledger entry creation** (via webhook processing)
3. **Payment intent creation** (via Stripe idempotency keys)
4. **Client invite creation**
5. **Webhook processing** (Stripe events)

### Operations That May Be Non-Idempotent

1. **Analytics event logging** (duplicates acceptable)
2. **UI state updates** (client-side only)
3. **Email sends** (handled by external service with own idempotency)

---

## Transition Idempotency Rules

### Rule 1: Already-In-Status Check

If an event is already in the target status, return success without creating a duplicate transition log.

```typescript
// Before attempting transition
if (event.status === toStatus) {
  // Already in target status - idempotent success
  return {
    success: true,
    event: { id: event.id, status: event.status },
    transition: { id: lastTransitionId, triggeredAt: lastTransitionDate },
  };
}
```

**Why**: Prevents duplicate transition logs when a user clicks "Confirm" twice or a webhook retries.

---

### Rule 2: Idempotency Key Usage

For critical transitions (especially system-triggered), use an idempotency key to prevent duplicate processing.

```typescript
const idempotencyKey = `evt_${stripeEvent.id}`; // Stripe event ID

// Check if this key was already processed
const existingTransition = await db.event_transitions.findUnique({
  where: { idempotency_key: idempotencyKey },
});

if (existingTransition) {
  // Already processed - return existing result
  return { success: true, alreadyProcessed: true };
}

// Proceed with transition, including idempotency key
await transitionEvent({
  eventId,
  toStatus: 'confirmed',
  triggeredBy: 'system',
  idempotencyKey,
});
```

**Why**: Prevents duplicate transitions from webhook retries or race conditions.

---

### Rule 3: Atomic Transaction Requirement

Transition log creation and status update must occur in a single database transaction.

```typescript
await db.$transaction(async (tx) => {
  // 1. Create transition log (immutable)
  await tx.event_transitions.create({ ... });

  // 2. Update event status
  await tx.events.update({ ... });
});
```

**Why**: Ensures either both operations succeed or both fail. No partial state.

---

## Ledger Idempotency Rules

### Rule 4: Stripe Event ID as Idempotency Key

Every ledger entry created from a Stripe event must include the Stripe event ID to prevent duplicates.

```typescript
// Before creating ledger entry from webhook
const existingEntry = await db.ledger_entries.findUnique({
  where: { stripe_event_id: stripeEvent.id },
});

if (existingEntry) {
  console.log('Ledger entry already exists for this Stripe event');
  return { success: true, alreadyProcessed: true };
}

// Create new ledger entry
await db.ledger_entries.create({
  data: {
    event_id: eventId,
    entry_type: 'charge_succeeded',
    amount_cents: amount,
    stripe_event_id: stripeEvent.id, // Unique constraint
  },
});
```

**Schema Requirement**:
```sql
ALTER TABLE ledger_entries
ADD COLUMN stripe_event_id TEXT UNIQUE;
```

---

### Rule 5: Manual Ledger Entries Use Unique Constraints

For chef-initiated ledger entries (adjustments, manual refunds), use composite unique constraints.

```sql
-- Prevent duplicate adjustments
CREATE UNIQUE INDEX idx_ledger_unique_adjustment
ON ledger_entries(event_id, entry_type, amount_cents, created_at)
WHERE entry_type = 'adjustment';
```

---

## Payment Intent Idempotency Rules

### Rule 6: Stripe Idempotency Keys

When creating Stripe payment intents, always provide an idempotency key.

```typescript
const idempotencyKey = `payment_${eventId}_${Date.now()}`;

const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: depositAmountCents,
    currency: 'usd',
    metadata: { event_id: eventId },
  },
  {
    idempotencyKey, // Stripe-level idempotency
  }
);

// Store idempotency key to prevent duplicate intent creation
await db.events.update({
  where: { id: eventId },
  data: { payment_intent_idempotency_key: idempotencyKey },
});
```

---

### Rule 7: Check Existing Payment Intent

Before creating a new payment intent, check if one already exists for the event.

```typescript
const event = await db.events.findUnique({
  where: { id: eventId },
  select: { payment_intent_id: true, status: true },
});

if (event.payment_intent_id) {
  // Payment intent already exists
  return { success: true, paymentIntentId: event.payment_intent_id };
}

// Proceed with creation
const paymentIntent = await createPaymentIntent(eventId);
```

---

## Webhook Idempotency Rules

### Rule 8: Stripe Event ID Check

Every webhook handler must check if the Stripe event has already been processed.

```typescript
// api/webhooks/stripe/route.ts

const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

// Check idempotency
const processed = await db.webhook_events.findUnique({
  where: { stripe_event_id: event.id },
});

if (processed) {
  console.log(`Webhook ${event.id} already processed`);
  return new Response('OK', { status: 200 }); // Acknowledge
}

// Process webhook
await processStripeEvent(event);

// Mark as processed
await db.webhook_events.create({
  data: {
    stripe_event_id: event.id,
    event_type: event.type,
    processed_at: new Date(),
  },
});

return new Response('OK', { status: 200 });
```

**Schema**:
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Client Invite Idempotency Rules

### Rule 9: Prevent Duplicate Active Invites

Before creating a new invite, check for existing active invites to the same client.

```typescript
const existingInvite = await db.client_invites.findFirst({
  where: {
    client_profile_id: clientId,
    tenant_id: tenantId,
    expires_at: { gt: new Date() }, // Not expired
    accepted_at: null, // Not yet accepted
  },
});

if (existingInvite) {
  // Return existing invite instead of creating duplicate
  return { success: true, inviteId: existingInvite.id, token: existingInvite.token };
}

// Create new invite
const invite = await db.client_invites.create({ ... });
```

---

## UI Idempotency Rules

### Rule 10: Disable Buttons During Processing

Prevent duplicate submissions via UI state management.

```tsx
'use client';

export function TransitionButton({ eventId, toStatus }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    setIsProcessing(true);

    try {
      await transitionEventAction(eventId, toStatus);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing} // Prevent double-click
    >
      {isProcessing ? 'Processing...' : 'Confirm'}
    </button>
  );
}
```

---

### Rule 11: Optimistic UI Only for Safe Operations

Never use optimistic UI for:
- Status transitions
- Payment processing
- Financial operations

```tsx
// ❌ WRONG: Optimistic status update
const [status, setStatus] = useState(event.status);

const handleConfirm = async () => {
  setStatus('confirmed'); // DON'T DO THIS
  await confirmEvent(eventId);
};

// ✅ CORRECT: Wait for server confirmation
const [status, setStatus] = useState(event.status);
const [isProcessing, setIsProcessing] = useState(false);

const handleConfirm = async () => {
  setIsProcessing(true);
  await confirmEvent(eventId);
  // Refetch actual status from server
  const updated = await fetchEvent(eventId);
  setStatus(updated.status);
  setIsProcessing(false);
};
```

---

## Testing Idempotency

### Test Case 1: Duplicate Transition Requests

```typescript
it('handles duplicate transition requests idempotently', async () => {
  const event = await createTestEvent({ status: 'draft' });

  // First transition
  const result1 = await transitionEvent({
    eventId: event.id,
    toStatus: 'proposed',
    triggeredBy: 'user-123',
  });
  expect(result1.success).toBe(true);

  // Second identical transition (should be no-op)
  const result2 = await transitionEvent({
    eventId: event.id,
    toStatus: 'proposed', // Already in this status
    triggeredBy: 'user-123',
  });
  expect(result2.success).toBe(true);

  // Should only have ONE transition log
  const transitions = await db.event_transitions.findMany({
    where: { event_id: event.id },
  });
  expect(transitions).toHaveLength(1);
});
```

---

### Test Case 2: Duplicate Webhook Processing

```typescript
it('prevents duplicate ledger entries from webhook replay', async () => {
  const stripeEventId = 'evt_test_123';

  // First webhook processing
  await processStripeWebhook({
    id: stripeEventId,
    type: 'payment_intent.succeeded',
    data: { amount: 50000, metadata: { event_id: 'event-123' } },
  });

  // Webhook replay (Stripe retries)
  await processStripeWebhook({
    id: stripeEventId, // Same event ID
    type: 'payment_intent.succeeded',
    data: { amount: 50000, metadata: { event_id: 'event-123' } },
  });

  // Should only have ONE ledger entry
  const entries = await db.ledger_entries.findMany({
    where: { stripe_event_id: stripeEventId },
  });
  expect(entries).toHaveLength(1);
});
```

---

## Common Failure Scenarios

### Scenario 1: User Double-Clicks Button
**Solution**: Disable button during processing (Rule 10).

### Scenario 2: Webhook Retry After 500 Error
**Solution**: Check `stripe_event_id` before processing (Rule 8).

### Scenario 3: Race Condition (Two Concurrent Requests)
**Solution**: Database unique constraints + transactions (Rules 3, 4).

### Scenario 4: Client Refreshes Payment Page
**Solution**: Check existing payment intent before creating new one (Rule 7).

---

## V1 Scope Boundaries

### Included in V1
- All idempotency rules above
- Database unique constraints
- Idempotency key support in transitions
- Webhook deduplication
- UI button disabling

### Excluded from V1
- Distributed idempotency (single-instance assumption)
- Advanced retry strategies (rely on Stripe/Supabase built-ins)
- Idempotency for batch operations (single-event focus)

---

**End of Event State Idempotency Rules**

# Event State Failsafe Behavior (V1)

This document defines failsafe behaviors for event state management when errors, delays, or ambiguous conditions occur. The guiding principle: **fail closed, never open**.

---

## Core Failsafe Principle

**When the system cannot determine the correct state with certainty, it must:**
1. Freeze the operation (do not proceed)
2. Show "processing" or "error" UI (never lie about success)
3. Log the error for investigation
4. Require manual reconciliation if automatic recovery fails

**Never assume success. Never proceed with uncertain state.**

---

## Failsafe Scenarios

### Scenario 1: Webhook Delay

**Situation**: Chef requests deposit payment. Client completes payment. Stripe webhook is delayed (network issue, Stripe outage, etc.).

**Wrong Behavior** (optimistic):
```typescript
// ❌ DON'T DO THIS
async function handlePaymentClick() {
  await createPaymentIntent(eventId);
  // Assume success
  await transitionEvent(eventId, 'confirmed');
}
```

**Correct Failsafe Behavior**:
```typescript
// ✅ CORRECT: Wait for webhook
async function handlePaymentClick() {
  await createPaymentIntent(eventId);
  // Show "processing" UI
  // DO NOT transition to confirmed
  // Let webhook handler transition when it arrives
}

// In webhook handler
async function handlePaymentSucceeded(stripeEvent) {
  // Only now transition to confirmed
  await transitionEvent({
    eventId: stripeEvent.metadata.event_id,
    toStatus: 'confirmed',
    triggeredBy: 'system',
  });
}
```

**UI Display**:
```tsx
{event.status === 'deposit_pending' && (
  <div className="alert alert-info">
    Payment processing... This may take a few moments.
  </div>
)}
```

**Timeout Handling**: If webhook doesn't arrive within 5 minutes, show:
```tsx
<div className="alert alert-warning">
  Payment is taking longer than expected. Please refresh or contact support.
</div>
```

---

### Scenario 2: Transition Validation Failure

**Situation**: User attempts an invalid transition (e.g., `draft` → `confirmed` skipping states).

**Wrong Behavior**:
```typescript
// ❌ DON'T DO THIS
if (!isValidTransition(from, to)) {
  // Silently proceed anyway
  await updateEventStatus(eventId, to);
}
```

**Correct Failsafe Behavior**:
```typescript
// ✅ CORRECT: Reject invalid transition
if (!isValidTransition(from, to)) {
  throw new Error(`Invalid transition: ${from} → ${to}`);
}
```

**UI Display**:
```tsx
{error && (
  <div className="alert alert-error">
    This action is not available for this event. Please refresh.
  </div>
)}
```

---

### Scenario 3: Race Condition (Concurrent Transitions)

**Situation**: Chef and automated system attempt to transition the same event simultaneously.

**Wrong Behavior**:
```typescript
// ❌ DON'T DO THIS (no locking)
const event = await db.events.findUnique({ where: { id: eventId } });
await transitionEvent(eventId, 'executed');
```

**Correct Failsafe Behavior**:
```typescript
// ✅ CORRECT: Use transaction + re-check status
await db.$transaction(async (tx) => {
  const event = await tx.events.findUnique({
    where: { id: eventId },
  });

  if (event.status !== expectedFromStatus) {
    throw new Error('Event status changed during transition');
  }

  await tx.event_transitions.create({ ... });
  await tx.events.update({ ... });
});
```

**Result**: First transaction wins. Second transaction fails with error. UI refetches current state.

---

### Scenario 4: Missing or Corrupt Event Data

**Situation**: Event record exists but critical fields are null/invalid.

**Wrong Behavior**:
```typescript
// ❌ DON'T DO THIS (proceed with bad data)
const event = await db.events.findUnique({ where: { id: eventId } });
// event.total_amount_cents is null
await createPaymentIntent(event.total_amount_cents); // Sends $0 intent!
```

**Correct Failsafe Behavior**:
```typescript
// ✅ CORRECT: Validate before proceeding
const event = await db.events.findUnique({ where: { id: eventId } });

if (!event.total_amount_cents || event.total_amount_cents <= 0) {
  throw new Error('Event has invalid total amount. Cannot create payment.');
}

await createPaymentIntent(event.total_amount_cents);
```

**UI Display**:
```tsx
{!event.total_amount_cents && (
  <div className="alert alert-error">
    Event financial data is incomplete. Please contact support.
  </div>
)}
```

---

### Scenario 5: RLS Policy Denies Access

**Situation**: User attempts to transition an event they don't have access to (cross-tenant attack or session corruption).

**Wrong Behavior**:
```typescript
// ❌ DON'T DO THIS (trust client)
async function transitionEvent(eventId, toStatus) {
  // No access check
  await db.events.update({
    where: { id: eventId },
    data: { status: toStatus },
  });
}
```

**Correct Failsafe Behavior**:
```typescript
// ✅ CORRECT: Let RLS deny
async function transitionEvent(eventId, toStatus) {
  // RLS will prevent update if user lacks access
  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    // Either doesn't exist OR RLS denied access
    throw new Error('Event not found or access denied');
  }

  // Proceed with transition
  await db.events.update({ ... });
}
```

**UI Display**:
```tsx
{error?.message.includes('not found') && (
  <div className="alert alert-error">
    You do not have permission to modify this event.
  </div>
)}
```

---

### Scenario 6: Stripe Webhook Receives Unknown Event Type

**Situation**: Stripe sends a new webhook event type not handled by the system.

**Wrong Behavior**:
```typescript
// ❌ DON'T DO THIS (crash or ignore silently)
async function handleWebhook(event) {
  if (event.type === 'payment_intent.succeeded') {
    // handle
  }
  // Unknown types ignored - might miss critical events
}
```

**Correct Failsafe Behavior**:
```typescript
// ✅ CORRECT: Log unknown types
async function handleWebhook(event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event);
      break;
    default:
      console.warn(`Unhandled webhook type: ${event.type}`, event);
      // Log to error tracking service
      // Return 200 to acknowledge (don't retry)
  }
}
```

---

### Scenario 7: Database Connection Lost Mid-Transaction

**Situation**: Database connection drops during a critical transition.

**Wrong Behavior**:
```typescript
// ❌ DON'T DO THIS (assume success)
try {
  await db.events.update({ ... });
  // Connection drops here
  return { success: true }; // LIE!
} catch (error) {
  // Ignore error
  return { success: true }; // DOUBLE LIE!
}
```

**Correct Failsafe Behavior**:
```typescript
// ✅ CORRECT: Propagate error
try {
  await db.$transaction(async (tx) => {
    await tx.event_transitions.create({ ... });
    await tx.events.update({ ... });
  });
  return { success: true };
} catch (error) {
  console.error('Transaction failed:', error);
  // Propagate error to caller
  throw error;
}
```

**UI Handling**:
```tsx
try {
  await transitionEventAction(eventId, 'confirmed');
  toast.success('Event confirmed!');
} catch (error) {
  toast.error('Failed to confirm event. Please try again.');
  // UI remains in previous state
}
```

---

### Scenario 8: Event in Terminal State

**Situation**: User attempts to transition an event that is already `closed` or `canceled`.

**Wrong Behavior**:
```typescript
// ❌ DON'T DO THIS (allow transition from terminal state)
await transitionEvent(eventId, 'draft'); // Resurrect closed event!?
```

**Correct Failsafe Behavior**:
```typescript
// ✅ CORRECT: Reject transition from terminal state
if (isTerminalStatus(event.status)) {
  throw new Error('Cannot transition from terminal state');
}
```

**UI Display**: Hide transition buttons entirely for terminal states.

```tsx
{!isTerminalStatus(event.status) && (
  <button onClick={handleTransition}>Transition</button>
)}
```

---

## Failsafe UI Patterns

### Pattern 1: Processing State

```tsx
{event.status === 'deposit_pending' && (
  <div className="processing-indicator">
    <Spinner />
    <p>Processing payment... Please wait.</p>
  </div>
)}
```

---

### Pattern 2: Error State

```tsx
{error && (
  <div className="alert alert-error">
    <p>{error.message}</p>
    <button onClick={handleRetry}>Retry</button>
  </div>
)}
```

---

### Pattern 3: Stale State Warning

```tsx
{isStale && (
  <div className="alert alert-warning">
    Event data may be outdated. <button onClick={refresh}>Refresh</button>
  </div>
)}
```

---

### Pattern 4: Disabled Actions with Tooltip

```tsx
<Tooltip content="Event is already confirmed. Cannot edit.">
  <button disabled={event.status === 'confirmed'}>
    Edit Details
  </button>
</Tooltip>
```

---

## Failsafe Logging

### Log All Errors

```typescript
try {
  await transitionEvent({ ... });
} catch (error) {
  console.error('Transition failed:', {
    eventId,
    fromStatus: event.status,
    toStatus,
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  });

  // Send to error tracking (e.g., Sentry)
  captureException(error, {
    tags: { feature: 'event-transitions' },
    extra: { eventId, fromStatus: event.status, toStatus },
  });

  throw error; // Propagate
}
```

---

### Log Unexpected States

```typescript
if (event.status === 'confirmed' && !event.payment_intent_id) {
  console.error('Event is confirmed but has no payment_intent_id:', eventId);
  // Alert developers (should never happen)
}
```

---

## Recovery Procedures

### Manual Reconciliation

If an event gets stuck in an ambiguous state:

1. **Check Stripe Dashboard**: Verify actual payment status
2. **Check Ledger Entries**: Confirm what was recorded
3. **Check Transition Log**: See last known good state
4. **Manual Correction**: Use service role to create corrective transition

```sql
-- SERVICE ROLE ONLY: Manual recovery
INSERT INTO event_transitions (
  event_id,
  from_status,
  to_status,
  triggered_by,
  notes
) VALUES (
  'event-123',
  'deposit_pending',
  'confirmed',
  'system',
  'Manual reconciliation: payment confirmed in Stripe but webhook missed'
);

UPDATE events
SET status = 'confirmed'
WHERE id = 'event-123';
```

---

### Automated Reconciliation (Future)

V1 does not include automated reconciliation. Future versions may include:
- Scheduled job to detect stuck events
- Stripe API polling for pending payments
- Automatic transition for events past execution date

---

## Testing Failsafe Behavior

### Test Case: Webhook Delay

```typescript
it('does not prematurely confirm event before webhook', async () => {
  const event = await createTestEvent({ status: 'deposit_pending' });

  // Simulate payment created but webhook not yet received
  await createStripePaymentIntent(event.id);

  // Event should STILL be deposit_pending
  const current = await db.events.findUnique({ where: { id: event.id } });
  expect(current.status).toBe('deposit_pending');
});
```

---

### Test Case: Invalid Transition

```typescript
it('rejects invalid transition and does not modify state', async () => {
  const event = await createTestEvent({ status: 'draft' });

  await expect(
    transitionEvent({
      eventId: event.id,
      toStatus: 'executed', // Invalid: skips many states
      triggeredBy: 'user-123',
    })
  ).rejects.toThrow('Invalid transition');

  // Status should remain unchanged
  const current = await db.events.findUnique({ where: { id: event.id } });
  expect(current.status).toBe('draft');
});
```

---

## V1 Scope Boundaries

### Included in V1
- All failsafe behaviors defined above
- Error logging
- UI state indicators (processing, error, stale)
- Transaction-based race condition prevention

### Excluded from V1
- Automated reconciliation jobs
- Advanced retry strategies
- Multi-step recovery workflows
- Alerting/monitoring dashboards (basic logging only)

---

**End of Event State Failsafe Behavior**

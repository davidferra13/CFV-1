# Event Cancellation Time Rules (V1)

## Cancellation Overview

Events can be canceled at any point in the lifecycle (except terminal states). However, **refund policies and restrictions vary based on how far in advance the cancellation occurs**.

---

## Cancellation Allowed by Status

| Status | Can Cancel? | Refund Required? |
|--------|-------------|------------------|
| `draft` | Yes | No (no payment) |
| `proposed` | Yes | No (no payment) |
| `deposit_pending` | Yes | No (payment not yet captured) |
| `confirmed` | Yes | Maybe (depends on timing) |
| `menu_in_progress` | Yes | Maybe (depends on timing) |
| `menu_locked` | Yes | Maybe (depends on timing) |
| `executed` | No | N/A (use refund in `closed` state) |
| `closed` | No | N/A (terminal) |
| `canceled` | No | N/A (already canceled) |

---

## Time-Based Refund Policy

### Full Refund (>14 days before event)

If canceled more than 14 days before `start_ts`:
- **Refund**: 100% of deposit
- **Chef Penalty**: None
- **Client Experience**: Full refund processed

```typescript
const FULL_REFUND_DAYS = 14;

function getRefundPercentage(
  cancellationDate: Date,
  eventStartDate: Date
): number {
  const daysUntilEvent = (eventStartDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilEvent >= FULL_REFUND_DAYS) {
    return 100; // Full refund
  } else if (daysUntilEvent >= 7) {
    return 50; // Partial refund
  } else {
    return 0; // No refund
  }
}
```

---

### Partial Refund (7-14 days before event)

If canceled 7-14 days before `start_ts`:
- **Refund**: 50% of deposit
- **Chef Penalty**: Keeps 50% as cancellation fee
- **Client Experience**: Partial refund

---

### No Refund (<7 days before event)

If canceled less than 7 days before `start_ts`:
- **Refund**: 0% of deposit
- **Chef Penalty**: None (full deposit retained)
- **Client Experience**: No refund, cancellation confirmed

---

## Cancellation Validation

```typescript
async function cancelEvent(
  eventId: string,
  canceledBy: string,
  reason?: string
): Promise<void> {
  const event = await db.events.findUnique({ where: { id: eventId } });

  // Prevent cancellation of terminal states
  if (isTerminalStatus(event.status)) {
    throw new Error('Cannot cancel event in terminal state');
  }

  // Prevent cancellation of executed events
  if (event.status === 'executed') {
    throw new Error('Cannot cancel executed events. Use refund process instead.');
  }

  // Calculate refund amount
  const refundPercentage = getRefundPercentage(new Date(), event.start_ts);
  const refundAmountCents = Math.floor((event.deposit_amount_cents || 0) * refundPercentage / 100);

  // Transition to canceled status
  await transitionEvent({
    eventId,
    toStatus: 'canceled',
    triggeredBy: canceledBy,
    notes: reason || 'Event canceled',
    metadata: {
      refund_percentage: refundPercentage,
      refund_amount_cents: refundAmountCents,
    },
  });

  // Process refund if applicable
  if (refundAmountCents > 0) {
    await processRefund(eventId, refundAmountCents, reason);
  }
}
```

---

## Refund Processing

```typescript
async function processRefund(
  eventId: string,
  amountCents: number,
  reason?: string
): Promise<void> {
  const event = await db.events.findUnique({ where: { id: eventId } });

  if (!event.payment_intent_id) {
    console.log('No payment intent to refund');
    return;
  }

  // Create Stripe refund
  const refund = await stripe.refunds.create({
    payment_intent: event.payment_intent_id,
    amount: amountCents,
    reason: 'requested_by_customer',
    metadata: {
      event_id: eventId,
      cancellation_reason: reason || 'N/A',
    },
  });

  // Log in ledger (pending)
  await db.ledger_entries.create({
    data: {
      event_id: eventId,
      entry_type: 'refund_pending',
      amount_cents: -amountCents, // Negative for refund
      stripe_refund_id: refund.id,
      notes: `Cancellation refund: ${reason || 'No reason provided'}`,
    },
  });

  // Webhook will later confirm refund_succeeded
}
```

---

## UI Cancellation Flow

### Step 1: Confirm Cancellation

```tsx
<button onClick={() => setShowCancelModal(true)}>
  Cancel Event
</button>

{showCancelModal && (
  <Modal>
    <h2>Cancel Event</h2>
    <p>
      Canceling this event will {refundPercentage === 100 ? 'issue a full refund' : refundPercentage > 0 ? `issue a ${refundPercentage}% refund` : 'not issue a refund'}.
    </p>
    <textarea
      placeholder="Reason for cancellation (optional)"
      value={cancellationReason}
      onChange={(e) => setCancellationReason(e.target.value)}
    />
    <button onClick={handleCancel}>Confirm Cancellation</button>
    <button onClick={() => setShowCancelModal(false)}>Nevermind</button>
  </Modal>
)}
```

---

### Step 2: Show Refund Details

```tsx
{refundPercentage > 0 && (
  <div className="alert alert-info">
    <p>Refund Amount: ${refundAmountCents / 100}</p>
    <p>Refund will be processed to the original payment method within 5-10 business days.</p>
  </div>
)}

{refundPercentage === 0 && (
  <div className="alert alert-warning">
    <p>No refund will be issued due to cancellation policy (&lt;7 days notice).</p>
  </div>
)}
```

---

## Cancellation Audit

Every cancellation must be logged:

```typescript
interface CancellationAuditLog {
  event_id: string;
  canceled_at: Date;
  canceled_by: string; // user_id or 'system'
  original_status: EventStatus;
  cancellation_reason?: string;
  refund_amount_cents: number;
  refund_percentage: number;
}

// Log in event_transitions (already done by transitionEvent)
// Additional cancellation-specific audit:
await db.event_audit_log.create({
  data: {
    event_id: eventId,
    action: 'cancel',
    actor_id: canceledBy,
    metadata: {
      original_status: event.status,
      refund_percentage: refundPercentage,
      refund_amount_cents: refundAmountCents,
      reason: reason,
    },
  },
});
```

---

## Cancellation by Client (Future)

V1: Chef-initiated only.

Future: Allow clients to cancel via Client Portal with same refund rules.

---

## V1 Scope

### Included
- Time-based refund policy (14 days / 7 days)
- Cancellation validation
- Refund processing via Stripe
- Ledger logging
- Audit trail

### Excluded
- Client self-service cancellation (chef-only in V1)
- Custom refund policies per event
- Cancellation insurance
- Partial service completion (only full cancellation)

---

**End of Event Cancellation Time Rules**

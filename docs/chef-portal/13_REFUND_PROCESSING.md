# Refund Processing (V1)

## Refund Flow

1. Chef initiates refund
2. Create `refund_pending` ledger entry
3. Call Stripe API to process refund
4. Stripe webhook confirms with `refund_succeeded`
5. Create `refund_succeeded` ledger entry

---

## Initiate Refund

```typescript
async function initiateRefund(
  eventId: string,
  amountCents: number,
  reason: string
) {
  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  if (!event.payment_intent_id) {
    throw new Error('No payment intent to refund');
  }

  // Create pending entry
  await appendLedgerEntry({
    eventId,
    tenantId: event.tenant_id,
    entryType: 'refund_pending',
    amountCents: -amountCents,
    notes: `Refund initiated: ${reason}`,
  });

  // Process refund via Stripe
  const refund = await stripe.refunds.create({
    payment_intent: event.payment_intent_id,
    amount: amountCents,
    reason: 'requested_by_customer',
    metadata: {
      event_id: eventId,
      tenant_id: event.tenant_id,
    },
  });

  return refund;
}
```

---

## Webhook Confirmation

```typescript
// In Stripe webhook handler
async function handleRefundSucceeded(stripeEvent: Stripe.Event) {
  const refund = stripeEvent.data.object as Stripe.Refund;

  await appendLedgerEntry({
    eventId: refund.metadata.event_id,
    tenantId: refund.metadata.tenant_id,
    entryType: 'refund_succeeded',
    amountCents: -refund.amount,
    stripeEventId: stripeEvent.id,
    stripeRefundId: refund.id,
    notes: 'Refund processed successfully',
  });
}
```

---

## Partial vs Full Refund

```typescript
const summary = await getEventFinancialSummary(eventId);

// Full refund
if (refundAmount === summary.totalCharged) {
  console.log('Full refund');
}

// Partial refund
if (refundAmount < summary.totalCharged) {
  console.log('Partial refund');
}
```

---

**End of Refund Processing**

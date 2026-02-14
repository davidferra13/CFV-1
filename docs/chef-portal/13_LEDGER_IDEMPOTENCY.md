# Ledger Idempotency (V1)

## Problem

Stripe webhooks may retry, potentially creating duplicate ledger entries.

---

## Solution: Stripe Event ID as Idempotency Key

Every Stripe-originated ledger entry uses `stripe_event_id` as a unique constraint.

```sql
ALTER TABLE ledger_entries ADD CONSTRAINT unique_stripe_event_id UNIQUE (stripe_event_id);
```

---

## Idempotent Write Pattern

```typescript
async function processStripeWebhook(stripeEvent: Stripe.Event) {
  // Check if already processed
  const existing = await db.ledger_entries.findUnique({
    where: { stripe_event_id: stripeEvent.id },
  });

  if (existing) {
    console.log('Webhook already processed:', stripeEvent.id);
    return existing; // Idempotent return
  }

  // Process webhook
  const entry = await appendLedgerEntry({
    eventId: stripeEvent.metadata.event_id,
    tenantId: stripeEvent.metadata.tenant_id,
    entryType: mapStripeEventToLedgerType(stripeEvent.type),
    amountCents: stripeEvent.data.object.amount,
    stripeEventId: stripeEvent.id,
    stripePaymentIntentId: stripeEvent.data.object.id,
  });

  return entry;
}
```

---

## Manual Entry Idempotency

For manual adjustments, generate unique idempotency key:

```typescript
const idempotencyKey = `adjustment_${eventId}_${Date.now()}_${userId}`;

await appendLedgerEntry({
  eventId,
  tenantId,
  entryType: 'adjustment',
  amountCents: -5000,
  notes: 'Manual discount',
  metadata: { idempotency_key: idempotencyKey },
});
```

Then check metadata before creating:

```typescript
const existing = await db.ledger_entries.findFirst({
  where: {
    metadata: { path: ['idempotency_key'], equals: idempotencyKey },
  },
});
```

---

**End of Ledger Idempotency**

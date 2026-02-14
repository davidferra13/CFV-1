# Webhook Idempotency Handling (V1)

## Problem

Stripe may send the same webhook multiple times (network retry, failures, etc.).

---

## Solution: Event ID Tracking

```typescript
async function processStripeWebhook(event: Stripe.Event) {
  // Check if already processed
  const existing = await db.webhook_events.findUnique({
    where: { stripe_event_id: event.id },
  });

  if (existing) {
    console.log('Webhook already processed:', event.id);
    return new Response('OK', { status: 200 }); // Acknowledge
  }

  // Process webhook
  await handleStripeEvent(event);

  // Mark as processed
  await db.webhook_events.create({
    data: {
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date(),
    },
  });

  return new Response('OK', { status: 200 });
}
```

---

## Schema

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
```

---

## Additional Safety: Ledger Entry Idempotency

Even if webhook tracking fails, ledger entries use `stripe_event_id` as unique key:

```typescript
await appendLedgerEntry({
  eventId,
  tenantId,
  entryType: 'charge_succeeded',
  amountCents: amount,
  stripeEventId: event.id, // Unique constraint prevents duplicates
});
```

---

**End of Webhook Idempotency Handling**

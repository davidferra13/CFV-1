# Webhook to Ledger Mapping (V1)

## Event Type Mappings

```typescript
function mapStripeEventToLedgerType(eventType: string): LedgerEntryType | null {
  const mapping: Record<string, LedgerEntryType> = {
    'payment_intent.succeeded': 'charge_succeeded',
    'payment_intent.payment_failed': 'charge_failed',
    'charge.refunded': 'refund_succeeded',
    'refund.failed': 'refund_failed',
  };

  return mapping[eventType] || null;
}
```

---

## Handler Routing

```typescript
async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event);
      break;

    case 'charge.refunded':
      await handleRefundSucceeded(event);
      break;

    case 'refund.failed':
      await handleRefundFailed(event);
      break;

    case 'charge.dispute.created':
      await handleDisputeCreated(event);
      break;

    default:
      console.log('Unhandled event type:', event.type);
  }
}
```

---

## Payment Intent Succeeded

```typescript
async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  await appendLedgerEntry({
    eventId: paymentIntent.metadata.event_id,
    tenantId: paymentIntent.metadata.tenant_id,
    entryType: 'charge_succeeded',
    amountCents: paymentIntent.amount,
    stripeEventId: event.id,
    stripePaymentIntentId: paymentIntent.id,
    notes: 'Deposit payment received',
  });

  // Transition event to confirmed
  await transitionEvent({
    eventId: paymentIntent.metadata.event_id,
    toStatus: 'confirmed',
    triggeredBy: 'system',
    notes: 'Deposit confirmed via Stripe',
  });
}
```

---

## Charge Refunded

```typescript
async function handleRefundSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const refund = charge.refunds?.data[0];

  if (!refund) return;

  await appendLedgerEntry({
    eventId: charge.metadata.event_id,
    tenantId: charge.metadata.tenant_id,
    entryType: 'refund_succeeded',
    amountCents: -refund.amount,
    stripeEventId: event.id,
    stripeRefundId: refund.id,
    notes: 'Refund processed',
  });
}
```

---

**End of Webhook to Ledger Mapping**

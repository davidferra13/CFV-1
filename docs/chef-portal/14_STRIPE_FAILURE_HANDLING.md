# Stripe Failure Handling (V1)

## Payment Failed Event

```typescript
async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // Log failure in ledger
  await appendLedgerEntry({
    eventId: paymentIntent.metadata.event_id,
    tenantId: paymentIntent.metadata.tenant_id,
    entryType: 'charge_failed',
    amountCents: 0,
    stripeEventId: event.id,
    stripePaymentIntentId: paymentIntent.id,
    notes: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
    metadata: {
      error_code: paymentIntent.last_payment_error?.code,
      error_message: paymentIntent.last_payment_error?.message,
    },
  });

  // Notify chef
  await notifyChefPaymentFailed(paymentIntent.metadata.event_id);
}
```

---

## Refund Failed Event

```typescript
async function handleRefundFailed(event: Stripe.Event) {
  const refund = event.data.object as Stripe.Refund;

  await appendLedgerEntry({
    eventId: refund.metadata.event_id,
    tenantId: refund.metadata.tenant_id,
    entryType: 'refund_failed',
    amountCents: 0,
    stripeEventId: event.id,
    stripeRefundId: refund.id,
    notes: `Refund failed: ${refund.failure_reason || 'Unknown'}`,
  });

  // Alert chef to manual intervention
  await alertChefRefundFailed(refund.metadata.event_id);
}
```

---

## Client-Side Error Handling

```tsx
const { error } = await stripe.confirmPayment({ ... });

if (error) {
  switch (error.type) {
    case 'card_error':
      setErrorMessage('Your card was declined. Please try a different payment method.');
      break;
    case 'validation_error':
      setErrorMessage('Please check your payment details and try again.');
      break;
    default:
      setErrorMessage('An unexpected error occurred. Please try again.');
  }
}
```

---

**End of Stripe Failure Handling**

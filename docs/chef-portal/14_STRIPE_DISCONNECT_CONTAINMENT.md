# Stripe Disconnect Containment (V1)

## Problem

If Stripe is unavailable, ChefFlow should degrade gracefully, not crash.

---

## Containment Strategy

### 1. Webhook Failures

If webhook handler fails:
- Return 200 OK anyway (prevents Stripe retry storm)
- Log error
- Alert developers

```typescript
export async function POST(request: Request) {
  try {
    const event = await verifyWebhook(request);
    await processStripeEvent(event);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    // Return 200 to prevent retries
    return new Response('OK', { status: 200 });
  }
}
```

---

### 2. Payment Intent Creation Failures

If Stripe API is down:
- Show error to chef
- Allow retry
- Don't block event creation

```typescript
try {
  const paymentIntent = await stripe.paymentIntents.create({ ... });
  return { success: true, clientSecret: paymentIntent.client_secret };
} catch (error) {
  console.error('Stripe API error:', error);
  return {
    success: false,
    error: 'Payment system temporarily unavailable. Please try again.',
  };
}
```

---

### 3. Read-Only Mode

If Stripe is down, show payment status as "processing":

```tsx
{event.status === 'deposit_pending' && (
  <div className="alert alert-info">
    Payment is being processed. This may take a few moments.
  </div>
)}
```

---

### 4. Manual Reconciliation

If webhook is delayed/failed:
- Chef can manually mark payment as received (with audit log)
- Later reconciliation job verifies against Stripe

---

**End of Stripe Disconnect Containment**

# Stripe Integration Boundary

**Document ID**: 033
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the complete integration boundary with Stripe for payment processing in ChefFlow V1. Stripe is the ONLY payment processor, handling all card data and PCI compliance.

---

## Stripe Responsibilities

**Stripe Handles**:
- Card data collection (never touches our servers)
- PCI DSS compliance (SAQ-A for us)
- Payment processing
- Refund processing
- Webhook delivery

**ChefFlow Handles**:
- Payment intent creation
- Webhook processing
- Ledger entry creation
- Event status transitions

---

## Integration Points

### 1. Payment Intent Creation

**Route**: `app/api/payments/create-intent/route.ts`

**Flow**:
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const { eventId } = await request.json();
  const user = await getCurrentUser();

  // Fetch event details
  const event = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: event.deposit_amount,
    currency: 'usd',
    metadata: {
      event_id: eventId,
      tenant_id: user.tenantId,
    },
  });

  return Response.json({ clientSecret: paymentIntent.client_secret });
}
```

---

### 2. Stripe Elements (Client-Side)

```typescript
'use client';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentElement />
      <button type="submit">Pay Now</button>
    </Elements>
  );
}
```

---

### 3. Webhook Endpoint

**Route**: `app/api/webhooks/stripe/route.ts`

**Events Handled**:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

**Implementation**: See `034-webhook-handling-model.md`

---

## Stripe Test Mode vs Live Mode

### Test Mode (Local/Staging)

**Publishable Key**: `pk_test_...`
**Secret Key**: `sk_test_...`

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

### Live Mode (Production)

**Publishable Key**: `pk_live_...`
**Secret Key**: `sk_live_...`

**Real Cards**: Actual charges processed

---

## Stripe Metadata

**Purpose**: Attach event context to Stripe objects for reconciliation

**Example**:
```typescript
metadata: {
  event_id: 'uuid',
  tenant_id: 'uuid',
  client_id: 'uuid',
}
```

**Usage**: Retrieved in webhook to identify event

---

## Error Handling

**Stripe API Errors**:
```typescript
try {
  await stripe.paymentIntents.create({...});
} catch (error) {
  if (error instanceof Stripe.errors.StripeCardError) {
    // Card declined
  } else if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    // Invalid parameters
  } else {
    // Other errors
  }
}
```

---

## References

- **Webhook Handling Model**: `034-webhook-handling-model.md`
- **Stripe Metadata Contract**: `035-stripe-metadata-contract.md`
- **Ledger Append-Only Rules**: `032-ledger-append-only-rules.md`

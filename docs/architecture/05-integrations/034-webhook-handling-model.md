# Webhook Handling Model

**Document ID**: 034
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the authoritative webhook handling model for Stripe events in ChefFlow V1. Webhooks MUST be idempotent, secure, and reliable.

---

## Webhook Endpoint

**Route**: `app/api/webhooks/stripe/route.ts`

**Method**: POST only

**Authentication**: Stripe signature verification (REQUIRED)

---

## Implementation

```typescript
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Verify signature (prevents spoofing)
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return new Response('Webhook Error', { status: 400 });
  }

  // Handle event type
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      await handleRefund(event.data.object as Stripe.Charge);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response('OK', { status: 200 });
}
```

---

## Payment Succeeded Handler

```typescript
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createServiceClient(); // Bypass RLS

  const { event_id, tenant_id } = paymentIntent.metadata;

  // Idempotency: Check if already processed
  const { data: existing } = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('stripe_event_id', paymentIntent.id)
    .single();

  if (existing) {
    console.log('Payment already processed:', paymentIntent.id);
    return; // Already handled
  }

  // Create ledger entry
  await supabase.from('ledger_entries').insert({
    tenant_id,
    event_id,
    amount: paymentIntent.amount,
    type: 'charge_succeeded',
    stripe_event_id: paymentIntent.id,
    metadata: paymentIntent.metadata,
  });

  // Transition event status
  await transitionEventStatus(event_id, 'paid');
}
```

---

## Idempotency Strategy

**Key**: `stripe_event_id` (unique constraint)

**Effect**: Duplicate webhooks (Stripe retries) are safe

**Implementation**:
```sql
CONSTRAINT unique_stripe_event UNIQUE(stripe_event_id)
```

**Behavior**: Second insert attempt fails silently, returns 200 OK

---

## Signature Verification

**Purpose**: Prevent spoofed webhooks

**Implementation**:
```typescript
stripe.webhooks.constructEvent(body, signature, secret);
```

**Failure**: Return 400 Bad Request (Stripe stops retrying after threshold)

---

## Retry Handling

**Stripe Retry Logic**:
- Immediate retry on 5xx errors
- Exponential backoff (up to 3 days)

**Our Response**:
- 200 OK: Successfully processed
- 400 Bad Request: Invalid signature (no retry)
- 500 Internal Server Error: Transient failure (retry)

---

## References

- **Stripe Integration Boundary**: `033-stripe-integration-boundary.md`
- **Stripe Metadata Contract**: `035-stripe-metadata-contract.md`
- **Ledger Append-Only Rules**: `032-ledger-append-only-rules.md`

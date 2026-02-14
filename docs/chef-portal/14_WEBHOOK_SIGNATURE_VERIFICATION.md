# Webhook Signature Verification (V1)

## Why Verify?

Prevent malicious actors from spoofing Stripe webhooks.

---

## Verification Process

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  // Process verified event
  await processStripeEvent(event);

  return new Response('OK', { status: 200 });
}
```

---

## Getting Webhook Secret

1. Go to Stripe Dashboard
2. Developers → Webhooks
3. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
4. Copy "Signing secret"
5. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Local Testing (Stripe CLI)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Stripe CLI provides test webhook secret.

---

**End of Webhook Signature Verification**

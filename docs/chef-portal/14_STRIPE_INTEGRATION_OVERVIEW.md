# Stripe Integration Overview (V1)

## Purpose

Stripe handles all payment processing for ChefFlow. The integration is **ledger-first**: Stripe events flow into the ledger, which becomes the source of truth.

---

## Architecture

```
Client → PaymentIntent (Stripe) → Webhook → Ledger Entry → Derived State
```

---

## Key Components

### 1. Payment Intent Creation
Chef creates payment intent for deposit, client completes payment.

### 2. Webhook Handler
Stripe sends events to `/api/webhooks/stripe`, which creates ledger entries.

### 3. Idempotency
Stripe event IDs ensure duplicate webhooks don't create duplicate ledger entries.

### 4. Tenant Scoping
Each chef has their own Stripe account (Stripe Connect) or shared platform account with metadata.

---

## Stripe Elements

V1 uses Stripe Elements for client-side payment UI.

```tsx
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

<Elements stripe={stripePromise} options={options}>
  <CheckoutForm />
</Elements>
```

---

## V1 Scope

### Included
- Payment intents for deposits
- Webhook handling (payment succeeded/failed)
- Refund processing
- Basic dispute logging

### Excluded
- Stripe Connect (multi-chef onboarding)
- Subscription billing
- ACH/bank transfers
- Multi-currency

---

**End of Stripe Integration Overview**

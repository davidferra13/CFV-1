# Stripe Integration and Payment Flow

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

This document describes the Stripe integration, payment processing flow, webhook handling, and ledger-first financial architecture in ChefFlow V1.

---

## Table of Contents

1. [Overview](#overview)
2. [Payment Flow](#payment-flow)
3. [Stripe Integration](#stripe-integration)
4. [Webhook Handling](#webhook-handling)
5. [Ledger-First Architecture](#ledger-first-architecture)
6. [Idempotency](#idempotency)
7. [Refunds](#refunds)
8. [Code Examples](#code-examples)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

ChefFlow V1 uses **Stripe** as the exclusive payment processor. All financial state is derived from the **append-only ledger** (`ledger_entries` table).

### System Law #3: Financial Truth is Ledger-First

> - ALL financial state derives from `ledger_entries` table (append-only)
> - Stripe webhook → ledger entry → computed balance/status
> - NEVER store balances, payment status, or totals directly on `events` table
> - Ledger entries are immutable (enforced by database triggers)
> - ALL monetary amounts stored in minor units (cents, INTEGER type)

### Key Principles

1. **Single source of truth**: Ledger is authoritative
2. **Webhook-driven**: Payments processed via Stripe webhooks
3. **Idempotent**: Duplicate webhooks safely handled
4. **Immutable**: Ledger entries cannot be modified or deleted
5. **Minor units**: All amounts in cents (integers, not decimals)

---

## Payment Flow

### High-Level Flow

```
┌──────┐                  ┌────────┐                 ┌──────────┐
│Client│                  │ Stripe │                 │  Ledger  │
└──┬───┘                  └───┬────┘                 └────┬─────┘
   │                          │                           │
   │ 1. Accept event          │                           │
   ├─────────────────────────>│                           │
   │                          │                           │
   │ 2. Create PaymentIntent  │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
   │ 3. Confirm payment       │                           │
   ├─────────────────────────>│                           │
   │                          │                           │
   │ 4. Webhook: succeeded    │                           │
   │                          ├──────────────────────────>│
   │                          │  5. Create ledger entry   │
   │                          │                           │
   │                          │  6. Transition event      │
   │                          │     (accepted → paid)     │
   │                          │                           │
   │ 7. Redirect to success   │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
```

### Detailed Steps

1. **Client accepts event** (`accepted` status)
2. **Server creates Stripe PaymentIntent**
   - Amount: `deposit_amount_cents` or `total_amount_cents`
   - Metadata: `event_id`, `tenant_id`, `client_id`
3. **Client confirms payment** (Stripe Elements UI)
4. **Stripe processes payment**
5. **Stripe sends webhook** (`payment_intent.succeeded`)
6. **Webhook handler**:
   - Verifies signature
   - Creates ledger entry (idempotent)
   - Transitions event to `paid`
7. **Client redirected** to success page

---

## Stripe Integration

### Required Environment Variables

```bash
# .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for details.

### Dependencies

```json
{
  "dependencies": {
    "stripe": "^20.3.1",
    "@stripe/stripe-js": "^2.0.0",
    "@stripe/react-stripe-js": "^2.0.0"
  }
}
```

### Creating PaymentIntent

```typescript
// lib/payments/create-payment-intent.ts
'use server'

import Stripe from 'stripe'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

export async function createPaymentIntent(eventId: string) {
  const client = await requireClient()
  const supabase = createServerClient()

  // 1. Fetch event
  const { data: event, error } = await supabase
    .from('events')
    .select('*, client:clients(*)')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  // 2. Verify client owns event
  if (event.client_id !== client.entityId) {
    throw new Error('Unauthorized')
  }

  // 3. Verify event is in accepted status
  if (event.status !== 'accepted') {
    throw new Error('Event must be accepted before payment')
  }

  // 4. Determine amount (deposit or full)
  const amountCents = event.deposit_required
    ? event.deposit_amount_cents
    : event.total_amount_cents

  // 5. Create or retrieve Stripe customer
  let stripeCustomerId = event.client.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: event.client.email,
      name: event.client.full_name,
      metadata: {
        client_id: event.client.id,
        tenant_id: event.tenant_id
      }
    })
    stripeCustomerId = customer.id

    // Update client record
    await supabase
      .from('clients')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', event.client.id)
  }

  // 6. Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: stripeCustomerId,
    metadata: {
      event_id: eventId,
      tenant_id: event.tenant_id,
      client_id: event.client_id
    },
    description: `Deposit for ${event.title}`
  })

  return {
    clientSecret: paymentIntent.client_secret,
    amount: amountCents
  }
}
```

### Client-Side Payment Form

```typescript
// app/(client)/events/[id]/payment/page.tsx
'use client'

import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useState } from 'react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PaymentPage({ params }: { params: { id: string } }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  // Fetch clientSecret on mount
  useEffect(() => {
    async function init() {
      const result = await createPaymentIntent(params.id)
      setClientSecret(result.clientSecret)
    }
    init()
  }, [params.id])

  if (!clientSecret) {
    return <div>Loading payment form...</div>
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm eventId={params.id} />
    </Elements>
  )
}

function PaymentForm({ eventId }: { eventId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/client/events/${eventId}/payment/success`
      }
    })

    if (error) {
      setError(error.message || 'Payment failed')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || processing}>
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  )
}
```

---

## Webhook Handling

### Webhook Endpoint

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { appendLedgerEntry } from '@/lib/ledger/append'
import { transitionEventStatus } from '@/lib/events/transitions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  // 1. Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[WEBHOOK] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 2. Handle event types
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event)
        break

      case 'charge.refunded':
        await handleRefund(event)
        break

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[WEBHOOK] Handler error:`, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const { event_id, tenant_id, client_id } = paymentIntent.metadata

  console.log(`[WEBHOOK] Payment succeeded for event ${event_id}`)

  // 1. Append ledger entry (idempotent via stripe_event_id)
  const ledgerResult = await appendLedgerEntry({
    tenant_id,
    event_id,
    client_id,
    entry_type: 'charge_succeeded',
    amount_cents: paymentIntent.amount,
    currency: paymentIntent.currency,
    stripe_event_id: event.id,
    stripe_object_id: paymentIntent.id,
    stripe_event_type: event.type,
    description: `Payment succeeded: ${paymentIntent.description}`
  })

  if (!ledgerResult.success) {
    // If ledger entry fails due to duplicate, that's OK (idempotency)
    if (ledgerResult.error?.includes('duplicate')) {
      console.log('[WEBHOOK] Duplicate event, skipping')
      return
    }
    throw new Error(`Ledger append failed: ${ledgerResult.error}`)
  }

  // 2. Transition event to paid (system user)
  await transitionEventStatus(event_id, 'paid', null, {
    stripe_event_id: event.id,
    payment_intent_id: paymentIntent.id
  })

  console.log(`[WEBHOOK] Event ${event_id} transitioned to paid`)
}

async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const { event_id, tenant_id, client_id } = paymentIntent.metadata

  console.log(`[WEBHOOK] Payment failed for event ${event_id}`)

  // Log failure to ledger
  await appendLedgerEntry({
    tenant_id,
    event_id,
    client_id,
    entry_type: 'charge_failed',
    amount_cents: 0,
    stripe_event_id: event.id,
    stripe_object_id: paymentIntent.id,
    stripe_event_type: event.type,
    description: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown'}`
  })
}

async function handleRefund(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge
  const { event_id, tenant_id, client_id } = charge.metadata

  console.log(`[WEBHOOK] Refund processed for event ${event_id}`)

  // Append negative ledger entry
  await appendLedgerEntry({
    tenant_id,
    event_id,
    client_id,
    entry_type: 'refund_succeeded',
    amount_cents: -charge.amount_refunded, // Negative amount
    stripe_event_id: event.id,
    stripe_object_id: charge.id,
    stripe_event_type: event.type,
    description: `Refund: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`
  })
}
```

### Webhook Configuration

1. **Create webhook endpoint** in Stripe Dashboard:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

2. **Copy webhook secret** to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Test with Stripe CLI**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

---

## Ledger-First Architecture

### Ledger Entry Schema

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE RESTRICT,
  entry_type ledger_entry_type NOT NULL,
  amount_cents INTEGER NOT NULL, -- Positive = credit, Negative = debit
  currency TEXT NOT NULL DEFAULT 'usd',
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
  stripe_event_id TEXT UNIQUE, -- Idempotency key
  stripe_object_id TEXT, -- payment_intent_xxx, charge_xxx
  stripe_event_type TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);
```

### Entry Types

```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_created',      -- PaymentIntent created
  'charge_succeeded',    -- Payment succeeded (+)
  'charge_failed',       -- Payment failed
  'refund_created',      -- Refund initiated
  'refund_succeeded',    -- Refund completed (-)
  'payout_created',      -- Payout to chef (future)
  'payout_paid',         -- Payout completed (future)
  'adjustment'           -- Manual adjustment
);
```

### Appending Ledger Entries

```typescript
// lib/ledger/append.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function appendLedgerEntry(entry: {
  tenant_id: string
  event_id?: string
  client_id?: string
  entry_type: string
  amount_cents: number
  currency?: string
  stripe_event_id?: string
  stripe_object_id?: string
  stripe_event_type?: string
  description: string
  metadata?: Record<string, any>
}) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ledger_entries')
    .insert({
      tenant_id: entry.tenant_id,
      event_id: entry.event_id || null,
      client_id: entry.client_id || null,
      entry_type: entry.entry_type,
      amount_cents: entry.amount_cents,
      currency: entry.currency || 'usd',
      stripe_event_id: entry.stripe_event_id || null,
      stripe_object_id: entry.stripe_object_id || null,
      stripe_event_type: entry.stripe_event_type || null,
      description: entry.description,
      metadata: entry.metadata || null
    })
    .select()
    .single()

  if (error) {
    // Check for duplicate stripe_event_id
    if (error.code === '23505' && error.message.includes('stripe_event_id')) {
      return { success: false, error: 'duplicate' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
```

### Computing Balances

Balances are **computed** from the ledger, never stored:

```sql
-- View: event_financial_summary
CREATE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.total_amount_cents AS expected_total_cents,
  e.deposit_amount_cents AS expected_deposit_cents,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents
    ELSE 0
  END), 0) AS collected_cents,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents
    ELSE 0
  END), 0) >= e.total_amount_cents AS is_fully_paid,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents
    ELSE 0
  END), 0) >= e.deposit_amount_cents AS is_deposit_paid
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
GROUP BY e.id, e.tenant_id, e.total_amount_cents, e.deposit_amount_cents;
```

Usage:

```typescript
// Get payment status for event
const { data } = await supabase
  .from('event_financial_summary')
  .select('*')
  .eq('event_id', eventId)
  .single()

console.log(data)
// {
//   event_id: '...',
//   expected_total_cents: 100000,
//   collected_cents: 50000,
//   is_fully_paid: false,
//   is_deposit_paid: true
// }
```

---

## Idempotency

### Webhook Idempotency

Webhooks may be retried. ChefFlow handles this via:

1. **Unique constraint** on `ledger_entries.stripe_event_id`
2. **Duplicate detection** in `appendLedgerEntry()`
3. **200 OK response** for duplicates (tells Stripe to stop retrying)

### Code Pattern

```typescript
const ledgerResult = await appendLedgerEntry({
  stripe_event_id: event.id, // Idempotency key
  // ... other fields
})

if (!ledgerResult.success) {
  if (ledgerResult.error === 'duplicate') {
    // Already processed - return success
    return NextResponse.json({ received: true }, { status: 200 })
  }
  // Real error - return 500 (Stripe will retry)
  return NextResponse.json({ error: ledgerResult.error }, { status: 500 })
}
```

---

## Refunds

### Process

1. **Chef cancels event** (triggers transition to `cancelled`)
2. **Server initiates refund** via Stripe API
3. **Stripe processes refund**
4. **Webhook** sends `charge.refunded` event
5. **Webhook handler** creates negative ledger entry
6. **Balance automatically updates** (view recomputes)

### Code Example

```typescript
// app/actions/cancel-and-refund.ts
'use server'

import Stripe from 'stripe'
import { requireChef } from '@/lib/auth/get-user'
import { transitionEventStatus } from '@/lib/events/transitions'
import { createServerClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function cancelEventAndRefund(
  eventId: string,
  cancellationReason: string
) {
  const chef = await requireChef()
  const supabase = createServerClient()

  // 1. Fetch event and ledger
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (event?.tenant_id !== chef.tenantId) {
    throw new Error('Unauthorized')
  }

  // 2. Find successful charges
  const { data: charges } = await supabase
    .from('ledger_entries')
    .select('stripe_object_id, amount_cents')
    .eq('event_id', eventId)
    .eq('entry_type', 'charge_succeeded')

  // 3. Process refunds
  for (const charge of charges || []) {
    if (charge.stripe_object_id) {
      await stripe.refunds.create({
        payment_intent: charge.stripe_object_id,
        metadata: {
          event_id: eventId,
          tenant_id: event.tenant_id,
          reason: cancellationReason
        }
      })
    }
  }

  // 4. Transition event to cancelled
  await transitionEventStatus(eventId, 'cancelled', chef.id, {
    cancellation_reason: cancellationReason,
    refund_initiated: true
  })

  return { success: true }
}
```

---

## Code Examples

See sections above for comprehensive examples.

---

## Testing

### Test Cards

Use Stripe test cards:

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### Local Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

### Manual Test Flow

1. Create event as chef
2. Propose to client
3. Accept as client
4. Navigate to payment page
5. Enter test card `4242 4242 4242 4242`
6. Verify webhook logged in console
7. Check ledger entry created
8. Verify event transitioned to `paid`

---

## Troubleshooting

### Webhook Not Received

- Check Stripe Dashboard > Webhooks > Event delivery
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check server logs for signature errors
- Ensure endpoint is publicly accessible (use ngrok for local)

### Payment Succeeded but Event Not Updated

- Check `ledger_entries` table for entry
- Verify `stripe_event_id` is unique
- Check `event_transitions` for transition log
- Look for errors in webhook handler logs

### Duplicate Ledger Entries

- Should not happen (unique constraint)
- If it does, check `stripe_event_id` uniqueness
- Verify idempotency logic in `appendLedgerEntry()`

### Balance Mismatch

- Query `event_financial_summary` view
- Compare with Stripe Dashboard
- Check for missing or failed ledger entries
- Run reconciliation script (see [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md))

---

## Related Documentation

- [EVENTS.md](./EVENTS.md) - Event lifecycle and transitions
- [API_REFERENCE.md](./API_REFERENCE.md) - Payment API functions
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Stripe credentials
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Webhook configuration in production

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team

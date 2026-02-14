# API Surface Definition

**Document ID**: 009
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines the complete HTTP API surface of ChefFlow V1, including all public endpoints, request/response contracts, and access control.

## API Surface Overview

ChefFlow V1 has a **minimal API surface**:

**Total API Routes**: 1
- `/api/webhooks/stripe` (POST) - Stripe webhook handler

**NOT Exposed**:
- No REST API for events, clients, menus, ledger
- No GraphQL endpoint
- No public API for third-party integrations

**Rationale**: V1 uses server actions for mutations, direct Supabase queries for reads (server components). API routes only needed for webhooks.

---

## API Route: Stripe Webhook

### Endpoint

```
POST /api/webhooks/stripe
```

**Purpose**: Receive Stripe webhook events (payment_intent.succeeded, charge.refunded, etc.)

**File**: `app/api/webhooks/stripe/route.ts`

### Request

**Headers** (required):
```
Content-Type: application/json
Stripe-Signature: t=xxx,v1=yyy,v0=zzz
```

**Body** (JSON):
```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 10000,
      "currency": "usd",
      "metadata": {
        "event_id": "uuid-here",
        "tenant_id": "uuid-here"
      }
    }
  }
}
```

### Response

**Success** (200 OK):
```json
{
  "received": true
}
```

**Error** (400 Bad Request):
```json
{
  "error": "Invalid signature"
}
```

**Error** (500 Internal Server Error):
```json
{
  "error": "Database error"
}
```

### Implementation

```typescript
// app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    // 1. Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // 2. Check idempotency (prevent duplicate processing)
    const supabase = createServerClient();
    const { data: existing } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();

    if (existing) {
      // Already processed, return 200 (idempotent)
      return NextResponse.json({ received: true });
    }

    // 3. Handle event type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 4. Return success
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createServerClient();

  const eventId = paymentIntent.metadata.event_id;
  const tenantId = paymentIntent.metadata.tenant_id;

  // Create ledger entry
  await supabase.from('ledger_entries').insert({
    tenant_id: tenantId,
    event_id: eventId,
    entry_type: 'charge_succeeded',
    amount_cents: paymentIntent.amount,
    currency: paymentIntent.currency,
    stripe_event_id: paymentIntent.id,
    metadata: { payment_intent_id: paymentIntent.id },
  });

  // Transition event to 'paid' status
  await supabase
    .from('events')
    .update({ status: 'paid' })
    .eq('id', eventId);

  // Create audit trail
  await supabase.from('event_transitions').insert({
    event_id: eventId,
    from_status: 'accepted',
    to_status: 'paid',
    transitioned_by: null, // System-initiated
    reason: 'Payment succeeded',
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createServerClient();

  const eventId = paymentIntent.metadata.event_id;
  const tenantId = paymentIntent.metadata.tenant_id;

  // Log failed payment to ledger (for audit)
  await supabase.from('ledger_entries').insert({
    tenant_id: tenantId,
    event_id: eventId,
    entry_type: 'charge_failed',
    amount_cents: 0, // No money transferred
    currency: paymentIntent.currency,
    stripe_event_id: paymentIntent.id,
    metadata: {
      payment_intent_id: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
    },
  });

  // Event remains in 'accepted' status (awaiting successful payment)
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const supabase = createServerClient();

  const paymentIntent = charge.payment_intent as string;

  // Find original ledger entry
  const { data: originalEntry } = await supabase
    .from('ledger_entries')
    .select('event_id, tenant_id')
    .eq('metadata->>payment_intent_id', paymentIntent)
    .single();

  if (!originalEntry) {
    console.error('Original ledger entry not found for refund');
    return;
  }

  // Create negative ledger entry (refund)
  await supabase.from('ledger_entries').insert({
    tenant_id: originalEntry.tenant_id,
    event_id: originalEntry.event_id,
    entry_type: 'refund_succeeded',
    amount_cents: -charge.amount_refunded, // Negative amount
    currency: charge.currency,
    stripe_event_id: charge.id,
    metadata: { charge_id: charge.id, refund_id: charge.refunds?.data[0]?.id },
  });
}
```

### Security

**Signature Verification**:
- Webhook Secret: `STRIPE_WEBHOOK_SECRET` (from Stripe dashboard)
- Verification: `stripe.webhooks.constructEvent()` validates signature
- Rejection: Invalid signature returns 400 error (Stripe retries)

**Idempotency**:
- Check: Query `ledger_entries` for existing `stripe_event_id`
- Behavior: If exists, return 200 (no error, no duplicate processing)
- Guarantee: Duplicate webhooks do not create duplicate ledger entries

**Rate Limiting**:
- NOT implemented in V1 (Stripe sends webhooks at reasonable rate)
- Vercel function timeout: 10 seconds (Hobby) / 60 seconds (Pro)

### Error Handling

**Return 200**: Webhook processed successfully (or already processed)
- Stripe considers webhook delivered, stops retrying

**Return 400**: Invalid signature, malformed request
- Stripe retries webhook (up to 3 days)

**Return 500**: Database error, transient failure
- Stripe retries webhook (exponential backoff)

**Retry Strategy** (Stripe):
1. Immediate retry
2. 5 minutes later
3. 1 hour later
4. 24 hours later
5. Up to 3 days total

---

## NOT Exposed: REST API for Entities

### Events API (NOT Exposed)

❌ `GET /api/events` - List events
❌ `POST /api/events` - Create event
❌ `GET /api/events/:id` - Get event
❌ `PUT /api/events/:id` - Update event
❌ `DELETE /api/events/:id` - Delete event

**Rationale**: Server actions handle mutations, server components handle queries

**Alternative** (V1):
- **Query**: Server component calls `getEvents(tenantId)` (direct Supabase query)
- **Mutation**: Client component calls `createEvent()` server action

### Clients API (NOT Exposed)

❌ `GET /api/clients` - List clients
❌ `POST /api/clients` - Create client
❌ `GET /api/clients/:id` - Get client

**Rationale**: Same as events (server actions + server components)

### Menus API (NOT Exposed)

❌ `GET /api/menus` - List menus
❌ `POST /api/menus` - Create menu

**Rationale**: Same as events

### Ledger API (NOT Exposed)

❌ `GET /api/ledger` - Get ledger entries

**Rationale**: Ledger is read-only for users, queried via server components

---

## Future API Surface (V2+)

### Public API (V2)

**NOT in V1**, but planned for V2:

```
GET /api/v2/events/:id
Authorization: Bearer <api_key>
```

**Purpose**: Allow third-party integrations (calendar apps, CRMs)

**Requirements**:
- API keys (generated per chef)
- Rate limiting
- Versioning (`/api/v2/...`)
- OpenAPI spec

### Admin API (V2)

**NOT in V1**, but planned for V2:

```
GET /api/admin/tenants
Authorization: Bearer <admin_token>
```

**Purpose**: Platform admin to view all tenants, metrics

**Requirements**:
- Super-admin role
- Audit logging
- IP whitelisting

---

## API Testing

### Local Testing (Stripe Webhook)

**Stripe CLI**:
```bash
# Forward Stripe webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Trigger Test Event**:
```bash
# Simulate payment_intent.succeeded event
stripe trigger payment_intent.succeeded
```

**Expected Result**:
- Webhook received at `/api/webhooks/stripe`
- Ledger entry created
- Event status transitioned to 'paid'

### Production Testing

**Stripe Dashboard**:
1. Navigate to Developers → Webhooks
2. Select webhook endpoint
3. Click "Send test webhook"
4. Select `payment_intent.succeeded`
5. Send

**Expected Result**:
- Webhook received (check Vercel logs)
- Ledger entry created (check Supabase database)

---

## API Versioning

### V1 API Version

**No Versioning**: V1 has only 1 endpoint, no versioning needed

**URL**: `/api/webhooks/stripe` (no `/v1/` prefix)

### Future Versioning (V2+)

**Pattern**: `/api/v2/...`

**Example**:
- V1: `/api/webhooks/stripe`
- V2: `/api/v2/webhooks/stripe` (if webhook contract changes)

**Deprecation Policy** (V2+):
- V1 endpoints supported for 6 months after V2 launch
- Deprecation warnings in response headers
- Sunset date announced in advance

---

## API Documentation

### V1 Documentation

**Location**: This document (API Surface Definition)

**Public Documentation**: NOT needed (no public API in V1)

### Future Documentation (V2+)

**Tool**: OpenAPI (Swagger) spec

**Example**:
```yaml
openapi: 3.0.0
info:
  title: ChefFlow API
  version: 2.0.0
paths:
  /api/v2/events:
    get:
      summary: List events
      parameters:
        - name: tenant_id
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Event'
```

---

## Monitoring & Alerts

### Webhook Failures

**Stripe Dashboard**:
- Developers → Webhooks → View logs
- Shows failed webhooks (4xx, 5xx responses)

**Alert** (Stripe):
- Email notification if webhook fails repeatedly

**Action**:
- Check Vercel logs for error details
- Fix database issue or code bug
- Stripe auto-retries (no manual replay needed)

### Vercel Logs

**Access**:
- Vercel Dashboard → Project → Functions → `/api/webhooks/stripe`
- View invocations, errors, latency

**Metrics**:
- Invocation count
- Error rate
- p50, p99 latency

---

**Authority**: This API surface is complete for V1. No additional endpoints may be added without scope unlock.

# Client Deposit State Rules

## Document Identity
- **File**: `CLIENT_DEPOSIT_STATE_RULES.md`
- **Category**: Lifecycle System (26/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **deposit payment rules** for ChefFlow V1.

It specifies:
- Deposit amount calculation and validation
- When deposits are required vs optional
- Deposit payment flow (Stripe integration)
- Ledger-based deposit verification
- Deposit refund rules
- Deposit state transitions

---

## Deposit Definition

A **deposit** is a **partial upfront payment** required to confirm an event booking.

### Deposit vs Full Payment

| Aspect | Deposit | Full Payment |
|--------|---------|--------------|
| **Amount** | Partial (`deposit_amount_cents`) | Full (`total_amount_cents`) |
| **Timing** | Before confirmation | Before or after event |
| **Purpose** | Secure booking commitment | Final settlement |
| **Refundable** | Policy-dependent | Usually non-refundable after event |

---

## Deposit Amount Rules

### Setting Deposit Amount

**Chef Decision**: Chef sets `deposit_amount_cents` when creating/editing event.

**Constraints**:

```typescript
interface DepositConstraints {
  min_deposit_cents: number; // Must be > 0
  max_deposit_cents: number; // Must be ≤ total_amount_cents
  recommended_percentage: number; // 20-50% typical
}

function validateDepositAmount(
  depositCents: number,
  totalCents: number
): ValidationResult {
  const errors: string[] = [];

  // Minimum: $1.00
  if (depositCents < 100) {
    errors.push('Deposit must be at least $1.00');
  }

  // Maximum: Cannot exceed total
  if (depositCents > totalCents) {
    errors.push('Deposit cannot exceed total amount');
  }

  // Warning: Low deposit (< 10%)
  if (depositCents < totalCents * 0.1) {
    console.warn('Deposit is less than 10% of total (low commitment)');
  }

  // Warning: High deposit (> 80%)
  if (depositCents > totalCents * 0.8) {
    console.warn('Deposit is more than 80% of total (consider full payment)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Typical Deposit Percentages**:
- **20-30%**: Low-commitment events (small parties)
- **40-50%**: Standard events (weddings, corporate)
- **100%**: Full payment upfront (small total amounts, high-risk clients)

---

## Deposit Requirement Flag

### Field: `deposit_required`

```sql
-- events table
deposit_required BOOLEAN DEFAULT true
```

| Value | Meaning | Use Case |
|-------|---------|----------|
| `true` | Deposit required before confirmation | Standard flow |
| `false` | No deposit, full payment only | Rare (trusted clients, small amounts) |

**V1 Default**: All events require deposit (`deposit_required = true`).

---

## Deposit Payment Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────┐
│                  DEPOSIT PAYMENT FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. Client accepts proposal (proposed → accepted)
        ↓
2. Stripe checkout session created
        ↓
3. Client redirected to Stripe checkout
        ↓
4. Client enters payment details
        ↓
5. Stripe processes payment
        ↓
6. Stripe webhook: payment_intent.succeeded
        ↓
7. Server creates ledger entry (idempotent)
        ↓
8. Server transitions event (accepted → paid)
        ↓
9. Client redirected back to app
        ↓
10. Client sees "Payment Received" status
```

---

## Stripe Checkout Session

### Creating Checkout Session

```typescript
async function createDepositCheckoutSession(event: Event): Promise<Stripe.Checkout.Session> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: event.client.stripe_customer_id,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: event.deposit_amount_cents, // Deposit, not total
          product_data: {
            name: `Deposit for ${event.title}`,
            description: `Event Date: ${event.event_date.toLocaleDateString()}`
          }
        },
        quantity: 1
      }
    ],
    payment_intent_data: {
      metadata: {
        event_id: event.id,
        tenant_id: event.tenant_id,
        client_id: event.client_id,
        payment_type: 'deposit'
      }
    },
    success_url: `${process.env.APP_URL}/my-events/${event.id}?payment=success`,
    cancel_url: `${process.env.APP_URL}/my-events/${event.id}?payment=cancelled`,
    metadata: {
      event_id: event.id,
      tenant_id: event.tenant_id,
      payment_type: 'deposit'
    }
  });

  return session;
}
```

**Key Fields**:
- `unit_amount`: **Deposit amount** (not total)
- `metadata.payment_type`: `'deposit'` (distinguishes from balance payment)
- `success_url`: Redirect on success
- `cancel_url`: Redirect if client cancels

---

## Webhook Processing

### Handling `payment_intent.succeeded`

```typescript
async function handlePaymentIntentSucceeded(
  event: Stripe.Event
): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // Extract metadata
  const eventId = paymentIntent.metadata.event_id;
  const tenantId = paymentIntent.metadata.tenant_id;
  const clientId = paymentIntent.metadata.client_id;
  const paymentType = paymentIntent.metadata.payment_type; // 'deposit' or 'balance'

  // Idempotency check
  const existingEntry = await db.ledger_entries.findUnique({
    where: { stripe_event_id: event.id }
  });

  if (existingEntry) {
    console.log('Webhook already processed (idempotent)');
    return; // Already processed
  }

  // Create ledger entry
  await db.ledger_entries.create({
    data: {
      tenant_id: tenantId,
      event_id: eventId,
      client_id: clientId,
      entry_type: 'charge_succeeded',
      amount_cents: paymentIntent.amount, // Positive (credit)
      currency: paymentIntent.currency,
      stripe_event_id: event.id,
      stripe_object_id: paymentIntent.id,
      stripe_event_type: event.type,
      description: `${paymentType === 'deposit' ? 'Deposit' : 'Balance'} payment via Stripe`,
      metadata: {
        payment_type: paymentType,
        payment_method: paymentIntent.payment_method
      }
    }
  });

  // If deposit payment, transition event status
  if (paymentType === 'deposit') {
    const eventRecord = await db.events.findUnique({
      where: { id: eventId }
    });

    if (eventRecord.status === 'accepted') {
      await db.events.update({
        where: { id: eventId },
        data: {
          status: 'paid',
          status_changed_at: new Date()
        }
      });

      // Create audit entry
      await db.event_transitions.create({
        data: {
          tenant_id: tenantId,
          event_id: eventId,
          from_status: 'accepted',
          to_status: 'paid',
          transitioned_by: null, // System transition
          metadata: {
            stripe_event_id: event.id,
            stripe_payment_intent_id: paymentIntent.id,
            amount_cents: paymentIntent.amount,
            payment_type: 'deposit'
          }
        }
      });
    }
  }
}
```

**System Law Alignment**: Law 3 (ledger-first), Law 11 (idempotency).

---

## Deposit Verification

### Ledger-Based Verification

**Critical Rule**: Event can only transition to `confirmed` if deposit is verified in **ledger**.

```typescript
async function verifyDepositPaid(eventId: string): Promise<boolean> {
  // Query ledger for deposit payment
  const ledgerSummary = await db.ledger_entries.aggregate({
    where: {
      event_id: eventId,
      entry_type: 'charge_succeeded'
    },
    _sum: {
      amount_cents: true
    }
  });

  const collectedCents = ledgerSummary._sum.amount_cents || 0;

  // Load event to get required deposit
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  // Verify collected >= deposit required
  return collectedCents >= event.deposit_amount_cents;
}
```

**Used During**: `paid → confirmed` transition validation.

---

## Deposit States

### State Diagram

```
┌───────────────────────────────────────────────────────┐
│              DEPOSIT PAYMENT STATES                    │
└───────────────────────────────────────────────────────┘

  NOT REQUIRED (deposit_required = false)
        ↓
  [Skip deposit, collect full payment]

  REQUIRED (deposit_required = true)
        ↓
  PENDING (accepted status, no payment)
        ↓
  PROCESSING (Stripe checkout initiated)
        ↓
  SUCCEEDED (webhook received, ledger updated)
        ↓
  VERIFIED (paid status, chef can confirm)
```

---

## Deposit vs Balance Payment

### Two-Payment Model

| Payment | When | Amount | Status Transition |
|---------|------|--------|------------------|
| **Deposit** | After proposal accepted | `deposit_amount_cents` | `accepted → paid` |
| **Balance** | After event execution | `total_amount_cents - deposit_amount_cents` | No status change |

**Example**:
- Total: $2,500
- Deposit: $500 (20%)
- Balance: $2,000 (80%)

**Flow**:
1. Client accepts proposal → pays $500 deposit → event `paid`
2. Chef confirms → event `confirmed`
3. Event executed → event `completed`
4. Client pays $2,000 balance → ledger updated, no status change

---

## Full Payment Upfront

### When Deposit = Total

If `deposit_amount_cents === total_amount_cents`, client pays **full amount** upfront.

**Implications**:
- No balance payment needed
- Event fully paid after deposit
- Ledger shows full settlement

**Use Cases**:
- Small total amounts (< $500)
- High-risk clients (new, unknown)
- Chef preference (simplifies accounting)

---

## Deposit Refund Rules

### Cancellation Before Event

| Cancellation Timing | Deposit Refund | Balance Refund |
|---------------------|---------------|----------------|
| **> 30 days before event** | 100% refund | N/A (not paid) |
| **14-30 days before event** | 50% refund | N/A |
| **< 14 days before event** | 0% refund (non-refundable) | N/A |
| **After event started** | 0% refund | 0% refund |

**V1**: Refund policy **not enforced by system**. Chef manually refunds via Stripe.

**V2 Enhancement**: Automated refund calculation based on policy.

---

### Refund Processing

```typescript
async function processDepositRefund(
  eventId: string,
  refundPercentage: number
): Promise<void> {
  // Get original payment intent
  const ledgerEntry = await db.ledger_entries.findFirst({
    where: {
      event_id: eventId,
      entry_type: 'charge_succeeded'
    },
    orderBy: { created_at: 'asc' }
  });

  if (!ledgerEntry) {
    throw new Error('No deposit payment found');
  }

  const refundAmountCents = Math.floor(
    ledgerEntry.amount_cents * (refundPercentage / 100)
  );

  // Create Stripe refund
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const refund = await stripe.refunds.create({
    payment_intent: ledgerEntry.stripe_object_id,
    amount: refundAmountCents,
    metadata: {
      event_id: eventId,
      refund_percentage: refundPercentage
    }
  });

  // Ledger entry created by webhook (refund.succeeded)
}
```

**System Law Alignment**: Law 3 (refunds via ledger).

---

## Deposit Display in Client Portal

### Before Payment

```
┌────────────────────────────────────────────────────┐
│           PAYMENT REQUIRED                          │
├────────────────────────────────────────────────────┤
│ To confirm your booking, please pay the deposit.   │
│                                                     │
│ Deposit Due: $500.00                                │
│ Total Event Cost: $2,500.00                         │
│ Balance Due After Event: $2,000.00                  │
│                                                     │
│ [Pay Deposit Now]                                   │
└────────────────────────────────────────────────────┘
```

### After Payment

```
┌────────────────────────────────────────────────────┐
│           DEPOSIT RECEIVED                          │
├────────────────────────────────────────────────────┤
│ ✓ Deposit Paid: $500.00 (Feb 14, 2026)             │
│                                                     │
│ Total Event Cost: $2,500.00                         │
│ Balance Due After Event: $2,000.00                  │
│                                                     │
│ Awaiting chef confirmation...                       │
└────────────────────────────────────────────────────┘
```

---

## Deposit Payment Failures

### Handling Failed Payments

If Stripe payment fails (card declined, insufficient funds):

1. Webhook `payment_intent.payment_failed` received
2. Ledger entry created with type `charge_failed`
3. Event remains in `accepted` status
4. Client sees error message
5. Client can retry payment

**No Status Transition**: Failed payments **do not** transition event status.

---

### Retry Logic

```typescript
async function handlePaymentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  const eventId = paymentIntent.metadata.event_id;

  // Log failure in ledger (for audit)
  await db.ledger_entries.create({
    data: {
      tenant_id: paymentIntent.metadata.tenant_id,
      event_id: eventId,
      entry_type: 'charge_failed',
      amount_cents: 0, // No money collected
      stripe_event_id: event.id,
      stripe_object_id: paymentIntent.id,
      description: 'Payment failed',
      metadata: {
        failure_reason: paymentIntent.last_payment_error?.message
      }
    }
  });

  // Event stays in 'accepted' - client can retry
}
```

**Client Experience**: Show "Payment Failed" message with retry button.

---

## Deposit Testing

### Test Scenarios

| Scenario | Deposit | Total | Expected Behavior |
|----------|---------|-------|------------------|
| **Standard deposit** | $500 | $2,500 | Deposit flow works, balance due shown |
| **Full payment** | $2,500 | $2,500 | No balance due, event fully paid |
| **Minimum deposit** | $1 | $100 | Allowed, but low commitment warning |
| **Deposit > Total** | $3,000 | $2,500 | Validation error (blocked) |
| **Zero deposit** | $0 | $2,500 | Validation error (blocked) |

**Test Cards** (Stripe):
- `4242 4242 4242 4242`: Success
- `4000 0000 0000 0002`: Declined
- `4000 0000 0000 9995`: Insufficient funds

---

## Related Documents

- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)
- [CLIENT_PROPOSAL_MODEL.md](./CLIENT_PROPOSAL_MODEL.md)
- [CLIENT_EVENT_CONFIRMATION_RULES.md](./CLIENT_EVENT_CONFIRMATION_RULES.md)
- [CLIENT_FINANCIAL_OVERVIEW.md](./CLIENT_FINANCIAL_OVERVIEW.md)
- [LEDGER.md](../../LEDGER.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

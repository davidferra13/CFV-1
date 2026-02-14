# ChefFlow V1 - Ledger System Documentation

**Version**: 1.0
**Last Updated**: 2026-02-13

## Table of Contents

- [Overview](#overview)
- [Ledger-First Architecture](#ledger-first-architecture)
- [Entry Types](#entry-types)
- [Immutability Enforcement](#immutability-enforcement)
- [Idempotency](#idempotency)
- [Minor Units (Cents)](#minor-units-cents)
- [Balance Computation](#balance-computation)
- [Adjustment Workflow](#adjustment-workflow)
- [Reconciliation](#reconciliation)
- [Examples](#examples)

---

## Overview

ChefFlow V1 implements a **ledger-first financial architecture** where ALL financial state derives from an append-only `ledger_entries` table. This ensures **single source of truth**, **immutability**, and **complete audit trails**.

### System Law #3: Financial Truth is Ledger-First

> ALL financial state derives from `ledger_entries` table (append-only)
> Flow: Stripe webhook → ledger entry → computed balance/status
> NEVER store balances, payment status, or totals directly on `events` table

---

## Ledger-First Architecture

### Traditional Approach (WRONG)

```sql
-- ❌ BAD: Storing balances directly on events table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  total_amount_cents INTEGER,
  amount_paid_cents INTEGER, -- ❌ Stored balance
  is_paid BOOLEAN,            -- ❌ Computed field stored
  balance_cents INTEGER       -- ❌ Duplicate data
);

UPDATE events SET amount_paid_cents = 5000 WHERE id = '...';
-- Problem: No audit trail, can be overwritten, no reconciliation
```

### Ledger-First Approach (CORRECT)

```sql
-- ✅ GOOD: Append-only ledger
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  event_id UUID,
  entry_type ledger_entry_type,
  amount_cents INTEGER, -- Positive = credit, Negative = debit
  stripe_event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ,
  -- ...
);

-- ✅ Balances computed via VIEW
CREATE VIEW event_financial_summary AS
SELECT
  event_id,
  SUM(CASE WHEN entry_type = 'charge_succeeded' THEN amount_cents ELSE 0 END) AS collected_cents,
  collected_cents >= events.total_amount_cents AS is_fully_paid
FROM ledger_entries
GROUP BY event_id;
```

### Benefits

1. **Immutable** - Cannot modify or delete historical entries
2. **Auditable** - Complete history of all transactions
3. **Reconcilable** - Can match against Stripe dashboard
4. **Verifiable** - Sum of ledger = current balance
5. **Corrections via Adjustments** - New entry, not UPDATE

---

## Entry Types

### ledger_entry_type Enum

```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_created',      -- Stripe PaymentIntent created
  'charge_succeeded',    -- Payment succeeded ✅
  'charge_failed',       -- Payment failed
  'refund_created',      -- Refund initiated
  'refund_succeeded',    -- Refund completed ✅
  'payout_created',      -- Payout to chef initiated (future)
  'payout_paid',         -- Payout completed (future)
  'adjustment'           -- Manual adjustment (requires approval)
);
```

### Entry Type Semantics

#### charge_created
- **Trigger**: `PaymentIntent` created on Stripe
- **Amount**: Positive (expected charge amount)
- **Effect**: Informational (not counted in balance)
- **Metadata**: `payment_intent_id`

#### charge_succeeded ✅
- **Trigger**: Stripe webhook `payment_intent.succeeded`
- **Amount**: Positive (actual collected amount)
- **Effect**: **INCREASES** event balance
- **Metadata**: `payment_intent_id`, `charge_id`
- **Critical**: This is the ONLY type that contributes to "amount paid"

#### charge_failed
- **Trigger**: Stripe webhook `payment_intent.payment_failed`
- **Amount**: Zero or negative
- **Effect**: Informational (logged for audit)
- **Metadata**: `failure_code`, `failure_message`

#### refund_created
- **Trigger**: Refund initiated on Stripe
- **Amount**: Negative (amount to be refunded)
- **Effect**: Informational (not counted until succeeded)
- **Metadata**: `refund_id`

#### refund_succeeded ✅
- **Trigger**: Stripe webhook `charge.refunded`
- **Amount**: **Negative** (reduces balance)
- **Effect**: **DECREASES** event balance
- **Metadata**: `refund_id`, `reason`

#### adjustment
- **Trigger**: Chef manually creates adjustment
- **Amount**: Positive or negative
- **Effect**: Increases or decreases balance
- **Metadata**: `reason`, `approved_by`
- **Restrictions**: Requires chef approval, logged in audit trail

#### payout_created / payout_paid (Future V1+)
- **Trigger**: Payout to chef's Stripe Connect account
- **Amount**: Negative (money leaving platform)
- **Effect**: Tracks payouts to chefs
- **Note**: NOT implemented in V1

---

## Immutability Enforcement

### Database Triggers

```sql
-- Prevent UPDATE on ledger_entries
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable. Create a new adjustment entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

CREATE TRIGGER ledger_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();
```

### Behavior

```sql
-- ❌ Attempt to UPDATE ledger entry
UPDATE ledger_entries SET amount_cents = 6000 WHERE id = '...';
-- ERROR: Ledger entries are immutable. Create a new adjustment entry instead.

-- ❌ Attempt to DELETE ledger entry
DELETE FROM ledger_entries WHERE id = '...';
-- ERROR: Ledger entries are immutable. Create a new adjustment entry instead.

-- ✅ CORRECT: Create adjustment entry
INSERT INTO ledger_entries (entry_type, amount_cents, description, ...)
VALUES ('adjustment', -1000, 'Correcting overcharge on Event #123', ...);
```

### Verification

```bash
npm run verify:immutability
```

See [`scripts/verify-immutability-strict.sql`](scripts/verify-immutability-strict.sql)

---

## Idempotency

### Problem: Webhook Retries

Stripe webhooks may be **delivered multiple times**:
- Network failures trigger retries
- Timeouts trigger retries
- Accidental replay in Stripe dashboard

**Without idempotency**: Same payment creates multiple ledger entries → duplicate charges

### Solution: Unique Constraint on stripe_event_id

```sql
CREATE TABLE ledger_entries (
  -- ...
  stripe_event_id TEXT UNIQUE, -- Idempotency key
  -- ...
);
```

### Webhook Handler Pattern

```typescript
export async function POST(request: Request) {
  const event = stripe.webhooks.constructEvent(/* ... */)

  // Check if already processed
  const { data: existing } = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    console.log(`[WEBHOOK] Already processed: ${event.id}`)
    return new Response('OK', { status: 200 }) // Return 200, not error
  }

  // Process webhook (insert ledger entry)
  await supabase.from('ledger_entries').insert({
    entry_type: 'charge_succeeded',
    amount_cents: paymentIntent.amount,
    stripe_event_id: event.id, // Unique constraint prevents duplicates
    // ...
  })

  return new Response('OK', { status: 200 })
}
```

### Idempotency Guarantees

- Same Stripe event ID → **One ledger entry only**
- Duplicate webhook → **200 OK** (no error, already processed)
- Database enforces uniqueness → **Cannot accidentally double-charge**

---

## Minor Units (Cents)

### Rule: ALL monetary amounts stored as INTEGER in cents

```sql
CREATE TABLE ledger_entries (
  amount_cents INTEGER NOT NULL, -- NEVER DECIMAL or FLOAT
  -- ...
);
```

### Why?

- **Precision**: No floating-point rounding errors
- **Stripe Standard**: Stripe uses minor units (cents)
- **Database Performance**: INTEGER faster than DECIMAL
- **No Fractional Cents**: Prevents $100.555 errors

### Examples

| Display | Stored (cents) | Type |
|---------|----------------|------|
| $100.00 | `10000` | INTEGER |
| $15.50 | `1550` | INTEGER |
| $0.99 | `99` | INTEGER |
| $1,234.56 | `123456` | INTEGER |

### Conversion

```typescript
// Display to cents
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

// Cents to display
function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2)
}

// Usage
const total = dollarsToCents(99.99) // 9999
const display = centsToDisplay(9999) // "99.99"
```

### Prohibited Patterns

```sql
-- ❌ WRONG: Using DECIMAL
CREATE TABLE ledger_entries (
  amount DECIMAL(10, 2) -- NO!
);

-- ❌ WRONG: Storing dollars as FLOAT
amount_dollars FLOAT -- NO! Rounding errors
```

---

## Balance Computation

### NEVER Store Balances

```sql
-- ❌ WRONG
ALTER TABLE events ADD COLUMN amount_paid_cents INTEGER;

UPDATE events SET amount_paid_cents = (
  SELECT SUM(amount_cents) FROM ledger_entries WHERE event_id = events.id
);
```

### ALWAYS Compute from Ledger

```sql
-- ✅ CORRECT: View computes balances
CREATE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.total_amount_cents AS expected_total_cents,
  e.deposit_amount_cents AS expected_deposit_cents,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents -- Negative
    ELSE 0
  END), 0) AS collected_cents,
  COALESCE(...) >= e.total_amount_cents AS is_fully_paid,
  COALESCE(...) >= e.deposit_amount_cents AS is_deposit_paid
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
GROUP BY e.id, e.tenant_id, e.total_amount_cents, e.deposit_amount_cents;
```

### Usage

```typescript
// Query financial summary
const { data } = await supabase
  .from('event_financial_summary')
  .select('*')
  .eq('event_id', eventId)
  .single()

console.log(data)
// {
//   event_id: 'abc...',
//   expected_total_cents: 20000, // $200.00
//   collected_cents: 5000,        // $50.00
//   is_fully_paid: false,
//   is_deposit_paid: true
// }
```

---

## Adjustment Workflow

### When to Use Adjustments

- **Overcharge correction**: Charged $110 instead of $100
- **Discount applied retroactively**: Give $20 credit
- **Manual payment**: Client paid via check/cash

### Creating an Adjustment

```typescript
export async function createAdjustment(eventId: string, amount: number, reason: string) {
  const user = await requireChef() // Only chefs can create adjustments

  await supabase.from('ledger_entries').insert({
    entry_type: 'adjustment',
    amount_cents: amount, // Positive or negative
    event_id: eventId,
    tenant_id: user.tenantId,
    description: `Adjustment: ${reason}`,
    metadata: {
      reason,
      approved_by: user.email,
      created_via: 'manual',
    },
    created_by: user.id,
  })

  // Adjustment immediately affects balance (via view)
}
```

### Audit Trail

```sql
-- Query all adjustments
SELECT
  created_at,
  amount_cents,
  description,
  metadata->>'reason' AS reason,
  metadata->>'approved_by' AS approved_by
FROM ledger_entries
WHERE entry_type = 'adjustment'
ORDER BY created_at DESC;
```

---

## Reconciliation

### Weekly Reconciliation Procedure

1. **Export Stripe Transactions**
   - Go to Stripe Dashboard → Payments
   - Export CSV for date range

2. **Export Ledger Entries**
   ```sql
   SELECT
     created_at::date AS date,
     entry_type,
     SUM(amount_cents) AS total_cents
   FROM ledger_entries
   WHERE created_at >= '2026-02-01' AND created_at < '2026-03-01'
   GROUP BY date, entry_type
   ORDER BY date;
   ```

3. **Compare Totals**
   - Stripe total = Ledger `charge_succeeded` total?
   - Stripe refunds = Ledger `refund_succeeded` total?

4. **Investigate Discrepancies**
   - Missing webhook events?
   - Duplicate entries (idempotency failure)?
   - Timezone differences?

### Reconciliation Script (Future)

```bash
npm run reconcile:stripe --from=2026-02-01 --to=2026-03-01
# Outputs: Matched / Discrepancies found
```

---

## Examples

### Example 1: Successful Payment

```sql
-- Event created: $200 total, $50 deposit
INSERT INTO events (total_amount_cents, deposit_amount_cents, ...)
VALUES (20000, 5000, ...);

-- Client pays deposit ($50)
INSERT INTO ledger_entries (entry_type, amount_cents, event_id, ...)
VALUES ('charge_succeeded', 5000, '<event-id>', ...);

-- Query balance
SELECT * FROM event_financial_summary WHERE event_id = '<event-id>';
-- collected_cents: 5000
-- is_deposit_paid: true
-- is_fully_paid: false

-- Client pays remaining ($150)
INSERT INTO ledger_entries (entry_type, amount_cents, event_id, ...)
VALUES ('charge_succeeded', 15000, '<event-id>', ...);

-- Query balance again
SELECT * FROM event_financial_summary WHERE event_id = '<event-id>';
-- collected_cents: 20000
-- is_deposit_paid: true
-- is_fully_paid: true
```

### Example 2: Refund

```sql
-- Event fully paid: $200
-- collected_cents: 20000

-- Refund $50
INSERT INTO ledger_entries (entry_type, amount_cents, event_id, ...)
VALUES ('refund_succeeded', -5000, '<event-id>', ...);

-- Query balance
SELECT * FROM event_financial_summary WHERE event_id = '<event-id>';
-- collected_cents: 15000 (20000 - 5000)
-- is_fully_paid: false
```

### Example 3: Adjustment

```sql
-- Overcharged $10 (charged $210 instead of $200)
-- collected_cents: 21000

-- Create adjustment
INSERT INTO ledger_entries (entry_type, amount_cents, event_id, ...)
VALUES ('adjustment', -1000, '<event-id>', ...);

-- Query balance
SELECT * FROM event_financial_summary WHERE event_id = '<event-id>';
-- collected_cents: 20000 (21000 - 1000)
-- is_fully_paid: true
```

---

## Related Documentation

- [Database Schema](DATABASE.md) - `ledger_entries` table structure
- [Payments](PAYMENTS.md) - Stripe webhook → ledger flow
- [Events](EVENTS.md) - Event status transitions based on payment
- [Verification Guide](VERIFICATION_GUIDE.md) - Immutability testing

---

**Document Status**: ✅ Complete
**Governance**: Governed by [CHEFFLOW_V1_SCOPE_LOCK.md](CHEFFLOW_V1_SCOPE_LOCK.md)

# Client Financial Overview

## Document Identity
- **File**: `CLIENT_FINANCIAL_OVERVIEW.md`
- **Category**: Financial & Ledger Model (36/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **client-facing financial model** within the ChefFlow V1 Client Portal. All financial state is **ledger-derived**, **append-only**, and **idempotent**. The client portal never stores balances or payment status directly; instead, all financial truth derives from the `ledger_entries` table.

---

## System Laws Alignment

This document enforces:

- **System Law 2**: All financial truth is ledger-derived (append-only)
- **System Law 3**: Ledger entries are immutable (no UPDATE/DELETE)
- **System Law 11**: All external writes are idempotent
- **System Law 12**: Webhooks must be replay-safe
- **System Law 18**: Client-visible state must match ledger truth

---

## Financial Truth Hierarchy

### Single Source of Truth

```
ledger_entries (append-only table)
    ↓
event_financial_summary (computed view)
    ↓
Client Portal UI (read-only display)
```

**NEVER**:
- Store balances in `events` table
- Store payment status as boolean flags
- Trust Stripe API directly for financial state
- Allow client to modify ledger entries

**ALWAYS**:
- Query `event_financial_summary` view for payment status
- Append new ledger entries for financial events
- Use idempotency keys for webhook-triggered entries
- Compute balances dynamically from ledger

---

## Core Financial Entities

### 1. Ledger Entries

**Table**: `ledger_entries`

**Purpose**: Append-only financial transaction log

**Schema**:
```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE RESTRICT,

  -- Transaction details
  entry_type ledger_entry_type NOT NULL,
  amount_cents INTEGER NOT NULL, -- Positive = credit, Negative = debit
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Context
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,

  -- Stripe reconciliation (idempotency)
  stripe_event_id TEXT UNIQUE,
  stripe_object_id TEXT, -- payment_intent_xxx, charge_xxx
  stripe_event_type TEXT,

  -- Audit trail
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);
```

**Entry Types**:
```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_succeeded',    -- Payment succeeded (+)
  'refund',              -- Refund processed (-)
  'adjustment',          -- Manual adjustment (+ or -)
  'installment'          -- Installment payment (+)
);
```

---

### 2. Event Financial Summary

**View**: `event_financial_summary`

**Purpose**: Compute payment status without storing balances

**Schema**:
```sql
CREATE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.client_id,
  e.total_amount_cents AS expected_total_cents,
  e.deposit_amount_cents AS expected_deposit_cents,

  -- Compute collected amount from ledger
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'installment' THEN le.amount_cents
    WHEN le.entry_type = 'refund' THEN le.amount_cents -- Negative
    WHEN le.entry_type = 'adjustment' THEN le.amount_cents
    ELSE 0
  END), 0) AS collected_cents,

  -- Compute payment status flags
  (COALESCE(SUM(...), 0) >= e.deposit_amount_cents) AS is_deposit_paid,
  (COALESCE(SUM(...), 0) >= e.total_amount_cents) AS is_fully_paid,

  -- Balance remaining
  (e.total_amount_cents - COALESCE(SUM(...), 0)) AS balance_cents
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
GROUP BY e.id, e.tenant_id, e.client_id, e.total_amount_cents, e.deposit_amount_cents;
```

**Client Access**: Via RLS policy filtering by `client_id`

---

## Client Financial Capabilities

### What Clients CAN Do

✅ **View payment status** for their events
✅ **See ledger entries** filtered to their events
✅ **View balance due** computed from ledger
✅ **Initiate payments** via Stripe Checkout
✅ **See refund history** via ledger entries
✅ **Download receipts** for settled charges
✅ **View installment schedule** if enabled

### What Clients CANNOT Do

❌ **Modify ledger entries** (immutable, service-role only)
❌ **Override payment status** (ledger-derived only)
❌ **See other clients' financials** (tenant isolation)
❌ **Access raw Stripe objects** (abstracted via ledger)
❌ **Bypass deposit requirements** (chef-controlled)
❌ **Self-issue refunds** (chef-initiated only)

---

## Financial Data Flow

### Payment Flow

```
1. Client clicks "Pay Deposit"
   ↓
2. Server creates Stripe PaymentIntent
   ↓
3. Stripe redirects to payment form
   ↓
4. Client enters payment details
   ↓
5. Stripe processes payment
   ↓
6. Stripe webhook: payment_intent.succeeded
   ↓
7. Webhook handler appends ledger entry (idempotent)
   ↓
8. Event status transitions to "paid"
   ↓
9. Client sees updated balance (from view)
```

**Idempotency Key**: `stripe_event_id` (unique constraint)

**Failure Handling**: Webhook retry → duplicate detection → 200 OK

---

### Refund Flow

```
1. Chef initiates refund (via Chef Portal)
   ↓
2. Server calls Stripe refund API
   ↓
3. Stripe processes refund
   ↓
4. Stripe webhook: charge.refunded
   ↓
5. Webhook handler appends negative ledger entry
   ↓
6. Balance recalculated (view updates)
   ↓
7. Client sees updated balance
```

**Ledger Entry**: `entry_type = 'refund'`, `amount_cents < 0`

---

## Client UI Financial Components

### 1. Event Payment Card

**Location**: `/my-events/[id]`

**Data Source**: `event_financial_summary` view

**Display**:
```typescript
interface EventPaymentCard {
  totalAmount: string;        // "$200.00"
  depositAmount: string;      // "$50.00"
  collectedAmount: string;    // "$50.00"
  balanceDue: string;         // "$150.00"
  isDepositPaid: boolean;
  isFullyPaid: boolean;
  nextPaymentDue: Date | null;
}
```

**Actions**:
- "Pay Deposit" (if not paid)
- "Pay Balance" (if deposit paid, not fully paid)
- "View Receipt" (if fully paid)

---

### 2. Payment History Table

**Location**: `/my-events/[id]/payments`

**Data Source**: `ledger_entries` filtered by `event_id` + `client_id`

**Columns**:
| Date | Type | Amount | Description | Receipt |
|------|------|--------|-------------|---------|
| 2026-02-10 | Deposit | +$50.00 | Payment succeeded | [Download] |
| 2026-02-12 | Balance | +$150.00 | Payment succeeded | [Download] |
| 2026-02-14 | Refund | -$25.00 | Partial refund | [Download] |

**Query**:
```typescript
const { data } = await supabase
  .from('ledger_entries')
  .select('id, entry_type, amount_cents, description, created_at')
  .eq('event_id', eventId)
  .eq('client_id', clientId)
  .order('created_at', { ascending: false });
```

---

### 3. Balance Summary Widget

**Location**: `/my-events` (dashboard)

**Data Source**: Aggregated `event_financial_summary`

**Display**:
```typescript
interface BalanceSummary {
  totalOutstanding: string;   // "$350.00"
  upcomingPayments: Array<{
    eventId: string;
    eventTitle: string;
    amountDue: string;
    dueDate: Date;
  }>;
  paidToDate: string;         // "$500.00"
  lifetimeSpent: string;      // "$2,500.00"
}
```

---

## Minor Units (Cents) Enforcement

### Rule

**ALL monetary amounts MUST be stored as INTEGER in cents.**

### Rationale

- **Precision**: No floating-point rounding errors
- **Stripe Standard**: Stripe uses minor units
- **Database Performance**: INTEGER faster than DECIMAL
- **No Fractional Cents**: Prevents $100.555 errors

### Examples

| Display | Stored | Type |
|---------|--------|------|
| $100.00 | `10000` | INTEGER |
| $15.50 | `1550` | INTEGER |
| $0.99 | `99` | INTEGER |

### Conversion Utilities

```typescript
// lib/utils/currency.ts
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(centsToDollars(cents));
}

// Usage
const total = dollarsToCents(99.99); // 9999
const display = formatCents(9999);   // "$99.99"
```

**NEVER** use `DECIMAL`, `FLOAT`, or `REAL` for monetary amounts.

---

## Idempotency Guarantees

### Webhook Idempotency

**Problem**: Stripe webhooks may be delivered multiple times

**Solution**: Unique constraint on `stripe_event_id`

**Implementation**:
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const event = stripe.webhooks.constructEvent(/* ... */);

  // Check if already processed
  const { data: existing } = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) {
    console.log(`[WEBHOOK] Already processed: ${event.id}`);
    return new Response('OK', { status: 200 }); // Return 200, not error
  }

  // Process webhook (insert ledger entry)
  const { error } = await supabase.from('ledger_entries').insert({
    entry_type: 'charge_succeeded',
    amount_cents: paymentIntent.amount,
    stripe_event_id: event.id, // Unique constraint prevents duplicates
    // ...
  });

  if (error && error.code === '23505') {
    // Duplicate key violation - already processed by concurrent request
    return new Response('OK', { status: 200 });
  }

  return new Response('OK', { status: 200 });
}
```

**Guarantees**:
- Same Stripe event → One ledger entry only
- Duplicate webhook → 200 OK (no error)
- Database enforces uniqueness

---

## Client Financial Audit Trail

### What Clients Can Access

✅ **Ledger entries** for their events
✅ **Event transitions** related to payments
✅ **Stripe receipt URLs** for settled charges
✅ **Refund reasons** (if applicable)

### Audit Query Example

```typescript
// Get full audit trail for an event
const { data } = await supabase
  .from('ledger_entries')
  .select(`
    id,
    entry_type,
    amount_cents,
    description,
    created_at,
    metadata,
    stripe_event_id
  `)
  .eq('event_id', eventId)
  .eq('client_id', clientId)
  .order('created_at', { ascending: true });
```

---

## Financial State Reconciliation

### Client-Facing Reconciliation

Clients can verify financial state by:

1. **Comparing ledger sum** to displayed balance
2. **Verifying Stripe receipts** match ledger entries
3. **Checking event status** matches payment status

### Example Reconciliation Display

```typescript
// components/ReconciliationWidget.tsx
function ReconciliationWidget({ eventId }: { eventId: string }) {
  const { data: summary } = useQuery(['financial_summary', eventId], () =>
    supabase
      .from('event_financial_summary')
      .select('*')
      .eq('event_id', eventId)
      .single()
  );

  const { data: ledger } = useQuery(['ledger', eventId], () =>
    supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('event_id', eventId)
  );

  const ledgerSum = ledger?.reduce((sum, entry) => sum + entry.amount_cents, 0) || 0;
  const reconciled = ledgerSum === summary?.collected_cents;

  return (
    <div>
      <p>Expected: {formatCents(summary?.expected_total_cents)}</p>
      <p>Collected: {formatCents(summary?.collected_cents)}</p>
      <p>Ledger Sum: {formatCents(ledgerSum)}</p>
      <p>Status: {reconciled ? '✅ Reconciled' : '❌ Mismatch'}</p>
    </div>
  );
}
```

---

## Error Handling & Edge Cases

### Webhook Delivery Failure

**Scenario**: Stripe webhook fails to reach server

**Impact**: Payment succeeded on Stripe, but ledger not updated

**Client View**: Balance due unchanged

**Resolution**:
1. Chef notified of webhook failure
2. Manual reconciliation via Stripe Dashboard
3. Manual ledger entry with `entry_type = 'adjustment'`
4. Client balance updates

### Partial Refunds

**Scenario**: Chef refunds $25 of $200 charge

**Ledger Entry**:
```json
{
  "entry_type": "refund",
  "amount_cents": -2500,
  "description": "Partial refund: menu item unavailable",
  "stripe_event_id": "evt_xyz..."
}
```

**Client View**: Balance changes from $0 to $25 due

### Overpayment

**Scenario**: Client accidentally pays twice

**Ledger Entries**:
```
charge_succeeded: +$200
charge_succeeded: +$200
Total collected: $400
```

**Client View**: Balance due: -$200 (overpaid)

**Resolution**: Chef initiates refund for overage

---

## Security & Access Control

### RLS Policies

**Ledger Entries**:
```sql
-- Clients can read their own ledger entries
CREATE POLICY client_read_ledger ON ledger_entries
FOR SELECT
TO authenticated
USING (client_id = get_current_client_id());

-- No INSERT/UPDATE/DELETE for clients (service role only)
```

**Event Financial Summary**:
```sql
-- Clients can read financial summary for their events
CREATE POLICY client_read_summary ON event_financial_summary
FOR SELECT
TO authenticated
USING (client_id = get_current_client_id());
```

### API Route Protection

```typescript
// app/api/events/[id]/payment-status/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const client = await requireClient(); // Middleware validation

  const { data, error } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', params.id)
    .eq('client_id', client.entityId) // Enforce client ownership
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
```

---

## TypeScript Types

```typescript
// types/financial.ts
export type LedgerEntryType =
  | 'charge_succeeded'
  | 'refund'
  | 'adjustment'
  | 'installment';

export interface LedgerEntry {
  id: string;
  tenant_id: string;
  entry_type: LedgerEntryType;
  amount_cents: number;
  currency: string;
  event_id: string | null;
  client_id: string | null;
  stripe_event_id: string | null;
  stripe_object_id: string | null;
  stripe_event_type: string | null;
  description: string;
  metadata: Record<string, any> | null;
  created_at: string;
  created_by: string | null;
}

export interface EventFinancialSummary {
  event_id: string;
  tenant_id: string;
  client_id: string;
  expected_total_cents: number;
  expected_deposit_cents: number;
  collected_cents: number;
  is_deposit_paid: boolean;
  is_fully_paid: boolean;
  balance_cents: number;
}
```

---

## Implementation Checklist

- [ ] Ledger entries table created with immutability triggers
- [ ] Event financial summary view created
- [ ] RLS policies enforce client access to own data
- [ ] Webhook handler uses idempotency keys
- [ ] All amounts stored in cents (INTEGER)
- [ ] Currency conversion utilities implemented
- [ ] Client UI displays ledger-derived balances
- [ ] Payment history component queries ledger
- [ ] Refund flow appends negative entries
- [ ] Reconciliation widget verifies sums
- [ ] Error handling for webhook failures
- [ ] TypeScript types match database schema

---

## Related Documents

- [CLIENT_LEDGER_MODEL.md](./CLIENT_LEDGER_MODEL.md)
- [CLIENT_PAYMENT_FLOW_MODEL.md](./CLIENT_PAYMENT_FLOW_MODEL.md)
- [CLIENT_DEPOSIT_HANDLING.md](./CLIENT_DEPOSIT_HANDLING.md)
- [CLIENT_BALANCE_CALCULATION_MODEL.md](./CLIENT_BALANCE_CALCULATION_MODEL.md)
- [CLIENT_STRIPE_WEBHOOK_MODEL.md](./CLIENT_STRIPE_WEBHOOK_MODEL.md)
- [CLIENT_FINANCIAL_AUDIT_INTEGRITY.md](./CLIENT_FINANCIAL_AUDIT_INTEGRITY.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

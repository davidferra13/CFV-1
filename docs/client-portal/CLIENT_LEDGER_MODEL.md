# Client Ledger Model

## Document Identity
- **File**: `CLIENT_LEDGER_MODEL.md`
- **Category**: Financial & Ledger Model (37/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **ledger table schema**, **entry types**, and **client access patterns** for the ChefFlow V1 ledger system. The ledger is the **single source of financial truth**, enforcing immutability, idempotency, and complete audit trails.

---

## System Laws Alignment

- **System Law 2**: All financial truth is ledger-derived
- **System Law 3**: Ledger entries are append-only (immutable)
- **System Law 11**: All external writes use idempotency keys
- **System Law 18**: Client-visible state matches ledger truth

---

## Ledger Entries Table Schema

### Complete Schema

```sql
CREATE TABLE ledger_entries (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant isolation
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE RESTRICT,

  -- Transaction classification
  entry_type ledger_entry_type NOT NULL,
  amount_cents INTEGER NOT NULL, -- Positive = credit, Negative = debit
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Context (optional references)
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,

  -- Stripe reconciliation & idempotency
  stripe_event_id TEXT UNIQUE, -- Idempotency key
  stripe_object_id TEXT,       -- payment_intent_xxx, charge_xxx, refund_xxx
  stripe_event_type TEXT,      -- payment_intent.succeeded, charge.refunded

  -- Human-readable description
  description TEXT NOT NULL,

  -- Flexible metadata storage
  metadata JSONB,

  -- Immutable audit trail
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id), -- NULL for system/webhook entries

  -- Constraints
  CONSTRAINT ledger_positive_for_credits CHECK (
    (entry_type IN ('charge_succeeded', 'installment') AND amount_cents > 0)
    OR
    (entry_type = 'refund' AND amount_cents < 0)
    OR
    (entry_type = 'adjustment') -- Can be positive or negative
  ),

  CONSTRAINT ledger_event_or_client CHECK (
    event_id IS NOT NULL OR client_id IS NOT NULL
  )
);
```

---

## Entry Type Enum

### Definition

```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_succeeded',  -- Payment succeeded (Stripe webhook)
  'refund',            -- Refund processed (Stripe webhook)
  'adjustment',        -- Manual correction (chef-initiated)
  'installment'        -- Installment payment (Stripe webhook)
);
```

---

## Entry Type Semantics

### 1. charge_succeeded

**Trigger**: Stripe webhook `payment_intent.succeeded`

**Amount**: Positive (actual collected amount)

**Effect**: INCREASES event balance

**Metadata**:
```json
{
  "payment_intent_id": "pi_xxx",
  "charge_id": "ch_xxx",
  "payment_method": "card",
  "last4": "4242"
}
```

**Example**:
```sql
INSERT INTO ledger_entries (
  tenant_id,
  event_id,
  client_id,
  entry_type,
  amount_cents,
  stripe_event_id,
  stripe_object_id,
  stripe_event_type,
  description,
  metadata
) VALUES (
  'tenant_uuid',
  'event_uuid',
  'client_uuid',
  'charge_succeeded',
  5000, -- $50.00
  'evt_stripe_webhook_id',
  'pi_payment_intent_id',
  'payment_intent.succeeded',
  'Deposit payment for "Anniversary Dinner"',
  '{"payment_method": "card", "last4": "4242"}'::jsonb
);
```

---

### 2. refund

**Trigger**: Stripe webhook `charge.refunded`

**Amount**: **Negative** (reduces balance)

**Effect**: DECREASES event balance

**Metadata**:
```json
{
  "refund_id": "re_xxx",
  "reason": "requested_by_customer",
  "initiated_by": "chef_uuid"
}
```

**Example**:
```sql
INSERT INTO ledger_entries (
  tenant_id,
  event_id,
  client_id,
  entry_type,
  amount_cents,
  stripe_event_id,
  stripe_object_id,
  stripe_event_type,
  description,
  metadata
) VALUES (
  'tenant_uuid',
  'event_uuid',
  'client_uuid',
  'refund',
  -5000, -- -$50.00 (negative!)
  'evt_stripe_refund_id',
  're_refund_id',
  'charge.refunded',
  'Full refund: event cancelled by chef',
  '{"reason": "requested_by_customer", "initiated_by": "chef_uuid"}'::jsonb
);
```

---

### 3. adjustment

**Trigger**: Chef manually creates adjustment

**Amount**: Positive or negative (credit or debit)

**Effect**: Increases or decreases balance

**Metadata**:
```json
{
  "reason": "Correcting overcharge",
  "approved_by": "chef_email",
  "created_via": "manual"
}
```

**Example**:
```sql
INSERT INTO ledger_entries (
  tenant_id,
  event_id,
  client_id,
  entry_type,
  amount_cents,
  description,
  metadata,
  created_by
) VALUES (
  'tenant_uuid',
  'event_uuid',
  'client_uuid',
  'adjustment',
  -1000, -- -$10.00 credit to client
  'Adjustment: overcharged by $10',
  '{"reason": "Correcting overcharge", "approved_by": "chef@example.com"}'::jsonb,
  'chef_auth_user_id'
);
```

**Restrictions**:
- Requires chef authentication (`created_by` must be chef)
- Must include reason in metadata
- Logged in audit trail

---

### 4. installment

**Trigger**: Stripe webhook `payment_intent.succeeded` (for installment plans)

**Amount**: Positive (installment payment amount)

**Effect**: INCREASES event balance

**Metadata**:
```json
{
  "installment_number": 2,
  "total_installments": 4,
  "payment_intent_id": "pi_xxx"
}
```

**Example**:
```sql
INSERT INTO ledger_entries (
  tenant_id,
  event_id,
  client_id,
  entry_type,
  amount_cents,
  stripe_event_id,
  stripe_object_id,
  stripe_event_type,
  description,
  metadata
) VALUES (
  'tenant_uuid',
  'event_uuid',
  'client_uuid',
  'installment',
  2500, -- $25.00 (2nd of 4 installments)
  'evt_installment_2',
  'pi_installment_2',
  'payment_intent.succeeded',
  'Installment 2/4 for "Wedding Reception"',
  '{"installment_number": 2, "total_installments": 4}'::jsonb
);
```

---

## Indexes

### Performance-Critical Indexes

```sql
-- Tenant-scoped queries
CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);

-- Event-scoped queries (most common)
CREATE INDEX idx_ledger_event ON ledger_entries(event_id)
WHERE event_id IS NOT NULL;

-- Client-scoped queries
CREATE INDEX idx_ledger_client ON ledger_entries(client_id)
WHERE client_id IS NOT NULL;

-- Idempotency check (webhook processing)
CREATE UNIQUE INDEX idx_ledger_stripe_event ON ledger_entries(stripe_event_id)
WHERE stripe_event_id IS NOT NULL;

-- Audit trail chronological order
CREATE INDEX idx_ledger_created ON ledger_entries(created_at DESC);

-- Composite index for client event queries
CREATE INDEX idx_ledger_client_event ON ledger_entries(client_id, event_id)
WHERE client_id IS NOT NULL AND event_id IS NOT NULL;
```

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

-- Prevent DELETE on ledger_entries
CREATE TRIGGER ledger_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();
```

### Behavior

```sql
-- ❌ Attempt to UPDATE ledger entry
UPDATE ledger_entries SET amount_cents = 6000 WHERE id = 'xxx';
-- ERROR: Ledger entries are immutable. Create a new adjustment entry instead.

-- ❌ Attempt to DELETE ledger entry
DELETE FROM ledger_entries WHERE id = 'xxx';
-- ERROR: Ledger entries are immutable. Create a new adjustment entry instead.

-- ✅ CORRECT: Create adjustment entry
INSERT INTO ledger_entries (entry_type, amount_cents, description, ...)
VALUES ('adjustment', -1000, 'Correcting overcharge', ...);
```

---

## Client Access Patterns

### RLS Policies

```sql
-- Policy: Clients can read ledger entries for their events
CREATE POLICY client_read_ledger ON ledger_entries
FOR SELECT
TO authenticated
USING (
  client_id = get_current_client_id()
  OR
  event_id IN (
    SELECT id FROM events WHERE client_id = get_current_client_id()
  )
);

-- Policy: No INSERT/UPDATE/DELETE for clients
-- (Only service role and chefs can write)
```

### Query Examples

**Client views all ledger entries for their events**:
```typescript
const { data } = await supabase
  .from('ledger_entries')
  .select('*')
  .eq('client_id', clientId)
  .order('created_at', { ascending: false });
```

**Client views ledger for specific event**:
```typescript
const { data } = await supabase
  .from('ledger_entries')
  .select('*')
  .eq('event_id', eventId)
  .eq('client_id', clientId)
  .order('created_at', { ascending: true });
```

**Client views only payments (exclude refunds)**:
```typescript
const { data } = await supabase
  .from('ledger_entries')
  .select('*')
  .eq('client_id', clientId)
  .in('entry_type', ['charge_succeeded', 'installment'])
  .order('created_at', { ascending: false });
```

---

## Client UI Display

### Payment History Table

```typescript
// components/PaymentHistory.tsx
interface PaymentHistoryProps {
  eventId: string;
}

export function PaymentHistory({ eventId }: PaymentHistoryProps) {
  const { data: entries } = useQuery(['ledger', eventId], async () => {
    const { data } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    return data;
  });

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {entries?.map(entry => (
          <tr key={entry.id}>
            <td>{formatDate(entry.created_at)}</td>
            <td>{formatEntryType(entry.entry_type)}</td>
            <td>{formatCents(entry.amount_cents)}</td>
            <td>{entry.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatEntryType(type: string): string {
  const labels = {
    charge_succeeded: 'Payment',
    installment: 'Installment',
    refund: 'Refund',
    adjustment: 'Adjustment'
  };
  return labels[type] || type;
}
```

---

## Metadata Schema Examples

### charge_succeeded metadata

```typescript
interface ChargeSucceededMetadata {
  payment_intent_id: string;
  charge_id: string;
  payment_method: 'card' | 'bank_account';
  last4?: string;
  brand?: string; // "visa", "mastercard"
  receipt_url?: string;
}
```

### refund metadata

```typescript
interface RefundMetadata {
  refund_id: string;
  reason: 'requested_by_customer' | 'duplicate' | 'fraudulent';
  initiated_by: string; // chef user ID
  approved_at: string;
}
```

### adjustment metadata

```typescript
interface AdjustmentMetadata {
  reason: string;
  approved_by: string; // chef email
  created_via: 'manual' | 'reconciliation';
  original_amount_cents?: number; // If correcting an error
}
```

### installment metadata

```typescript
interface InstallmentMetadata {
  installment_number: number;
  total_installments: number;
  payment_intent_id: string;
  schedule_id?: string; // If using Stripe Billing
}
```

---

## Balance Calculation

### Client Balance Query

```sql
-- Get total collected for an event
SELECT
  event_id,
  SUM(amount_cents) AS collected_cents
FROM ledger_entries
WHERE event_id = 'event_uuid'
  AND entry_type IN ('charge_succeeded', 'installment', 'refund', 'adjustment')
GROUP BY event_id;
```

**Note**: Use `event_financial_summary` view instead of raw queries.

---

## Audit Trail Queries

### Full Event Financial History

```typescript
async function getEventFinancialHistory(eventId: string) {
  const { data } = await supabase
    .from('ledger_entries')
    .select(`
      id,
      entry_type,
      amount_cents,
      description,
      created_at,
      stripe_event_id,
      metadata
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  return data;
}
```

### Client Lifetime Financial Summary

```typescript
async function getClientLifetimeSummary(clientId: string) {
  const { data } = await supabase
    .from('ledger_entries')
    .select('amount_cents, entry_type')
    .eq('client_id', clientId);

  const summary = data?.reduce((acc, entry) => {
    if (entry.entry_type === 'charge_succeeded' || entry.entry_type === 'installment') {
      acc.totalPaid += entry.amount_cents;
    } else if (entry.entry_type === 'refund') {
      acc.totalRefunded += Math.abs(entry.amount_cents);
    }
    return acc;
  }, { totalPaid: 0, totalRefunded: 0 });

  return {
    totalPaid: summary.totalPaid,
    totalRefunded: summary.totalRefunded,
    netPaid: summary.totalPaid - summary.totalRefunded
  };
}
```

---

## Error Handling

### Duplicate Stripe Event

```typescript
// app/api/webhooks/stripe/route.ts
async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  const { error } = await supabase.from('ledger_entries').insert({
    tenant_id: paymentIntent.metadata.tenant_id,
    event_id: paymentIntent.metadata.event_id,
    client_id: paymentIntent.metadata.client_id,
    entry_type: 'charge_succeeded',
    amount_cents: paymentIntent.amount,
    stripe_event_id: event.id, // Unique constraint
    stripe_object_id: paymentIntent.id,
    stripe_event_type: event.type,
    description: `Payment succeeded: ${paymentIntent.description}`
  });

  if (error) {
    if (error.code === '23505') { // Unique violation
      console.log('[WEBHOOK] Duplicate event, already processed');
      return { success: true, duplicate: true };
    }
    throw error;
  }

  return { success: true, duplicate: false };
}
```

---

## TypeScript Types

```typescript
// types/ledger.ts
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

export interface LedgerMetadata {
  charge_succeeded?: ChargeSucceededMetadata;
  refund?: RefundMetadata;
  adjustment?: AdjustmentMetadata;
  installment?: InstallmentMetadata;
}
```

---

## Implementation Checklist

- [ ] Ledger entries table created with schema
- [ ] Entry type enum defined
- [ ] Immutability triggers installed
- [ ] Indexes created for performance
- [ ] RLS policies enforce client access
- [ ] Unique constraint on stripe_event_id
- [ ] CHECK constraints on amount signs
- [ ] Client UI components query ledger
- [ ] Error handling for duplicate events
- [ ] TypeScript types match schema

---

## Related Documents

- [CLIENT_FINANCIAL_OVERVIEW.md](./CLIENT_FINANCIAL_OVERVIEW.md)
- [CLIENT_LEDGER_ENTRY_TYPES.md](./CLIENT_LEDGER_ENTRY_TYPES.md)
- [CLIENT_LEDGER_APPEND_ONLY_RULES.md](./CLIENT_LEDGER_APPEND_ONLY_RULES.md)
- [CLIENT_LEDGER_IDEMPOTENCY_RULES.md](./CLIENT_LEDGER_IDEMPOTENCY_RULES.md)
- [CLIENT_LEDGER_UNIQUE_CONSTRAINTS.md](./CLIENT_LEDGER_UNIQUE_CONSTRAINTS.md)
- [CLIENT_FINANCIAL_AUDIT_INTEGRITY.md](./CLIENT_FINANCIAL_AUDIT_INTEGRITY.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

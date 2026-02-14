# Ledger Schema (V1)

## Table Definition

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event linkage
  event_id UUID REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),

  -- Entry details
  entry_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL, -- Positive for income, negative for refunds

  -- Stripe linkage
  stripe_event_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  stripe_charge_id TEXT,

  -- Context
  notes TEXT,
  metadata JSONB,

  -- Immutability
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at or deleted_at (immutable)
);

-- Indexes
CREATE INDEX idx_ledger_event ON ledger_entries(event_id);
CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);
CREATE INDEX idx_ledger_stripe_event ON ledger_entries(stripe_event_id);
CREATE INDEX idx_ledger_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at DESC);

-- Immutability triggers
CREATE TRIGGER prevent_ledger_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_update();

CREATE TRIGGER prevent_ledger_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_delete();
```

---

## Field Definitions

### `id` (UUID)
Primary key, auto-generated.

### `event_id` (UUID)
Links to `events(id)`. Null for tenant-level entries (e.g., platform fees).

### `tenant_id` (UUID)
Required. Every entry belongs to a tenant.

### `entry_type` (TEXT)
Type of entry (see `13_LEDGER_ENTRY_TYPES.md` for canonical list).

### `amount_cents` (INTEGER)
Amount in cents. Positive for charges, negative for refunds.

### `stripe_event_id` (TEXT)
Unique Stripe webhook event ID. Prevents duplicate processing.

### `stripe_payment_intent_id` (TEXT)
Stripe PaymentIntent ID for charge entries.

### `stripe_refund_id` (TEXT)
Stripe Refund ID for refund entries.

### `notes` (TEXT)
Human-readable description.

### `metadata` (JSONB)
Additional structured data.

### `created_at` (TIMESTAMPTZ)
Entry creation timestamp. **Immutable**.

---

## TypeScript Types

```typescript
export interface LedgerEntry {
  id: string;
  event_id: string | null;
  tenant_id: string;
  entry_type: LedgerEntryType;
  amount_cents: number;
  stripe_event_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export type LedgerEntryType =
  | 'charge_pending'
  | 'charge_succeeded'
  | 'charge_failed'
  | 'refund_pending'
  | 'refund_succeeded'
  | 'refund_failed'
  | 'adjustment';
```

---

**End of Ledger Schema**

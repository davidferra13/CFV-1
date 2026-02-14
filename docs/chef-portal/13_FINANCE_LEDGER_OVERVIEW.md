# Finance & Ledger Overview (V1)

## Core Principle

**The ledger is the single source of truth for all financial data.** Payment state, balances, and totals are always **derived** from ledger entries, never stored separately.

---

## Ledger-First Architecture

```
Stripe Event → Webhook → Ledger Entry → Derived State
```

NOT:
```
❌ Stripe Event → Update event.payment_status
```

---

## Why Ledger-First?

1. **Immutability**: Ledger entries cannot be edited/deleted
2. **Auditability**: Complete financial history preserved
3. **Reconciliation**: Can replay entries to verify state
4. **Corrections**: Via new entries, not edits

---

## Key Concepts

### Append-Only
Ledger entries are never modified. Corrections are made via new offsetting entries.

### Derived State
Payment status and balances are computed from ledger entries at read time.

### Event Linkage
Every ledger entry is linked to an event (or tenant for non-event entries).

---

## Schema

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),

  entry_type TEXT NOT NULL, -- 'charge_succeeded', 'refund_pending', etc.
  amount_cents INTEGER NOT NULL,

  stripe_event_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,

  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_event ON ledger_entries(event_id);
CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);
CREATE INDEX idx_ledger_stripe_event ON ledger_entries(stripe_event_id);
```

---

## V1 Scope

### Included
- Append-only ledger
- Entry types (7 locked types)
- Stripe event mapping
- Derived payment state

### Excluded
- Multi-currency support (USD only)
- Tax calculations
- Recurring billing
- Invoicing beyond event payments

---

**End of Finance & Ledger Overview**

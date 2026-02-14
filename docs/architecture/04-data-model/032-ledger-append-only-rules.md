# Ledger Append-Only Rules

**Document ID**: 032
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the append-only ledger model for financial transactions in ChefFlow V1. Ledger is the single source of truth for all financial state.

---

## Core Principles

### 1. All Money Enters Via Ledger

**Rule**: Payment processing creates ledger entry FIRST, then derives event status.

**Flow**:
```
Stripe webhook fires
  ↓
Create ledger entry (immutable)
  ↓
Recompute event balance (from ledger)
  ↓
Transition event status if threshold met
```

---

### 2. Ledger Entries Are Immutable

**Enforcement**: Database triggers prevent UPDATE and DELETE

**Correction**: Create new entry with opposite amount

---

### 3. Amounts in Minor Units (Cents)

**Type**: INTEGER (not DECIMAL or FLOAT)

**Examples**:
- $100.00 → 10000
- $15.50 → 1550

---

### 4. Idempotency via stripe_event_id

**Constraint**:
```sql
stripe_event_id TEXT UNIQUE
```

**Effect**: Duplicate webhook deliveries rejected

**Implementation**:
```typescript
try {
  await supabase.from('ledger_entries').insert({
    stripe_event_id: event.id,
    // other fields
  });
} catch (error) {
  if (error.code === '23505') {
    // Duplicate stripe_event_id, already processed
    return new Response('OK', { status: 200 });
  }
  throw error;
}
```

---

### 5. Balances Are Computed, Never Stored

**Prohibition**: Do NOT store balance, amount_paid, is_paid on events table

**View**:
```sql
CREATE VIEW event_financial_summary AS
SELECT
  event_id,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_paid,
  SUM(amount) AS net_amount
FROM ledger_entries
GROUP BY event_id;
```

---

## Entry Types

### charge_succeeded
**Created**: When Stripe payment_intent.succeeded webhook received

**Amount**: Positive (e.g., 10000 for $100.00)

### refund_succeeded
**Created**: When Stripe charge.refunded webhook received

**Amount**: Negative (e.g., -10000 for $100.00 refund)

### adjustment
**Created**: Manual correction by chef or support

**Amount**: Positive or negative

**Metadata**: Must include reason

---

## Reconciliation

**Daily Process**:
1. Export Stripe transactions (CSV)
2. Export ledger_entries (SQL)
3. Verify SUM(ledger.amount) = SUM(stripe.amount)

**Discrepancy**: Critical bug, investigate immediately

---

## References

- **Immutability Enforcement**: `031-immutability-enforcement.md`
- **Stripe Integration Boundary**: `033-stripe-integration-boundary.md`
- **Database Authority Rules**: `027-database-authority-rules.md`

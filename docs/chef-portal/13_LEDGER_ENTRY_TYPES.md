# Ledger Entry Types (V1)

## Canonical Entry Types (7 Total)

### 1. `charge_pending`
- **When**: Payment intent created, awaiting payment
- **Amount**: Positive (expected charge amount)
- **Source**: Chef initiates deposit request
- **Example**: $500.00 deposit requested

### 2. `charge_succeeded`
- **When**: Stripe confirms successful payment
- **Amount**: Positive (actual charged amount)
- **Source**: Stripe webhook `payment_intent.succeeded`
- **Example**: $500.00 deposited

### 3. `charge_failed`
- **When**: Payment fails (card declined, etc.)
- **Amount**: Zero or negative offset to pending
- **Source**: Stripe webhook `payment_intent.payment_failed`
- **Example**: $0.00 (or -$500.00 offset)

### 4. `refund_pending`
- **When**: Refund initiated, awaiting processing
- **Amount**: Negative (refund amount)
- **Source**: Chef initiates refund
- **Example**: -$250.00 partial refund requested

### 5. `refund_succeeded`
- **When**: Stripe confirms successful refund
- **Amount**: Negative (actual refunded amount)
- **Source**: Stripe webhook `charge.refunded`
- **Example**: -$250.00 refunded

### 6. `refund_failed`
- **When**: Refund fails
- **Amount**: Zero or positive offset to pending
- **Source**: Stripe webhook `refund.failed`
- **Example**: $0.00

### 7. `adjustment`
- **When**: Manual correction by chef
- **Amount**: Positive or negative
- **Source**: Chef manual entry (rare)
- **Example**: -$50.00 courtesy discount

---

## Entry Type Enum

```typescript
export const LEDGER_ENTRY_TYPES = [
  'charge_pending',
  'charge_succeeded',
  'charge_failed',
  'refund_pending',
  'refund_succeeded',
  'refund_failed',
  'adjustment',
] as const;

export type LedgerEntryType = typeof LEDGER_ENTRY_TYPES[number];
```

---

## Database Enum

```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_pending',
  'charge_succeeded',
  'charge_failed',
  'refund_pending',
  'refund_succeeded',
  'refund_failed',
  'adjustment'
);

ALTER TABLE ledger_entries
ALTER COLUMN entry_type TYPE ledger_entry_type USING entry_type::ledger_entry_type;
```

---

**End of Ledger Entry Types**

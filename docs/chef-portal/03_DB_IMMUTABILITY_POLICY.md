# Database Immutability Policy (V1)

## Immutable Tables

### `ledger_entries`
**Why immutable**: Financial truth; editing history enables fraud.

### `event_transitions`
**Why immutable**: Audit trail; lifecycle must be traceable.

## Immutability Enforcement

**Triggers prevent UPDATE and DELETE:**

```sql
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is immutable', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER immutable_ledger_entries
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER immutable_event_transitions
BEFORE UPDATE OR DELETE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

## Application Layer

Application code must never attempt to modify immutable tables:

```typescript
// ❌ FORBIDDEN
await db.ledger_entries.update({ where: { id }, data: { amount_cents: 1000 } });

// ✅ CORRECT: Append new entry for corrections
await db.ledger_entries.create({
  data: {
    event_id,
    entry_type: 'adjustment',
    amount_cents: -500,
    notes: 'Correction for overcharge'
  }
});
```

## Verification

Test immutability with `verify-immutability.sql` script:

```sql
-- Attempt UPDATE (should fail)
UPDATE ledger_entries SET amount_cents = 0 WHERE id = 'test-id';

-- Attempt DELETE (should fail)
DELETE FROM event_transitions WHERE id = 'test-id';
```

Both should raise exception.

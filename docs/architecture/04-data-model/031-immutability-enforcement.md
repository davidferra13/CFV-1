# Immutability Enforcement

**Document ID**: 031
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines which tables are immutable and how immutability is enforced at the database level in ChefFlow V1.

---

## Immutable Tables

1. **ledger_entries**: Financial audit trail
2. **event_transitions**: Event lifecycle audit trail
3. **user_roles**: Role assignments (no changes allowed)

---

## Enforcement Mechanism

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is immutable. Create a new entry instead.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
```

### Trigger Application

```sql
CREATE TRIGGER ledger_entries_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER ledger_entries_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

---

## Correction Strategy

**Problem**: Error in ledger entry

**Solution**: Create adjustment entry

```typescript
await supabase.from('ledger_entries').insert({
  tenant_id,
  event_id,
  amount: -originalAmount, // Reversal
  type: 'adjustment',
  metadata: { reason: 'Correcting duplicate entry', original_entry_id: 'xxx' }
});
```

---

## Verification

```sql
-- Attempt UPDATE (should fail)
UPDATE ledger_entries SET amount = 5000 WHERE id = 'xxx';
-- Expected: ERROR: Table ledger_entries is immutable

-- Attempt DELETE (should fail)
DELETE FROM ledger_entries WHERE id = 'xxx';
-- Expected: ERROR: Table ledger_entries is immutable
```

---

## References

- **Ledger Append-Only Rules**: `032-ledger-append-only-rules.md`
- **Database Authority Rules**: `027-database-authority-rules.md`
- **Immutability Verification**: `049-immutability-verification-contract.md`

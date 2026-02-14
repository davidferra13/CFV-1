# Immutability Verification (V1)

## Immutable Tables

1. `ledger_entries`
2. `event_transitions`

---

## Database Triggers

```sql
CREATE OR REPLACE FUNCTION prevent_immutable_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Updates not allowed on immutable table %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_immutable_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Deletes not allowed on immutable table %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Apply to ledger_entries
CREATE TRIGGER prevent_ledger_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_update();

CREATE TRIGGER prevent_ledger_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_delete();

-- Apply to event_transitions
CREATE TRIGGER prevent_transitions_update
BEFORE UPDATE ON event_transitions
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_update();

CREATE TRIGGER prevent_transitions_delete
BEFORE DELETE ON event_transitions
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_delete();
```

---

## Verification Script

See `/scripts/verify-immutability.sql` for test suite.

---

**End of Immutability Verification**

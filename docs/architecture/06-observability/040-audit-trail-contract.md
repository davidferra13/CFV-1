# Audit Trail Contract

**Document ID**: 040
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines audit trail requirements for ChefFlow V1. All critical actions MUST be auditable.

---

## Audited Tables

### 1. ledger_entries (Financial Audit)

**Fields**:
- `created_at`: Timestamp
- `stripe_event_id`: External reference
- `metadata`: Additional context

**Immutable**: Yes (cannot modify or delete)

---

### 2. event_transitions (Lifecycle Audit)

**Fields**:
- `from_status`: Previous state
- `to_status`: New state
- `created_by`: User who triggered transition
- `created_at`: Timestamp

**Immutable**: Yes

---

### 3. Supabase Auth Logs

**Automatic**:
- Sign in attempts
- Sign up events
- Password reset requests

**Access**: Supabase Dashboard → Logs → Auth

---

## Audit Queries

### "Who changed event status?"

```sql
SELECT * FROM event_transitions
WHERE event_id = 'event-uuid'
ORDER BY created_at DESC;
```

### "All payments for tenant"

```sql
SELECT * FROM ledger_entries
WHERE tenant_id = 'tenant-uuid'
ORDER BY created_at DESC;
```

---

## References

- **Immutability Enforcement**: `031-immutability-enforcement.md`
- **Ledger Append-Only Rules**: `032-ledger-append-only-rules.md`

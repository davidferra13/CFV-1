# Database Authority Rules

**Document ID**: 027
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Establishes that PostgreSQL database is the single source of truth for all application state in ChefFlow V1. Application code reads from and writes to database; database enforces all constraints.

---

## Core Principles

### 1. Database is Authority

**Rule**: All business logic constraints MUST be enforced at database level.

**Examples**:
- Immutability: Enforced by triggers
- Tenant isolation: Enforced by RLS
- Data integrity: Enforced by constraints
- Valid transitions: Enforced by CHECK constraints

---

### 2. Application Code is Thin Layer

**Role of Application**:
- ✅ User interface
- ✅ Input validation (redundant, database is final)
- ✅ Business logic orchestration
- ❌ NOT authoritative for constraints

---

### 3. Never Cache Authoritative State

**Prohibition**: Do NOT cache role, tenant_id, or financial balances in application memory.

**Always Query Fresh**: Each request queries database for authoritative state.

---

## Database Constraints

### Foreign Keys

```sql
tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE
```

**Effect**: Invalid references rejected, cascade deletion enforced.

---

### CHECK Constraints

```sql
CHECK (amount > 0)
CHECK (role IN ('chef', 'client'))
CHECK (guest_count BETWEEN 1 AND 1000)
```

**Effect**: Invalid data rejected at insertion.

---

### UNIQUE Constraints

```sql
CONSTRAINT unique_stripe_event UNIQUE(stripe_event_id)
CONSTRAINT user_roles_auth_user_id_key UNIQUE(auth_user_id)
```

**Effect**: Duplicate prevention (idempotency).

---

### NOT NULL Constraints

```sql
tenant_id UUID NOT NULL
amount INTEGER NOT NULL
```

**Effect**: Required fields enforced.

---

## Triggers for Complex Logic

### Immutability Enforcement

```sql
CREATE TRIGGER ledger_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

---

### Auto-Timestamps

```sql
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Views for Computed State

### Event Financial Summary

```sql
CREATE VIEW event_financial_summary AS
SELECT
  event_id,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_paid,
  SUM(amount) AS net_amount
FROM ledger_entries
GROUP BY event_id;
```

**Benefit**: Always up-to-date, no sync issues.

---

## References

- **Schema Contract**: `028-schema-contract.md`
- **Migration Model**: `029-migration-model.md`
- **Immutability Enforcement**: `031-immutability-enforcement.md`

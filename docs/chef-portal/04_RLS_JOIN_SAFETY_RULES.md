# RLS Join Safety Rules (V1)

## Problem: RLS on Joined Tables

RLS must be enforced on **all tables in a JOIN**, not just the primary table.

## Example: Safe Join

```sql
-- Both tables have RLS enabled and policies
SELECT e.*, c.name AS client_name
FROM events e
JOIN client_profiles c ON c.id = e.client_id
WHERE e.tenant_id = current_tenant_id();
```

RLS filters both `events` and `client_profiles` automatically.

## Example: Unsafe Join

```sql
-- If client_profiles has no RLS policy, data can leak
SELECT e.*, c.email
FROM events e
JOIN client_profiles c ON c.id = e.client_id;
```

**Solution**: Ensure ALL tables have RLS policies.

## Inherited Scoping

For tables without direct `tenant_id`:

```sql
-- ledger_entries inherits scoping via event_id
CREATE POLICY chef_access ON ledger_entries
FOR SELECT
USING (
  event_id IN (
    SELECT id FROM events WHERE tenant_id = current_tenant_id()
  )
);
```

## Testing Joins

Verify cross-tenant leaks don't occur via JOINs in `verify-rls.sql`.

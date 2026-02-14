# RLS Overview: Deny By Default (V1)

## Core Principle

**Deny by default**: No access unless explicitly granted by policy.

## Enable RLS

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
-- ... all tables
```

## Default Behavior

With RLS enabled but no policies:
- SELECT returns 0 rows
- INSERT fails
- UPDATE affects 0 rows
- DELETE affects 0 rows

## Creating Policies

Policies explicitly grant access:

```sql
CREATE POLICY chef_access ON events
FOR ALL  -- SELECT, INSERT, UPDATE, DELETE
USING (tenant_id = current_tenant_id());
```

## Testing RLS

```sql
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-id';
SELECT * FROM events;  -- Should respect RLS
```

See `verify-rls.sql` for comprehensive tests.

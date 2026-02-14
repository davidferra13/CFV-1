# RLS Helper Functions (V1)

## Purpose

Helper functions simplify policy expressions.

## `current_user_id()`

```sql
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE;
```

## `current_user_role()`

```sql
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM user_roles
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

## `current_tenant_id()`

```sql
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM user_roles
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

## Usage in Policies

```sql
CREATE POLICY chef_access ON events
FOR ALL
USING (tenant_id = current_tenant_id() AND current_user_role() IN ('chef', 'chef_subaccount'));
```

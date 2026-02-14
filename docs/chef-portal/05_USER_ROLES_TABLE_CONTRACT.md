# User Roles Table Contract (V1)

## Schema

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('chef', 'chef_subaccount', 'client')),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
```

## Constraints

- **UNIQUE(user_id, tenant_id)**: One role per user per tenant
- **NOT NULL**: All fields required
- **CHECK**: Role must be one of 3 valid values
- **CASCADE**: If user or tenant deleted, role mapping deleted

## Indexes

```sql
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);
```

## RLS

```sql
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_role ON user_roles
FOR SELECT
USING (user_id = auth.uid());
```

Users can read their own role, but cannot modify it.

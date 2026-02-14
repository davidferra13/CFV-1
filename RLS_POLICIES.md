# Row Level Security Policies Reference

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

Complete reference for Row Level Security (RLS) policies enforcing multi-tenant isolation in ChefFlow V1.

---

## Table of Contents

1. [Overview](#overview)
2. [Helper Functions](#helper-functions)
3. [Policy Patterns](#policy-patterns)
4. [Table-by-Table Policies](#table-by-table-policies)
5. [Testing RLS](#testing-rls)
6. [Common Patterns](#common-patterns)

---

## Overview

### System Law #1: Multi-Tenant Isolation

> Every table except `chefs` and `clients` MUST have `tenant_id` column. RLS policies prevent Chef A from querying Chef B's data.

### RLS Guarantees

- **Deny by default**: No access without explicit policy
- **Database enforced**: Cannot be bypassed (even with service role disabled)
- **Layer 3 defense**: Backup if middleware/application layer fails

### All Tables Have RLS Enabled

```sql
ALTER TABLE chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menus ENABLE ROW LEVEL SECURITY;
```

---

## Helper Functions

These SQL functions return user context for RLS policies.

### `get_current_user_role()`

Returns current user's role from authoritative `user_roles` table.

```sql
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns**: `'chef'` or `'client'`
**Usage**: Check user role in policies

### `get_current_tenant_id()`

Returns chef's ID (tenant) if user is a chef.

```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns**: `chef.id` or `NULL`
**Usage**: Filter by tenant for chef users

### `get_current_client_id()`

Returns client's ID if user is a client.

```sql
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns**: `client.id` or `NULL`
**Usage**: Filter by client for client users

---

## Policy Patterns

### Chef Policy Pattern

Chef sees only their tenant's data:

```sql
CREATE POLICY {table}_chef_select ON {table}
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

### Client Policy Pattern

Client sees only their own data:

```sql
CREATE POLICY {table}_client_select ON {table}
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

### Self-Only Pattern

User sees only their own record:

```sql
CREATE POLICY {table}_self_select ON {table}
  FOR SELECT
  USING (auth.uid() = auth_user_id);
```

---

## Table-by-Table Policies

### `chefs` Table

**SELECT**: Chefs see only their own profile
```sql
CREATE POLICY chefs_select ON chefs
  FOR SELECT
  USING (auth.uid() = auth_user_id);
```

**UPDATE**: Chefs update only their own profile
```sql
CREATE POLICY chefs_update ON chefs
  FOR UPDATE
  USING (auth.uid() = auth_user_id);
```

**INSERT/DELETE**: Via service role only (signup flow)

---

### `clients` Table

**Chef SELECT**: See own tenant clients
```sql
CREATE POLICY clients_chef_select ON clients
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Chef INSERT**: Create clients in own tenant
```sql
CREATE POLICY clients_chef_insert ON clients
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Chef UPDATE**: Update own tenant clients
```sql
CREATE POLICY clients_chef_update ON clients
  FOR UPDATE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Client SELECT**: See own profile
```sql
CREATE POLICY clients_self_select ON clients
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );
```

**Client UPDATE**: Update own profile
```sql
CREATE POLICY clients_self_update ON clients
  FOR UPDATE
  USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );
```

---

### `user_roles` Table

**SELECT**: Users see only their own role
```sql
CREATE POLICY user_roles_self_select ON user_roles
  FOR SELECT
  USING (auth.uid() = auth_user_id);
```

**INSERT/UPDATE/DELETE**: Via service role only (prevents role escalation)

---

### `client_invitations` Table

**Chef ALL**: Manage own tenant invitations
```sql
CREATE POLICY invitations_chef_all ON client_invitations
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Public SELECT**: Read valid invitations by token (signup flow)
```sql
CREATE POLICY invitations_public_select_by_token ON client_invitations
  FOR SELECT
  USING (
    token IS NOT NULL AND
    used_at IS NULL AND
    expires_at > now()
  );
```

---

### `events` Table

**Chef SELECT**: See own tenant events
```sql
CREATE POLICY events_chef_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Chef INSERT**: Create events in own tenant
```sql
CREATE POLICY events_chef_insert ON events
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id() AND
    created_by = auth.uid()
  );
```

**Chef UPDATE**: Update own tenant events
```sql
CREATE POLICY events_chef_update ON events
  FOR UPDATE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Chef DELETE**: Delete own tenant events
```sql
CREATE POLICY events_chef_delete ON events
  FOR DELETE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Client SELECT**: See own events
```sql
CREATE POLICY events_client_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

**Client UPDATE**: Update own events (limited fields via server actions)
```sql
CREATE POLICY events_client_update ON events
  FOR UPDATE
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

---

### `event_transitions` Table

**Chef SELECT**: See own tenant transitions
```sql
CREATE POLICY transitions_chef_select ON event_transitions
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Client SELECT**: See transitions for own events
```sql
CREATE POLICY transitions_client_select ON event_transitions
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    event_id IN (
      SELECT id FROM events WHERE client_id = get_current_client_id()
    )
  );
```

**INSERT**: Authenticated users only (server validates)
```sql
CREATE POLICY transitions_insert ON event_transitions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**UPDATE/DELETE**: Blocked by immutability triggers

---

### `ledger_entries` Table

**Chef SELECT**: See own tenant ledger
```sql
CREATE POLICY ledger_chef_select ON ledger_entries
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Client SELECT**: See ledger for own events
```sql
CREATE POLICY ledger_client_select ON ledger_entries
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

**INSERT**: Chef adjustments or webhook (service role)
```sql
CREATE POLICY ledger_insert ON ledger_entries
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id()) OR
    (auth.uid() IS NULL) -- Webhook uses service role
  );
```

**UPDATE/DELETE**: Blocked by immutability triggers

---

### `menus` Table

**Chef ALL**: Manage own tenant menus
```sql
CREATE POLICY menus_chef_all ON menus
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Client SELECT**: See active menus from their chef
```sql
CREATE POLICY menus_client_select ON menus
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    is_active = true AND
    tenant_id = (SELECT tenant_id FROM clients WHERE id = get_current_client_id())
  );
```

---

### `event_menus` Table

**Chef ALL**: Manage menus for own events
```sql
CREATE POLICY event_menus_chef_all ON event_menus
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    event_id IN (SELECT id FROM events WHERE tenant_id = get_current_tenant_id())
  )
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    event_id IN (SELECT id FROM events WHERE tenant_id = get_current_tenant_id())
  );
```

**Client SELECT**: See menus for own events
```sql
CREATE POLICY event_menus_client_select ON event_menus
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    event_id IN (SELECT id FROM events WHERE client_id = get_current_client_id())
  );
```

---

## Testing RLS

### Verification Script

Run `scripts/verify-rls.sql` from Supabase SQL Editor.

**Tests**:
- Chef A cannot see Chef B's data
- Client A1 cannot see Client A2's data
- Service role can see all data

### Manual Testing

```sql
-- Test as Chef A
-- Set auth context (requires service role)
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'chef-a-auth-user-id')::text,
  true
);

-- Try to query Chef B's events (should return 0 rows)
SELECT COUNT(*) FROM events WHERE tenant_id = 'chef-b-id';
```

### Common Test Cases

**Cross-tenant access**:
- [ ] Chef A cannot SELECT Chef B's events
- [ ] Chef A cannot INSERT into Chef B's tenant
- [ ] Chef A cannot UPDATE Chef B's events

**Cross-client access**:
- [ ] Client A1 cannot SELECT Client A2's events
- [ ] Client cannot UPDATE other client's events

**Unauthorized mutations**:
- [ ] Client cannot INSERT events
- [ ] Client cannot DELETE events
- [ ] User cannot UPDATE user_roles (role escalation)

---

## Common Patterns

### Subquery Pattern

Used when filtering by related table:

```sql
-- Clients see transitions for their events
event_id IN (
  SELECT id FROM events WHERE client_id = get_current_client_id()
)
```

### NULL Check Pattern

Allow system actions (webhooks):

```sql
WITH CHECK (
  (auth.uid() IS NOT NULL AND ...) OR  -- User action
  (auth.uid() IS NULL)                 -- System action
)
```

### Tenant Lookup Pattern

Get tenant from client record:

```sql
tenant_id = (
  SELECT tenant_id FROM clients WHERE id = get_current_client_id()
)
```

---

## Debugging RLS

### Check If RLS Is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### List All Policies

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Test Policy Logic

```sql
-- Manually test USING clause
SELECT *
FROM events
WHERE (
  get_current_user_role() = 'chef' AND
  tenant_id = get_current_tenant_id()
);
```

### Common RLS Issues

**No rows returned**: Check if:
- RLS is enabled on table
- User has role in `user_roles`
- Policy EXISTS for operation (SELECT/INSERT/UPDATE/DELETE)

**Too many rows returned**: Check if:
- Policy logic is correct
- Helper functions return expected values

---

## Related Documentation

- [MULTI_TENANT_GUIDE.md](./MULTI_TENANT_GUIDE.md) - Multi-tenancy architecture
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Role resolution
- [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md) - RLS verification scripts

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team

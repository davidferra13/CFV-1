# RLS Policy Contract

**Document ID**: 023
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the exact RLS policies for every table in ChefFlow V1. This is the authoritative contract for database-level access control. Every policy MUST be documented here and match the implementation in `supabase/migrations/20260213000002_rls_policies.sql`.

---

## Policy Naming Convention

**Format**: `{table}_{role}_{operation}`

**Examples**:
- `events_chef_select`
- `events_client_select`
- `ledger_chef_insert`

**Benefit**: Clear, self-documenting policy names

---

## Events Table Policies

### Schema Reference

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  client_id UUID REFERENCES clients(id),
  title TEXT NOT NULL,
  status event_status NOT NULL DEFAULT 'draft',
  -- ... other columns
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

### Policies

**SELECT (Chef)**:
```sql
CREATE POLICY events_chef_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**SELECT (Client)**:
```sql
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

**INSERT (Chef only)**:
```sql
CREATE POLICY events_chef_insert ON events
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**UPDATE (Chef only)**:
```sql
CREATE POLICY events_chef_update ON events
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  ) WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**DELETE (Chef only, soft delete preferred)**:
```sql
CREATE POLICY events_chef_delete ON events
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

## Ledger Entries Table Policies

### Schema Reference

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  event_id UUID REFERENCES events(id),
  amount INTEGER NOT NULL,
  type ledger_entry_type NOT NULL,
  stripe_event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
```

### Policies

**SELECT (Chef)**:
```sql
CREATE POLICY ledger_chef_select ON ledger_entries
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**SELECT (Client - via event)**:
```sql
CREATE POLICY ledger_client_select ON ledger_entries
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    event_id IN (
      SELECT id FROM events WHERE client_id = get_current_client_id()
    )
  );
```

**INSERT (System only via service role)**:
- No INSERT policy for regular users
- Webhooks use service role key (bypasses RLS)

**UPDATE/DELETE**:
- No UPDATE or DELETE policies (enforced immutable by triggers)

---

## Menus Table Policies

### Schema Reference

```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL,
  description TEXT,
  price_per_person INTEGER NOT NULL
);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
```

### Policies

**SELECT (Chef)**:
```sql
CREATE POLICY menus_chef_select ON menus
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**SELECT (Client - via event assignment)**:
```sql
CREATE POLICY menus_client_select ON menus
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    id IN (
      SELECT menu_id FROM event_menus
      WHERE event_id IN (
        SELECT id FROM events WHERE client_id = get_current_client_id()
      )
    )
  );
```

**INSERT/UPDATE/DELETE (Chef only)**:
```sql
CREATE POLICY menus_chef_insert ON menus
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY menus_chef_update ON menus
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  ) WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY menus_chef_delete ON menus
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

## Clients Table Policies

### Schema Reference

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  auth_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
```

### Policies

**SELECT (Chef - own tenant)**:
```sql
CREATE POLICY clients_chef_select ON clients
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**SELECT (Client - self only)**:
```sql
CREATE POLICY clients_self_select ON clients
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );
```

**INSERT (Chef only)**:
```sql
CREATE POLICY clients_chef_insert ON clients
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**UPDATE (Chef for their clients, Client for self)**:
```sql
CREATE POLICY clients_chef_update ON clients
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY clients_self_update ON clients
  FOR UPDATE USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  ) WITH CHECK (
    id = get_current_client_id() AND
    tenant_id = (SELECT tenant_id FROM clients WHERE id = get_current_client_id())
  );
```

---

## Chefs Table Policies

### Schema Reference

```sql
CREATE TABLE chefs (
  id UUID PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  business_name TEXT NOT NULL,
  email TEXT NOT NULL
);

ALTER TABLE chefs ENABLE ROW LEVEL SECURITY;
```

### Policies

**SELECT (Self only)**:
```sql
CREATE POLICY chefs_self_select ON chefs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM user_roles WHERE chef_id = chefs.id
    )
  );
```

**UPDATE (Self only)**:
```sql
CREATE POLICY chefs_self_update ON chefs
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT auth_user_id FROM user_roles WHERE chef_id = chefs.id
    )
  );
```

**INSERT/DELETE**:
- No policies (created via signup trigger only)

---

## User Roles Table Policies

### Schema Reference

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('chef', 'client')),
  chef_id UUID REFERENCES chefs(id),
  client_id UUID REFERENCES clients(id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

### Policies

**SELECT (Self only)**:
```sql
CREATE POLICY user_roles_self_select ON user_roles
  FOR SELECT USING (
    auth_user_id = auth.uid()
  );
```

**INSERT/UPDATE/DELETE**:
- No policies (managed by system triggers only)

---

## Event Transitions Table Policies

### Schema Reference

```sql
CREATE TABLE event_transitions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  event_id UUID NOT NULL REFERENCES events(id),
  from_status event_status,
  to_status event_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE event_transitions ENABLE ROW LEVEL SECURITY;
```

### Policies

**SELECT (Chef - own tenant)**:
```sql
CREATE POLICY transitions_chef_select ON event_transitions
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**SELECT (Client - via event)**:
```sql
CREATE POLICY transitions_client_select ON event_transitions
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    event_id IN (
      SELECT id FROM events WHERE client_id = get_current_client_id()
    )
  );
```

**INSERT (Implicit via application logic)**:
```sql
CREATE POLICY transitions_chef_insert ON event_transitions
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY transitions_client_insert ON event_transitions
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'client' AND
    event_id IN (
      SELECT id FROM events WHERE client_id = get_current_client_id()
    )
  );
```

**UPDATE/DELETE**:
- No policies (enforced immutable by triggers)

---

## Event Menus Junction Table Policies

### Schema Reference

```sql
CREATE TABLE event_menus (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  event_id UUID NOT NULL REFERENCES events(id),
  menu_id UUID NOT NULL REFERENCES menus(id)
);

ALTER TABLE event_menus ENABLE ROW LEVEL SECURITY;
```

### Policies

**SELECT (Chef)**:
```sql
CREATE POLICY event_menus_chef_select ON event_menus
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**SELECT (Client - via event)**:
```sql
CREATE POLICY event_menus_client_select ON event_menus
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    event_id IN (
      SELECT id FROM events WHERE client_id = get_current_client_id()
    )
  );
```

**INSERT/DELETE (Chef only)**:
```sql
CREATE POLICY event_menus_chef_insert ON event_menus
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY event_menus_chef_delete ON event_menus
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

## Policy Verification Matrix

| Table | SELECT (Chef) | SELECT (Client) | INSERT (Chef) | INSERT (Client) | UPDATE | DELETE |
|-------|--------------|-----------------|---------------|-----------------|--------|--------|
| events | ✅ (tenant) | ✅ (assigned) | ✅ | ❌ | ✅ (chef) | ✅ (chef) |
| ledger_entries | ✅ (tenant) | ✅ (via event) | ❌ (system) | ❌ | ❌ | ❌ |
| menus | ✅ (tenant) | ✅ (via event) | ✅ | ❌ | ✅ (chef) | ✅ (chef) |
| clients | ✅ (tenant) | ✅ (self) | ✅ | ❌ | ✅ (both) | ❌ |
| chefs | ✅ (self) | ❌ | ❌ | ❌ | ✅ (self) | ❌ |
| user_roles | ✅ (self) | ✅ (self) | ❌ | ❌ | ❌ | ❌ |
| event_transitions | ✅ (tenant) | ✅ (via event) | ✅ | ✅ (limited) | ❌ | ❌ |
| event_menus | ✅ (tenant) | ✅ (via event) | ✅ | ❌ | ❌ | ✅ (chef) |

---

## Testing Each Policy

### Test Script Template

```sql
-- Test as Chef A
SET request.jwt.claim.sub = 'chef-a-auth-uuid';

-- Should return Chef A's events only
SELECT COUNT(*) FROM events WHERE tenant_id = 'chef-a-uuid';

-- Should return 0 (Chef A cannot see Chef B's events)
SELECT COUNT(*) FROM events WHERE tenant_id = 'chef-b-uuid';

-- Should succeed
INSERT INTO events (tenant_id, title) VALUES ('chef-a-uuid', 'Test Event');

-- Should fail (wrong tenant_id)
INSERT INTO events (tenant_id, title) VALUES ('chef-b-uuid', 'Hacked Event');
```

---

## References

- **RLS Enforcement Philosophy**: `022-rls-enforcement-philosophy.md`
- **Multi-Tenant Isolation**: `024-multi-tenant-isolation.md`
- **Database Authority Rules**: `027-database-authority-rules.md`
- **Migration Model**: `029-migration-model.md`

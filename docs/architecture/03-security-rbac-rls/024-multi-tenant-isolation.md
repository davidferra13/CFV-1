# Multi-Tenant Isolation

**Document ID**: 024
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the complete multi-tenant isolation model for ChefFlow V1. Every chef is a separate tenant with absolute data isolation enforced at the database level. This document specifies how tenant boundaries are established and enforced.

---

## Tenant Definition

**Tenant**: A single chef and their associated data (events, clients, menus, ledger entries).

**Tenant ID**: `chefs.id` (UUID, primary key of chefs table)

**Scope**: All tenant-owned data MUST reference `tenant_id` foreign key.

---

## Tenant ID Propagation

### Required on All Tenant-Scoped Tables

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  -- other columns
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  -- other columns
);

CREATE TABLE menus (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  -- other columns
);
```

**Rule**: Every table with user data MUST have `tenant_id` column (except `chefs` and `clients`).

---

## Isolation Enforcement Layers

### Layer 1: Database Constraints

**Foreign Key**:
```sql
tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE
```

**Effect**: Invalid tenant_id rejected at insertion

---

### Layer 2: RLS Policies

**Pattern**:
```sql
CREATE POLICY {table}_chef_select ON {table}
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Effect**: Chef A cannot query Chef B's data

---

### Layer 3: Application Logic

**Server-Side Validation**:
```typescript
const user = await getCurrentUser();
await supabase.from('events').insert({
  tenant_id: user.tenantId, // Derived from user, not client input
  // other fields
});
```

**Effect**: Even if RLS bypassed, correct tenant_id inserted

---

## Cross-Tenant Access Prohibition

### Prohibited Patterns

**❌ Direct Tenant ID from Client**:
```typescript
// WRONG: Trusts client-provided tenant_id
const { tenant_id } = await request.json();
await supabase.from('events').insert({ tenant_id });
```

**❌ Query Without Tenant Filter**:
```typescript
// WRONG: Returns all tenants' events (if RLS disabled)
const events = await supabase.from('events').select('*');
```

**✅ Correct Pattern**:
```typescript
const user = await getCurrentUser();
const events = await supabase
  .from('events')
  .select('*')
  .eq('tenant_id', user.tenantId);
```

---

## Client-Tenant Relationship

### Schema

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  -- Clients belong to exactly one tenant (chef)
);
```

**Rule**: Clients CANNOT be shared between tenants.

**Effect**: Client A invited by Chef X cannot access Chef Y's data.

---

## Tenant Data Deletion

### Cascade Deletion

```sql
tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE
```

**Effect**: Deleting chef deletes all tenant data automatically.

**V1 Limitation**: No chef deletion UI (manual via Supabase Studio).

**Post-V1**: Implement chef account deletion flow.

---

## Verification Procedures

### Cross-Tenant Test

**Setup**:
1. Create Chef A and Chef B
2. Chef A creates Event A1
3. Chef B creates Event B1

**Test 1: SELECT Isolation**:
```sql
-- Sign in as Chef A
SET request.jwt.claim.sub = 'chef-a-auth-uuid';

-- Should return 1 (Event A1)
SELECT COUNT(*) FROM events WHERE tenant_id = 'chef-a-uuid';

-- Should return 0 (cannot see Event B1)
SELECT COUNT(*) FROM events WHERE tenant_id = 'chef-b-uuid';
```

**Test 2: INSERT Isolation**:
```sql
-- Chef A attempts to insert with Chef B's tenant_id
INSERT INTO events (tenant_id, title) VALUES ('chef-b-uuid', 'Hacked Event');
-- Expected: Error (RLS WITH CHECK fails)
```

**Test 3: UPDATE Isolation**:
```sql
-- Chef A attempts to change Event A1 to Chef B's tenant
UPDATE events SET tenant_id = 'chef-b-uuid' WHERE id = 'event-a1-uuid';
-- Expected: Error (RLS WITH CHECK fails)
```

---

## References

- **RLS Policy Contract**: `023-rls-policy-contract.md`
- **Database Authority Rules**: `027-database-authority-rules.md`
- **Schema Contract**: `028-schema-contract.md`

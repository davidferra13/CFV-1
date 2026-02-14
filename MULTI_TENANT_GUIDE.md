# Multi-Tenancy Architecture Guide

**Version**: 1.0
**Last Updated**: 2026-02-13

Complete guide to multi-tenant isolation in ChefFlow V1.

---

## Overview

ChefFlow V1 is a **multi-tenant SaaS** where each chef is a separate tenant. Multi-tenant isolation is enforced at the **database layer** via Row Level Security (RLS).

### System Law #1

> **Multi-Tenant Isolation is Database-Enforced**
> - Every table except `chefs` and `clients` MUST have `tenant_id` column
> - RLS policies prevent Chef A from querying Chef B's data
> - NEVER rely on frontend filtering or client-side state

---

## Tenant Model

### Tenant Structure

```
Chef (Tenant)
├── Clients (owned by tenant)
├── Events (scoped to tenant)
├── Menus (scoped to tenant)
├── Ledger Entries (scoped to tenant)
└── Event Transitions (scoped to tenant)
```

### `tenant_id` Column

All tenant-scoped tables have `tenant_id`:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  -- ... other columns
);

CREATE INDEX idx_events_tenant ON events(tenant_id);
```

**Exception**: `chefs` and `clients` tables (they define tenants)

---

## Data Isolation

### RLS Policies

Chef sees only their tenant's data:

```sql
CREATE POLICY events_chef_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

See [RLS_POLICIES.md](./RLS_POLICIES.md) for complete reference.

### Application-Level Checks

Always verify tenant ownership:

```typescript
export async function updateEvent(eventId: string, updates: EventUpdate) {
  const chef = await requireChef()

  // Fetch event
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .single()

  // Verify ownership
  if (event?.tenant_id !== chef.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Proceed with update
  await supabase.from('events').update(updates).eq('id', eventId)
}
```

---

## Client Scoping

Clients belong to a tenant:

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  -- ...
);
```

### Cross-Tenant Prevention

Events can only reference clients in the same tenant:

```sql
ALTER TABLE events
ADD CONSTRAINT fk_client_tenant CHECK (
  (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
);
```

This prevents Chef A from creating events for Chef B's clients.

---

## Testing Multi-Tenancy

### Verification Script

Run `scripts/verify-rls.sql`:

```sql
-- Test: Chef A cannot see Chef B's events
SELECT COUNT(*) FROM events WHERE tenant_id = 'chef-b-id';
-- Expected: 0 rows (RLS blocks)
```

### Manual Test

1. Create Chef A account
2. Create event as Chef A
3. Create Chef B account (different browser)
4. Try to access Chef A's event URL
5. Verify: Empty result or 404

---

## Tenant Context

### Resolving Tenant ID

```typescript
// In server functions
const chef = await getCurrentUser()
const tenantId = chef.tenantId // Chef's ID

// In RLS policies
get_current_tenant_id() -- Returns chef.id
```

### Client Tenant ID

Clients inherit tenant from their chef:

```typescript
const client = await getCurrentUser()
const tenantId = client.tenantId // Client's chef ID

// Query
SELECT tenant_id FROM clients WHERE id = client.entityId
```

---

## Related Documentation

- [RLS_POLICIES.md](./RLS_POLICIES.md) - RLS reference
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Role resolution
- [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md) - Verification scripts

---

**Last Updated**: 2026-02-13

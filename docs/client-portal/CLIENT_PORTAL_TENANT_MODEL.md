# Client Portal Tenant Model

## Document Identity
- **File**: `CLIENT_PORTAL_TENANT_MODEL.md`
- **Category**: Core Identity & Portal Definition (7/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **tenant isolation model** for the Client Portal.

It specifies:
- What a tenant is
- How tenant isolation is enforced
- How clients interact with tenants
- What cross-tenant access is prohibited
- How multi-tenancy impacts data visibility

---

## Tenant Definition

### What is a Tenant?

A **tenant** is a single chef business entity.

| Property | Definition |
|----------|------------|
| **Identifier** | `tenant_id` (UUID) |
| **Maps to** | One entry in `chefs` table |
| **Scope** | All data for a single chef business |
| **Isolation** | Absolute (no cross-tenant data access) |

### Example

If Chef A has `tenant_id = 'aaa-111'` and Chef B has `tenant_id = 'bbb-222'`:
- Client working with Chef A sees only `tenant_id = 'aaa-111'` data
- Client working with Chef B sees only `tenant_id = 'bbb-222'` data
- No overlap, no aggregation, no cross-tenant queries

---

## Tenant Isolation Principles

### Principle 1: One Tenant Per Portal Instance
- Each Client Portal instance is **single-tenant scoped**
- Client sees data for one chef only
- No "switch tenant" functionality in V1

### Principle 2: Tenant ID in Every Table
- All client-accessible tables include `tenant_id` column
- `tenant_id` is **non-nullable**
- `tenant_id` included in RLS filtering

### Principle 3: RLS Enforces Isolation
- All RLS policies filter by `tenant_id`
- No query can bypass tenant filtering
- JOINs preserve tenant isolation

### Principle 4: Middleware Validates Tenant
- Session includes `tenant_id`
- Middleware validates `tenant_id` before rendering
- Unauthorized tenant access → redirect or deny

---

## Tenant-Scoped Tables

### Tables with Tenant ID

All client-accessible tables include `tenant_id`:

| Table | Tenant ID Column | Purpose |
|-------|-----------------|---------|
| `chefs` | `id` (primary key = tenant_id) | Chef profile |
| `clients` | `tenant_id` | Client profiles per tenant |
| `events` | `tenant_id` | Events per tenant |
| `ledger_entries` | `tenant_id` | Financial entries per tenant |
| `menus` | `tenant_id` | Menus per tenant |
| `event_menus` | (via JOIN to `events`) | Menu assignments per event |
| `messages` | `tenant_id` | Messages per tenant |
| `attachments` | `tenant_id` | Attachments per tenant |
| `event_transitions` | `tenant_id` | Lifecycle transitions per tenant |
| `user_roles` | `tenant_id` | Role assignments per tenant |

---

## RLS Tenant Isolation

### Example RLS Policy: Events

```sql
CREATE POLICY "Clients can view own events within tenant"
ON events
FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM user_roles WHERE auth_user_id = auth.uid() LIMIT 1)
  AND client_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client' LIMIT 1)
);
```

### Key Features
- Filters by `tenant_id` from session
- Also filters by `client_id` for client isolation
- No cross-tenant access possible

---

## Tenant Resolution Flow

### 1. Authentication
- User logs in via Supabase Auth
- `auth.uid()` (auth_user_id) established

### 2. Role Resolution
- Middleware queries `user_roles`:
  ```sql
  SELECT role, entity_id, tenant_id
  FROM user_roles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  ```

### 3. Tenant Validation
- Middleware validates `tenant_id` exists
- Session includes `tenant_id` for subsequent queries

### 4. Data Access
- All queries filtered by `tenant_id` from session
- RLS policies enforce tenant isolation

---

## Client-Tenant Relationship

### One Client, One Tenant (V1)

In V1:
- A client profile is **scoped to a single tenant**
- `clients.tenant_id` is immutable after creation
- Client cannot access data from other tenants

### Example

| Client Email | Tenant A | Tenant B |
|-------------|----------|----------|
| `client@example.com` | Has profile with `tenant_id = 'aaa-111'` | Has separate profile with `tenant_id = 'bbb-222'` |

**Important**: These are **two separate client profiles**, not one client accessing two tenants.

---

## Multi-Tenant Client (Out of Scope for V1)

### NOT Supported in V1

Client **cannot**:
- ❌ Switch between tenants (chefs) in a single portal
- ❌ View aggregated data across tenants
- ❌ See "all my bookings" across multiple chefs
- ❌ Access multiple tenant dashboards

### V2 Consideration

Multi-tenant client access is a **V2 feature** requiring:
- Tenant switcher UI
- Cross-tenant aggregation views
- Multi-tenant RLS policies
- Unified client identity across tenants

**V1 is strictly single-tenant.**

---

## Tenant-Scoped Resources

### Storage Paths

Supabase Storage paths are tenant-scoped:

```
{tenant_id}/menus/{menu_id}/menu.pdf
{tenant_id}/messages/{message_id}/attachment.jpg
{tenant_id}/attachments/{attachment_id}/file.pdf
```

### Signed URL Generation

Signed URLs validate tenant path:

```typescript
const { data, error } = await supabase
  .storage
  .from('attachments')
  .createSignedUrl(`${tenant_id}/messages/${message_id}/file.jpg`, 3600);
```

**No cross-tenant path access.**

---

## Tenant Isolation Testing

### Test Scenarios

| Test | Expected Result |
|------|----------------|
| Client A queries events in Tenant A | ✅ Returns events |
| Client A queries events in Tenant B | ❌ Returns empty (RLS denies) |
| Client A tries to access Tenant B signed URL | ❌ Signed URL invalid or access denied |
| Client A queries ledger in Tenant A | ✅ Returns ledger entries |
| Client A queries ledger in Tenant B | ❌ Returns empty (RLS denies) |

### Validation Script

`scripts/verify-rls-strict.sql` validates tenant isolation.

---

## Tenant-Scoped Queries

### Safe Query Pattern

```typescript
// Server action or server component
const { data: events } = await supabase
  .from('events')
  .select('id, event_date, lifecycle_state')
  .eq('tenant_id', session.tenant_id) // Explicit tenant filter
  .eq('client_id', session.client_id); // Explicit client filter
```

### Unsafe Query Pattern (Blocked by RLS)

```typescript
// This will return empty due to RLS, even if tenant_id filter omitted
const { data: events } = await supabase
  .from('events')
  .select('*'); // No tenant_id filter → RLS blocks all rows
```

---

## Tenant Metadata

### Stored in `chefs` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Tenant ID (primary key) |
| `business_name` | TEXT | Chef business name |
| `contact_email` | TEXT | Chef contact email |
| `phone` | TEXT | Chef phone |
| `timezone` | TEXT | Chef timezone |
| `created_at` | TIMESTAMP | Chef account creation |

### Client Visibility

Client **can view**:
- ✅ Chef business name
- ✅ Chef contact email
- ✅ Chef phone

Client **cannot view**:
- ❌ Chef internal settings
- ❌ Chef admin flags
- ❌ Other tenants' chef profiles

---

## Tenant-Scoped Dashboard

### Client Dashboard Scope

Client dashboard shows:
- Events for **this tenant only**
- Loyalty balance for **this tenant only**
- Messages for **this tenant only**

### No Cross-Tenant Aggregation

Dashboard does **NOT** show:
- ❌ Total bookings across all chefs
- ❌ Combined loyalty balance across tenants
- ❌ All messages from all chefs

---

## Tenant Onboarding (Client Perspective)

### How Client Becomes Associated with Tenant

1. **Chef initiates**: Chef creates inquiry or sends invitation
2. **Client receives**: Invitation link includes `tenant_id`
3. **Client signs up**: Account created with `tenant_id` binding
4. **Client profile created**: `clients` record with `tenant_id`
5. **Role assigned**: `user_roles` links `auth_user_id` → `role = 'client'` → `entity_id = client_id` → `tenant_id`

**Result**: Client is permanently bound to this tenant.

---

## Tenant Isolation Edge Cases

### Edge Case 1: Client Email Exists in Multiple Tenants

**Scenario**: `client@example.com` books with Chef A, then books with Chef B.

**Outcome**:
- Two separate `clients` records (one per tenant)
- Two separate `user_roles` records (one per tenant)
- No automatic linking or cross-tenant visibility

**V1 Behavior**: Client sees only the tenant they're currently logged into.

**V2 Consideration**: Unified identity with tenant switcher.

---

### Edge Case 2: Client Tries to Access Another Tenant's Data

**Scenario**: Client A in Tenant A attempts to access event from Tenant B.

**Outcome**:
- RLS policy filters by `tenant_id` from session
- Query returns empty (no error, just no rows)
- Signed URLs for Tenant B attachments are invalid

**Enforcement**: Database-level RLS.

---

## Tenant-Scoped Environment Variables

### Tenant-Specific Configuration (Future)

In V1, single-tenant deployment assumes single `.env.local`.

In V2 multi-tenant:
- Tenant-specific Stripe keys
- Tenant-specific email settings
- Tenant-specific storage buckets

**V1 uses global environment variables per deployment.**

---

## Tenant Isolation Guarantees

The Client Portal guarantees:

✅ No cross-tenant data leakage
✅ RLS enforces tenant filtering on all queries
✅ JOINs preserve tenant isolation
✅ Storage paths are tenant-scoped
✅ Signed URLs validate tenant path
✅ Dashboard aggregates are tenant-scoped
✅ Queries without `tenant_id` filter return empty (RLS blocks)

---

## Tenant Performance Isolation

### Indexing Strategy

All tenant-scoped queries indexed:

```sql
CREATE INDEX idx_events_tenant_client ON events(tenant_id, client_id);
CREATE INDEX idx_ledger_tenant_event ON ledger_entries(tenant_id, event_id);
CREATE INDEX idx_messages_tenant_event ON messages(tenant_id, event_id);
```

### Performance Guarantee

One tenant's query load **cannot degrade** another tenant's performance.

---

## Related Documents

- [CLIENT_PORTAL_OVERVIEW.md](./CLIENT_PORTAL_OVERVIEW.md)
- [CLIENT_PORTAL_BOUNDARIES.md](./CLIENT_PORTAL_BOUNDARIES.md)
- [CLIENT_SECURITY_OVERVIEW.md](./CLIENT_SECURITY_OVERVIEW.md)
- [CLIENT_RLS_STRATEGY.md](./CLIENT_RLS_STRATEGY.md)
- [CLIENT_TENANT_ISOLATION_RULES.md](./CLIENT_TENANT_ISOLATION_RULES.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13

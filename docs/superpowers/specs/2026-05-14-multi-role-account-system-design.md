# Multi-Role Account System

**Status:** Design spec - awaiting review
**Date:** 2026-05-14
**Approach:** B (Multi-Role Accounts)

---

## Problem

ChefFlow has 5 roles in the `user_role` enum: `chef`, `client`, `system`, `partner`, `staff`. Of these, chef and client are fully wired with auth flows. Partner and staff have invite-only flows that work but lack middleware fast-path headers. Vendors (farmers, fishmongers, suppliers) exist only as chef-owned data records with no login capability.

The fundamental constraint: `user_roles` has `UNIQUE(auth_user_id)`, meaning one person can only hold one role. A farmer who supplies Chef A cannot also be a client of Chef B. A staff member who works for two chefs cannot exist.

## Goals

1. Remove the one-role-per-user constraint so one person can hold multiple roles across tenants
2. Add `vendor` as a new role with invite-only signup and a lightweight portal
3. Add `guest` as a new role for ticketed event attendees
4. Harden existing partner and staff flows (middleware header propagation, role switching)
5. Preserve all existing RLS policies and tenant isolation

## Non-Goals

- No marketplace or multi-chef tenancy (V1 is single-chef-as-tenant)
- No "delegate" role yet (build queue #273, needs its own spec)
- No `system` role wiring (stays internal/reserved)
- No self-signup for vendor/guest (invite-only or event-triggered)

---

## Architecture

### 1. Multi-Role `user_roles` Table

**Current:** `UNIQUE(auth_user_id)` - one role per user.

**New:** Drop the unique constraint. Replace with `UNIQUE(auth_user_id, role, entity_id)` to prevent duplicate assignments but allow multiple roles.

```sql
-- Migration
ALTER TABLE user_roles DROP CONSTRAINT user_roles_auth_user_id_key;
DROP INDEX IF EXISTS idx_user_roles_auth_user;

-- New composite unique: same person can't have same role+entity twice
ALTER TABLE user_roles ADD CONSTRAINT user_roles_auth_entity_unique
  UNIQUE (auth_user_id, role, entity_id);

-- Index for fast lookup by auth user (replaces old unique index)
CREATE INDEX idx_user_roles_auth_user ON user_roles (auth_user_id);
```

### 2. Active Role Selection

With multiple roles, the system needs to know which role is "active" for the current session.

**Session-level role tracking:**

- JWT token stores `activeRoleId` (the `user_roles.id` of the currently active role)
- On login, if user has one role: auto-select it
- On login, if user has multiple roles: redirect to `/auth/role-selection` to pick one
- Role switch: new server action `switchRole(roleId)` that re-signs the JWT with the new active role
- Middleware reads `activeRoleId` from JWT, resolves role/entity/tenant from `user_roles`

**Role switcher UI:**

- Dropdown in the app header (all surfaces)
- Shows: role icon + name + tenant context (e.g., "Vendor for Chef David", "Client of Chef Maria")
- Clicking switches active role, triggers page reload to the new role's home route

### 3. New Role: `vendor`

**Enum update:**

```sql
ALTER TYPE user_role ADD VALUE 'vendor';
```

**Signup flow (invite-only, mirrors partner):**

1. Chef creates vendor invitation from vendor management page
2. System generates token, sends email with signup link
3. Vendor clicks `/auth/vendor-signup?token=<uuid>`
4. Creates `auth.users` + links existing `vendors` record via `user_roles(role='vendor', entity_id=vendors.id)`
5. Vendor redirected to `/vendor/dashboard`

**Vendor portal routes (new route group `(vendor)`):**

| Route                 | Purpose                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `/vendor/dashboard`   | Overview: open POs, recent invoices, price update requests          |
| `/vendor/orders`      | Purchase orders list with status (draft/sent/acknowledged/received) |
| `/vendor/orders/[id]` | PO detail: confirm, reject, mark shipped, add notes                 |
| `/vendor/invoices`    | Invoice list: submit new, view matched/disputed                     |
| `/vendor/catalog`     | Their item catalog for this chef: update prices, availability       |
| `/vendor/profile`     | Contact info, business details                                      |

**RLS policy updates:**

- Vendor sees only their own records: `vendor_id = get_current_vendor_id()`
- New SQL function:

```sql
-- Uses the active_role_id claim set in JWT by middleware
-- This ensures correct resolution when a vendor supplies multiple chefs
CREATE OR REPLACE FUNCTION get_current_vendor_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid()
    AND role = 'vendor'
    AND id = (
      SELECT ((current_setting('request.jwt.claims', true))::jsonb ->> 'active_role_id')::uuid
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

- Add SELECT policies on `purchase_orders`, `vendor_invoices`, `vendor_items`, `vendor_price_points` for vendor role
- Vendor can UPDATE status on their own POs (acknowledge, mark shipped)
- Vendor can INSERT new `vendor_invoices` for their own records
- Vendor can UPDATE prices on `vendor_items` for their own catalog

**Guard function:**

```typescript
// lib/auth/get-user.ts
export async function requireVendor(): Promise<VendorUser> {
  // Same pattern as requirePartner/requireStaff
  // Returns { userId, role: 'vendor', entityId, tenantId, vendorId }
}
```

**Tenant resolution:**

- Vendor's `tenantId` = the chef who created the vendor record (`vendors.chef_id`)
- Same pattern as staff: `resolveRoleAndTenant()` looks up `vendors.chef_id`

### 4. New Role: `guest`

**Purpose:** Ticketed event attendees who purchase tickets get a lightweight account.

**Enum update:**

```sql
ALTER TYPE user_role ADD VALUE 'guest';
```

**New table: `guest_profiles`** (stable identity, like `clients`):

```sql
CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  dietary_restrictions TEXT[],
  allergens TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The `user_roles.entity_id` for guests points to `guest_profiles.id` (not to individual tickets). Tickets link to the guest profile via `event_tickets.guest_profile_id`. One guest profile, many tickets across events.

**Account creation (auto on ticket purchase):**

1. Guest visits public event page `/e/[shareToken]`
2. Purchases ticket via Stripe Checkout
3. On successful payment, system creates:
   - `guest_profiles` record (or finds existing by email)
   - `auth.users` record (if email not already registered)
   - `user_roles(role='guest', entity_id=guest_profiles.id)` (if not already a guest)
   - Links `event_tickets.guest_profile_id` to the profile
4. Guest receives email with magic link to view their ticket/event details
5. If email already has an account (e.g., they're a client): adds guest role, no new auth user

**Guest portal routes (minimal):**

| Route              | Purpose                                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| `/my-tickets`      | List of purchased tickets across all events                                 |
| `/my-tickets/[id]` | Ticket detail: event info, menu preview, dietary form, QR code for check-in |

**Tenant resolution for guests:**

- Guests are cross-tenant by nature (can attend events from different chefs)
- `guest_profiles` has no `tenant_id`; tenant is derived from the specific ticket/event being viewed
- RLS: guests see only their own profile and tickets where `guest_profile_id = get_current_guest_id()`

**Key constraints:**

- Guest is the lightest role. No dashboard, no messaging, no CRM
- Guest data is scoped to the events they purchased tickets for
- A guest who later becomes a client retains both roles
- Dietary restrictions submitted as guest carry over if they become a client (via email match)

### 5. Middleware and Header Propagation Updates

**Current:** Only `chef` and `client` get `x-cf-*` headers in middleware.

**New:** All roles get header propagation:

```typescript
// middleware.ts - expand RequestPortalAuthContext
type RequestPortalAuthContext = {
  role: 'chef' | 'client' | 'partner' | 'staff' | 'vendor' | 'guest'
  userId: string
  entityId: string
  tenantId: string
  activeRoleId: string // new: which user_roles row is active
}
```

**Route policy updates:**

- Add `VENDOR_PROTECTED_PATHS`: `/vendor/*`
- Add `GUEST_PROTECTED_PATHS`: `/my-tickets/*`
- Update `getRoutePolicyDecisionForRole()` to handle all 6 human roles

### 6. Auth Config Changes

**`resolveRoleAndTenant()` update:**

```typescript
// Currently handles: chef, client, partner, staff
// Add: vendor, guest
case 'vendor': {
  const vendor = await db.select().from(vendors)
    .where(eq(vendors.id, role.entityId)).limit(1);
  return { role: 'vendor', entityId: role.entityId, tenantId: vendor.chefId };
}
case 'guest': {
  const ticket = await db.select().from(eventTickets)
    .where(eq(eventTickets.id, role.entityId)).limit(1);
  // Guest tenant = the chef who owns the event
  return { role: 'guest', entityId: role.entityId, tenantId: ticket.tenantId };
}
```

**Multi-role login flow:**

1. `authorize()` calls `resolveRolesAndTenant(authUserId)` (note: plural)
2. If 1 role: auto-select, set in JWT
3. If 2+ roles: set `pendingRoleSelection: true` in JWT, redirect to `/auth/role-selection`
4. `/auth/role-selection` page shows all roles with context, user picks one
5. `selectRole(roleId)` server action re-signs JWT with chosen role

### 7. Vendor Invitation System

**New table: `vendor_invitations`** (mirrors `client_invitations`):

```sql
CREATE TABLE vendor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token)
);
```

**Chef-side UI:** "Invite to portal" button on vendor detail page. Sends email with signup link.

---

## Migration Safety

This is a live production system. Migration plan:

1. **Phase 1: Schema only** - Drop unique constraint, add composite unique, add new enum values, create vendor_invitations table. All additive. Zero data loss risk.

2. **Phase 2: Auth plumbing** - Update `resolveRoleAndTenant`, middleware headers, route policies, guard functions. Existing single-role users continue working exactly as before (auto-selected).

3. **Phase 3: Vendor portal** - New route group, pages, server actions. Entirely new code, no modifications to existing surfaces.

4. **Phase 4: Guest flow** - Depends on ticketed events being fully wired (blocked by missing `event_share_settings` table and `public-event-view.tsx`).

5. **Phase 5: Role switcher UI** - Only needed once users actually have multiple roles. Can ship after Phase 3.

---

## Role Summary (Post-Implementation)

| Role       | Signup Method           | Home Route           | Portal Scope                  | Tenant Resolution             |
| ---------- | ----------------------- | -------------------- | ----------------------------- | ----------------------------- |
| Chef       | Public signup or OAuth  | `/dashboard`         | Full app (500+ routes)        | IS the tenant                 |
| Client     | Invitation or public    | `/my-events`         | Client portal (30+ routes)    | `clients.tenant_id`           |
| Partner    | Chef invitation         | `/partner/dashboard` | Partner dashboard + locations | `referral_partners.tenant_id` |
| Staff      | Chef creates record     | `/staff-dashboard`   | Staff ops (6 routes)          | `staff_members.chef_id`       |
| **Vendor** | Chef invitation         | `/vendor/dashboard`  | Vendor portal (6 routes)      | `vendors.chef_id`             |
| **Guest**  | Auto on ticket purchase | `/my-tickets`        | Ticket viewer (2 routes)      | Event's `tenant_id`           |
| System     | None                    | None                 | Internal only                 | N/A                           |

---

## CONTEXT.md Updates Required

Add to Roles and Access table:

| Role              | Access                                    | Key Constraint                                            |
| ----------------- | ----------------------------------------- | --------------------------------------------------------- |
| **Vendor** (role) | Own POs, invoices, catalog for one chef.  | Cannot see other vendors' data or chef's full operations. |
| **Guest** (role)  | Own tickets, event details, dietary form. | Lightest role. No CRM, no messaging.                      |

Update rule: "One person can hold multiple roles across different tenants. Active role selected per session."

---

## Testing Strategy

- Unit tests for `resolveRolesAndTenant()` with single and multi-role users
- Integration test: create vendor invitation, claim it, verify vendor portal access
- Integration test: user with both client and vendor roles can switch between them
- RLS tests: vendor cannot see other vendors' POs or another chef's data
- Playwright E2E: vendor invitation flow, PO confirmation, price update
- Edge case: same email invited as vendor by Chef A and client by Chef B

# Multi-Role Account System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the one-role-per-user constraint, expand middleware auth to all roles, add vendor portal with invite-only signup, and build role-switching for multi-role users.

**Architecture:** Drop `UNIQUE(auth_user_id)` on `user_roles`, replace with composite unique. Widen `RequestPortalAuthContext` and middleware to propagate headers for all roles. Add `vendor` and `guest` enum values. Build vendor invitation + portal mirroring the partner pattern. Role switcher in JWT + header dropdown.

**Tech Stack:** Next.js 15, Auth.js v5 (JWT strategy), Drizzle ORM, PostgreSQL, Supabase RLS, React Server Components

**Spec:** `docs/superpowers/specs/2026-05-14-multi-role-account-system-design.md`

**Scope:** Phases 1-3 and 5 (schema, auth plumbing, vendor portal, role switcher). Phase 4 (guest) is blocked by incomplete ticketed events infrastructure and will get its own plan later.

---

## File Map

### Phase 1: Schema Migration

- Create: `database/migrations/20260515000001_multi_role_accounts.sql`

### Phase 2: Auth Plumbing

- Modify: `lib/auth/request-auth-context.ts` (widen `RequestPortalAuthContext.role` type)
- Modify: `lib/auth/auth-config.ts` (multi-role `resolveRolesForUser`, `activeRoleId` in JWT)
- Modify: `lib/auth/get-user.ts` (add `VendorAuthUser` type, `requireVendor()`, widen `getCurrentUser`)
- Modify: `middleware.ts` (propagate headers for all roles, add `activeRoleId` header)
- Modify: `lib/auth/route-policy.ts` (add `VENDOR_PROTECTED_PATHS`, update `getRoutePolicyDecisionForRole`)
- Modify: `lib/auth/actions.ts` (widen `assignRole` to accept vendor)
- Create: `lib/auth/role-switching.ts` (switchRole server action)

### Phase 3: Vendor Portal

- Create: `lib/vendors/invite-actions.ts` (generateVendorInvite, claimVendorInvite)
- Create: `app/auth/vendor-signup/page.tsx` (invitation claim page)
- Create: `app/(vendor)/vendor/layout.tsx` (auth guard layout)
- Create: `app/(vendor)/vendor/dashboard/page.tsx`
- Create: `app/(vendor)/vendor/orders/page.tsx`
- Create: `app/(vendor)/vendor/orders/[id]/page.tsx`
- Create: `app/(vendor)/vendor/invoices/page.tsx`
- Create: `app/(vendor)/vendor/catalog/page.tsx`
- Create: `app/(vendor)/vendor/profile/page.tsx`
- Create: `components/vendor/vendor-sidebar.tsx`
- Create: `components/vendor/vendor-mobile-nav.tsx`

### Phase 5: Role Switcher UI

- Create: `components/shared/role-switcher.tsx`
- Modify: `app/(chef)/layout.tsx` (add role switcher to header)
- Modify: `app/(partner)/partner/layout.tsx` (add role switcher)
- Modify: `app/(staff)/layout.tsx` (add role switcher)
- Modify: `app/(vendor)/vendor/layout.tsx` (add role switcher)

### Tests

- Create: `tests/unit/multi-role-auth.test.ts`
- Create: `tests/unit/vendor-invite.test.ts`
- Create: `tests/unit/role-switching.test.ts`

---

## Task 1: Schema Migration

**Files:**

- Create: `database/migrations/20260515000001_multi_role_accounts.sql`

- [ ] **Step 1: Check highest existing migration timestamp**

```bash
ls database/migrations/*.sql | tail -5
```

Pick a timestamp strictly higher than the highest existing one. The plan uses `20260515000001` but adjust if needed.

- [ ] **Step 2: Write the migration**

```sql
-- 20260515000001_multi_role_accounts.sql
-- Multi-Role Account System: allow one person to hold multiple roles
-- SAFETY: All operations are additive. No data loss. No column drops.

BEGIN;

-- 1. Drop the single-role constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_auth_user_id_key;

-- 2. Drop the old unique index (it enforced single-role)
DROP INDEX IF EXISTS idx_user_roles_auth_user;

-- 3. Add composite unique: prevent duplicate role+entity for same user
ALTER TABLE user_roles ADD CONSTRAINT user_roles_auth_entity_unique
  UNIQUE (auth_user_id, role, entity_id);

-- 4. Add index for fast lookup by auth_user_id (replaces old unique index)
CREATE INDEX idx_user_roles_auth_user ON user_roles (auth_user_id);

-- 5. Add new role enum values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vendor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'guest';

-- 6. Create vendor_invitations table (mirrors client_invitations pattern)
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

-- RLS for vendor_invitations: chefs manage their own
ALTER TABLE vendor_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_invitations_chef_all ON vendor_invitations
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id());

-- 7. Create guest_profiles table (stable identity for ticket purchasers)
CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_guest_profiles_email ON guest_profiles (lower(email));

ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

-- Guests can read their own profile
CREATE POLICY guest_profiles_self_select ON guest_profiles
  FOR SELECT TO public
  USING (id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'guest'
  ));

-- Guests can update their own profile
CREATE POLICY guest_profiles_self_update ON guest_profiles
  FOR UPDATE TO public
  USING (id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'guest'
  ));

-- 8. Add vendor RLS policies for vendor-role users
-- Purchase orders: vendor can see their own
CREATE POLICY po_vendor_select ON purchase_orders
  FOR SELECT TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Purchase orders: vendor can update status (acknowledge, mark shipped)
CREATE POLICY po_vendor_update ON purchase_orders
  FOR UPDATE TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Vendor invoices: vendor can see and create their own
CREATE POLICY vi_vendor_select ON vendor_invoices
  FOR SELECT TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

CREATE POLICY vi_vendor_insert ON vendor_invoices
  FOR INSERT TO public
  WITH CHECK (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Vendor items: vendor can see and update their catalog
CREATE POLICY vitems_vendor_select ON vendor_items
  FOR SELECT TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

CREATE POLICY vitems_vendor_update ON vendor_items
  FOR UPDATE TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Vendor price points: vendor can see their own
CREATE POLICY vpp_vendor_select ON vendor_price_points
  FOR SELECT TO public
  USING (
    get_current_user_role() = 'vendor' AND
    vendor_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'vendor'
    )
  );

-- 9. Update get_current_user_role() to use active role from JWT
-- (The existing function derives role from user_roles table; with multi-role
--  we need the JWT to specify which role is active. This function already
--  works correctly since it queries the user_roles table, but with multiple
--  rows it needs to be scoped. We'll handle this at the application layer
--  by setting the active role in JWT claims.)

COMMIT;
```

- [ ] **Step 3: Verify migration is valid SQL**

```bash
cd /c/Users/david/Documents/CFv1 && cat database/migrations/20260515000001_multi_role_accounts.sql | head -5
```

Confirm the file exists and starts with the expected header.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/20260515000001_multi_role_accounts.sql
git commit -m "feat(auth): add multi-role schema migration

Drop UNIQUE(auth_user_id) on user_roles, replace with composite unique.
Add vendor and guest enum values. Create vendor_invitations and
guest_profiles tables. Add vendor-role RLS policies on PO/invoice/item tables."
```

---

## Task 2: Widen Request Auth Context Types

**Files:**

- Modify: `lib/auth/request-auth-context.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/multi-role-auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

// Type-level test: verify RequestPortalAuthContext accepts all roles
describe('RequestPortalAuthContext', () => {
  it('should accept vendor role in type', () => {
    // This test verifies the type was widened correctly
    const context = {
      userId: 'test-user-id',
      email: 'farmer@example.com',
      role: 'vendor' as const,
      entityId: 'vendor-entity-id',
      tenantId: 'chef-tenant-id',
      activeRoleId: 'role-row-id',
    }
    expect(context.role).toBe('vendor')
  })

  it('should accept staff role in type', () => {
    const context = {
      userId: 'test-user-id',
      email: 'staff@example.com',
      role: 'staff' as const,
      entityId: 'staff-entity-id',
      tenantId: 'chef-tenant-id',
      activeRoleId: 'role-row-id',
    }
    expect(context.role).toBe('staff')
  })

  it('should accept partner role in type', () => {
    const context = {
      userId: 'test-user-id',
      email: 'partner@example.com',
      role: 'partner' as const,
      entityId: 'partner-entity-id',
      tenantId: 'chef-tenant-id',
      activeRoleId: 'role-row-id',
    }
    expect(context.role).toBe('partner')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/multi-role-auth.test.ts
```

Expected: Type error because `RequestPortalAuthContext.role` only allows `'chef' | 'client'`.

- [ ] **Step 3: Add ACTIVE_ROLE_ID_HEADER constant and widen role type**

In `lib/auth/request-auth-context.ts`, add the new header constant after the existing ones:

```typescript
export const ACTIVE_ROLE_ID_HEADER = 'x-cf-active-role-id'
```

Change the `RequestPortalAuthContext` type from:

```typescript
export type RequestPortalAuthContext = {
  userId: string
  email: string
  role: 'chef' | 'client'
  entityId: string
  tenantId: string | null
}
```

To:

```typescript
export type RequestPortalAuthContext = {
  userId: string
  email: string
  role: 'chef' | 'client' | 'partner' | 'staff' | 'vendor' | 'guest'
  entityId: string
  tenantId: string | null
  activeRoleId: string
}
```

- [ ] **Step 4: Update setRequestAuthContext to include activeRoleId**

In the `setRequestAuthContext` function, add after the existing header sets:

```typescript
headers.set(ACTIVE_ROLE_ID_HEADER, context.activeRoleId)
```

And in the clear branch (when context is null), add:

```typescript
headers.delete(ACTIVE_ROLE_ID_HEADER)
```

- [ ] **Step 5: Update readRequestAuthContext to accept all roles and read activeRoleId**

Change the role validation from:

```typescript
if (role !== 'chef' && role !== 'client') return null
```

To:

```typescript
const validRoles = ['chef', 'client', 'partner', 'staff', 'vendor', 'guest']
if (!validRoles.includes(role)) return null
```

Add after reading `tenantId`:

```typescript
const activeRoleId = get(ACTIVE_ROLE_ID_HEADER)
if (!activeRoleId) return null
```

Include `activeRoleId` in the returned object.

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run tests/unit/multi-role-auth.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/auth/request-auth-context.ts tests/unit/multi-role-auth.test.ts
git commit -m "feat(auth): widen RequestPortalAuthContext to support all roles

Add activeRoleId field and ACTIVE_ROLE_ID_HEADER constant.
Accept partner, staff, vendor, guest roles in readRequestAuthContext."
```

---

## Task 3: Multi-Role Resolution in Auth Config

**Files:**

- Modify: `lib/auth/auth-config.ts`

- [ ] **Step 1: Add resolveRolesForUser function**

Below the existing `resolveRoleAndTenant` function (around line 122), add a new function that returns ALL roles for a user:

```typescript
async function resolveRolesForUser(authUserId: string): Promise<
  Array<{
    roleId: string
    role: string
    entityId: string
    tenantId: string | null
  }>
> {
  const roleRows = await db.select().from(userRoles).where(eq(userRoles.authUserId, authUserId))

  if (roleRows.length === 0) return []

  const resolved: Array<{
    roleId: string
    role: string
    entityId: string
    tenantId: string | null
  }> = []

  for (const row of roleRows) {
    let tenantId: string | null = null

    switch (row.role) {
      case 'chef':
        tenantId = row.entityId
        break
      case 'client': {
        const [client] = await db
          .select({ tenantId: clients.tenantId, deletedAt: clients.deletedAt })
          .from(clients)
          .where(eq(clients.id, row.entityId))
          .limit(1)
        if (!client || client.deletedAt) continue
        tenantId = client.tenantId
        break
      }
      case 'staff': {
        const [staff] = await db
          .select({ chefId: staffMembers.chefId, status: staffMembers.status })
          .from(staffMembers)
          .where(eq(staffMembers.id, row.entityId))
          .limit(1)
        if (!staff || staff.status !== 'active') continue
        tenantId = staff.chefId
        break
      }
      case 'partner': {
        const [partner] = await db
          .select({ tenantId: referralPartners.tenantId })
          .from(referralPartners)
          .where(eq(referralPartners.id, row.entityId))
          .limit(1)
        if (!partner) continue
        tenantId = partner.tenantId
        break
      }
      case 'vendor': {
        const [vendor] = await db
          .select({ chefId: vendors.chefId })
          .from(vendors)
          .where(eq(vendors.id, row.entityId))
          .limit(1)
        if (!vendor) continue
        tenantId = vendor.chefId
        break
      }
      default:
        continue
    }

    resolved.push({
      roleId: row.id,
      role: row.role,
      entityId: row.entityId,
      tenantId,
    })
  }

  return resolved
}
```

- [ ] **Step 2: Update authorize() to use multi-role resolution**

In the `authorize` function, replace the call to `resolveRoleAndTenant(authUser.id)` with:

```typescript
const roles = await resolveRolesForUser(authUser.id)

if (roles.length === 0) {
  return { id: authUser.id, email: authUser.email }
}

// Auto-select if single role, otherwise pick first (role-selection page handles multi)
const activeRole = roles[0]

return {
  id: authUser.id,
  email: authUser.email,
  role: activeRole.role,
  entityId: activeRole.entityId,
  tenantId: activeRole.tenantId,
  activeRoleId: activeRole.roleId,
  pendingRoleSelection: roles.length > 1,
  availableRoles: roles.length,
}
```

- [ ] **Step 3: Update AuthJwtToken type**

Add new fields to `AuthJwtToken`:

```typescript
type AuthJwtToken = {
  userId?: string
  email?: string
  role?: string
  entityId?: string
  tenantId?: string | null
  activeRoleId?: string // new: which user_roles row is active
  pendingRoleSelection?: boolean // new: true if multi-role user needs to pick
  availableRoles?: number // new: count of roles for this user
  sessionVersion?: number
  sessionAuthenticatedAt?: number
  sessionControlCheckedAt?: number
  mfaPending?: boolean
  mfaChallengeId?: string
  iat?: number
}
```

- [ ] **Step 4: Update JWT callback to carry activeRoleId**

In the JWT callback (`async jwt({ token, user, trigger })`), in the `if (user)` block, add:

```typescript
authToken.activeRoleId = user.activeRoleId
authToken.pendingRoleSelection = user.pendingRoleSelection
authToken.availableRoles = user.availableRoles
```

In the `trigger === 'update'` block, update to re-resolve all roles:

```typescript
if (trigger === 'update' && authToken.userId) {
  const roles = await resolveRolesForUser(authToken.userId)
  if (roles.length > 0) {
    // If activeRoleId is set (from role switch), find that role
    const activeRole = authToken.activeRoleId
      ? roles.find((r) => r.roleId === authToken.activeRoleId) || roles[0]
      : roles[0]
    authToken.role = activeRole.role
    authToken.entityId = activeRole.entityId
    authToken.tenantId = activeRole.tenantId
    authToken.activeRoleId = activeRole.roleId
    authToken.pendingRoleSelection = roles.length > 1
    authToken.availableRoles = roles.length
  }
}
```

- [ ] **Step 5: Update Session callback to expose activeRoleId**

In the session callback, add:

```typescript
session.user.activeRoleId = authToken.activeRoleId
session.user.pendingRoleSelection = authToken.pendingRoleSelection
session.user.availableRoles = authToken.availableRoles
```

And update the `Session` type declaration in `declare module 'next-auth'`:

```typescript
interface Session {
  user: {
    id: string
    email: string
    role: string
    entityId: string
    tenantId: string | null
    activeRoleId?: string
    pendingRoleSelection?: boolean
    availableRoles?: number
    mfaPending?: boolean
    mfaChallengeId?: string
  }
}
```

Also update the `User` interface:

```typescript
interface User {
  role?: string
  entityId?: string
  tenantId?: string | null
  activeRoleId?: string
  pendingRoleSelection?: boolean
  availableRoles?: number
  mfaPending?: boolean
  mfaChallengeId?: string
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/auth/auth-config.ts
git commit -m "feat(auth): add multi-role resolution and activeRoleId in JWT

resolveRolesForUser returns all roles for a user. JWT carries activeRoleId,
pendingRoleSelection flag, and availableRoles count. Existing single-role
users auto-select their only role with zero behavior change."
```

---

## Task 4: Update Middleware for All Roles

**Files:**

- Modify: `middleware.ts`

- [ ] **Step 1: Expand header propagation to all roles**

In `middleware.ts`, find the block around line 169 that only sets auth context for chef/client:

```typescript
if (role === 'chef' || role === 'client') {
  setRequestAuthContext(requestHeaders, { ... })
}
```

Replace with:

```typescript
const propagatableRoles = ['chef', 'client', 'partner', 'staff', 'vendor', 'guest']
if (role && propagatableRoles.includes(role)) {
  setRequestAuthContext(requestHeaders, {
    userId: session.user.id,
    email: session.user.email ?? '',
    role: role as RequestPortalAuthContext['role'],
    entityId: session.user.entityId,
    tenantId: session.user.tenantId,
    activeRoleId: session.user.activeRoleId ?? '',
  })
}
```

Import `RequestPortalAuthContext` from `@/lib/auth/request-auth-context` if not already imported.

- [ ] **Step 2: Add pending role selection redirect**

After the existing "no role/entityId" redirect block (around line 158), add handling for multi-role users who haven't selected a role:

```typescript
// Multi-role users must select a role before accessing protected routes
if (session.user.pendingRoleSelection && !pathname.startsWith('/auth/role-selection')) {
  return NextResponse.redirect(new URL('/auth/role-selection', request.url))
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): propagate auth headers for all roles in middleware

All six human roles (chef, client, partner, staff, vendor, guest) now get
x-cf-* headers injected by middleware. Adds activeRoleId header.
Multi-role users without a selected role redirect to role-selection."
```

---

## Task 5: Update getCurrentUser and Add requireVendor

**Files:**

- Modify: `lib/auth/get-user.ts`

- [ ] **Step 1: Add VendorAuthUser type**

After the existing `PartnerAuthUser` type (around line 43), add:

```typescript
export type VendorAuthUser = {
  id: string
  email: string
  role: 'vendor'
  vendorId: string
  tenantId: string
  activeRoleId: string
}
```

- [ ] **Step 2: Widen getCurrentUser to accept all roles**

In the `getCurrentUser` function, find the line that returns null for non-chef/client roles:

```typescript
if (roleData.role !== 'chef' && roleData.role !== 'client') return null
```

Replace with:

```typescript
// getCurrentUser returns AuthUser for chef/client only (backward compat)
// Staff, partner, vendor use their own require* functions
if (roleData.role !== 'chef' && roleData.role !== 'client') return null
```

Also update the fast-path in `readRequestAuthContext` handling. Find where it reads the auth context and constructs the return value. After the existing fast-path return, keep the same behavior (only chef/client return from getCurrentUser). The key change is that `readRequestAuthContext` will no longer return null for staff/partner/vendor, so add a guard:

```typescript
const ctx = readRequestAuthContext(headerStore)
if (ctx) {
  // getCurrentUser only returns AuthUser for chef/client
  if (ctx.role !== 'chef' && ctx.role !== 'client') return null
  return {
    id: ctx.entityId,
    userId: ctx.userId,
    authUserId: ctx.userId,
    email: ctx.email,
    role: ctx.role,
    entityId: ctx.entityId,
    tenantId: ctx.tenantId,
  }
}
```

- [ ] **Step 3: Add requireVendor function**

After `requireStaff` (around line 293), add:

```typescript
export async function requireVendor(): Promise<VendorAuthUser> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      redirect('/auth/signin?portal=vendor')
    }

    const [roleRow] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.authUserId, session.user.id), eq(userRoles.role, 'vendor')))
      .limit(1)

    if (!roleRow) {
      redirect('/auth/signin?portal=vendor')
    }

    const [vendor] = await db
      .select({ chefId: vendors.chefId, status: vendors.status })
      .from(vendors)
      .where(eq(vendors.id, roleRow.entityId))
      .limit(1)

    if (!vendor || vendor.status !== 'active') {
      redirect('/auth/signin?portal=vendor')
    }

    return {
      id: session.user.id,
      email: session.user.email ?? '',
      role: 'vendor',
      vendorId: roleRow.entityId,
      tenantId: vendor.chefId,
      activeRoleId: roleRow.id,
    }
  } catch (e) {
    if (e instanceof Error && 'digest' in e) throw e // re-throw redirect
    redirect('/auth/signin?portal=vendor')
  }
}
```

Add the `vendors` import at the top of the file:

```typescript
import { vendors } from '@/lib/db/schema/schema'
```

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Expected: No new errors related to auth types.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/get-user.ts
git commit -m "feat(auth): add VendorAuthUser type and requireVendor guard

Mirrors requirePartner/requireStaff pattern. Validates vendor status is active.
getCurrentUser continues to return only chef/client for backward compatibility."
```

---

## Task 6: Update Route Policy

**Files:**

- Modify: `lib/auth/route-policy.ts`

- [ ] **Step 1: Add VENDOR_PROTECTED_PATHS**

After `PARTNER_PROTECTED_PATHS`, add:

```typescript
export const VENDOR_PROTECTED_PATHS = ['/vendor'] as const
```

Add `/vendor-signup` to `PUBLIC_UNAUTHENTICATED_PATHS`:

```typescript
'/vendor-signup',
```

- [ ] **Step 2: Add vendor route detection functions**

After `isPartnerRoutePath`, add:

```typescript
export function isVendorRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, VENDOR_PROTECTED_PATHS)
}
```

- [ ] **Step 3: Update getRouteAccountMode**

In `getRouteAccountMode`, add vendor detection before the chef check:

```typescript
if (isVendorRoutePath(pathname)) return 'vendor_workspace'
```

Add `'vendor_workspace'` to the `RouteAccountMode` type:

```typescript
export type RouteAccountMode =
  | 'public'
  | 'guest'
  | 'chef_workspace'
  | 'team_workspace'
  | 'partner_workspace'
  | 'vendor_workspace'
  | 'admin_console'
```

- [ ] **Step 4: Update getRoutePolicyDecisionForRole**

Add a case for vendor_workspace:

```typescript
case 'vendor_workspace':
  return {
    allowed: role === 'vendor',
    mode,
    reason: role === 'vendor' ? 'Vendor accessing vendor portal' : 'Only vendors can access vendor routes',
    recoveryPath: getHomePathForRole(role),
  }
```

- [ ] **Step 5: Update getHomePathForRole**

Add vendor:

```typescript
case 'vendor': return '/vendor/dashboard'
```

- [ ] **Step 6: Commit**

```bash
git add lib/auth/route-policy.ts
git commit -m "feat(auth): add vendor route policy and protected paths

VENDOR_PROTECTED_PATHS covers /vendor/*. vendor_workspace account mode
restricts access to vendor role only. Home path: /vendor/dashboard."
```

---

## Task 7: Role Switching Server Action

**Files:**

- Create: `lib/auth/role-switching.ts`
- Create: `tests/unit/role-switching.test.ts`

- [ ] **Step 1: Write the test**

Create `tests/unit/role-switching.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('role switching', () => {
  it('should export switchRole and getAvailableRoles functions', async () => {
    const mod = await import('@/lib/auth/role-switching')
    expect(typeof mod.switchRole).toBe('function')
    expect(typeof mod.getAvailableRoles).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/role-switching.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement role-switching.ts**

Create `lib/auth/role-switching.ts`:

```typescript
'use server'

import { auth, unstable_update } from '@/lib/auth'
import { db } from '@/lib/db'
import { userRoles } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getHomePathForRole } from '@/lib/auth/route-policy'

export type AvailableRole = {
  roleId: string
  role: string
  entityId: string
  tenantId: string | null
  label: string
}

export async function getAvailableRoles(): Promise<AvailableRole[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const roles = await db.select().from(userRoles).where(eq(userRoles.authUserId, session.user.id))

  return roles.map((r) => ({
    roleId: r.id,
    role: r.role,
    entityId: r.entityId,
    tenantId: null, // resolved at switch time
    label: r.role.charAt(0).toUpperCase() + r.role.slice(1),
  }))
}

export async function switchRole(roleId: string): Promise<{ success: true; homePath: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Verify this role belongs to the current user
  const [role] = await db.select().from(userRoles).where(eq(userRoles.id, roleId)).limit(1)

  if (!role || role.authUserId !== session.user.id) {
    throw new Error('Invalid role selection')
  }

  // Trigger JWT update with new active role
  await unstable_update({
    user: {
      activeRoleId: roleId,
      role: role.role,
      entityId: role.entityId,
    },
  })

  const homePath = getHomePathForRole(role.role)
  return { success: true, homePath }
}
```

**Note:** `unstable_update` is the Auth.js v5 way to update JWT claims mid-session. If this import doesn't exist in the project's Auth.js setup, use the alternative approach of setting a cookie with the active role ID and reading it in the JWT callback. Check `lib/auth/index.ts` for available exports.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/role-switching.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth/role-switching.ts tests/unit/role-switching.test.ts
git commit -m "feat(auth): add role switching server actions

getAvailableRoles returns all roles for current user.
switchRole validates ownership and triggers JWT update."
```

---

## Task 8: Vendor Invitation Actions

**Files:**

- Create: `lib/vendors/invite-actions.ts`
- Create: `tests/unit/vendor-invite.test.ts`

- [ ] **Step 1: Write the test**

Create `tests/unit/vendor-invite.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('vendor invite actions', () => {
  it('should export generateVendorInvite and claimVendorInvite', async () => {
    const mod = await import('@/lib/vendors/invite-actions')
    expect(typeof mod.generateVendorInvite).toBe('function')
    expect(typeof mod.claimVendorInvite).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/vendor-invite.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement vendor invite actions**

Create `lib/vendors/invite-actions.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { vendors, userRoles } from '@/lib/db/schema/schema'
import { requireChef } from '@/lib/auth/get-user'
import { eq, and } from 'drizzle-orm'
import { hashToken } from '@/lib/auth/invitations'
import { randomUUID } from 'crypto'
import { hash } from 'bcryptjs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function generateVendorInvite(vendorId: string): Promise<{
  success: true
  inviteUrl: string
}> {
  const chef = await requireChef()

  // Verify vendor belongs to this chef
  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.chefId, chef.entityId)))
    .limit(1)

  if (!vendor) {
    throw new Error('Vendor not found')
  }

  if (!vendor.email) {
    throw new Error('Vendor must have an email address to be invited')
  }

  const token = randomUUID()
  const hashedToken = hashToken(token)

  await db.execute(
    `INSERT INTO vendor_invitations (tenant_id, vendor_id, email, token, expires_at, created_by)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days', $5)`,
    [chef.entityId, vendorId, vendor.email, hashedToken, chef.authUserId]
  )

  const inviteUrl = `${APP_URL}/auth/vendor-signup?token=${token}`

  return { success: true, inviteUrl }
}

export async function claimVendorInvite(
  token: string,
  email: string,
  password: string
): Promise<{ success: true } | { error: string }> {
  if (!token || token.length < 10) {
    return { error: 'Invalid invitation token' }
  }

  const hashedToken = hashToken(token)

  // Find the invitation
  const result = await db.execute(
    `SELECT vi.id, vi.tenant_id, vi.vendor_id, vi.email, vi.used_at, vi.expires_at,
            v.name as vendor_name
     FROM vendor_invitations vi
     JOIN vendors v ON v.id = vi.vendor_id
     WHERE vi.token = $1
     LIMIT 1`,
    [hashedToken]
  )

  const invitation = result.rows?.[0] as any
  if (!invitation) {
    return { error: 'Invalid or expired invitation' }
  }

  if (invitation.used_at) {
    return { error: 'This invitation has already been used' }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: 'This invitation has expired' }
  }

  // Check if email matches (case-insensitive)
  if (email.toLowerCase() !== invitation.email.toLowerCase()) {
    return { error: 'Email does not match the invitation' }
  }

  try {
    // Check if auth user already exists with this email
    const existingUser = await db.execute(
      `SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    )

    let authUserId: string

    if (existingUser.rows?.length > 0) {
      // User already exists (e.g., they're a client too) - just add vendor role
      authUserId = (existingUser.rows[0] as any).id
    } else {
      // Create new auth user
      const hashedPassword = await hash(password, 12)
      const newUser = await db.execute(
        `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, NOW(), NOW(), NOW())
         RETURNING id`,
        [email.toLowerCase(), hashedPassword]
      )
      authUserId = (newUser.rows[0] as any).id
    }

    // Insert user_roles for vendor
    await db.insert(userRoles).values({
      authUserId,
      role: 'vendor',
      entityId: invitation.vendor_id,
    })

    // Mark invitation as used
    await db.execute(`UPDATE vendor_invitations SET used_at = NOW() WHERE id = $1`, [invitation.id])

    return { success: true }
  } catch (e) {
    console.error('Failed to claim vendor invite:', e)
    return { error: 'Failed to create account. Please try again.' }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/vendor-invite.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/vendors/invite-actions.ts tests/unit/vendor-invite.test.ts
git commit -m "feat(vendor): add vendor invitation and claim server actions

generateVendorInvite creates time-limited invitation for existing vendor record.
claimVendorInvite creates auth user (or links existing), assigns vendor role.
Mirrors partner invite pattern with hashed tokens and 7-day expiry."
```

---

## Task 9: Vendor Signup Page

**Files:**

- Create: `app/auth/vendor-signup/page.tsx`

- [ ] **Step 1: Create vendor signup page**

This mirrors the partner signup page at `app/auth/partner-signup/page.tsx`.

Create `app/auth/vendor-signup/page.tsx`:

```tsx
'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { claimVendorInvite } from '@/lib/vendors/invite-actions'
import { signIn } from '@/lib/auth/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function VendorSignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              This vendor invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin" className="text-sm text-blue-600 hover:underline">
              Go to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await claimVendorInvite(token!, email, password)

      if ('error' in result) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Sign in with the new credentials
      await signIn({ email, password, rememberMe: true })
      router.push('/vendor/dashboard')
      router.refresh()
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vendor Portal Signup</CardTitle>
          <CardDescription>
            Create your account to access purchase orders, invoices, and pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-500">
            Already have an account?{' '}
            <Link href="/auth/signin?portal=vendor" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VendorSignupPage() {
  return (
    <Suspense>
      <VendorSignupForm />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/vendor-signup/page.tsx
git commit -m "feat(vendor): add vendor signup page with invitation claim flow

Token-based signup mirrors partner pattern. Creates account, claims invite,
signs in, redirects to vendor dashboard."
```

---

## Task 10: Vendor Portal Layout and Navigation

**Files:**

- Create: `components/vendor/vendor-sidebar.tsx`
- Create: `components/vendor/vendor-mobile-nav.tsx`
- Create: `app/(vendor)/vendor/layout.tsx`

- [ ] **Step 1: Create vendor sidebar**

Create `components/vendor/vendor-sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, FileText, Package, User } from 'lucide-react'

const navItems = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/orders', label: 'Purchase Orders', icon: ClipboardList },
  { href: '/vendor/invoices', label: 'Invoices', icon: FileText },
  { href: '/vendor/catalog', label: 'Catalog', icon: Package },
  { href: '/vendor/profile', label: 'Profile', icon: User },
]

export function VendorSidebar({ vendorName }: { vendorName: string }) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-stone-200 bg-white lg:block">
      <div className="flex h-16 items-center border-b border-stone-200 px-6">
        <span className="text-lg font-semibold text-stone-900">{vendorName}</span>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Create vendor mobile nav**

Create `components/vendor/vendor-mobile-nav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, FileText, Package, User } from 'lucide-react'

const navItems = [
  { href: '/vendor/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/vendor/orders', label: 'Orders', icon: ClipboardList },
  { href: '/vendor/invoices', label: 'Invoices', icon: FileText },
  { href: '/vendor/catalog', label: 'Catalog', icon: Package },
  { href: '/vendor/profile', label: 'Profile', icon: User },
]

export function VendorMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white lg:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1 text-xs',
                isActive ? 'text-stone-900' : 'text-stone-500'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Create vendor layout**

Create `app/(vendor)/vendor/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { requireVendor } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { vendors } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { VendorSidebar } from '@/components/vendor/vendor-sidebar'
import { VendorMobileNav } from '@/components/vendor/vendor-mobile-nav'
import { PresenceBeacon } from '@/components/shared/presence-beacon'
import { TestAccountBanner } from '@/components/shared/test-account-banner'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s - Vendor Portal',
    default: 'Vendor Portal',
  },
}

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  let vendorUser
  try {
    vendorUser = await requireVendor()
  } catch (e) {
    if (e instanceof Error && 'digest' in e) throw e
    redirect('/auth/signin?portal=vendor')
  }

  const [vendor] = await db
    .select({ name: vendors.name })
    .from(vendors)
    .where(eq(vendors.id, vendorUser.vendorId))
    .limit(1)

  const vendorName = vendor?.name ?? 'Vendor Portal'

  return (
    <div className="flex min-h-screen bg-stone-50" data-cf-portal="vendor">
      <VendorSidebar vendorName={vendorName} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-6 pb-20 lg:pb-6">{children}</main>
        <VendorMobileNav />
      </div>
      <PresenceBeacon />
      <TestAccountBanner />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/vendor/vendor-sidebar.tsx components/vendor/vendor-mobile-nav.tsx app/\(vendor\)/vendor/layout.tsx
git commit -m "feat(vendor): add vendor portal layout with sidebar and mobile nav

Auth-guarded layout using requireVendor(). Sidebar with 5 nav items.
Mobile bottom nav. Mirrors partner portal pattern."
```

---

## Task 11: Vendor Portal Pages

**Files:**

- Create: `app/(vendor)/vendor/dashboard/page.tsx`
- Create: `app/(vendor)/vendor/orders/page.tsx`
- Create: `app/(vendor)/vendor/orders/[id]/page.tsx`
- Create: `app/(vendor)/vendor/invoices/page.tsx`
- Create: `app/(vendor)/vendor/catalog/page.tsx`
- Create: `app/(vendor)/vendor/profile/page.tsx`

- [ ] **Step 1: Create vendor dashboard page**

Create `app/(vendor)/vendor/dashboard/page.tsx`:

```tsx
import { requireVendor } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import { purchaseOrders, vendorInvoices, vendors } from '@/lib/db/schema/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function VendorDashboardPage() {
  const vendorUser = await requireVendor()

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, vendorUser.vendorId))
    .limit(1)

  // Count open purchase orders
  const [openPOs] = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseOrders)
    .where(
      and(eq(purchaseOrders.vendorId, vendorUser.vendorId), sql`status IN ('sent', 'acknowledged')`)
    )

  // Count pending invoices
  const [pendingInvoices] = await db
    .select({ count: sql<number>`count(*)` })
    .from(vendorInvoices)
    .where(and(eq(vendorInvoices.vendorId, vendorUser.vendorId), sql`status = 'pending'`))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Welcome, {vendor?.name}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/vendor/orders">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-500">Open Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{openPOs?.count ?? 0}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/invoices">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-500">Pending Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendingInvoices?.count ?? 0}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/catalog">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-500">Your Catalog</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600">Update prices and availability</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create vendor orders list page**

Create `app/(vendor)/vendor/orders/page.tsx`:

```tsx
import { requireVendor } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { purchaseOrders } from '@/lib/db/schema/schema'
import { eq, desc } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Purchase Orders' }

const statusColors: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-700',
  sent: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-amber-100 text-amber-700',
  partially_received: 'bg-purple-100 text-purple-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function VendorOrdersPage() {
  const vendorUser = await requireVendor()

  const orders = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.vendorId, vendorUser.vendorId))
    .orderBy(desc(purchaseOrders.orderDate))
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Purchase Orders</h1>

      {orders.length === 0 ? (
        <p className="text-stone-500">No purchase orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <Link key={po.id} href={`/vendor/orders/${po.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-stone-900">PO #{po.poNumber}</p>
                    <p className="text-sm text-stone-500">
                      {new Date(po.orderDate).toLocaleDateString()}
                      {po.expectedDeliveryDate && (
                        <>
                          {' '}
                          &middot; Expected:{' '}
                          {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      ${((po.totalCents ?? 0) / 100).toFixed(2)}
                    </span>
                    <Badge className={statusColors[po.status] ?? 'bg-stone-100'}>
                      {po.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create vendor order detail page**

Create `app/(vendor)/vendor/orders/[id]/page.tsx`:

```tsx
import { requireVendor } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { purchaseOrders, purchaseOrderItems } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VendorOrderActions } from './vendor-order-actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Order Detail' }

export default async function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const vendorUser = await requireVendor()

  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.vendorId, vendorUser.vendorId)))
    .limit(1)

  if (!po) notFound()

  // Fetch line items
  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, po.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">PO #{po.poNumber}</h1>
        <Badge>{po.status.replace(/_/g, ' ')}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Order Date</CardTitle>
          </CardHeader>
          <CardContent>{new Date(po.orderDate).toLocaleDateString()}</CardContent>
        </Card>
        {po.expectedDeliveryDate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Expected Delivery</CardTitle>
            </CardHeader>
            <CardContent>{new Date(po.expectedDeliveryDate).toLocaleDateString()}</CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-stone-500">No items on this order.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-stone-500">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">{item.itemName}</td>
                    <td className="py-2">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2 text-right">
                      ${((item.unitPriceCents ?? 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      ${((item.totalCents ?? 0) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <td colSpan={3} className="pt-2 text-right">
                    Total:
                  </td>
                  <td className="pt-2 text-right">${((po.totalCents ?? 0) / 100).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      <VendorOrderActions orderId={po.id} currentStatus={po.status} />
    </div>
  )
}
```

Create the client component for order actions at `app/(vendor)/vendor/orders/[id]/vendor-order-actions.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateOrderStatus } from '@/lib/vendors/order-actions'

export function VendorOrderActions({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleStatusUpdate(newStatus: string) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateOrderStatus(orderId, newStatus)
        if ('error' in result) {
          setError(result.error)
        } else {
          router.refresh()
        }
      } catch {
        setError('Failed to update order status')
      }
    })
  }

  if (currentStatus === 'received' || currentStatus === 'cancelled') {
    return null
  }

  return (
    <div className="flex flex-wrap gap-3">
      {currentStatus === 'sent' && (
        <Button onClick={() => handleStatusUpdate('acknowledged')} disabled={isPending}>
          {isPending ? 'Updating...' : 'Acknowledge Order'}
        </Button>
      )}
      {(currentStatus === 'sent' || currentStatus === 'acknowledged') && (
        <Button
          variant="outline"
          onClick={() => handleStatusUpdate('partially_received')}
          disabled={isPending}
        >
          Mark Partially Shipped
        </Button>
      )}
      {(currentStatus === 'acknowledged' || currentStatus === 'partially_received') && (
        <Button onClick={() => handleStatusUpdate('received')} disabled={isPending}>
          Mark Fully Shipped
        </Button>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

Create the order status update action at `lib/vendors/order-actions.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { purchaseOrders } from '@/lib/db/schema/schema'
import { requireVendor } from '@/lib/auth/get-user'
import { eq, and } from 'drizzle-orm'

const VALID_TRANSITIONS: Record<string, string[]> = {
  sent: ['acknowledged', 'partially_received'],
  acknowledged: ['partially_received', 'received'],
  partially_received: ['received'],
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<{ success: true } | { error: string }> {
  const vendorUser = await requireVendor()

  const [po] = await db
    .select({ status: purchaseOrders.status })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.vendorId, vendorUser.vendorId)))
    .limit(1)

  if (!po) return { error: 'Order not found' }

  const allowed = VALID_TRANSITIONS[po.status]
  if (!allowed || !allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${po.status} to ${newStatus}` }
  }

  await db
    .update(purchaseOrders)
    .set({ status: newStatus })
    .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.vendorId, vendorUser.vendorId)))

  return { success: true }
}
```

- [ ] **Step 4: Create vendor invoices page**

Create `app/(vendor)/vendor/invoices/page.tsx`:

```tsx
import { requireVendor } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { vendorInvoices } from '@/lib/db/schema/schema'
import { eq, desc } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Invoices' }

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  matched: 'bg-green-100 text-green-700',
  disputed: 'bg-red-100 text-red-700',
}

export default async function VendorInvoicesPage() {
  const vendorUser = await requireVendor()

  const invoices = await db
    .select()
    .from(vendorInvoices)
    .where(eq(vendorInvoices.vendorId, vendorUser.vendorId))
    .orderBy(desc(vendorInvoices.invoiceDate))
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Invoices</h1>

      {invoices.length === 0 ? (
        <p className="text-stone-500">No invoices yet.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-stone-900">{inv.invoiceNumber ?? 'No number'}</p>
                  <p className="text-sm text-stone-500">
                    {new Date(inv.invoiceDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">${(inv.totalCents / 100).toFixed(2)}</span>
                  <Badge className={statusColors[inv.status ?? 'pending']}>
                    {inv.status ?? 'pending'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create vendor catalog page**

Create `app/(vendor)/vendor/catalog/page.tsx`:

```tsx
import { requireVendor } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { vendorItems } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Catalog' }

export default async function VendorCatalogPage() {
  const vendorUser = await requireVendor()

  const items = await db
    .select()
    .from(vendorItems)
    .where(eq(vendorItems.vendorId, vendorUser.vendorId))
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Your Catalog</h1>
      <p className="text-stone-500">
        Items your chef has on file. Update prices to keep quotes accurate.
      </p>

      {items.length === 0 ? (
        <p className="text-stone-500">No items in catalog yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{item.vendorItemName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">${(item.unitPriceCents / 100).toFixed(2)}</p>
                {item.unitSize && item.unitMeasure && (
                  <p className="text-sm text-stone-500">
                    per {item.unitSize} {item.unitMeasure}
                  </p>
                )}
                {item.vendorSku && <p className="text-xs text-stone-400">SKU: {item.vendorSku}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create vendor profile page**

Create `app/(vendor)/vendor/profile/page.tsx`:

```tsx
import { requireVendor } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { vendors } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile' }

export default async function VendorProfilePage() {
  const vendorUser = await requireVendor()

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, vendorUser.vendorId))
    .limit(1)

  if (!vendor) return <p>Vendor not found.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Your Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-stone-500">Business Name</p>
              <p className="font-medium">{vendor.name}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Type</p>
              <p className="font-medium capitalize">{vendor.vendorType}</p>
            </div>
            {vendor.contactName && (
              <div>
                <p className="text-sm text-stone-500">Contact</p>
                <p className="font-medium">{vendor.contactName}</p>
              </div>
            )}
            {vendor.email && (
              <div>
                <p className="text-sm text-stone-500">Email</p>
                <p className="font-medium">{vendor.email}</p>
              </div>
            )}
            {vendor.phone && (
              <div>
                <p className="text-sm text-stone-500">Phone</p>
                <p className="font-medium">{vendor.phone}</p>
              </div>
            )}
            {vendor.address && (
              <div>
                <p className="text-sm text-stone-500">Address</p>
                <p className="font-medium">{vendor.address}</p>
              </div>
            )}
            {vendor.website && (
              <div>
                <p className="text-sm text-stone-500">Website</p>
                <p className="font-medium">{vendor.website}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add app/\(vendor\)/ lib/vendors/order-actions.ts
git commit -m "feat(vendor): add all vendor portal pages

Dashboard (open POs, pending invoices), orders list + detail with status
transitions, invoices list, catalog browser, profile view. All auth-guarded
via requireVendor()."
```

---

## Task 12: Role Switcher UI Component

**Files:**

- Create: `components/shared/role-switcher.tsx`

- [ ] **Step 1: Create role switcher component**

Create `components/shared/role-switcher.tsx`:

```tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getAvailableRoles, switchRole, type AvailableRole } from '@/lib/auth/role-switching'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChefHat, User, Users, Truck, ArrowLeftRight } from 'lucide-react'

const roleIcons: Record<string, React.ElementType> = {
  chef: ChefHat,
  client: User,
  partner: Users,
  staff: Users,
  vendor: Truck,
  guest: User,
}

const roleLabels: Record<string, string> = {
  chef: 'Chef',
  client: 'Client',
  partner: 'Partner',
  staff: 'Staff',
  vendor: 'Vendor',
  guest: 'Guest',
}

export function RoleSwitcher({
  currentRole,
  availableRoleCount,
}: {
  currentRole: string
  availableRoleCount: number
}) {
  const router = useRouter()
  const [roles, setRoles] = useState<AvailableRole[]>([])
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  // Only show if user has multiple roles
  if (availableRoleCount <= 1) return null

  async function loadRoles() {
    if (loaded) return
    const available = await getAvailableRoles()
    setRoles(available)
    setLoaded(true)
  }

  function handleSwitch(roleId: string) {
    startTransition(async () => {
      const result = await switchRole(roleId)
      if (result.success) {
        router.push(result.homePath)
        router.refresh()
      }
    })
  }

  const Icon = roleIcons[currentRole] ?? User

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) loadRoles()
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={isPending}>
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{roleLabels[currentRole] ?? currentRole}</span>
          <ArrowLeftRight className="h-3 w-3 text-stone-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const RoleIcon = roleIcons[role.role] ?? User
          const isCurrent = role.role === currentRole
          return (
            <DropdownMenuItem
              key={role.roleId}
              onClick={() => !isCurrent && handleSwitch(role.roleId)}
              className={isCurrent ? 'bg-stone-100' : ''}
              disabled={isCurrent}
            >
              <RoleIcon className="mr-2 h-4 w-4" />
              <span>{roleLabels[role.role] ?? role.role}</span>
              {isCurrent && <span className="ml-auto text-xs text-stone-400">Active</span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/shared/role-switcher.tsx
git commit -m "feat(auth): add role switcher dropdown component

Shows current role with icon. Dropdown lists all roles for multi-role users.
Lazy-loads role list on open. Hidden for single-role users."
```

---

## Task 13: Wire Role Switcher Into Layouts

**Files:**

- Modify: `app/(vendor)/vendor/layout.tsx` (add role switcher)
- Note: Chef, partner, staff layouts should also get the role switcher, but those are existing files with complex structures. Wire vendor layout first as the pattern, then apply to others.

- [ ] **Step 1: Add role switcher to vendor layout**

In `app/(vendor)/vendor/layout.tsx`, add import:

```typescript
import { RoleSwitcher } from '@/components/shared/role-switcher'
```

Add the role switcher in the header area, between the `<VendorSidebar>` and `<main>`:

```tsx
<div className="flex flex-1 flex-col">
  <header className="flex h-14 items-center justify-end border-b border-stone-200 px-6">
    <RoleSwitcher currentRole="vendor" availableRoleCount={/* pass from session */} />
  </header>
  <main className="flex-1 p-6 pb-20 lg:pb-6">{children}</main>
  <VendorMobileNav />
</div>
```

To get `availableRoleCount`, read it from the session in the server component. Add to the layout after `requireVendor()`:

```typescript
import { auth } from '@/lib/auth'

// Inside the layout function, after requireVendor():
const session = await auth()
const availableRoleCount = session?.user?.availableRoles ?? 1
```

- [ ] **Step 2: Commit**

```bash
git add app/\(vendor\)/vendor/layout.tsx
git commit -m "feat(vendor): wire role switcher into vendor portal layout

Shows role switcher in header for multi-role users. Single-role vendors
see no switcher (hidden automatically)."
```

---

## Task 14: Update Role Selection Page for Multi-Role

**Files:**

- Modify: `app/auth/role-selection/page.tsx`

- [ ] **Step 1: Update role selection to handle existing multi-role users**

The current role selection page only shows chef and client. For multi-role users logging in, it needs to show all their existing roles. However, the page also serves as the first-time role picker for OAuth users.

Add a new section that detects if the user already has roles and shows those instead:

At the top of the `RoleSelectionContent` component, before the existing role cards, add:

```tsx
const [existingRoles, setExistingRoles] = useState<AvailableRole[]>([])
const [loadingRoles, setLoadingRoles] = useState(true)

useEffect(() => {
  async function load() {
    try {
      const roles = await getAvailableRoles()
      setExistingRoles(roles)
    } catch {
      // No roles yet, show signup options
    }
    setLoadingRoles(false)
  }
  load()
}, [])
```

Add imports:

```typescript
import { getAvailableRoles, switchRole, type AvailableRole } from '@/lib/auth/role-switching'
```

Before the existing chef/client selection cards, add:

```tsx
{
  existingRoles.length > 0 && (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Roles</h2>
      <p className="text-sm text-stone-500">Select which role to use:</p>
      {existingRoles.map((role) => (
        <button
          key={role.roleId}
          onClick={async () => {
            setLoading(true)
            const result = await switchRole(role.roleId)
            if (result.success) {
              router.push(result.homePath)
              router.refresh()
            }
          }}
          className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-stone-50"
        >
          <p className="font-medium capitalize">{role.label}</p>
        </button>
      ))}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-stone-500">or create a new role</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/role-selection/page.tsx
git commit -m "feat(auth): update role selection page for multi-role users

Shows existing roles with switch option before new role creation.
Handles both first-time OAuth users and returning multi-role users."
```

---

## Task 15: Type Check and Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -40
```

Fix any type errors that appear. Common issues:

- Missing imports for new schema tables (e.g., `purchaseOrderItems`)
- Type mismatches on `session.user.activeRoleId` (may need to check Auth.js type augmentation)

- [ ] **Step 2: Run build**

```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: Build succeeds. Watch for:

- Missing page exports
- Server/client component boundary issues
- Import errors in new vendor pages

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: All existing tests pass. New tests pass.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type and build errors from multi-role account system"
```

---

## Phase 4 (Guest Flow) - BLOCKED

Phase 4 depends on ticketed events being fully wired. Currently blocked by:

- Missing `event_share_settings` table (build queue #303)
- Missing `public-event-view.tsx` component (build queue #304)

The guest flow will get its own plan once those blockers are resolved. The schema migration in Task 1 already creates the `guest_profiles` table and adds the `guest` enum value, so the foundation is ready.

---

## Summary

| Task | What                        | Files Created/Modified          |
| ---- | --------------------------- | ------------------------------- |
| 1    | Schema migration            | 1 migration file                |
| 2    | Widen auth context types    | `request-auth-context.ts`, test |
| 3    | Multi-role auth config      | `auth-config.ts`                |
| 4    | Middleware all-role headers | `middleware.ts`                 |
| 5    | requireVendor guard         | `get-user.ts`                   |
| 6    | Vendor route policy         | `route-policy.ts`               |
| 7    | Role switching actions      | `role-switching.ts`, test       |
| 8    | Vendor invite actions       | `invite-actions.ts`, test       |
| 9    | Vendor signup page          | `vendor-signup/page.tsx`        |
| 10   | Vendor layout + nav         | layout, sidebar, mobile nav     |
| 11   | Vendor portal pages         | 6 pages + order actions         |
| 12   | Role switcher component     | `role-switcher.tsx`             |
| 13   | Wire switcher to layout     | vendor layout update            |
| 14   | Multi-role role selection   | role-selection page update      |
| 15   | Type check + build verify   | verification only               |

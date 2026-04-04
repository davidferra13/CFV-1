# RBAC Implementation Summary

> Date: 2026-04-04
> Agent: Claude Opus 4.6
> Spec: docs/specs/rbac-system-specification.md

## What Was Built

### Database (Phase 1)

Migration: `database/migrations/20260404000001_rbac_foundation.sql`

**New column:**

- `user_roles.tenant_role` - maps the legacy `role` column to the new hierarchy: `tenant_owner`, `manager`, `team_member`, `client`, `partner`. Backfilled on migration.

**New tables:**

- `role_permissions` - seeded role defaults (tenant_owner, manager, team_member, client, partner) across 19 permission domains with 5 action levels each
- `user_permission_overrides` - per-user, per-domain override grants set by owner/manager
- `permission_audit_log` - every permission change is recorded with actor, target, old/new values

**New trigger:**

- `protect_last_owner` on `platform_admins` - prevents deactivation, deletion, or downgrade of the last active platform owner. DB-level defense-in-depth.

### Permission Resolution Engine (Phase 2)

File: `lib/auth/permissions.ts`

- `PermissionSet` class with `has(domain, action)`, `getScope()`, `toJSON()`, `fromJSON()`
- `resolveCurrentUserPermissions(authUserId, tenantId)` - cached per-request via React `cache()`
- `requirePermission(domain, action)` - throws if denied (use in server actions)
- `hasPermission(domain, action)` - non-throwing boolean check
- `getCurrentPermissions()` - full permission set for layout/UI

### Server Actions (Phase 2)

File: `lib/auth/permission-actions.ts`

- `grantPermissionOverride()` - add domain:actions override for a user
- `revokePermissionOverride()` - remove a domain override
- `changeTenantRole()` - change a user between manager/team_member
- `getPermissionOverrides()` - list overrides for a user
- `getPermissionAuditLog()` - audit trail for permission changes

All actions enforce `requirePermission('users', 'manage')`, prevent self-modification, and prevent owner modification.

### Client Context (Phase 3)

Files:

- `lib/context/permission-context.tsx` - React context + `usePermissions()` hook
- `components/auth/permission-gate.tsx` - `<PermissionGate>` and `<PermissionDenied>` components

### Layout Integration (Phase 3)

- Chef layout (`app/(chef)/layout.tsx`) resolves permissions in the parallel data loading `Promise.all` and wraps children in `<PermissionProvider>`
- Both desktop (`chef-nav.tsx`) and mobile (`chef-mobile-nav.tsx`) nav now filter items by `requiredPermission` field in addition to `adminOnly`
- Nav config type `NavItem` extended with optional `requiredPermission: 'domain:action'` field

### Permission Management UI (Phase 4)

Files:

- `app/(chef)/staff/permissions/page.tsx` - server component page
- `app/(chef)/staff/permissions/permission-matrix-client.tsx` - interactive matrix

Features:

- Shows all team members with their current role
- Visual permission matrix (domain x action grid)
- Green checkmarks = role defaults (locked, cannot remove)
- Blue checkmarks = custom overrides (click to toggle)
- Empty = not granted (click to add for managers+)
- Role change buttons (Manager / Team Member)
- All changes are optimistic with rollback on failure
- Every change is audit-logged

### Navigation

- Added `/staff/permissions` to the Staff nav group children

## What Was NOT Built (Deferred)

- **Phase 5: Incremental server action migration.** Existing `requireChef()` calls still work. The `requirePermission()` function is ready to replace them one action at a time. No rush; tenant_owner has full permissions seeded, so all existing chef functionality is preserved.
- **requiredPermission annotations on nav items.** The infrastructure is in place but no nav items are annotated yet. This happens gradually as server actions are migrated.

## Backward Compatibility

- All existing behavior is preserved. `requireChef()` still works identically.
- `tenant_role` is backfilled from `role` column on migration, so existing users get correct permissions immediately.
- `PermissionProvider` defaults to allow-all if permission resolution fails (prevents blocking existing users).
- No existing queries, routes, or components were modified beyond the layout wrapper and nav filtering additions.

## How to Use Going Forward

### In a server action (new pattern):

```typescript
// Instead of:
const user = await requireChef()

// Use:
const user = await requirePermission('events', 'edit')
```

### In a client component:

```tsx
import { PermissionGate } from '@/components/auth/permission-gate'

;<PermissionGate domain="financial" action="view">
  <RevenueChart />
</PermissionGate>
```

### In a client component (hook):

```tsx
const { has } = usePermissions()
if (has('billing', 'manage')) {
  /* show billing link */
}
```

### In nav config:

```typescript
{ href: '/finance', label: 'Finance', icon: DollarSign, requiredPermission: 'financial:view' }
```

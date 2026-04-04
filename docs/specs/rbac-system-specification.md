# Role-Based Access Control (RBAC) System Specification

> **Status:** Planning / Specification only. No implementation.
> **Date:** 2026-04-04
> **Scope:** Complete RBAC model for ChefFlow V1

---

## 1. Current System Audit

### 1.1 What Exists Today

ChefFlow has a **portal-based role system** with five discrete user types and a separate platform admin layer:

| Role           | Table             | Portal            | Routes           | Auth Function      |
| -------------- | ----------------- | ----------------- | ---------------- | ------------------ |
| `chef`         | `user_roles`      | `app/(chef)/*`    | 87 paths         | `requireChef()`    |
| `client`       | `user_roles`      | `app/(client)/*`  | 6 paths          | `requireClient()`  |
| `staff`        | `user_roles`      | `app/(staff)/*`   | 5 paths          | `requireStaff()`   |
| `partner`      | `user_roles`      | `app/(partner)/*` | 1 path           | `requirePartner()` |
| platform admin | `platform_admins` | `app/(admin)/*`   | All + admin-only | `requireAdmin()`   |

**Database tables:**

- `user_roles` (auth_user_id UNIQUE, role enum, entity_id) - one role per user
- `platform_admins` (auth_user_id UNIQUE, access_level: 'admin' | 'owner', is_active) - separate from user_roles
- `staff_members` (chef_id, auth_user_id, role_override as staff_role enum)

**Enforcement layers (defense-in-depth):**

1. **Middleware** (`middleware.ts`) - route-level, redirects wrong roles
2. **Layout** (`requireChef()` etc.) - server component render gate
3. **Server actions** - 793+ functions start with role checks
4. **API v2** - bearer token + scope validation
5. **Tenant scoping** - every DB query filters by tenant_id/chef_id
6. **Cron/webhook** - CRON_SECRET and HMAC signature validation

**How admin works today:**

- `platform_admins` table has `access_level` column: `'admin'` or `'owner'`
- `requireAdmin()` checks presence + `is_active = true`, but does NOT differentiate admin vs owner
- `isAdmin()` is a boolean check used for nav filtering (`adminOnly: true` items)
- Admin is an overlay on top of a normal role (a chef can also be an admin)

### 1.2 Current Gaps

| #   | Gap                                                                                                                                                                                                           | Risk                                                     | Severity     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------ |
| G1  | **Owner/admin distinction is not enforced.** `access_level` column exists but code treats all admins identically. An admin can deactivate the owner.                                                          | Owner lockout                                            | **Critical** |
| G2  | **No granular permissions within chef portal.** Every chef sees everything. A chef's bookkeeper, office manager, or event coordinator would need the full chef role to access anything.                       | Over-exposure of sensitive data (financials, client PII) | **High**     |
| G3  | **Staff portal is minimal (5 routes).** Staff have no access to recipes beyond read, no event detail, no client info. If a sous chef needs more access, the only option is giving them full chef credentials. | Credential sharing, audit trail loss                     | **High**     |
| G4  | **No permission delegation within a tenant.** A chef cannot grant specific capabilities to specific staff. It's all-or-nothing per role.                                                                      | Blocks real-world team workflows                         | **High**     |
| G5  | **Admin cannot manage other admins programmatically.** `platform_admins` rows must be inserted manually via SQL. No UI, no audit trail for admin provisioning.                                                | Operational friction, no accountability                  | **Medium**   |
| G6  | **No concept of "manager" between chef and staff.** A head chef or operations manager needs more than staff access but should not have full owner access.                                                     | Forces owner to handle everything or share credentials   | **Medium**   |
| G7  | **API v2 scopes exist but are disconnected from user roles.** API keys have granular scopes (events:read, quotes:write), but UI users have no equivalent capability model.                                    | Inconsistent permission model across access methods      | **Medium**   |
| G8  | **Role is immutable in JWT.** Changing a user's role requires deleting and recreating the user_roles row, plus a logout/login cycle.                                                                          | Poor UX for role changes                                 | **Low**      |
| G9  | **No activity audit log tied to permissions.** Actions are logged but not correlated with the permission that authorized them.                                                                                | Forensics gap                                            | **Low**      |

### 1.3 What Works Well (Keep)

- Portal-based routing (chef/client/staff/partner/admin) is clean and correct
- Defense-in-depth enforcement (middleware + layout + server action + tenant scoping)
- Tenant isolation via session-derived tenant_id (never from request body)
- Platform admin as a separate table (overlay, not a role replacement)
- API v2 scope system (granular, per-key)
- Single role per auth user (simple, predictable)

---

## 2. Role Hierarchy

### 2.1 Platform-Level Roles (cross-tenant)

| Role               | Description                                                                                                                                                     | Lockout Protection                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Owner**          | System creator. Irrevocable. Cannot be deactivated, downgraded, or removed by any user including themselves via UI. Only modifiable via direct database access. | Cannot be deleted. Cannot be downgraded. Must always exist (count >= 1 constraint). |
| **Platform Admin** | Manages platform-wide settings, user management, analytics. Granted by owner. Can be deactivated.                                                               | Can be deactivated by owner only. Cannot self-elevate to owner.                     |

### 2.2 Tenant-Level Roles (within a chef's workspace)

| Role             | Description                                                                                                                                                                 | Typical User                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Tenant Owner** | The chef who created the account. Full access to everything within their tenant. Cannot be removed from their own tenant.                                                   | The chef themselves                             |
| **Manager**      | Elevated staff with broad operational access. Can manage events, clients, staff, and most settings. Cannot manage billing, delete the account, or modify owner permissions. | Head chef, operations manager, business partner |
| **Team Member**  | Standard staff with task-focused access. Sees what they need for their job, nothing more. Configurable per-user via permission sets.                                        | Sous chef, line cook, server, bartender         |
| **Client**       | External user who books services. Sees only their own events, quotes, and communications within one tenant.                                                                 | Food service client                             |
| **Partner**      | Referral source. Sees referral dashboard and commission data within one tenant.                                                                                             | Venue owner, Airbnb host                        |

### 2.3 Hierarchy and Inheritance

```
Platform Owner
  └── Platform Admin
        └── (can view/manage any tenant)

Within each tenant:
  Tenant Owner (chef)
    └── Manager
          └── Team Member (staff)
                └── (no sub-roles)

  Client (isolated, no hierarchy)
  Partner (isolated, no hierarchy)
```

**Rules:**

- A user has exactly ONE tenant-level role per tenant (enforced by user_roles UNIQUE constraint)
- A user can additionally be a platform admin (overlay, stored in platform_admins)
- Platform admins can view any tenant but act within tenant context when doing so
- Clients and partners are scoped to one tenant and cannot see other tenants

---

## 3. Permission Categories

### 3.1 Permission Domains

Each domain contains granular capabilities. Permissions are additive (deny-by-default).

| Domain                    | Key            | Description                                            |
| ------------------------- | -------------- | ------------------------------------------------------ |
| **Events**                | `events`       | Create, view, edit, delete, transition events          |
| **Clients**               | `clients`      | View, create, edit client records and contacts         |
| **Quotes & Proposals**    | `quotes`       | Create, edit, send, accept quotes                      |
| **Financial**             | `financial`    | View revenue, expenses, payments, ledger entries       |
| **Recipes & Menus**       | `recipes`      | View, create, edit recipes and menus                   |
| **Culinary / Inventory**  | `inventory`    | Price catalog, ingredients, food cost, stock           |
| **Staff**                 | `staff`        | View, add, edit, deactivate staff members              |
| **Documents**             | `documents`    | Generate, view, edit contracts, invoices, proposals    |
| **Calendar & Scheduling** | `calendar`     | View, create, edit calendar entries and schedules      |
| **Communications**        | `comms`        | Email, chat, notifications, inquiry management         |
| **Analytics & Reports**   | `analytics`    | Dashboard metrics, reports, insights                   |
| **Settings**              | `settings`     | Profile, preferences, integrations, modules            |
| **Billing**               | `billing`      | Subscription, payment methods, supporter contributions |
| **AI / Remy**             | `ai`           | Remy concierge, AI-assisted features                   |
| **Community**             | `community`    | Network, circles, marketplace visibility               |
| **User Management**       | `users`        | Invite, edit, deactivate users within tenant           |
| **Data Import/Export**    | `data`         | CSV import, bulk operations, data export               |
| **Integrations**          | `integrations` | Google Calendar, Gmail sync, Stripe, external services |
| **Admin**                 | `admin`        | Platform-wide admin functions (platform admins only)   |

### 3.2 Capability Actions Per Domain

Each domain supports up to five actions:

| Action   | Meaning                                                                                |
| -------- | -------------------------------------------------------------------------------------- |
| `view`   | Read data                                                                              |
| `create` | Create new records                                                                     |
| `edit`   | Modify existing records                                                                |
| `delete` | Remove or archive records                                                              |
| `manage` | Full control including dangerous operations (transition states, send to clients, etc.) |

A permission is expressed as `domain:action`, e.g., `events:view`, `financial:manage`, `staff:edit`.

---

## 4. Permission Matrix

### 4.1 Tenant-Level Roles

`F` = Full (all actions) | `V` = View only | `VC` = View + Create | `VCE` = View + Create + Edit | `-` = No access

| Domain                 | Tenant Owner | Manager         | Team Member (default) | Client           | Partner      |
| ---------------------- | ------------ | --------------- | --------------------- | ---------------- | ------------ |
| **Events**             | F            | F               | V                     | V (own only)     | -            |
| **Clients**            | F            | VCE             | V                     | -                | -            |
| **Quotes**             | F            | F               | V                     | V (own only)     | -            |
| **Financial**          | F            | V               | -                     | -                | -            |
| **Recipes**            | F            | VCE             | V                     | -                | -            |
| **Inventory**          | F            | VCE             | V                     | -                | -            |
| **Staff**              | F            | VCE             | V (self only)         | -                | -            |
| **Documents**          | F            | VCE             | V                     | V (own only)     | -            |
| **Calendar**           | F            | F               | V                     | -                | -            |
| **Communications**     | F            | VCE             | V (assigned only)     | VC (own threads) | -            |
| **Analytics**          | F            | V               | -                     | -                | -            |
| **Settings**           | F            | V (non-billing) | -                     | -                | -            |
| **Billing**            | F            | -               | -                     | -                | -            |
| **AI / Remy**          | F            | F               | V                     | V                | -            |
| **Community**          | F            | V               | -                     | -                | -            |
| **User Management**    | F            | VCE (not owner) | -                     | -                | -            |
| **Data Import/Export** | F            | F               | -                     | -                | -            |
| **Integrations**       | F            | V               | -                     | -                | -            |
| **Partner Dashboard**  | -            | -               | -                     | -                | F (own data) |

### 4.2 Platform-Level Roles

| Domain                             | Owner              | Platform Admin                  |
| ---------------------------------- | ------------------ | ------------------------------- |
| **All tenant data**                | F (any tenant)     | F (any tenant)                  |
| **Platform admin management**      | F                  | V (cannot create/remove admins) |
| **Owner management**               | Cannot be modified | Cannot modify owner             |
| **System settings**                | F                  | V                               |
| **User management (cross-tenant)** | F                  | VCE                             |
| **Analytics (platform-wide)**      | F                  | V                               |

### 4.3 Team Member Customization

Team Members get the defaults above, but the Tenant Owner or Manager can grant additional permissions per user. This is the **permission override** system:

- Overrides are stored per user per domain
- An override can only ELEVATE within the role's ceiling (Team Member cannot exceed Manager-level access)
- Overrides are set via UI by the Tenant Owner or Manager
- Example: A sous chef gets `recipes:edit` and `events:create` in addition to defaults

---

## 5. Safety and Edge-Case Handling

### 5.1 Owner Protection

| Scenario                                  | Protection                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Owner tries to deactivate themselves      | **Blocked.** UI and server action reject.                                                      |
| Admin tries to deactivate owner           | **Blocked.** Server action checks `access_level = 'owner'` and rejects.                        |
| Owner tries to downgrade own access_level | **Blocked.** Owner access_level is immutable via application code.                             |
| Last owner removal                        | **Blocked.** DB constraint: `COUNT(*) >= 1 WHERE access_level = 'owner' AND is_active = true`. |
| Owner forgets password                    | Standard password reset flow. Owner is never locked out of reset.                              |

### 5.2 Privilege Escalation Prevention

| Attack Vector                                 | Defense                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| User modifies role in request body            | Tenant_id and role always derived from server session, never from request.              |
| Staff tries to access chef portal routes      | Middleware redirects. Layout throws. Server action throws.                              |
| Manager tries to modify owner permissions     | Server action checks: target user cannot have higher or equal role to actor.            |
| Team Member tries to grant themselves Manager | Server action checks: actor must have `users:manage` (only Owner and Manager have it).  |
| API key used to bypass UI restrictions        | API v2 scopes are independent; scopes cannot exceed the key creator's role permissions. |
| JWT manipulation                              | JWT is signed server-side (Auth.js). Invalid signatures are rejected by middleware.     |
| Cross-tenant data access                      | Every DB query includes tenant_id filter derived from session. No exceptions.           |

### 5.3 Multi-User Conflict Handling

| Scenario                                                         | Resolution                                                                                                                                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two managers edit the same event                                 | Last-write-wins with optimistic locking (existing pattern). No permission conflict.                                                                                                                   |
| Owner deactivates a manager who is mid-session                   | Manager's next server action call fails with `requireChef()` (account status check). Forced re-auth.                                                                                                  |
| Role changed while user is logged in                             | JWT contains cached role. On next session refresh (5 min cache), role updates. For immediate effect, user must re-login. Alternatively, implement `trigger: 'update'` session refresh on role change. |
| Manager invites staff while owner simultaneously removes manager | Staff invitation server action runs `requireChef()` + permission check. If manager is deactivated between the two checks, the action fails gracefully.                                                |

### 5.4 System Lockout Prevention

| Scenario                 | Prevention                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All admins deactivated   | Owner always exists and cannot be deactivated. Owner can always access admin panel.                                                                                         |
| Owner account suspended  | `chefs.accountStatus = 'suspended'` check exists in `requireChef()`. Owner platform_admin access is separate from chef suspension. Platform admin panel remains accessible. |
| Database connection lost | Auth fails gracefully (redirect to signin). No silent degradation to elevated access.                                                                                       |
| JWT expired mid-session  | Middleware rejects. User redirected to signin. No silent access continuation.                                                                                               |

---

## 6. Permission Architecture

### 6.1 Recommended Model: Role + Permission Override (Hybrid RBAC)

**Why not pure RBAC:** Pure role-based is too coarse. A "Team Member" who is a sous chef needs different access than a "Team Member" who is a server. Pure permission-based is too complex for a chef to manage. Hybrid gives sensible defaults with targeted customization.

**How it works:**

1. Every user has a **role** (Tenant Owner, Manager, Team Member, Client, Partner)
2. Each role has **default permissions** (the matrix in Section 4)
3. Tenant Owner or Manager can add **permission overrides** per user (elevate only, within role ceiling)
4. Final permissions = role defaults + overrides

### 6.2 Database Schema (New Tables)

```sql
-- Role default permissions (seeded, not user-editable)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,                    -- 'tenant_owner', 'manager', 'team_member', 'client', 'partner'
  domain TEXT NOT NULL,                  -- 'events', 'financial', 'recipes', etc.
  actions TEXT[] NOT NULL DEFAULT '{}',  -- ['view', 'create', 'edit', 'delete', 'manage']
  scope TEXT NOT NULL DEFAULT 'tenant',  -- 'tenant', 'own', 'assigned', 'self'
  UNIQUE(role, domain)
);

-- Per-user permission overrides (set by owner/manager)
CREATE TABLE user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  domain TEXT NOT NULL,
  actions TEXT[] NOT NULL DEFAULT '{}',  -- additional actions beyond role default
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, auth_user_id, domain)
);

-- Audit log for permission changes
CREATE TABLE permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id),
  actor_auth_user_id UUID NOT NULL,
  target_auth_user_id UUID NOT NULL,
  action TEXT NOT NULL,                   -- 'grant', 'revoke', 'role_change'
  domain TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Changes to existing tables:**

```sql
-- Add tenant_role to user_roles (migration, additive)
ALTER TABLE user_roles ADD COLUMN tenant_role TEXT
  DEFAULT 'team_member'
  CHECK (tenant_role IN ('tenant_owner', 'manager', 'team_member', 'client', 'partner'));

-- Backfill: chef -> tenant_owner, client -> client, staff -> team_member, partner -> partner
UPDATE user_roles SET tenant_role = CASE
  WHEN role = 'chef' THEN 'tenant_owner'
  WHEN role = 'client' THEN 'client'
  WHEN role = 'staff' THEN 'team_member'
  WHEN role = 'partner' THEN 'partner'
END;

-- platform_admins: add owner protection constraint
-- (Application-level enforcement is primary; this is defense-in-depth)
CREATE OR REPLACE FUNCTION prevent_owner_deletion() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.access_level = 'owner' AND (TG_OP = 'DELETE' OR NEW.is_active = false OR NEW.access_level != 'owner') THEN
    IF (SELECT COUNT(*) FROM platform_admins WHERE access_level = 'owner' AND is_active = true AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove or deactivate the last platform owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_last_owner
  BEFORE UPDATE OR DELETE ON platform_admins
  FOR EACH ROW EXECUTE FUNCTION prevent_owner_deletion();
```

### 6.3 Permission Resolution (Runtime)

```
resolvePermissions(user):
  1. Look up user's tenant_role from user_roles
  2. Load role_permissions for that tenant_role
  3. Load user_permission_overrides for this user + tenant
  4. Merge: final_permissions = role_defaults ∪ overrides
  5. Cache in JWT claims (refresh on role/override change)
  6. Return PermissionSet
```

### 6.4 Enforcement Points

| Layer             | What It Checks              | How                                                               |
| ----------------- | --------------------------- | ----------------------------------------------------------------- |
| **Middleware**    | Route access by portal role | Existing pattern (unchanged)                                      |
| **Layout**        | Portal membership           | Existing `requireChef()` etc. (unchanged)                         |
| **Server Action** | Domain + action permission  | New `requirePermission('events', 'edit')` function                |
| **UI Component**  | Conditional rendering       | New `<PermissionGate domain="financial" action="view">` component |
| **API v2**        | Scope validation            | Existing `withApiAuth()` (unchanged, scopes map to domains)       |
| **Database**      | Tenant isolation            | Existing tenant_id filtering (unchanged)                          |

**New enforcement function:**

```typescript
// lib/auth/permissions.ts
export async function requirePermission(
  domain: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage'
): Promise<AuthUser> {
  const user = await requireAuth()
  const permissions = await resolvePermissions(user)

  if (!permissions.has(domain, action)) {
    throw new Error(`Permission denied: ${domain}:${action}`)
  }

  return user
}

// Usage in server actions:
export async function updateEvent(eventId: string, input: unknown) {
  const user = await requirePermission('events', 'edit')
  // ... existing logic
}
```

**New UI gate component:**

```tsx
// components/auth/permission-gate.tsx
export function PermissionGate({
  domain,
  action,
  children,
  fallback,
}: {
  domain: string
  action: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const permissions = usePermissions() // from context, set in layout
  if (!permissions.has(domain, action)) return fallback ?? null
  return children
}

// Usage:
;<PermissionGate domain="financial" action="view">
  <RevenueChart />
</PermissionGate>
```

### 6.5 Migration Strategy

This system is **additive** and **backward-compatible**:

1. **Phase 1:** Add `tenant_role` column to `user_roles`, backfill from `role`. Create `role_permissions` (seeded). Create `user_permission_overrides` (empty). Create `permission_audit_log` (empty). Add owner protection trigger to `platform_admins`.

2. **Phase 2:** Implement `resolvePermissions()` and `requirePermission()`. Initially, these return "full access" for tenant_owner (identical to current behavior). No behavior change for existing users.

3. **Phase 3:** Add `<PermissionGate>` to UI. Initially all gates pass for tenant_owner. Staff and manager roles start seeing appropriate restrictions.

4. **Phase 4:** Add permission management UI (Settings > Team > Permissions). Owner and Manager can view/modify overrides.

5. **Phase 5:** Migrate server actions from `requireChef()` to `requirePermission()` incrementally. Each migration is testable and reversible.

**Zero downtime. Zero data loss. No breaking changes at any phase.**

---

## 7. Usability Design

### 7.1 Zero-Friction Defaults

| Role             | Out-of-Box Experience                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Tenant Owner** | Everything works. Full access. No configuration needed.                                                              |
| **Manager**      | Can do everything except billing and destructive account operations. Immediately productive.                         |
| **Team Member**  | Can view events, recipes, schedules. Can update their own tasks and station assignments. Enough to show up and work. |
| **Client**       | Sees their events, quotes, documents. Can chat with the chef. Nothing else visible.                                  |
| **Partner**      | Sees referral dashboard and commissions. Nothing else.                                                               |

### 7.2 Permission Management UX

**Where:** Settings > Team > [User] > Permissions

**How it works:**

- Show the user's current effective permissions as a visual grid (domain x action)
- Role defaults shown as locked checkboxes (cannot be removed without role change)
- Overrides shown as toggleable checkboxes
- Changes take effect on next page load (JWT refresh)
- Toast confirmation: "Updated permissions for [name]"

**Simplification for small teams:**

- If a tenant has 0-2 staff, hide the permissions UI entirely. Show it only when the team has 3+ members.
- Default permissions are designed so that most chefs never need to touch this screen.

### 7.3 Role Assignment UX

**Changing a user's tenant role:**

- Settings > Team > [User] > Role dropdown
- Confirmation dialog for escalation (Team Member -> Manager)
- Immediate effect: next server action uses new role
- Cannot change own role (Owner stays Owner)
- Cannot elevate above own role (Manager cannot make someone Owner)

---

## 8. Summary of Recommended Changes

### New Database Objects

- `role_permissions` table (seeded defaults)
- `user_permission_overrides` table
- `permission_audit_log` table
- `tenant_role` column on `user_roles`
- Owner protection trigger on `platform_admins`

### New Code

- `lib/auth/permissions.ts` (resolvePermissions, requirePermission, hasPermission)
- `components/auth/permission-gate.tsx` (UI gating component)
- Permission context provider in chef layout
- Permission management UI (Settings > Team > Permissions)

### Modified Code (Incremental)

- Server actions: `requireChef()` -> `requirePermission(domain, action)` (one at a time)
- Nav config: add `requiredPermission` field to nav items (in addition to `adminOnly`)
- Staff portal: expand routes as permissions allow

### Unchanged

- Portal routing (chef/client/staff/partner/admin)
- Middleware route protection
- Tenant isolation (tenant_id from session)
- API v2 scope system
- JWT session strategy
- Auth.js v5 configuration

---

## 9. Risk Assessment

| Risk                                            | Likelihood | Impact   | Mitigation                                                                                                                                      |
| ----------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Permission check forgotten on new server action | Medium     | High     | Lint rule or pre-commit hook that flags exported async functions in 'use server' files without `requirePermission`                              |
| JWT cache stale after permission change         | Medium     | Low      | Force session refresh on permission/role change. Existing `trigger: 'update'` mechanism handles this.                                           |
| Permission UI confusion for non-technical chefs | Low        | Medium   | Hide UI for small teams. Use plain language ("Can view events" not "events:view"). Show presets ("Full kitchen access", "Front-of-house only"). |
| Migration breaks existing staff login           | Low        | High     | Phase 1 is purely additive. `tenant_role` defaults to current behavior. No existing query changes until Phase 5.                                |
| Owner lockout via direct DB manipulation        | Very Low   | Critical | DB trigger prevents last-owner removal. Documented recovery procedure in emergency runbook.                                                     |

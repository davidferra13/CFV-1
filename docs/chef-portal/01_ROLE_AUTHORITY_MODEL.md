# Chef Portal Role Authority Model (V1)

This document defines how roles are determined, stored, and enforced throughout the Chef Portal. Role authority is the foundation of access control.

---

## 1) Roles in V1

### 1.1 Defined Roles

The Chef Portal supports exactly **3 roles** in V1:

| Role | Portal Access | Description |
|------|---------------|-------------|
| `chef` | Chef Portal | Primary tenant owner; full access to tenant data |
| `chef_subaccount` | Chef Portal | Limited user within a tenant (if implemented) |
| `client` | Client Portal | End-user; no access to Chef Portal |

**No other roles exist in V1.** Any undefined role must be treated as unauthorized.

---

## 2) Role Storage

### 2.1 The `user_roles` Table

**Schema:**

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('chef', 'chef_subaccount', 'client')),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, tenant_id) -- A user can have only one role per tenant
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);
```

**Key Points:**
- `user_id` links to Supabase Auth's `auth.users` table
- `role` is constrained to the 3 valid values
- `tenant_id` links to `chefs` table
- A user can have only one role per tenant (enforced by UNIQUE constraint)

### 2.2 Example Records

| user_id | role | tenant_id |
|---------|------|-----------|
| `user-abc` | `chef` | `tenant-1` |
| `user-def` | `chef_subaccount` | `tenant-1` |
| `user-ghi` | `client` | `tenant-1` |
| `user-jkl` | `chef` | `tenant-2` |

**Interpretation:**
- `user-abc` is the chef (owner) of `tenant-1`
- `user-def` is a subaccount user in `tenant-1`
- `user-ghi` is a client of `tenant-1` (uses Client Portal only)
- `user-jkl` is the chef (owner) of `tenant-2`

---

## 3) Role Resolution Flow

### 3.1 When User Logs In

```
1. User authenticates via Supabase Auth
   ↓
2. Session created; auth.uid() now returns user_id
   ↓
3. Middleware (or server component) queries user_roles:
   SELECT role, tenant_id FROM user_roles WHERE user_id = auth.uid()
   ↓
4. If no record found → Role = UNKNOWN (deny access)
   ↓
5. If record found → Store role + tenant_id in request context
   ↓
6. Route guard checks role:
   - chef or chef_subaccount → Allow /chef/* routes
   - client → Redirect to /client/*
   - UNKNOWN → Deny access (show error page)
```

### 3.2 Role Resolution Function

```typescript
type RoleData = {
  role: 'chef' | 'chef_subaccount' | 'client';
  tenant_id: string;
} | null;

async function getUserRole(userId: string): Promise<RoleData> {
  const roleRecord = await db.user_roles.findFirst({
    where: { user_id: userId },
  });

  if (!roleRecord) return null; // No role assigned

  return {
    role: roleRecord.role,
    tenant_id: roleRecord.tenant_id,
  };
}
```

### 3.3 Multiple Roles (Edge Case)

**Question:** Can a user have multiple roles across different tenants?

**V1 Answer:** Not supported. A user belongs to exactly ONE tenant with ONE role.

**Future (V2):** Could support users as chef in one tenant and client in another, but requires:
- Updated UNIQUE constraint
- Role context switching UI
- More complex RLS policies

**V1 Constraint:** `UNIQUE(user_id, tenant_id)` enforces one role per tenant, but users should realistically have only one row in `user_roles`.

---

## 4) Role Authority (Who Decides Role?)

### 4.1 Role Assignment

**Who assigns roles?**

| Role | Assigned By | When |
|------|-------------|------|
| `chef` | System | During chef signup/onboarding |
| `chef_subaccount` | Chef | When chef invites a subaccount user (if implemented) |
| `client` | System | When client accepts invite and creates account |

**Key Principle:** **Users cannot self-assign roles.** Role assignment is controlled server-side.

### 4.2 Chef Role Assignment (Signup)

**Flow:**

1. User signs up as chef via onboarding form
2. Server action creates `chefs` record (tenant)
3. Server action creates `user_roles` record:
   ```typescript
   await db.user_roles.create({
     data: {
       user_id: user.id,
       role: 'chef',
       tenant_id: newChef.id,
     },
   });
   ```
4. User is now authorized as `chef` for their tenant

### 4.3 Client Role Assignment (Invite Acceptance)

**Flow:**

1. Chef creates client profile
2. Chef sends invite (generates token tied to client_profile_id)
3. Client clicks invite link, signs up (or logs in)
4. Server action links user to client profile:
   ```typescript
   await db.user_roles.create({
     data: {
       user_id: clientUser.id,
       role: 'client',
       tenant_id: chef.id,
     },
   });
   await db.client_profiles.update({
     where: { id: clientProfileId },
     data: { user_id: clientUser.id },
   });
   ```
5. User is now authorized as `client` for that tenant

### 4.4 Subaccount Role Assignment (If Implemented)

**Flow:**

1. Chef creates subaccount invite
2. Invited user signs up
3. Server action creates `user_roles` record:
   ```typescript
   await db.user_roles.create({
     data: {
       user_id: newUser.id,
       role: 'chef_subaccount',
       tenant_id: chef.id,
     },
   });
   ```
4. User is now authorized as `chef_subaccount` for that tenant

---

## 5) Role Enforcement Points

### 5.1 Middleware (Route Guard)

**Purpose:** Prevent unauthorized users from accessing wrong portal

**Implementation:**

```typescript
export async function middleware(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return redirectToLogin();

  const roleData = await getUserRole(user.id);
  if (!roleData) return showErrorPage('No role assigned');

  const { role } = roleData;
  const path = req.nextUrl.pathname;

  // Route guards
  if (path.startsWith('/chef')) {
    if (role === 'client') return redirectToClientPortal();
    if (role !== 'chef' && role !== 'chef_subaccount') {
      return denyAccess();
    }
  }

  if (path.startsWith('/client')) {
    if (role === 'chef' || role === 'chef_subaccount') {
      return redirectToChefPortal();
    }
    if (role !== 'client') return denyAccess();
  }

  return NextResponse.next();
}
```

### 5.2 Server Layout (Portal Selection)

**Purpose:** Render correct layout based on role

**Implementation:**

```typescript
// app/(chef)/layout.tsx
export default async function ChefLayout({ children }) {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  if (!roleData || !['chef', 'chef_subaccount'].includes(roleData.role)) {
    redirect('/error?message=unauthorized');
  }

  return (
    <div>
      <ChefNavigation role={roleData.role} />
      {children}
    </div>
  );
}
```

### 5.3 RLS Policies (Database Enforcement)

**Purpose:** Ensure database queries respect role boundaries

**Example: Events table RLS**

```sql
-- Chef and subaccounts can access events in their tenant
CREATE POLICY chef_access ON events
FOR ALL
USING (
  tenant_id = (
    SELECT tenant_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('chef', 'chef_subaccount')
  )
);

-- Clients cannot access events table at all via this policy
-- (Clients access events through a separate client-safe view)
```

### 5.4 Server Actions (Operation Permissions)

**Purpose:** Control which roles can perform which actions

**Example: Transition Event Status**

```typescript
export async function transitionEvent(eventId: string, toStatus: string) {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  // Only chef can transition events
  if (roleData.role !== 'chef') {
    throw new Error('Only chefs can transition event status');
  }

  // ... proceed with transition
}
```

---

## 6) Role-Based Permissions Matrix

### 6.1 Chef Portal Actions

| Action | chef | chef_subaccount | client |
|--------|------|-----------------|--------|
| **View Dashboard** | ✅ | ✅ | ❌ |
| **View Events** | ✅ | ✅ | ❌ |
| **Create Event** | ✅ | ⚠️ (if permitted) | ❌ |
| **Edit Event (draft)** | ✅ | ⚠️ (if permitted) | ❌ |
| **Transition Event Status** | ✅ | ❌ | ❌ |
| **Cancel Event** | ✅ | ❌ | ❌ |
| **View Clients** | ✅ | ✅ | ❌ |
| **Create Client** | ✅ | ⚠️ (if permitted) | ❌ |
| **Edit Client** | ✅ | ⚠️ (if permitted) | ❌ |
| **Send Invite** | ✅ | ❌ | ❌ |
| **View Menus** | ✅ | ✅ | ❌ |
| **Create Menu** | ✅ | ⚠️ (if permitted) | ❌ |
| **Lock Menu** | ✅ | ❌ | ❌ |
| **View Finance/Ledger** | ✅ | ❌ | ❌ |
| **Append Ledger Entry** | ✅ | ❌ | ❌ |
| **Connect Stripe** | ✅ | ❌ | ❌ |
| **Manage Settings** | ✅ | ❌ | ❌ |

**Legend:**
- ✅ Allowed
- ❌ Forbidden
- ⚠️ Conditionally allowed (configurable per subaccount)

### 6.2 Subaccount Permissions (If Implemented)

**V1 Subaccount Permissions (Simple Model):**

If subaccounts are implemented, they have **read-only or limited-write** access:

- ✅ View events, clients, menus
- ✅ Create/edit drafts (events, menus)
- ❌ Transition event status
- ❌ Lock menus
- ❌ Access finance
- ❌ Manage settings

**Permissions are hardcoded in V1, not configurable per user.**

---

## 7) Role Changes and Revocation

### 7.1 Can a User's Role Change?

**V1 Answer:** Rarely, but possible.

**Scenarios:**

1. **Client becomes chef:** If a client signs up as a chef separately, they get a second auth account (V1 does not support role switching)
2. **Subaccount promoted to chef:** Not supported in V1 (would require manual DB update)
3. **Chef demoted to subaccount:** Not supported in V1

**Role changes are out of scope for V1.** Users have one role for their lifetime in V1.

### 7.2 Revoking Access

**How to revoke a user's access:**

1. **Soft delete user_roles record:**
   ```sql
   DELETE FROM user_roles WHERE user_id = 'user-abc';
   ```
   Result: User can log in but has no role → access denied

2. **Disable auth account (Supabase):**
   ```typescript
   await supabase.auth.admin.updateUserById(userId, { banned: true });
   ```
   Result: User cannot log in at all

**V1 uses option 1 (delete user_roles record) for access revocation.**

---

## 8) Unknown or Undefined Roles

### 8.1 Handling Unknown Roles

**Scenario:** A user authenticates but has no entry in `user_roles` table.

**Behavior:**

```typescript
const roleData = await getUserRole(user.id);

if (!roleData) {
  // No role assigned → DENY ACCESS
  return showErrorPage('Your account is not set up. Contact support.');
}
```

**Key Principle:** **Fail closed.** No role = no access.

### 8.2 Handling Corrupt or Invalid Roles

**Scenario:** Database contains role value outside the enum (shouldn't happen due to CHECK constraint, but defensive coding).

```typescript
const validRoles = ['chef', 'chef_subaccount', 'client'];

if (!validRoles.includes(roleData.role)) {
  throw new Error('Invalid role detected');
}
```

---

## 9) Role Context in Server Components

### 9.1 Accessing Role in Server Components

```typescript
// app/(chef)/events/page.tsx
export default async function EventsPage() {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  if (!roleData) redirect('/error');

  const { role, tenant_id } = roleData;

  const events = await db.events.findMany({
    where: { tenant_id },
  });

  return (
    <div>
      <h1>Events</h1>
      <p>Role: {role}</p>
      <EventsList events={events} />
    </div>
  );
}
```

### 9.2 Passing Role to Client Components

**Server component renders role-aware UI:**

```typescript
// Server component
const roleData = await getUserRole(user.id);

return <EventCard event={event} userRole={roleData.role} />;
```

**Client component receives role as prop:**

```typescript
// Client component
'use client';

export function EventCard({ event, userRole }) {
  const canEdit = userRole === 'chef' && event.status === 'draft';

  return (
    <div>
      <h2>{event.name}</h2>
      {canEdit && <button>Edit</button>}
    </div>
  );
}
```

**Important:** Client component logic is UX only. Server must still enforce permissions.

---

## 10) Role Authority Testing

### 10.1 Test Scenarios

| Test | Expected Behavior |
|------|-------------------|
| **Chef accesses /chef/events** | ✅ Allowed |
| **Client accesses /chef/events** | ❌ Redirected to /client |
| **Subaccount accesses /chef/finance** | ❌ Access denied (UI hides link, server denies) |
| **User with no role accesses /chef** | ❌ Error page |
| **Chef tries to transition another tenant's event** | ❌ RLS blocks (zero rows affected) |

### 10.2 Verification Tests

**Test: Role resolution**

```typescript
describe('Role resolution', () => {
  it('resolves chef role correctly', async () => {
    const roleData = await getUserRole('user-abc');
    expect(roleData).toEqual({
      role: 'chef',
      tenant_id: 'tenant-1',
    });
  });

  it('returns null for user with no role', async () => {
    const roleData = await getUserRole('user-unknown');
    expect(roleData).toBeNull();
  });
});
```

**Test: Route guard**

```typescript
describe('Middleware route guard', () => {
  it('allows chef to access /chef/events', async () => {
    const req = mockRequest('/chef/events', { userId: 'user-abc' });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects client from /chef/events to /client', async () => {
    const req = mockRequest('/chef/events', { userId: 'user-ghi' });
    const res = await middleware(req);
    expect(res.status).toBe(307); // redirect
    expect(res.headers.get('Location')).toBe('/client');
  });
});
```

---

## 11) Role Authority Summary

### 11.1 Key Principles

1. **Role is stored in `user_roles` table** (authoritative source)
2. **Role is resolved server-side** from authenticated user ID
3. **Role is enforced at multiple layers** (middleware, layout, RLS, server actions)
4. **Unknown roles are denied access** (fail closed)
5. **Users cannot self-assign roles** (server-controlled)

### 11.2 Enforcement Stack

| Layer | Mechanism |
|-------|-----------|
| **Middleware** | Route guard (redirect or deny based on role) |
| **Server Layout** | Portal selection (render correct layout) |
| **RLS** | Database policies (filter by role + tenant) |
| **Server Actions** | Permission checks (reject unauthorized operations) |

### 11.3 One-Sentence Summary

**The Chef Portal role authority model uses a server-authoritative `user_roles` table to map authenticated users to one of three roles (chef, chef_subaccount, client), enforces access control at middleware, layout, RLS, and action layers, and fails closed when roles are unknown or invalid to ensure no unauthorized access is possible.**

---

**End of Role Authority Model**

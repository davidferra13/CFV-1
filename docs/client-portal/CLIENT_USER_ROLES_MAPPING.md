# Client User Roles Mapping

## Document Identity
- **File**: `CLIENT_USER_ROLES_MAPPING.md`
- **Category**: Identity & Linking (14/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines how the **`user_roles` table** establishes the authoritative mapping between auth identity and client profiles.

It specifies:
- The structure and purpose of the `user_roles` table
- How roles bind auth users to entities (clients/chefs)
- Role resolution logic and implementation
- Invariants that must always hold
- How role changes are handled

---

## The `user_roles` Table

### Purpose

The `user_roles` table is the **single source of truth** for:
- What role a user has (`'client'` or `'chef'`)
- Which entity (client profile or chef profile) they are linked to
- Which tenant they belong to

**System Law #2**: Role is stored ONLY in `user_roles` table. Never infer from URL, JWT, or client state.

---

### Schema

```sql
CREATE TABLE user_roles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth identity
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role assignment
  role user_role NOT NULL, -- ENUM: 'chef' | 'client'

  -- Entity binding
  entity_id UUID NOT NULL,

  -- Tenant binding (for multi-tenant isolation)
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT user_roles_auth_user_unique UNIQUE(auth_user_id, tenant_id, role)
);
```

**Note**: V1 simplification - one role per user globally (enforced by `UNIQUE(auth_user_id)`)

---

## Field Definitions

### `id` (UUID)

**Type**: UUID
**Default**: `gen_random_uuid()`
**Purpose**: Primary key

**Usage**: Internal database use only (rarely referenced)

---

### `auth_user_id` (UUID)

**Type**: UUID
**References**: `auth.users(id)` ON DELETE CASCADE
**Unique**: ✅ Yes (globally in V1)
**Immutable**: ✅ Yes
**Nullable**: ❌ No

**Purpose**: Links to Supabase Auth user

**Relationship**:
```
auth.users.id (canonical identity from Supabase)
    ↓
user_roles.auth_user_id (authoritative role binding)
```

**Key Points**:
- One role per user in V1 (enforced by UNIQUE constraint)
- CASCADE delete: If auth user deleted, role assignment deleted
- Never changes once created

**Validation**:
```typescript
// Must match authenticated session
if (session.user.id !== auth_user_id) {
  throw new Error('Unauthorized role assignment');
}
```

---

### `role` (user_role ENUM)

**Type**: ENUM (`'chef'` | `'client'`)
**Immutable**: ✅ Yes (cannot change role in V1)
**Nullable**: ❌ No

**Purpose**: Defines user's role in the system

**Enum Definition**:
```sql
CREATE TYPE user_role AS ENUM ('chef', 'client');
```

**Values**:
- `'chef'` - Tenant owner (private chef business)
- `'client'` - Customer of a specific chef

**Key Points**:
- Role NEVER inferred from frontend state
- Role NEVER stored in JWT claims (must query database)
- Role determines portal access (chef vs client)
- Cannot have multiple roles in V1

**V2 Consideration**: Multi-role users (e.g., user is both chef and client)

---

### `entity_id` (UUID)

**Type**: UUID
**Immutable**: ✅ Yes
**Nullable**: ❌ No

**Purpose**: Links to the specific entity (profile) for this role

**Interpretation**:
- If `role = 'chef'` → `entity_id` references `chefs.id`
- If `role = 'client'` → `entity_id` references `clients.id`

**Polymorphic Relationship**:
```
user_roles.role = 'chef'
  → user_roles.entity_id = chefs.id

user_roles.role = 'client'
  → user_roles.entity_id = clients.id
```

**Key Points**:
- No foreign key constraint (polymorphic)
- Application enforces referential integrity
- Entity must exist before role created
- Cannot change once set

**Example**:
```typescript
// Client role
{
  auth_user_id: 'aaa-111',
  role: 'client',
  entity_id: 'ccc-333', // clients.id
  tenant_id: 'ttt-999'  // chefs.id
}

// Chef role
{
  auth_user_id: 'bbb-222',
  role: 'chef',
  entity_id: 'ttt-999', // chefs.id (same as tenant_id for chefs)
  tenant_id: 'ttt-999'  // chefs.id
}
```

---

### `tenant_id` (UUID)

**Type**: UUID
**References**: `chefs(id)` ON DELETE CASCADE
**Immutable**: ✅ Yes
**Nullable**: ❌ No
**Indexed**: ✅ Yes

**Purpose**: Binds role to a specific tenant (multi-tenant isolation)

**Interpretation**:
- For **clients**: Which chef they are a client of
- For **chefs**: Their own tenant (self-reference)

**Multi-Tenancy**:
```
Chef role:
  tenant_id = chefs.id (self)
  entity_id = chefs.id (same)

Client role:
  tenant_id = chefs.id (which chef invited them)
  entity_id = clients.id (their profile)
```

**Key Points**:
- All roles scoped to a tenant
- RLS policies filter by `tenant_id`
- CASCADE delete: If chef deleted, all role assignments in that tenant deleted
- Cannot change once set (no tenant migration in V1)

---

### `created_at` (TIMESTAMPTZ)

**Type**: TIMESTAMPTZ
**Default**: `now()`
**Immutable**: ✅ Yes
**Nullable**: ❌ No

**Purpose**: Audit trail - when role was assigned

**Usage**:
- Track when user became chef/client
- Compliance and auditing

---

## Role Assignment Flow

### Chef Role Assignment (Signup)

```typescript
// 1. Chef signs up via Supabase Auth
const { data: authData } = await supabase.auth.signUp({
  email: 'chef@example.com',
  password: 'password123'
});

const auth_user_id = authData.user.id;

// 2. Create chef profile
const { data: chef } = await supabase
  .from('chefs')
  .insert({
    auth_user_id: auth_user_id,
    business_name: 'Chef Alice',
    email: 'chef@example.com'
  })
  .select()
  .single();

// 3. Assign chef role (authoritative)
await supabase
  .from('user_roles')
  .insert({
    auth_user_id: auth_user_id,
    role: 'chef',
    entity_id: chef.id,
    tenant_id: chef.id // Self-reference for chefs
  });
```

**Key Points**:
- Chef role assignment happens during onboarding
- `tenant_id = entity_id` for chefs (self-reference)
- Role cannot be changed after creation

---

### Client Role Assignment (Invitation-Based)

```typescript
// 1. Client signs up via invitation
const { data: authData } = await supabase.auth.signUp({
  email: 'client@example.com',
  password: 'password123'
});

const auth_user_id = authData.user.id;

// 2. Validate invitation
const invitation = await supabase
  .from('client_invitations')
  .select('*')
  .eq('token', invitationToken)
  .single();

// 3. Create client profile
const { data: client } = await supabase
  .from('clients')
  .insert({
    auth_user_id: auth_user_id,
    tenant_id: invitation.tenant_id, // From invitation
    email: invitation.email,
    full_name: invitation.full_name
  })
  .select()
  .single();

// 4. Assign client role (authoritative)
await supabase
  .from('user_roles')
  .insert({
    auth_user_id: auth_user_id,
    role: 'client',
    entity_id: client.id,
    tenant_id: invitation.tenant_id
  });

// 5. Mark invitation as used
await supabase
  .from('client_invitations')
  .update({ used_at: new Date() })
  .eq('token', invitationToken);
```

**Key Points**:
- Client role assignment happens after email verification
- `tenant_id` comes from invitation (determines which chef)
- Role cannot be changed after creation

---

## Role Resolution

### Server-Side Role Resolution

**Function**: `getCurrentUser()`

```typescript
import { createServerClient } from '@/lib/supabase/server';

export async function getCurrentUser() {
  const supabase = createServerClient();

  // 1. Get auth session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return null; // Not authenticated
  }

  const auth_user_id = session.user.id;

  // 2. Resolve role from database (authoritative)
  const { data: userRole, error } = await supabase
    .from('user_roles')
    .select('role, entity_id, tenant_id')
    .eq('auth_user_id', auth_user_id)
    .single();

  if (error || !userRole) {
    return null; // Role not assigned (orphaned account)
  }

  // 3. Return resolved identity
  return {
    auth_user_id: auth_user_id,
    email: session.user.email,
    role: userRole.role,
    entity_id: userRole.entity_id,
    tenant_id: userRole.tenant_id
  };
}
```

**Usage**:
```typescript
// Middleware
const user = await getCurrentUser();

if (!user) {
  return NextResponse.redirect('/login');
}

if (user.role === 'client') {
  // Allow client portal access
} else if (user.role === 'chef') {
  // Redirect to chef portal
}
```

---

### RLS Helper Functions

#### `get_current_user_role()`

```sql
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns**: `'chef'` | `'client'` | NULL

**Usage in RLS**:
```sql
CREATE POLICY clients_client_select ON clients
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );
```

---

#### `get_current_tenant_id()`

```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns**: UUID (tenant/chef ID) or NULL

**Usage in RLS**:
```sql
CREATE POLICY events_chef_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

#### `get_current_client_id()`

```sql
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns**: UUID (client profile ID) or NULL

**Usage in RLS**:
```sql
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

---

## Invariants

### Invariant 1: One Role Per User (V1)

```sql
-- Enforced by UNIQUE constraint
UNIQUE(auth_user_id)
```

**Rule**: Each auth user has exactly one role.

**Violations**:
- ❌ User with multiple roles (chef + client)
- ❌ User with duplicate role assignments

**V2 Consideration**: Remove constraint to allow multi-role users

---

### Invariant 2: Entity Must Exist

**Rule**: `entity_id` must reference an existing entity.

**Validation** (application-level):
```typescript
// Before creating role, validate entity exists
if (role === 'client') {
  const client = await supabase
    .from('clients')
    .select('id')
    .eq('id', entity_id)
    .single();

  if (!client) {
    throw new Error('Client entity does not exist');
  }
}
```

**Violations**:
- ❌ `entity_id` referencing non-existent client
- ❌ `entity_id` referencing deleted entity

---

### Invariant 3: Tenant Must Exist

```sql
-- Enforced by foreign key
FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE
```

**Rule**: `tenant_id` must reference an existing chef.

**Violations**:
- ❌ `tenant_id` referencing non-existent chef
- ✅ Cascade delete: If chef deleted, role assignments deleted

---

### Invariant 4: Role and Entity Type Match

**Rule**: If `role = 'client'`, then `entity_id` must reference `clients.id`.

**Validation** (application-level):
```typescript
if (role === 'client') {
  const client = await supabase
    .from('clients')
    .select('id')
    .eq('id', entity_id)
    .single();

  if (!client) {
    throw new Error('entity_id must reference a client for role=client');
  }
}

if (role === 'chef') {
  const chef = await supabase
    .from('chefs')
    .select('id')
    .eq('id', entity_id)
    .single();

  if (!chef) {
    throw new Error('entity_id must reference a chef for role=chef');
  }
}
```

**Violations**:
- ❌ `role = 'client'` but `entity_id` references `chefs.id`
- ❌ `role = 'chef'` but `entity_id` references `clients.id`

---

### Invariant 5: Chef Role Has Self-Reference

**Rule**: If `role = 'chef'`, then `entity_id = tenant_id`.

**Validation**:
```typescript
if (role === 'chef' && entity_id !== tenant_id) {
  throw new Error('Chef role must have entity_id = tenant_id');
}
```

**Violations**:
- ❌ Chef with mismatched `entity_id` and `tenant_id`

---

## Role Changes

### V1: No Role Changes

**Rule**: Once a role is assigned, it **cannot** be changed.

**Reasons**:
- Simplifies identity model
- Prevents unauthorized privilege escalation
- Reduces complexity

**Workaround**: Delete account and create new one with different role

---

### V2: Potential Role Upgrade

**Scenario**: Client wants to become a chef

**Flow**:
```typescript
// 1. Create chef profile
const { data: chef } = await supabase
  .from('chefs')
  .insert({
    auth_user_id: auth_user_id,
    business_name: 'New Chef Business',
    email: session.user.email
  })
  .select()
  .single();

// 2. Create new chef role assignment
await supabase
  .from('user_roles')
  .insert({
    auth_user_id: auth_user_id,
    role: 'chef',
    entity_id: chef.id,
    tenant_id: chef.id
  });

// Note: Existing client role remains (multi-role user)
```

**V2 Requirement**: Remove `UNIQUE(auth_user_id)` constraint

---

## RLS Policies

### User Can Read Own Role

```sql
CREATE POLICY user_roles_self_select ON user_roles
  FOR SELECT USING (
    auth_user_id = auth.uid()
  );
```

**Purpose**: Allow users to query their own role

**Usage**:
```typescript
const { data: role } = await supabase
  .from('user_roles')
  .select('role, entity_id, tenant_id')
  .eq('auth_user_id', session.user.id)
  .single();
```

---

### No User Writes

**Rule**: Only service role can INSERT/UPDATE/DELETE user roles

**Reason**: Prevent privilege escalation

**Implementation**:
- No RLS policies for INSERT/UPDATE/DELETE
- Only server-side code with service role can mutate

---

## Testing

### Verify Role Assignment

```typescript
test('Client role assigned on signup', async () => {
  // 1. Create client via invitation
  const { user, client } = await signUpClient({
    email: 'test@example.com',
    invitationToken: validToken
  });

  // 2. Verify role exists
  const role = await getUserRole(user.id);

  expect(role.auth_user_id).toBe(user.id);
  expect(role.role).toBe('client');
  expect(role.entity_id).toBe(client.id);
  expect(role.tenant_id).toBe(invitation.tenant_id);
});
```

---

### Verify Role Resolution

```typescript
test('getCurrentUser resolves client role', async () => {
  // 1. Log in as client
  await signIn('client@example.com', 'password');

  // 2. Resolve user
  const user = await getCurrentUser();

  expect(user.role).toBe('client');
  expect(user.entity_id).toBeDefined();
  expect(user.tenant_id).toBeDefined();
});
```

---

### Verify Invariants

```typescript
test('Cannot assign duplicate role', async () => {
  // 1. Assign client role
  await assignRole({
    auth_user_id: 'aaa-111',
    role: 'client',
    entity_id: 'ccc-333',
    tenant_id: 'ttt-999'
  });

  // 2. Attempt duplicate assignment
  await expect(
    assignRole({
      auth_user_id: 'aaa-111',
      role: 'client',
      entity_id: 'ccc-444',
      tenant_id: 'ttt-999'
    })
  ).rejects.toThrow('duplicate key value violates unique constraint');
});
```

---

## Edge Cases

### Orphaned Auth User

**Scenario**: Auth user exists but no role assigned

**Detection**:
```typescript
const user = await getCurrentUser();

if (!user || !user.role) {
  // Orphaned account → redirect to setup
  return redirect('/account-setup-incomplete');
}
```

**Causes**:
- Signup interrupted before role assignment
- Role manually deleted (admin action)
- Database inconsistency

**Resolution**: Complete signup flow or contact support

---

### Deleted Entity

**Scenario**: `entity_id` references deleted client/chef

**Prevention**: Use soft deletes (not hard deletes)

**Detection**:
```typescript
if (role === 'client') {
  const client = await supabase
    .from('clients')
    .select('id, is_deleted')
    .eq('id', entity_id)
    .single();

  if (client.is_deleted) {
    // Account soft-deleted → deny access
    return redirect('/account-deleted');
  }
}
```

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_AUTH_FLOW.md](./CLIENT_AUTH_FLOW.md)
- [CLIENT_ROLE_RESOLUTION_FLOW.md](./CLIENT_ROLE_RESOLUTION_FLOW.md)
- [CLIENT_AUTHORIZATION_INVARIANTS.md](./CLIENT_AUTHORIZATION_INVARIANTS.md)
- [CLIENT_TABLE_USER_ROLES.md](./CLIENT_TABLE_USER_ROLES.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

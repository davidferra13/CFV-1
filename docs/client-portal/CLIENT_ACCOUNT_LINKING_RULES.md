# Client Account Linking Rules

## Document Identity
- **File**: `CLIENT_ACCOUNT_LINKING_RULES.md`
- **Category**: Identity & Linking (15/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **rules and mechanisms** for linking client accounts in the ChefFlow system.

It specifies:
- How auth identity links to client profiles
- How client profiles link across tenants
- When and how linking occurs
- What constitutes a valid link
- How broken links are detected and resolved

---

## Identity Linking Model

### Three-Layer Identity Chain

```
Layer 1: Auth Identity (Supabase Auth)
  auth.users.id (auth_user_id)
    ↓
Layer 2: Role Binding (ChefFlow)
  user_roles.auth_user_id → role → entity_id → tenant_id
    ↓
Layer 3: Profile Data (ChefFlow)
  clients.id (entity_id)
  clients.tenant_id
  clients.email (matches auth.users.email)
```

**Invariant**: All three layers must be consistent for valid identity.

---

## Linking Rule 1: Auth-to-Role Link

### Definition

**Rule**: `user_roles.auth_user_id` must reference an existing `auth.users.id`.

### Enforcement

```sql
-- Foreign key constraint
FOREIGN KEY (auth_user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE
```

### Behavior

**Creation**:
```typescript
// Step 1: Auth user created
const { data: authData } = await supabase.auth.signUp({
  email: 'client@example.com',
  password: 'password123'
});

const auth_user_id = authData.user.id;

// Step 2: Role assigned (links to auth)
await supabase
  .from('user_roles')
  .insert({
    auth_user_id: auth_user_id, // ← Link established
    role: 'client',
    entity_id: client_id,
    tenant_id: tenant_id
  });
```

**Deletion**:
```
If auth.users deleted
  → user_roles CASCADE deleted
  → Profile orphaned (no valid auth)
```

### Validation

```typescript
// Verify link exists
const { data: role } = await supabase
  .from('user_roles')
  .select('auth_user_id, role, entity_id')
  .eq('auth_user_id', auth_user_id)
  .single();

if (!role) {
  throw new Error('Auth-to-role link broken: no role assigned');
}
```

---

## Linking Rule 2: Role-to-Profile Link

### Definition

**Rule**: `user_roles.entity_id` must reference an existing client profile (`clients.id`).

### Enforcement

Application-level (no database foreign key due to polymorphic relationship).

### Behavior

**Creation**:
```typescript
// Step 1: Client profile created
const { data: client } = await supabase
  .from('clients')
  .insert({
    auth_user_id: auth_user_id,
    tenant_id: invitation.tenant_id,
    email: 'client@example.com',
    full_name: 'John Doe'
  })
  .select()
  .single();

// Step 2: Role links to profile
await supabase
  .from('user_roles')
  .insert({
    auth_user_id: auth_user_id,
    role: 'client',
    entity_id: client.id, // ← Link established
    tenant_id: client.tenant_id
  });
```

**Deletion** (soft delete):
```typescript
// Client profile soft-deleted
await supabase
  .from('clients')
  .update({ is_deleted: true })
  .eq('id', client_id);

// Role still exists, but profile marked deleted
// Access denied at application layer
```

### Validation

```typescript
// Verify profile exists and is active
const { data: client } = await supabase
  .from('clients')
  .select('id, is_deleted')
  .eq('id', entity_id)
  .single();

if (!client) {
  throw new Error('Role-to-profile link broken: profile does not exist');
}

if (client.is_deleted) {
  throw new Error('Role-to-profile link broken: profile soft-deleted');
}
```

---

## Linking Rule 3: Email Consistency

### Definition

**Rule**: `auth.users.email` must match `clients.email` (after sync).

### Enforcement

Application-level (synced on email change).

### Behavior

**Initial Setup**:
```typescript
// Email set during signup (automatically consistent)
const { data: authData } = await supabase.auth.signUp({
  email: 'client@example.com',
  password: 'password123'
});

const { data: client } = await supabase
  .from('clients')
  .insert({
    auth_user_id: authData.user.id,
    email: 'client@example.com', // ← Matches auth email
    tenant_id: tenant_id,
    full_name: 'John Doe'
  });
```

**Email Change**:
```typescript
// Step 1: Client requests email change via Supabase Auth
const { error } = await supabase.auth.updateUser({
  email: 'newemail@example.com'
});

// Step 2: Supabase sends verification email

// Step 3: Client clicks verification link
// → auth.users.email updated
// → auth.users.email_confirmed_at updated

// Step 4: Application syncs email to profile
const session = await supabase.auth.getSession();
await supabase
  .from('clients')
  .update({ email: session.user.email })
  .eq('auth_user_id', session.user.id);
```

### Validation

```typescript
// Verify email consistency
const { data: { user } } = await supabase.auth.getUser();
const { data: client } = await supabase
  .from('clients')
  .select('email')
  .eq('auth_user_id', user.id)
  .single();

if (user.email !== client.email) {
  // Sync issue detected → trigger repair
  await syncEmailToProfile(user.id);
}
```

---

## Linking Rule 4: Tenant Consistency

### Definition

**Rule**: `user_roles.tenant_id` must match `clients.tenant_id`.

### Enforcement

Application-level (validated during role creation).

### Behavior

**Creation**:
```typescript
// Client profile and role must have matching tenant_id
const client = await supabase
  .from('clients')
  .insert({
    auth_user_id: auth_user_id,
    tenant_id: invitation.tenant_id,
    email: email,
    full_name: full_name
  })
  .select()
  .single();

await supabase
  .from('user_roles')
  .insert({
    auth_user_id: auth_user_id,
    role: 'client',
    entity_id: client.id,
    tenant_id: client.tenant_id // ← Must match
  });
```

### Validation

```typescript
// Verify tenant consistency
const { data: role } = await supabase
  .from('user_roles')
  .select('tenant_id, entity_id')
  .eq('auth_user_id', auth_user_id)
  .single();

const { data: client } = await supabase
  .from('clients')
  .select('tenant_id')
  .eq('id', role.entity_id)
  .single();

if (role.tenant_id !== client.tenant_id) {
  throw new Error('Tenant mismatch between role and profile');
}
```

---

## Multi-Tenant Linking

### Scenario: Same Email, Different Tenants

**Setup**:
- `client@example.com` has profile in Tenant A
- `client@example.com` books with Tenant B (different chef)

**Result**:
```
One auth.users record:
  id: 'aaa-111'
  email: 'client@example.com'

Two clients records:
  1. { id: 'ccc-111', auth_user_id: 'aaa-111', tenant_id: 'ttt-aaa' }
  2. { id: 'ccc-222', auth_user_id: 'aaa-111', tenant_id: 'ttt-bbb' }

Two user_roles records (V2 only):
  1. { auth_user_id: 'aaa-111', role: 'client', entity_id: 'ccc-111', tenant_id: 'ttt-aaa' }
  2. { auth_user_id: 'aaa-111', role: 'client', entity_id: 'ccc-222', tenant_id: 'ttt-bbb' }
```

**V1 Limitation**: Multi-tenant clients not supported (UNIQUE constraint on `auth_user_id` in `user_roles`).

**V2 Enhancement**: Remove unique constraint, allow multiple roles per user.

---

## Link Validation on Login

### Middleware Validation Flow

```typescript
export async function middleware(request: NextRequest) {
  const supabase = createServerClient();

  // 1. Validate auth session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect('/login');
  }

  const auth_user_id = session.user.id;

  // 2. Validate auth-to-role link
  const { data: role } = await supabase
    .from('user_roles')
    .select('role, entity_id, tenant_id')
    .eq('auth_user_id', auth_user_id)
    .single();

  if (!role) {
    // Link 1 broken: no role assigned
    return NextResponse.redirect('/account-setup-incomplete');
  }

  // 3. Validate role-to-profile link (clients only)
  if (role.role === 'client') {
    const { data: client } = await supabase
      .from('clients')
      .select('id, is_deleted, email')
      .eq('id', role.entity_id)
      .single();

    if (!client) {
      // Link 2 broken: profile does not exist
      return NextResponse.redirect('/account-error');
    }

    if (client.is_deleted) {
      // Link 2 broken: profile soft-deleted
      return NextResponse.redirect('/account-deleted');
    }

    // 4. Validate email consistency
    if (session.user.email !== client.email) {
      // Link 3 broken: email mismatch → auto-repair
      await syncEmailToProfile(auth_user_id);
    }

    // 5. Validate tenant consistency
    if (role.tenant_id !== client.tenant_id) {
      // Link 4 broken: tenant mismatch (critical error)
      console.error('Tenant mismatch detected', {
        auth_user_id,
        role_tenant: role.tenant_id,
        client_tenant: client.tenant_id
      });
      return NextResponse.redirect('/account-error');
    }
  }

  // All links valid → proceed
  return NextResponse.next();
}
```

---

## Broken Link Detection

### Auto-Repair Scenarios

| Broken Link | Cause | Auto-Repair? | Repair Action |
|-------------|-------|--------------|---------------|
| Email mismatch | Email changed in auth, not synced | ✅ Yes | Sync `auth.users.email` → `clients.email` |
| Profile soft-deleted | Client requested deletion | ❌ No | Deny access, show deletion notice |
| Role missing | Signup incomplete | ❌ No | Redirect to complete signup |
| Tenant mismatch | Data corruption | ❌ No | Log error, deny access |

---

### Manual Repair Scenarios

**Orphaned Auth User** (no role):
```sql
-- Admin query: Find orphaned auth users
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN user_roles ur ON ur.auth_user_id = au.id
WHERE ur.id IS NULL
  AND au.created_at < now() - interval '1 hour';
```

**Resolution**: Complete signup flow or delete auth user.

---

**Orphaned Profile** (no role):
```sql
-- Admin query: Find orphaned client profiles
SELECT c.id, c.email, c.tenant_id, c.created_at
FROM clients c
LEFT JOIN user_roles ur ON ur.entity_id = c.id AND ur.role = 'client'
WHERE ur.id IS NULL;
```

**Resolution**: Create missing role assignment or delete profile.

---

## Link Immutability

### What Cannot Change

| Link | Field | Reason |
|------|-------|--------|
| Auth-to-Role | `user_roles.auth_user_id` | Identity anchor |
| Role-to-Profile | `user_roles.entity_id` | Entity binding |
| Profile-to-Tenant | `clients.tenant_id` | Tenant isolation |

**Rule**: Once links established, they are **immutable**.

### What Can Change

| Link | Field | How |
|------|-------|-----|
| Email Consistency | `clients.email` | Synced after auth email change |
| Profile Active Status | `clients.is_deleted` | Soft delete flag |

---

## Link Lifecycle

### Creation Flow

```
1. Auth user created (Supabase Auth)
   → auth.users.id generated

2. Email verified (Supabase Auth)
   → auth.users.email_confirmed_at set

3. Client profile created (ChefFlow)
   → clients record inserted
   → auth_user_id = auth.users.id (Link 1)
   → tenant_id = invitation.tenant_id
   → email = auth.users.email (Link 3)

4. Role assigned (ChefFlow)
   → user_roles record inserted
   → auth_user_id = auth.users.id (Link 1)
   → entity_id = clients.id (Link 2)
   → tenant_id = clients.tenant_id (Link 4)

5. Links validated (Middleware)
   → All four links verified on every request
```

---

### Deletion Flow (Soft Delete)

```
1. Client requests deletion
   → clients.is_deleted = true
   → clients.deleted_at = now()

2. Link 2 (role-to-profile) becomes invalid
   → Access denied at application layer

3. Auth user remains (Supabase-managed)
   → Can potentially reactivate account

4. Role remains (audit trail)
   → entity_id still references deleted profile
```

---

### Deletion Flow (Hard Delete)

```
1. Auth user deleted (admin action or Supabase cleanup)
   → auth.users record deleted

2. Cascade delete triggered
   → user_roles CASCADE deleted (Link 1 enforced)
   → clients CASCADE deleted (auth_user_id foreign key)

3. All links destroyed
   → No orphaned records
```

---

## Testing Link Integrity

### Test: Valid Link Creation

```typescript
test('All links established on signup', async () => {
  // 1. Create client via invitation
  const { user, client, role } = await signUpClient({
    email: 'test@example.com',
    invitationToken: validToken
  });

  // 2. Verify Link 1: Auth-to-Role
  expect(role.auth_user_id).toBe(user.id);

  // 3. Verify Link 2: Role-to-Profile
  expect(role.entity_id).toBe(client.id);

  // 4. Verify Link 3: Email Consistency
  expect(client.email).toBe(user.email);

  // 5. Verify Link 4: Tenant Consistency
  expect(role.tenant_id).toBe(client.tenant_id);
});
```

---

### Test: Broken Link Detection

```typescript
test('Middleware detects orphaned auth user', async () => {
  // 1. Create auth user (no profile, no role)
  const { user } = await supabase.auth.signUp({
    email: 'orphan@example.com',
    password: 'password123'
  });

  // 2. Attempt to access client portal
  const response = await fetch('/my-events', {
    headers: { Authorization: `Bearer ${user.access_token}` }
  });

  // 3. Verify redirect to account setup
  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/account-setup-incomplete');
});
```

---

### Test: Email Sync Repair

```typescript
test('Email mismatch auto-repaired', async () => {
  // 1. Create client
  const { user, client } = await signUpClient({
    email: 'original@example.com',
    invitationToken: validToken
  });

  // 2. Change email in auth (simulate manual DB change)
  await supabase.auth.admin.updateUserById(user.id, {
    email: 'updated@example.com'
  });

  // 3. Access portal (triggers middleware)
  await fetch('/my-events', {
    headers: { Authorization: `Bearer ${user.access_token}` }
  });

  // 4. Verify email synced to profile
  const updatedClient = await getClient(client.id);
  expect(updatedClient.email).toBe('updated@example.com');
});
```

---

## Security Implications

### Link Hijacking Prevention

**Attack**: Attacker changes `user_roles.auth_user_id` to hijack another user's role.

**Prevention**:
- ✅ No RLS policies allow client writes to `user_roles`
- ✅ Only service role can mutate `user_roles`
- ✅ Middleware validates links on every request

---

### Cross-Tenant Link Prevention

**Attack**: Link client profile from Tenant A to role in Tenant B.

**Prevention**:
- ✅ Tenant consistency validated (Link 4)
- ✅ RLS filters by `tenant_id`
- ✅ Application-level validation during role creation

---

### Email Spoofing Prevention

**Attack**: Change `clients.email` without changing `auth.users.email`.

**Prevention**:
- ✅ Email changes must go through Supabase Auth (verification required)
- ✅ Application syncs email after verification
- ✅ Middleware detects and repairs email mismatches

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_AUTH_FLOW.md](./CLIENT_AUTH_FLOW.md)
- [CLIENT_USER_ROLES_MAPPING.md](./CLIENT_USER_ROLES_MAPPING.md)
- [CLIENT_MERGE_PROCESS.md](./CLIENT_MERGE_PROCESS.md)
- [CLIENT_DUPLICATE_PREVENTION.md](./CLIENT_DUPLICATE_PREVENTION.md)
- [CLIENT_AUTHORIZATION_INVARIANTS.md](./CLIENT_AUTHORIZATION_INVARIANTS.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

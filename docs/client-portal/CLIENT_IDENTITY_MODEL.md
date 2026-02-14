# Client Identity Model

## Document Identity
- **File**: `CLIENT_IDENTITY_MODEL.md`
- **Category**: Identity & Linking (11/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **identity model** for clients in the ChefFlow system.

It specifies:
- How client identity is established
- How identity is linked across auth and profile
- What constitutes canonical identity
- How duplicate identities are prevented
- How identity is verified

---

## Identity Hierarchy

```
Supabase Auth User (auth.users)
├── auth_user_id (UUID) ← Canonical identity anchor
└── email (verified or unverified)
    │
    ├─→ user_roles
    │   ├── auth_user_id → role → entity_id → tenant_id
    │   └── Maps auth identity to application role
    │
    └─→ clients (Client Profile)
        ├── id (client_id, UUID)
        ├── email (matches auth.users.email)
        ├── tenant_id (chef they're working with)
        └── Profile data (name, phone, preferences)
```

---

## Canonical Identity

### Primary Key: `auth_user_id`

The **canonical identity** for a client is `auth.users.id` (auth_user_id).

| Property | Value |
|----------|-------|
| **Source** | Supabase Auth (`auth.users.id`) |
| **Type** | UUID |
| **Immutable** | Yes (never changes) |
| **Uniqueness** | Globally unique |

### Why `auth_user_id` is Canonical

- **Single source of truth**: Managed by Supabase Auth
- **Immutable**: Does not change even if email changes
- **Session-tied**: `auth.uid()` in RLS policies
- **Verifiable**: JWT contains `sub` claim = `auth_user_id`

---

## Identity Components

### 1. Auth Identity (`auth.users`)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Canonical identity (auth_user_id) |
| `email` | TEXT | Login credential |
| `email_confirmed_at` | TIMESTAMP | Email verification status |
| `encrypted_password` | TEXT | Hashed password (Supabase-managed) |
| `created_at` | TIMESTAMP | Account creation time |

**Managed by**: Supabase Auth (not directly mutable by application)

---

### 2. Role Mapping (`user_roles`)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `auth_user_id` | UUID | Links to `auth.users.id` |
| `role` | TEXT | Role enum: `'client'`, `'chef'`, `'admin'` |
| `entity_id` | UUID | Links to `clients.id` or `chefs.id` |
| `tenant_id` | UUID | Tenant (chef) this role applies to |

**Purpose**: Binds auth identity to application role and entity.

**Example**:
```
auth_user_id = 'aaa-111'
role = 'client'
entity_id = 'ccc-333' (client_id)
tenant_id = 'ttt-999' (chef's tenant)
```

---

### 3. Client Profile (`clients`)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Client profile ID (entity_id) |
| `tenant_id` | UUID | Chef (tenant) this profile belongs to |
| `email` | TEXT | Client email (matches auth.users.email) |
| `full_name` | TEXT | Client display name |
| `phone` | TEXT | Client phone |
| `dietary_restrictions` | TEXT[] | Dietary preferences |
| `allergies` | TEXT[] | Allergy information |
| `favorite_dishes` | TEXT[] | Preferred dishes |
| `created_at` | TIMESTAMP | Profile creation time |

**Owned by**: Client (mutable via client portal)

---

## Identity Resolution Flow

### Step 1: User Logs In
```
User provides: email + password
Supabase Auth validates credentials
→ JWT issued with auth_user_id (auth.uid())
```

### Step 2: Session Established
```
Middleware extracts auth_user_id from session
→ auth_user_id = auth.uid()
```

### Step 3: Role Resolution
```sql
SELECT role, entity_id, tenant_id
FROM user_roles
WHERE auth_user_id = auth.uid()
LIMIT 1;
```

### Step 4: Profile Access
```sql
SELECT *
FROM clients
WHERE id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client' LIMIT 1)
  AND tenant_id = (SELECT tenant_id FROM user_roles WHERE auth_user_id = auth.uid() LIMIT 1);
```

---

## Identity Linking

### Auth ↔ Role ↔ Profile Chain

```
auth.users.id (auth_user_id)
    ↓
user_roles.auth_user_id = auth.users.id
user_roles.role = 'client'
user_roles.entity_id = clients.id
user_roles.tenant_id = chefs.id
    ↓
clients.id = user_roles.entity_id
clients.tenant_id = user_roles.tenant_id
```

**Invariant**: All three links must exist for valid identity.

---

## Identity Verification

### Email Verification Requirement

| Scenario | Email Verification Required? |
|----------|----------------------------|
| **Sign up via invitation** | ✅ Yes (click invite link) |
| **Sign up via magic link** | ✅ Yes (automatic) |
| **Sign up via email/password** | ✅ Yes (verify email) |
| **Login (already verified)** | ❌ No (already verified) |

### Verification Flow

1. User signs up → `auth.users` created with `email_confirmed_at = NULL`
2. Supabase sends verification email
3. User clicks link → `email_confirmed_at` set to now
4. Client profile creation allowed

**Unverified emails cannot access client portal.**

---

## Identity Uniqueness

### Uniqueness Constraints

| Table | Constraint | Purpose |
|-------|-----------|---------|
| `auth.users` | `UNIQUE(email)` | One auth account per email (global) |
| `clients` | `UNIQUE(tenant_id, email)` | One client profile per email per tenant |
| `user_roles` | `UNIQUE(auth_user_id, tenant_id, role)` | One role per user per tenant |

### What This Means

- **Global email uniqueness**: Email `client@example.com` can only exist once in `auth.users`
- **Tenant-scoped profile**: Same email can have separate profiles in different tenants
- **Role uniqueness**: One user cannot have duplicate roles in same tenant

---

## Identity Duplication Scenarios

### Scenario 1: Same Email, Same Tenant

**Setup**: `client@example.com` already has profile in Tenant A

**Action**: `client@example.com` tries to create another profile in Tenant A

**Outcome**: ❌ Blocked by `UNIQUE(tenant_id, email)` constraint

**Resolution**: Merge flow triggered (see [CLIENT_MERGE_PROCESS.md](./CLIENT_MERGE_PROCESS.md))

---

### Scenario 2: Same Email, Different Tenant

**Setup**: `client@example.com` has profile in Tenant A

**Action**: `client@example.com` books with Tenant B (different chef)

**Outcome**: ✅ Allowed (separate tenant)

**Result**:
- One `auth.users` record (auth_user_id = same)
- Two `clients` records (one per tenant)
- Two `user_roles` records (one per tenant)

**V1 Limitation**: Client sees only one tenant at a time (no multi-tenant switcher)

---

### Scenario 3: Different Email, Same Person

**Setup**: Client books as `client@gmail.com`, later books as `client@work.com`

**Outcome**: ✅ Two separate identities (no automatic linking)

**V1 Behavior**: Two distinct client profiles

**V2 Consideration**: Identity merge tool for manual linking

---

## Identity Lifecycle

### 1. Creation

```
User signs up
→ auth.users created (auth_user_id)
→ Email verification sent
→ User clicks verify link
→ clients record created
→ user_roles record created
→ Identity established
```

### 2. Active Use

```
User logs in
→ JWT issued with auth_user_id
→ Middleware resolves role + entity_id + tenant_id
→ Client portal displays personalized data
```

### 3. Email Change

```
User requests email change
→ Supabase Auth updates auth.users.email
→ New email verification sent
→ User clicks verify link
→ clients.email updated to match
→ Identity preserved (auth_user_id unchanged)
```

### 4. Deletion (Soft Delete)

```
User requests account deletion
→ clients.is_deleted = true
→ user_roles.is_deleted = true
→ auth.users remains (Supabase-managed)
→ Identity preserved for audit
```

---

## Identity and Sessions

### Session Contents

JWT contains:
- `sub` = `auth_user_id`
- `email` = user email
- `email_verified` = true/false
- `aud` = "authenticated"

### Middleware Validates

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Not authenticated → redirect to login
}

const { data: role } = await supabase
  .from('user_roles')
  .select('role, entity_id, tenant_id')
  .eq('auth_user_id', user.id)
  .single();

if (role.role !== 'client') {
  // Not a client → redirect to chef portal or deny
}

// Attach to session: auth_user_id, client_id, tenant_id
```

---

## Identity Immutability

### What Cannot Change

| Field | Immutable | Reason |
|-------|-----------|--------|
| `auth.users.id` | ✅ Yes | Canonical identity |
| `user_roles.auth_user_id` | ✅ Yes | Links to auth identity |
| `clients.id` | ✅ Yes | Entity primary key |
| `clients.tenant_id` | ✅ Yes | Tenant binding |

### What Can Change

| Field | Mutable | How |
|-------|---------|-----|
| `auth.users.email` | ✅ Yes | Supabase Auth email change flow |
| `clients.email` | ✅ Yes | Updated after auth email verified |
| `clients.full_name` | ✅ Yes | Client edits profile |
| `clients.phone` | ✅ Yes | Client edits profile |
| `clients.dietary_restrictions` | ✅ Yes | Client edits preferences |

---

## Identity and Multi-Tenancy

### V1: Single-Tenant Client

Client identity is **tenant-scoped** in V1:
- One active tenant per session
- No tenant switching in UI
- Profile data isolated per tenant

### V2: Multi-Tenant Client (Future)

Potential V2 enhancements:
- Tenant switcher UI
- Aggregated cross-tenant views
- Unified client profile
- Single loyalty balance across tenants

**V1 does not support multi-tenant client access.**

---

## Identity Security

### Protection Mechanisms

| Threat | Protection |
|--------|-----------|
| **Identity theft** | Email verification required |
| **Session hijacking** | JWT expiration + refresh tokens |
| **Unauthorized role escalation** | Role resolved from database, not JWT |
| **Cross-client impersonation** | RLS filters by auth_user_id |
| **Cross-tenant access** | RLS filters by tenant_id |

---

## Related Documents

- [CLIENT_AUTH_FLOW.md](./CLIENT_AUTH_FLOW.md)
- [CLIENT_ROLE_RESOLUTION_FLOW.md](./CLIENT_ROLE_RESOLUTION_FLOW.md)
- [CLIENT_MERGE_PROCESS.md](./CLIENT_MERGE_PROCESS.md)
- [CLIENT_DUPLICATE_PREVENTION.md](./CLIENT_DUPLICATE_PREVENTION.md)
- [CLIENT_TABLE_CLIENTS.md](./CLIENT_TABLE_CLIENTS.md)
- [CLIENT_TABLE_USER_ROLES.md](./CLIENT_TABLE_USER_ROLES.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

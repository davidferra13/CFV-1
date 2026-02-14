# Public Layer - Role Resolution Flow

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines how user roles are determined after authentication, including the database query, caching strategy, and error handling.

---

## Core Principle: Database is Authoritative

**Rule**: User role MUST be determined by querying `user_roles` table. NEVER infer role from URL, session claims, or client-side state.

---

## Role Resolution Function

### Implementation
```typescript
// lib/auth/get-user-role.ts
import { createClient } from '@/lib/supabase/server';

export async function getUserRole(authUserId: string): Promise<'chef' | 'client' | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    console.error('Role resolution failed', { authUserId, error });
    return null;
  }

  if (!data) {
    console.error('Role not found', { authUserId });
    return null;
  }

  return data.role as 'chef' | 'client';
}
```

---

## When Role Resolution Happens

### 1. Middleware (Every Request)
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.next(); // Unauthenticated user
  }

  // Resolve role for routing decisions
  const role = await getUserRole(session.user.id);

  // Redirect logic based on role...
}
```

**Frequency**: On EVERY authenticated request
**Performance**: <10ms (database query on edge)

---

### 2. After Signup/Signin
```typescript
// After successful authentication
const role = await getUserRole(authUserId);

if (role === 'chef') {
  redirect('/dashboard');
} else if (role === 'client') {
  redirect('/my-events');
} else {
  redirect('/error?code=no_role');
}
```

---

### 3. Header Navigation
```typescript
// components/public/Header.tsx
const session = await getSession();

if (session) {
  const role = await getUserRole(session.user.id);

  if (role === 'chef') {
    return <Link href="/dashboard">Go to Dashboard</Link>;
  } else if (role === 'client') {
    return <Link href="/my-events">Go to My Events</Link>;
  }
}
```

---

## Return Values

| Return Value | Meaning | Action |
|-------------|---------|--------|
| `'chef'` | User is a chef (tenant owner) | Redirect to /dashboard |
| `'client'` | User is a client (invited by chef) | Redirect to /my-events |
| `null` | User exists in auth.users but NO role assigned | Redirect to /error?code=no_role |

---

## Database Schema

### `user_roles` Table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL, -- 'chef' or 'client'
  entity_id UUID NOT NULL, -- References chefs.id OR clients.id
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);
```

**Key Constraint**: `auth_user_id` is UNIQUE (one user = one role)

---

## Flow Diagram

```
User authenticates (signin or signup)
  ↓
Supabase Auth creates session
  ↓
Session contains user.id (auth_user_id)
  ↓
Call getUserRole(user.id)
  ↓
Query: SELECT role FROM user_roles WHERE auth_user_id = user.id
  ↓
[Result Check]
  ↓
  role = 'chef' → Redirect to /dashboard
  role = 'client' → Redirect to /my-events
  role = NULL → Redirect to /error?code=no_role
```

---

## Error States

### Orphaned Account (No Role)
**Scenario**: User exists in `auth.users` but NOT in `user_roles`.

**Causes**:
- Signup transaction failed halfway
- Manual database manipulation (role deleted)
- Race condition (unlikely)

**Detection**:
```typescript
const role = await getUserRole(authUserId);
if (role === null) {
  // Orphaned account detected
}
```

**Resolution**:
1. Log error:
   ```typescript
   console.error('Orphaned account detected', { authUserId, timestamp: new Date() });
   ```
2. Redirect to error page:
   ```typescript
   redirect('/error?code=no_role');
   ```
3. Show error message:
   ```
   "Your account is incomplete. Please contact support at hello@chefflow.app"
   ```
4. Manual fix: Support team inserts role into `user_roles` table

---

### Database Connection Error
**Scenario**: Unable to query `user_roles` table (network issue, Supabase outage).

**Detection**:
```typescript
const { data, error } = await supabase.from('user_roles').select('role')...;
if (error) {
  console.error('Database error during role resolution', error);
}
```

**Resolution**:
- Return `null` (treat as orphaned account)
- Redirect to generic error page
- User must retry

---

### Multiple Roles (Should Never Happen)
**Scenario**: User has multiple rows in `user_roles` table (violates UNIQUE constraint).

**Prevention**: Database UNIQUE constraint prevents this:
```sql
CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);
```

**If it somehow happens**: Query returns first row (`.single()` will error, but without `.single()` it returns first match)

---

## Caching Strategy (V1: No Caching)

### Approach
Query `user_roles` table on EVERY role resolution (no cache).

**Rationale**:
- Ensures latest data (role changes are immediately reflected)
- Middleware runs at edge (very fast database query)
- Overhead is minimal (<10ms)

**Trade-off**: Extra database query per request, but guaranteed correctness.

---

### Future Caching (V1.1 Consideration)

#### Option 1: Store Role in JWT Claims
```typescript
// During signin, encode role in JWT
const { data: { session } } = await supabase.auth.signIn({
  email,
  password,
});

// Add role to JWT (requires Supabase Edge Function or custom auth)
// NOT available in V1
```

**Pros**: No database query on every request
**Cons**: Stale data if role changes (requires JWT refresh)

---

#### Option 2: In-Memory Cache (Edge Runtime)
```typescript
const roleCache = new Map<string, { role: 'chef' | 'client', expires: number }>();

export async function getUserRoleWithCache(authUserId: string) {
  const cached = roleCache.get(authUserId);

  if (cached && cached.expires > Date.now()) {
    return cached.role; // Return cached
  }

  // Query database
  const role = await getUserRole(authUserId);

  // Cache for 5 minutes
  roleCache.set(authUserId, {
    role,
    expires: Date.now() + 5 * 60 * 1000,
  });

  return role;
}
```

**Pros**: Reduces database queries
**Cons**: Stale data for up to 5 minutes

**Verdict for V1**: NO caching. Authoritative source is always database.

---

## Performance

### Target
- Role resolution: <10ms
- Total request (including middleware): <50ms

### Optimization
- Database index on `user_roles.auth_user_id` (already exists)
- Vercel Edge Runtime for middleware (global edge network)

### Measurement
```typescript
export async function getUserRole(authUserId: string) {
  const start = Date.now();

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', authUserId)
    .single();

  const duration = Date.now() - start;
  console.log('Role resolution time', { duration, authUserId });

  return data?.role || null;
}
```

---

## Multi-Role Users (NOT Supported in V1)

### Current Limitation
Users CANNOT have multiple roles (e.g., both chef and client).

### Enforcement
UNIQUE constraint on `auth_user_id` prevents multiple roles.

### Future (V2)
If multi-role is needed:
1. Remove UNIQUE constraint
2. Add `is_active` column to `user_roles`
3. Allow multiple rows per user, only one active at a time
4. Add role-switching UI

**V1 Verdict**: One user = one role (immutable).

---

## Role Assignment

### When Roles are Created

#### Chef Signup
```typescript
// During chef signup
await adminClient.from('user_roles').insert({
  auth_user_id: authUserId,
  role: 'chef',
  entity_id: chefId, // References chefs.id
});
```

#### Client Signup
```typescript
// During client signup (via invitation)
await adminClient.from('user_roles').insert({
  auth_user_id: authUserId,
  role: 'client',
  entity_id: clientId, // References clients.id
});
```

### Role Changes (NOT Supported in V1)
- Users CANNOT change their role after signup
- No role upgrade/downgrade UI
- Manual database edit required (support team only)

---

## Testing Scenarios

### Test 1: Chef Role Resolution
1. Sign up as chef
2. Sign in
3. Verify `getUserRole()` returns `'chef'`
4. Verify redirect to `/dashboard`

---

### Test 2: Client Role Resolution
1. Client signs up via invitation
2. Sign in
3. Verify `getUserRole()` returns `'client'`
4. Verify redirect to `/my-events`

---

### Test 3: Orphaned Account
1. Create auth user manually
2. Do NOT create role in `user_roles`
3. Attempt signin
4. Verify `getUserRole()` returns `null`
5. Verify redirect to `/error?code=no_role`

---

### Test 4: Role Resolution Performance
1. Sign in as chef
2. Measure time for `getUserRole()` call
3. Verify <10ms (database query)

---

### Test 5: Middleware Role Check
1. Sign in as chef
2. Visit `/signin` (while signed in)
3. Verify middleware queries role
4. Verify redirect to `/dashboard` (not signin page)

---

## Logging & Monitoring

### Log Role Resolutions
```typescript
export async function getUserRole(authUserId: string) {
  console.log('Resolving role', { authUserId });

  const { data, error } = await supabase...;

  if (error) {
    console.error('Role resolution error', { authUserId, error });
  } else if (!data) {
    console.warn('Orphaned account detected', { authUserId });
  } else {
    console.log('Role resolved', { authUserId, role: data.role });
  }

  return data?.role || null;
}
```

### Alerts (V1.1)
- Alert if orphaned accounts detected (manual intervention needed)
- Alert if role resolution takes >100ms (performance issue)

---

## Related Documents

- [PUBLIC_AUTH_OVERVIEW.md](./PUBLIC_AUTH_OVERVIEW.md) - High-level auth architecture
- [PUBLIC_SIGNIN_FLOW.md](./PUBLIC_SIGNIN_FLOW.md) - Signin implementation
- [PUBLIC_SIGNUP_FLOW.md](./PUBLIC_SIGNUP_FLOW.md) - Signup implementation
- [PUBLIC_AUTH_REDIRECT_RULES.md](./PUBLIC_AUTH_REDIRECT_RULES.md) - Post-auth routing logic

---

**Status**: This role resolution flow is LOCKED and authoritative for V1.

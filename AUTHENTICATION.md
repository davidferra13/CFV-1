# Authentication Flow and Role Resolution

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

This document describes the authentication system, role resolution mechanism, and defense-in-depth security architecture in ChefFlow V1.

---

## Table of Contents

1. [Overview](#overview)
2. [System Law #2: Authoritative Roles](#system-law-2-authoritative-roles)
3. [Authentication Flow](#authentication-flow)
4. [Role Resolution](#role-resolution)
5. [Defense in Depth](#defense-in-depth)
6. [Middleware](#middleware)
7. [Server-Side Auth](#server-side-auth)
8. [RLS Policies](#rls-policies)
9. [Code Examples](#code-examples)
10. [Testing](#testing)

---

## Overview

ChefFlow V1 uses **Supabase Auth** for authentication with a custom **role resolution** system. Roles (`chef` vs `client`) are stored authoritatively in the `user_roles` table and enforced at three layers:

1. **Network Layer**: Middleware blocks requests before pages load
2. **Application Layer**: Server components verify role
3. **Database Layer**: RLS policies enforce access control

---

## System Law #2: Authoritative Roles

> **Roles are Authoritative and Single-Source-of-Truth**
> - Role (`chef` vs `client`) is stored ONLY in `user_roles` table
> - Server-side role resolution via `getCurrentUser()` querying `user_roles`
> - NEVER infer role from URL path, client state, or JWT claims
> - No "flash of wrong portal" - middleware redirects before HTML is sent

### Why This Matters

**Problem**: If roles are inferred from URL or client state, users could:
- Access wrong portal by URL manipulation
- See data from other tenants before redirect
- Experience "flash of wrong content"

**Solution**: Query authoritative `user_roles` table on every request.

---

## Authentication Flow

### Sign Up Flow (Chef)

```
┌──────┐
│ Chef │
└──┬───┘
   │ 1. Navigate to /auth/signup
   ▼
┌───────────────────┐
│ Signup Form       │
│ - Email           │
│ - Password        │
│ - Business Name   │
└────────┬──────────┘
         │ 2. Submit
         ▼
┌───────────────────┐
│ Server Action     │
│ - Create auth user│
│ - Create chef rec │
│ - Create user_role│
└────────┬──────────┘
         │ 3. Success
         ▼
┌───────────────────┐
│ Redirect to       │
│ /chef/dashboard   │
└───────────────────┘
```

### Sign Up Flow (Client - Invitation)

```
┌────────┐
│ Client │
└───┬────┘
    │ 1. Click invitation link
    │    /auth/signup?token=xxx
    ▼
┌───────────────────┐
│ Verify token      │
│ - Check expiry    │
│ - Check used_at   │
└────────┬──────────┘
         │ 2. Valid
         ▼
┌───────────────────┐
│ Signup Form       │
│ - Email (prefill) │
│ - Password        │
│ - Name (prefill)  │
└────────┬──────────┘
         │ 3. Submit
         ▼
┌───────────────────┐
│ Server Action     │
│ - Create auth user│
│ - Create client   │
│ - Create user_role│
│ - Mark token used │
└────────┬──────────┘
         │ 4. Success
         ▼
┌───────────────────┐
│ Redirect to       │
│ /client/my-events │
└───────────────────┘
```

### Sign In Flow

```
┌──────┐
│ User │
└──┬───┘
   │ 1. Navigate to /auth/signin
   ▼
┌───────────────────┐
│ Signin Form       │
│ - Email           │
│ - Password        │
└────────┬──────────┘
         │ 2. Submit
         ▼
┌───────────────────┐
│ Supabase Auth     │
│ - Verify creds    │
│ - Set session     │
└────────┬──────────┘
         │ 3. Success
         ▼
┌───────────────────┐
│ Middleware        │
│ - Query user_roles│
│ - Redirect based  │
│   on role         │
└────────┬──────────┘
         │ 4. Chef → /chef/dashboard
         │    Client → /client/my-events
         ▼
┌───────────────────┐
│ Portal Dashboard  │
└───────────────────┘
```

---

## Role Resolution

### The `user_roles` Table

**Single source of truth** for all role assignments:

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  role user_role NOT NULL, -- 'chef' | 'client'
  entity_id UUID NOT NULL, -- chefs.id OR clients.id
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**Key constraints**:
- `auth_user_id` is UNIQUE (one role per user)
- No user-facing UPDATE (prevents role escalation)
- Only service role can modify during signup

### The `getCurrentUser()` Function

Located in `lib/auth/get-user.ts`:

```typescript
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = createServerClient()

  // 1. Get Supabase auth user
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // 2. Query user_roles (AUTHORITATIVE)
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', user.id)
    .single()

  if (roleError || !roleData) return null

  // 3. Get tenant_id based on role
  let tenantId: string | null = null

  if (roleData.role === 'chef') {
    tenantId = roleData.entity_id // Chef's ID is tenant
  } else if (roleData.role === 'client') {
    const { data: clientData } = await supabase
      .from('clients')
      .select('tenant_id')
      .eq('id', roleData.entity_id)
      .single()
    tenantId = clientData?.tenant_id || null
  }

  return {
    id: user.id,
    email: user.email!,
    role: roleData.role,
    entityId: roleData.entity_id,
    tenantId
  }
})
```

**Why `cache()`?**
- React Server Components cache per request
- Single DB query even if called multiple times
- No performance penalty for frequent checks

### Helper Functions

```typescript
// Require chef role (throw if not)
export async function requireChef(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef') {
    throw new Error('Unauthorized: Chef access required')
  }
  return user
}

// Require client role (throw if not)
export async function requireClient(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'client') {
    throw new Error('Unauthorized: Client access required')
  }
  return user
}

// Require any authenticated user
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized: Authentication required')
  }
  return user
}
```

---

## Defense in Depth

ChefFlow enforces security at **three layers**:

### Layer 1: Network (Middleware)

- Runs **before** any page loads
- Blocks unauthenticated requests
- Redirects wrong-role portal access
- No HTML sent to client

### Layer 2: Application (Layouts)

- Server components verify role
- Prevents rendering if unauthorized
- Throws error before component tree builds

### Layer 3: Database (RLS)

- Postgres Row Level Security
- Blocks data access at database level
- Even if layers 1 & 2 fail, RLS prevents data leaks

**Guarantee**: Even if one layer fails, others prevent unauthorized access.

---

## Middleware

Located in `middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow public routes
  const publicPaths = ['/', '/pricing', '/contact']
  if (publicPaths.some(path => pathname === path)) {
    return NextResponse.next()
  }

  // 2. Allow auth routes
  if (pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // 3. Exclude webhooks (use signature verification)
  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next()
  }

  // 4. Create Supabase client
  const supabase = createServerClient(/* ... */)

  // 5. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  // 6. Redirect unauthenticated users
  if (!user) {
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 7. Get role from authoritative source
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!roleData) {
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  // 8. Enforce role-based routing
  if (pathname.startsWith('/chef') && roleData.role !== 'chef') {
    return NextResponse.redirect(new URL('/client/my-events', request.url))
  }

  if (pathname.startsWith('/client') && roleData.role !== 'client') {
    return NextResponse.redirect(new URL('/chef/dashboard', request.url))
  }

  return NextResponse.next()
}
```

**Key Points**:
- Runs on Edge Runtime (fast)
- Queries `user_roles` table (authoritative)
- Redirects **before** page renders (no flash)

---

## Server-Side Auth

### In Server Components

```typescript
// app/(chef)/dashboard/page.tsx
import { requireChef } from '@/lib/auth/get-user'

export default async function ChefDashboard() {
  const chef = await requireChef() // Throws if not chef

  return (
    <div>
      <h1>Welcome, {chef.email}</h1>
      <p>Tenant ID: {chef.tenantId}</p>
    </div>
  )
}
```

### In Server Actions

```typescript
// app/actions/create-event.ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export async function createEvent(data: EventData) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      tenant_id: chef.tenantId, // From auth context
      created_by: chef.id,
      ...data
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return event
}
```

### In Route Handlers

```typescript
// app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'chef') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch events for chef's tenant
  // ...
}
```

---

## RLS Policies

Database functions for role resolution:

```sql
-- Get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current tenant ID (if chef)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current client ID (if client)
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Used in RLS policies**:

```sql
-- Example: Chefs can only see their tenant's events
CREATE POLICY events_chef_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

See [RLS_POLICIES.md](./RLS_POLICIES.md) for full details.

---

## Code Examples

### Complete Signup Flow (Chef)

```typescript
// app/actions/signup-chef.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function signupChef(formData: {
  email: string
  password: string
  businessName: string
}) {
  const supabase = createServerClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Signup failed' }
  }

  // 2. Create chef record (use service role)
  const serviceSupabase = createServiceClient()

  const { data: chef, error: chefError } = await serviceSupabase
    .from('chefs')
    .insert({
      auth_user_id: authData.user.id,
      email: formData.email,
      business_name: formData.businessName
    })
    .select()
    .single()

  if (chefError || !chef) {
    // Rollback auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to create chef profile' }
  }

  // 3. Create user_role (authoritative)
  const { error: roleError } = await serviceSupabase
    .from('user_roles')
    .insert({
      auth_user_id: authData.user.id,
      role: 'chef',
      entity_id: chef.id
    })

  if (roleError) {
    // Rollback
    await serviceSupabase.from('chefs').delete().eq('id', chef.id)
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to assign role' }
  }

  return { success: true }
}
```

### Complete Signup Flow (Client)

```typescript
// app/actions/signup-client.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function signupClient(formData: {
  token: string
  password: string
}) {
  const supabase = createServerClient()

  // 1. Verify invitation token
  const { data: invitation } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', formData.token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invitation) {
    return { error: 'Invalid or expired invitation' }
  }

  // 2. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invitation.email,
    password: formData.password
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Signup failed' }
  }

  // 3. Create client record (service role)
  const serviceSupabase = createServiceClient()

  const { data: client, error: clientError } = await serviceSupabase
    .from('clients')
    .insert({
      auth_user_id: authData.user.id,
      tenant_id: invitation.tenant_id,
      email: invitation.email,
      full_name: invitation.full_name || 'Unknown'
    })
    .select()
    .single()

  if (clientError || !client) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to create client profile' }
  }

  // 4. Create user_role
  const { error: roleError } = await serviceSupabase
    .from('user_roles')
    .insert({
      auth_user_id: authData.user.id,
      role: 'client',
      entity_id: client.id
    })

  if (roleError) {
    await serviceSupabase.from('clients').delete().eq('id', client.id)
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to assign role' }
  }

  // 5. Mark invitation as used
  await serviceSupabase
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { success: true }
}
```

---

## Testing

### Manual Tests

- [ ] Chef signup creates chef + user_role
- [ ] Client signup requires valid invitation token
- [ ] Expired token is rejected
- [ ] Used token is rejected
- [ ] Signin redirects chef to `/chef/dashboard`
- [ ] Signin redirects client to `/client/my-events`
- [ ] Chef cannot access `/client/*` routes
- [ ] Client cannot access `/chef/*` routes
- [ ] Unauthenticated user redirected to `/auth/signin`
- [ ] No "flash of wrong portal" (check network tab)

### Automated Tests

```typescript
// tests/auth/role-resolution.test.ts
import { describe, it, expect } from '@jest/globals'
import { getCurrentUser } from '@/lib/auth/get-user'

describe('Role Resolution', () => {
  it('should resolve chef role from user_roles', async () => {
    // Mock auth session
    mockAuthUser({ id: chefAuthUserId })

    const user = await getCurrentUser()

    expect(user?.role).toBe('chef')
    expect(user?.tenantId).toBe(chefId)
  })

  it('should resolve client role and tenant', async () => {
    mockAuthUser({ id: clientAuthUserId })

    const user = await getCurrentUser()

    expect(user?.role).toBe('client')
    expect(user?.tenantId).toBe(chefId) // Client's chef
  })

  it('should return null for user without role', async () => {
    mockAuthUser({ id: 'no-role-user' })

    const user = await getCurrentUser()

    expect(user).toBeNull()
  })
})
```

---

## Related Documentation

- [RLS_POLICIES.md](./RLS_POLICIES.md) - Database-level access control
- [MULTI_TENANT_GUIDE.md](./MULTI_TENANT_GUIDE.md) - Tenant isolation
- [CLIENT_INVITATIONS.md](./CLIENT_INVITATIONS.md) - Invitation system
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Auth environment variables

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team

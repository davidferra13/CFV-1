# Public Layer - Role Routing Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines **how user roles are determined** and **how routing decisions are made** based on those roles. This is critical for preventing "flash of wrong portal" and ensuring users land in the correct portal after authentication.

---

## Core Principle: Authoritative Role Resolution

### Rule
User role MUST ALWAYS be determined by querying the `user_roles` table. NEVER infer role from:
- URL path
- Session claims
- Client-side state
- Cookies
- JWT payload (unless explicitly set server-side)

### Enforcement
Every routing decision MUST call `getUserRole(authUserId)` which queries the database.

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

  if (error || !data) {
    return null;
  }

  return data.role as 'chef' | 'client';
}
```

### Return Values
- `'chef'` - User is a chef (tenant owner)
- `'client'` - User is a client (invited by a chef)
- `null` - User exists in `auth.users` but has NO role assigned (orphaned account, error state)

---

## Middleware Routing Logic

### File Location
`middleware.ts` (root level)

### Execution Flow
```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/get-user-role';

export async function middleware(req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;

  // === RULE 1: Redirect authenticated users away from /signin and /signup ===
  if (session && (path === '/signin' || path === '/signup')) {
    const role = await getUserRole(session.user.id);

    if (role === 'chef') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (role === 'client') {
      return NextResponse.redirect(new URL('/my-events', req.url));
    }

    // If role is null (orphaned account), allow access to signup to fix
    // OR redirect to error page
    if (role === null) {
      return NextResponse.redirect(new URL('/error?code=no_role', req.url));
    }
  }

  // === RULE 2: Protect portal routes (handled in portal middleware, not public) ===
  // Public middleware does NOT block /dashboard or /my-events
  // Those routes have their own layout.tsx that checks auth

  // === RULE 3: Allow all public routes ===
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## Routing Decision Matrix

| User State | Current Route | Action |
|-----------|--------------|--------|
| Not signed in | `/` | Allow (public) |
| Not signed in | `/signin` | Allow (render signin page) |
| Not signed in | `/signup` | Allow (render signup page) |
| Not signed in | `/dashboard` | Block (Chef portal middleware) |
| Not signed in | `/my-events` | Block (Client portal middleware) |
| Signed in (chef) | `/` | Allow (public, show "Go to Dashboard" in header) |
| Signed in (chef) | `/signin` | Redirect → `/dashboard` |
| Signed in (chef) | `/signup` | Redirect → `/dashboard` |
| Signed in (chef) | `/dashboard` | Allow (Chef portal) |
| Signed in (chef) | `/my-events` | Block (wrong portal) |
| Signed in (client) | `/` | Allow (public, show "Go to My Events" in header) |
| Signed in (client) | `/signin` | Redirect → `/my-events` |
| Signed in (client) | `/signup` | Redirect → `/my-events` |
| Signed in (client) | `/dashboard` | Block (wrong portal) |
| Signed in (client) | `/my-events` | Allow (Client portal) |
| Signed in (no role) | Any | Redirect → `/error?code=no_role` |

---

## Role Assignment Rules

### Chef Role Assignment
**When**: During chef signup
**Trigger**: User submits signup form at `/signup` (no token parameter)
**Process**:
1. Create `auth.users` record (Supabase Auth)
2. Insert into `chefs` table (with `auth_user_id` FK)
3. Insert into `user_roles` table:
   ```sql
   INSERT INTO user_roles (auth_user_id, role, entity_id)
   VALUES (auth_user_id, 'chef', chef_id);
   ```
4. Redirect to `/dashboard`

### Client Role Assignment
**When**: During client signup (invitation-based)
**Trigger**: User submits signup form at `/signup?token=xxx`
**Process**:
1. Validate invitation token
2. Create `auth.users` record (Supabase Auth)
3. Insert into `clients` table (with `auth_user_id` FK and `tenant_id`)
4. Insert into `user_roles` table:
   ```sql
   INSERT INTO user_roles (auth_user_id, role, entity_id)
   VALUES (auth_user_id, 'client', client_id);
   ```
5. Mark invitation as used (`used_at = now()`)
6. Redirect to `/my-events`

---

## Error States

### Orphaned Account (No Role)
**Scenario**: User exists in `auth.users` but NOT in `user_roles` table.

**Causes**:
- Signup transaction failed halfway (user created, role not inserted)
- Manual database manipulation (role deleted)
- Race condition (unlikely with proper transactions)

**Detection**:
```typescript
const role = await getUserRole(session.user.id);
if (role === null) {
  // Orphaned account detected
}
```

**Resolution**:
1. Redirect to `/error?code=no_role`
2. Show error message: "Your account is incomplete. Please contact support."
3. Log error server-side for investigation
4. Support manually fixes by inserting role, OR user re-signs up

---

### Duplicate Role Assignment
**Scenario**: User has multiple roles in `user_roles` table (violates UNIQUE constraint).

**Prevention**:
```sql
-- Constraint in schema
CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);
```

**Enforcement**: Database UNIQUE constraint prevents this at insert time.

---

## Redirect Timing (No Flash of Wrong Portal)

### Critical Requirement
Middleware MUST return redirect response BEFORE page HTML is sent to client.

### Implementation
```typescript
// Middleware runs at edge (before page render)
export async function middleware(req: NextRequest) {
  // ... check session and role ...

  if (shouldRedirect) {
    // Return 307 Temporary Redirect
    return NextResponse.redirect(new URL(targetUrl, req.url));
  }

  // Continue to page
  return NextResponse.next();
}
```

### Verification
```bash
# Sign in as chef, then visit /signin
curl -I http://localhost:3000/signin -H "Cookie: ..."
# Response MUST be:
# HTTP/1.1 307 Temporary Redirect
# Location: /dashboard
# (NOT 200 OK)
```

---

## Role-Based Header Navigation

### Conditional Rendering in Header
```typescript
// components/public/Header.tsx
'use server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/get-user-role';

export async function Header() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let portalLink = null;

  if (session) {
    const role = await getUserRole(session.user.id);

    if (role === 'chef') {
      portalLink = { href: '/dashboard', label: 'Go to Dashboard' };
    } else if (role === 'client') {
      portalLink = { href: '/my-events', label: 'Go to My Events' };
    }
  }

  return (
    <header>
      {/* ... logo, nav links ... */}
      {portalLink ? (
        <Link href={portalLink.href}>{portalLink.label}</Link>
      ) : (
        <Link href="/signin">Sign In</Link>
      )}
    </header>
  );
}
```

---

## Role Caching (NOT Implemented in V1)

### V1 Approach
Query `user_roles` table on EVERY middleware execution.

**Rationale**:
- Ensures latest data (role changes are immediately reflected)
- Middleware runs at edge (Vercel Edge Functions), very fast
- Database query overhead is minimal (<10ms)

### V1.1 Consideration
If performance becomes an issue, cache role in JWT claims:
- On signup/signin, query role and store in JWT
- Middleware reads role from JWT (no database query)
- Trade-off: Stale data if role is manually changed in database

**Verdict for V1**: NO caching. Authoritative source is database.

---

## Multi-Role Users (NOT Supported in V1)

### Rule
Users CANNOT have multiple roles (e.g., both chef and client).

### Enforcement
```sql
CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);
```

### Rationale
- Simplifies role resolution (no ambiguity)
- Simplifies UI (no role-switching dropdown)
- Simplifies RLS policies (no cross-role queries)

### Future (V2)
If multi-role is needed:
- Add `role_id` column to `user_roles` (allow multiple rows per user)
- Add role-switching UI in header
- Store "active role" in session
- Update RLS policies to check active role

**Verdict for V1**: One user = one role (UNIQUE constraint enforced).

---

## Routing Performance

### Middleware Execution Time
- Target: <50ms (including database query)
- Measurement: Log `Date.now()` before and after `getUserRole()`

### Optimization (If Needed)
- Database connection pooling (Supabase handles this)
- Edge runtime (Vercel automatically uses edge for middleware)

---

## Testing Scenarios

### Test 1: Unauthenticated User
```bash
# Visit public routes - should all return 200 OK
curl -I http://localhost:3000/
curl -I http://localhost:3000/services
curl -I http://localhost:3000/signin
```

### Test 2: Chef Visits /signin
```bash
# Sign in as chef, get session cookie, then visit /signin
curl -I http://localhost:3000/signin -H "Cookie: sb-access-token=..."
# Expected: 307 redirect to /dashboard
```

### Test 3: Client Visits /signup
```bash
# Sign in as client, get session cookie, then visit /signup
curl -I http://localhost:3000/signup -H "Cookie: sb-access-token=..."
# Expected: 307 redirect to /my-events
```

### Test 4: Orphaned Account
```bash
# Manually delete role from user_roles, then visit any route
# Expected: Redirect to /error?code=no_role
```

---

## Verification Checklist

Before considering routing "complete":

- [ ] `getUserRole()` queries `user_roles` table (not inferred)
- [ ] Middleware redirects chef away from `/signin` to `/dashboard`
- [ ] Middleware redirects client away from `/signin` to `/my-events`
- [ ] Middleware redirects chef away from `/signup` to `/dashboard`
- [ ] Middleware redirects client away from `/signup` to `/my-events`
- [ ] Unauthenticated users can access all public routes
- [ ] Orphaned accounts (no role) are handled gracefully
- [ ] No "flash of wrong portal" (redirect happens before HTML sent)
- [ ] Header shows correct portal link based on role
- [ ] Middleware execution time <50ms

---

**Status**: These routing rules are LOCKED and authoritative for V1.

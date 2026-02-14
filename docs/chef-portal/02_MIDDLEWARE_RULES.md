# Middleware Rules (V1)

This document defines the exact rules and behavior for the global middleware that guards all Chef Portal and Client Portal routes.

---

## 1) Purpose of Middleware

The middleware is the **first line of defense** that:

1. Authenticates every request
2. Resolves user role and tenant
3. Enforces role-based routing
4. Redirects users to correct portal
5. Blocks unauthorized access

**Middleware runs on EVERY request** before any page or API route handler executes.

---

## 2) Middleware Location and Config

**File:** `middleware.ts` (root level)

**Matcher Config:**

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**What this matcher does:**
- ✅ Runs on all routes
- ❌ Skips Next.js internal routes (`_next/static`, `_next/image`)
- ❌ Skips static files (`favicon.ico`)

---

## 3) Middleware Execution Flow

```
1. Request received
   ↓
2. Check if route is public (/, /login, /signup, /api/webhooks)
   ↓ If public → allow without auth
   ↓ If protected → continue
3. Authenticate user (read session cookie)
   ↓ If no session → redirect to /login
   ↓ If session → continue
4. Resolve role and tenant (query user_roles table)
   ↓ If no role → redirect to /error?code=no_role
   ↓ If role found → continue
5. Route guard (check role vs requested path)
   ↓ If role matches portal → allow
   ↓ If role doesn't match → redirect to correct portal or deny
6. Allow request to proceed to route handler
```

---

## 4) Public Routes (No Auth Required)

These routes bypass authentication:

| Route Pattern | Description |
|---------------|-------------|
| `/` | Landing page |
| `/login` | Login page |
| `/signup` | Signup page |
| `/api/webhooks/*` | Webhook endpoints (verified via signature) |
| `/error` | Error page |

**Implementation:**

```typescript
const publicRoutes = ['/', '/login', '/signup', '/error'];
const isPublic = publicRoutes.includes(path) || path.startsWith('/api/webhooks');

if (isPublic) {
  return NextResponse.next();
}
```

---

## 5) Authentication Check

**If route is protected, user must have valid session:**

```typescript
const user = await getUser(req);

if (!user) {
  return NextResponse.redirect(new URL('/login', req.url));
}
```

**Session Source:** Supabase Auth cookie (HttpOnly, Secure)

---

## 6) Role Resolution

**Query user_roles table:**

```typescript
const roleData = await getUserRole(user.id);

if (!roleData) {
  return NextResponse.redirect(new URL('/error?code=no_role', req.url));
}

const { role, tenant_id } = roleData;
```

**Possible Roles:**
- `chef`
- `chef_subaccount`
- `client`

**If no role found:** User is authenticated but has no role assignment → error page

---

## 7) Route Guards

### 7.1 Chef Portal Routes

**Pattern:** `/chef/*`

**Allowed Roles:** `chef`, `chef_subaccount`

**Rule:**

```typescript
if (path.startsWith('/chef')) {
  if (role === 'client') {
    return NextResponse.redirect(new URL('/client', req.url));
  }

  if (role !== 'chef' && role !== 'chef_subaccount') {
    return NextResponse.redirect(new URL('/error?code=unauthorized', req.url));
  }
}
```

**Behavior:**
- Client → Redirect to Client Portal
- Unknown role → Error page
- Chef or subaccount → Allow

---

### 7.2 Client Portal Routes

**Pattern:** `/client/*`

**Allowed Roles:** `client`

**Rule:**

```typescript
if (path.startsWith('/client')) {
  if (role === 'chef' || role === 'chef_subaccount') {
    return NextResponse.redirect(new URL('/chef/dashboard', req.url));
  }

  if (role !== 'client') {
    return NextResponse.redirect(new URL('/error?code=unauthorized', req.url));
  }
}
```

**Behavior:**
- Chef/subaccount → Redirect to Chef Portal
- Unknown role → Error page
- Client → Allow

---

## 8) Complete Middleware Implementation

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Public routes
  const publicRoutes = ['/', '/login', '/signup', '/error'];
  const isPublic = publicRoutes.includes(path) || path.startsWith('/api/webhooks');

  if (isPublic) {
    return NextResponse.next();
  }

  // 2. Authenticate
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. Resolve role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!roleData) {
    return NextResponse.redirect(new URL('/error?code=no_role', req.url));
  }

  const { role } = roleData;

  // 4. Route guards
  if (path.startsWith('/chef')) {
    if (role === 'client') {
      return NextResponse.redirect(new URL('/client', req.url));
    }
    if (role !== 'chef' && role !== 'chef_subaccount') {
      return NextResponse.redirect(new URL('/error?code=unauthorized', req.url));
    }
  }

  if (path.startsWith('/client')) {
    if (role === 'chef' || role === 'chef_subaccount') {
      return NextResponse.redirect(new URL('/chef/dashboard', req.url));
    }
    if (role !== 'client') {
      return NextResponse.redirect(new URL('/error?code=unauthorized', req.url));
    }
  }

  // 5. Allow
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 9) Middleware Performance

**Target:** < 50ms per request

**Optimizations:**
- ✅ Cache role lookups in request context (avoid duplicate queries)
- ✅ Use database indexes on `user_roles.user_id`
- ✅ Minimize middleware logic (no heavy computations)

---

## 10) Error Handling

**If middleware throws error:**

```typescript
try {
  // ... middleware logic
} catch (error) {
  console.error('Middleware error:', error);
  return NextResponse.redirect(new URL('/error?code=middleware_error', req.url));
}
```

**Fail closed:** On error, redirect to error page (don't allow request through)

---

## Summary

The middleware:
1. Skips public routes
2. Authenticates user
3. Resolves role
4. Enforces route guards
5. Redirects to correct portal or denies access

**One-sentence:** The middleware authenticates every protected request, resolves the user's role and tenant from the session, and enforces role-based routing by redirecting chefs to `/chef/*`, clients to `/client/*`, and denying access to unauthorized roles, all before any page or API handler executes.

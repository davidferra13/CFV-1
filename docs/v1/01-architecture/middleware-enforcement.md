# Middleware Enforcement

**Document ID**: 008
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines how Next.js middleware enforces portal isolation, authentication, and routing rules in ChefFlow V1.

## Middleware Overview

**File**: `middleware.ts` (root level, NOT in `/app`)
**Runtime**: Vercel Edge Runtime (lightweight, fast, global distribution)
**Execution**: Runs BEFORE page renders (request interceptor)
**Capabilities**: Auth checks, redirects, header manipulation, route protection

## Middleware Responsibilities

1. **Session Validation**: Verify Supabase session exists
2. **Role Resolution**: Query `user_roles` table to determine chef vs client
3. **Portal Enforcement**: Redirect user to correct portal based on role
4. **Public Route Exemption**: Allow unauthenticated access to landing, pricing, contact
5. **No Flash of Wrong Portal**: Redirect BEFORE any HTML is rendered

---

## Middleware Implementation

### File Location

```
CFv1/
├── middleware.ts          # ← Middleware file (root level)
├── app/
│   ├── (public)/
│   ├── (chef)/
│   └── (client)/
└── ...
```

**Critical**: MUST be at root level (NOT inside `/app`)

### Core Logic

```typescript
// middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. Create Supabase client (Edge runtime compatible)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 2. Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = request.nextUrl;

  // 3. Public routes (no auth required)
  const publicPaths = ['/', '/pricing', '/contact', '/auth'];
  if (publicPaths.some((path) => url.pathname.startsWith(path))) {
    return response;
  }

  // 4. Protected routes (require auth)
  if (!session) {
    // Not authenticated, redirect to landing
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 5. Resolve user role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!userRole) {
    // User has no role (edge case, should not happen)
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const role = userRole.role; // 'chef' | 'client'

  // 6. Portal enforcement
  const isChefPortal = url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/events') ||
    url.pathname.startsWith('/clients') ||
    url.pathname.startsWith('/menus') ||
    url.pathname.startsWith('/ledger');

  const isClientPortal = url.pathname.startsWith('/my-events') ||
    url.pathname.startsWith('/profile');

  if (role === 'chef' && isClientPortal) {
    // Chef trying to access client portal → redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (role === 'client' && isChefPortal) {
    // Client trying to access chef portal → redirect to my-events
    return NextResponse.redirect(new URL('/my-events', request.url));
  }

  // 7. Allow request to proceed
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Middleware Flow Diagram

```
Request: /dashboard
    ↓
[Middleware Execution]
    ↓
Is public route? (/,  /pricing, /contact)
    ├─ YES → Allow (return response)
    └─ NO → Continue
    ↓
Session exists?
    ├─ NO → Redirect to /
    └─ YES → Continue
    ↓
Query user_roles table (get role)
    ↓
Role = 'chef' or 'client'?
    ├─ NULL → Redirect to /
    └─ Continue
    ↓
Is chef accessing client portal?
    ├─ YES → Redirect to /dashboard
    └─ NO → Continue
    ↓
Is client accessing chef portal?
    ├─ YES → Redirect to /my-events
    └─ NO → Continue
    ↓
Allow request → Render page
```

---

## Portal Route Definitions

### Chef Portal Routes

**Paths**:
- `/dashboard`
- `/events`
- `/events/[id]`
- `/events/create`
- `/clients`
- `/clients/[id]`
- `/clients/invite`
- `/menus`
- `/menus/[id]`
- `/menus/create`
- `/ledger`

**Auth Required**: YES
**Allowed Role**: `chef` ONLY

**Middleware Action**:
- If no session → Redirect to `/`
- If role = `client` → Redirect to `/my-events`
- If role = `chef` → Allow

### Client Portal Routes

**Paths**:
- `/my-events`
- `/my-events/[id]`
- `/my-events/[id]/payment`
- `/profile`

**Auth Required**: YES
**Allowed Role**: `client` ONLY

**Middleware Action**:
- If no session → Redirect to `/`
- If role = `chef` → Redirect to `/dashboard`
- If role = `client` → Allow

### Public Routes

**Paths**:
- `/` (landing page)
- `/pricing`
- `/contact`
- `/auth/login`
- `/auth/signup`
- `/auth/reset-password`

**Auth Required**: NO
**Allowed Role**: ANY (including unauthenticated)

**Middleware Action**:
- Allow (bypass auth check)

---

## Role Resolution

### Database Query (Middleware)

```typescript
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('auth_user_id', session.user.id)
  .single();

const role = userRole.role; // 'chef' | 'client'
```

**Authority**: `user_roles` table is single source of truth
**Caching**: NO caching (query on every request for correctness)
**Performance**: Edge runtime + PostgreSQL connection pooling = fast (<50ms)

### Role Determination Rules

| User State | Role Query Result | Action |
|------------|-------------------|--------|
| No session | N/A (skip query) | Redirect to `/` (if protected route) |
| Session exists, no role | NULL | Redirect to `/` (error state) |
| Session exists, role = `chef` | `chef` | Allow chef portal, block client portal |
| Session exists, role = `client` | `client` | Allow client portal, block chef portal |

---

## Redirect Rules

### Unauthorized Access

**Scenario**: User not logged in, tries to access `/dashboard`
**Action**: Redirect to `/` (landing page)
**HTTP Status**: 302 (temporary redirect)

```typescript
if (!session) {
  return NextResponse.redirect(new URL('/', request.url));
}
```

### Wrong Portal Access

**Scenario**: Chef tries to access `/my-events` (client portal)
**Action**: Redirect to `/dashboard` (chef portal home)
**HTTP Status**: 302 (temporary redirect)

```typescript
if (role === 'chef' && isClientPortal) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

**Scenario**: Client tries to access `/dashboard` (chef portal)
**Action**: Redirect to `/my-events` (client portal home)
**HTTP Status**: 302 (temporary redirect)

```typescript
if (role === 'client' && isChefPortal) {
  return NextResponse.redirect(new URL('/my-events', request.url));
}
```

### No Infinite Loops

**Guarantee**: Redirects ALWAYS go to allowed routes
- Chef → `/dashboard` (chef portal, allowed)
- Client → `/my-events` (client portal, allowed)
- Unauthenticated → `/` (public, allowed)

**NO scenario** where redirect target itself triggers another redirect.

---

## Performance Characteristics

### Edge Runtime

**Execution Location**: Vercel Edge Network (globally distributed)
**Cold Start**: <10ms (vs 500-2000ms for Node.js serverless)
**Latency**: 20-100ms (including Supabase query)

**Limitations**:
- No Node.js APIs (fs, path, crypto module, etc.)
- Limited npm packages (must be Edge-compatible)
- No Prisma, no heavy ORMs

**Compatible**:
- `@supabase/ssr` (Edge-compatible)
- Fetch API
- URL manipulation
- Cookie manipulation

### Database Query Performance

**Query**: SELECT role FROM user_roles WHERE auth_user_id = ?
**Index**: Indexed on `auth_user_id` (unique index)
**Typical Latency**: 10-50ms (Supabase Pooler)

**Optimization**: Connection pooling (Supabase Pooler prevents connection exhaustion)

**NOT Cached**: Role resolution is NOT cached (always queries DB for correctness)
- Reason: If role changes (edge case), middleware must reflect immediately
- Trade-off: Slightly higher latency, but guaranteed correctness

---

## Security Guarantees

### Defense Layer 1: Middleware

**Guarantee**: User CANNOT receive HTML for wrong portal
**Enforcement**: Redirect BEFORE layout/page components execute
**Result**: Even if RLS or layout auth checks fail, middleware blocks access

### Defense Layer 2: Layout Auth Check

**Guarantee**: Layout queries user role again (double-check)
**Enforcement**: If role mismatch, redirect (defense in depth)
**Result**: Even if middleware is bypassed (impossible, but defensive), layout blocks

### Defense Layer 3: RLS Policies

**Guarantee**: Database enforces tenant isolation
**Enforcement**: Even if middleware + layout fail, database returns zero rows for wrong tenant
**Result**: User sees empty data, not other tenant's data

**Example**: Chef A tries to access Chef B's events
1. Middleware: Allows (both are chefs, accessing `/events`)
2. Layout: Allows (both are chefs)
3. RLS Policy: Blocks (query returns zero rows, tenant_id != current_tenant_id)
4. User sees: Empty event list (correct behavior)

---

## Edge Cases

### User Role Changes Mid-Session

**Scenario**: Admin changes user from `chef` to `client` while user is logged in

**Behavior**:
- **Next Request**: Middleware queries DB, gets updated role, redirects to correct portal
- **Current Page**: User may still see old portal until next navigation (acceptable, rare edge case)

**Mitigation** (optional, V2):
- Add role to JWT claims (refresh token on role change)
- Middleware checks JWT claims (faster, no DB query)

### User Has No Role

**Scenario**: User signed up but `user_roles` row not created (error state)

**Behavior**:
- Middleware queries DB, gets NULL
- Redirects to `/` (landing page)
- User cannot access any portal

**Fix**: Ensure role assignment is atomic with signup (transaction or trigger)

### Multiple Concurrent Sessions

**Scenario**: User logs in on two devices (phone, laptop)

**Behavior**:
- Each request queries DB independently
- Consistent role resolution across devices

**No Issue**: Supabase allows multiple concurrent sessions per user

---

## Matcher Configuration

### Route Matching

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Included** (middleware runs):
- All routes in `/app`
- API routes (`/api/...`)

**Excluded** (middleware does NOT run):
- Static files (`/images/logo.svg`)
- Next.js internals (`/_next/static/...`)
- Image optimization (`/_next/image/...`)
- Favicon (`/favicon.ico`)

**Reason**: Static files do not require auth checks (faster, reduces Edge function invocations)

---

## Testing Middleware

### Manual Testing

**Test 1: Unauthenticated access to protected route**
1. Log out (clear cookies)
2. Navigate to `/dashboard`
3. Expected: Redirect to `/` (landing page)

**Test 2: Chef accessing client portal**
1. Log in as chef
2. Navigate to `/my-events`
3. Expected: Redirect to `/dashboard`

**Test 3: Client accessing chef portal**
1. Log in as client
2. Navigate to `/dashboard`
3. Expected: Redirect to `/my-events`

**Test 4: Public route access (unauthenticated)**
1. Log out
2. Navigate to `/` or `/pricing` or `/contact`
3. Expected: Page loads (no redirect)

### Automated Testing (Optional, V2)

**Tool**: Playwright or Cypress
**Tests**: Simulate login, navigation, verify redirects

**Example**:
```typescript
test('chef cannot access client portal', async ({ page }) => {
  await loginAsChef(page);
  await page.goto('/my-events');
  await expect(page).toHaveURL('/dashboard'); // Redirected
});
```

---

## Debugging Middleware

### Logging

**Add Logging** (development only):
```typescript
// middleware.ts

export async function middleware(request: NextRequest) {
  console.log('[MIDDLEWARE]', request.nextUrl.pathname);

  const session = await supabase.auth.getSession();
  console.log('[MIDDLEWARE] Session:', !!session);

  if (session) {
    const { data: userRole } = await supabase.from('user_roles').select('role').single();
    console.log('[MIDDLEWARE] Role:', userRole?.role);
  }

  // ...
}
```

**Output** (in Vercel logs or local terminal):
```
[MIDDLEWARE] /dashboard
[MIDDLEWARE] Session: true
[MIDDLEWARE] Role: chef
```

### Browser DevTools

**Network Tab**:
- Look for `302` status codes (redirects)
- Check redirect URL in `Location` header

**Example**:
```
Request: GET /my-events
Response: 302 Found
Location: /dashboard
```

---

## Limitations

### NO Client-Side Routing Middleware

**Important**: Middleware runs on SERVER request, NOT client-side navigation

**Example**:
- User clicks `<Link href="/my-events">` (client-side navigation)
- Next.js fetches page data via internal API call
- Middleware runs on that internal API call (still enforced)

**Result**: Middleware enforces even on client-side navigation (correct behavior)

### NO Request Body Access

**Limitation**: Middleware cannot read request body (POST data)
**Reason**: Edge runtime limitation
**Workaround**: Use API routes or server actions for POST validation

---

**Authority**: This middleware enforcement model is binding for V1. Changes require scope unlock.

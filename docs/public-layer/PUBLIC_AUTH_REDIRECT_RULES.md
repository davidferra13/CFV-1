# Public Layer - Auth Redirect Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Defines explicit redirect rules for authenticated and unauthenticated users across all Public Layer routes.

---

## Redirect Decision Matrix

| User State | Current Route | Action | Destination |
|-----------|--------------|--------|-------------|
| **Unauthenticated** | `/` | Allow | Stay on `/` |
| **Unauthenticated** | `/services` | Allow | Stay on `/services` |
| **Unauthenticated** | `/signin` | Allow | Stay on `/signin` |
| **Unauthenticated** | `/signup` | Allow | Stay on `/signup` |
| **Unauthenticated** | `/dashboard` | Block | Redirect `/signin` |
| **Unauthenticated** | `/my-events` | Block | Redirect `/signin` |
| **Chef (authenticated)** | `/` | Allow | Stay on `/` |
| **Chef (authenticated)** | `/signin` | Redirect | → `/dashboard` |
| **Chef (authenticated)** | `/signup` | Redirect | → `/dashboard` |
| **Chef (authenticated)** | `/dashboard` | Allow | Stay on `/dashboard` |
| **Chef (authenticated)** | `/my-events` | Block | Redirect `/dashboard` |
| **Client (authenticated)** | `/` | Allow | Stay on `/` |
| **Client (authenticated)** | `/signin` | Redirect | → `/my-events` |
| **Client (authenticated)** | `/signup` | Redirect | → `/my-events` |
| **Client (authenticated)** | `/dashboard` | Block | Redirect `/my-events` |
| **Client (authenticated)** | `/my-events` | Allow | Stay on `/my-events` |

---

## Middleware Implementation

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/get-user-role';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // PUBLIC ROUTES: Always accessible
  const publicRoutes = ['/', '/services', '/how-it-works', '/pricing', '/inquire', '/terms', '/privacy'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // AUTH PAGES: Redirect if already signed in
  if (session && (pathname === '/signin' || pathname === '/signup')) {
    const role = await getUserRole(session.user.id);

    if (role === 'chef') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (role === 'client') {
      return NextResponse.redirect(new URL('/my-events', req.url));
    }
    // Orphaned account
    return NextResponse.redirect(new URL('/error?code=no_role', req.url));
  }

  // PORTAL ROUTES: Handled by portal-specific middleware
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Redirect Timing

### Critical: No Flash of Wrong Page
Middleware MUST return redirect BEFORE HTML is sent to client.

**Verification**:
```bash
curl -I https://chefflow.app/signin -H "Cookie: sb-access-token=..."
# Expected: 307 Temporary Redirect
# Location: /dashboard (or /my-events)
```

---

## Status Codes

| Redirect Type | HTTP Status | Usage |
|--------------|-------------|-------|
| Temporary (role-based) | 307 | Authenticated user visits /signin |
| Permanent (deprecated route) | 308 | NOT USED in V1 |
| Found (legacy) | 302 | NOT USED (use 307 instead) |

---

**Status**: These redirect rules are LOCKED for V1.

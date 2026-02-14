# Edge Boundaries

**Document ID**: 011
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines the execution boundaries in ChefFlow V1, specifically distinguishing between Edge Runtime (middleware) and Node.js Runtime (server components, API routes, server actions).

## Runtime Environments

ChefFlow V1 operates across TWO distinct runtime environments:

1. **Edge Runtime** (Vercel Edge Network)
2. **Node.js Runtime** (Vercel Serverless Functions)

---

## Edge Runtime

### What Runs on Edge

**Only ONE component**:
- Middleware (`middleware.ts`)

**Characteristics**:
- **Execution Location**: Vercel Edge Network (globally distributed, 300+ locations)
- **Cold Start**: <10ms
- **Latency**: 20-100ms (including Supabase query)
- **Timeout**: 30 seconds
- **Memory**: Limited (no configuration)
- **APIs**: Subset of Web APIs (no Node.js APIs)

### Edge Runtime Capabilities

**CAN**:
✅ Access request/response (headers, cookies, URL)
✅ Fetch external APIs (HTTP requests)
✅ Query Supabase (via `@supabase/ssr`)
✅ Redirect requests
✅ Set response headers
✅ Read environment variables
✅ Use Web APIs (URL, Headers, Request, Response)

**CANNOT**:
❌ Use Node.js APIs (fs, path, crypto module, etc.)
❌ Use npm packages with native dependencies
❌ Access file system
❌ Execute long-running tasks (>30 seconds)
❌ Use Prisma, TypeORM, Drizzle (not Edge-compatible)

### Edge Runtime Limitations

**NO Node.js APIs**:
```typescript
// ❌ DOES NOT WORK in middleware
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const data = fs.readFileSync('/data.json'); // Error: fs not available
```

**Limited npm Packages**:
- `@supabase/ssr` - ✅ Edge-compatible
- `stripe` (Node.js SDK) - ❌ NOT Edge-compatible
- `zod` - ✅ Edge-compatible
- `date-fns` - ✅ Edge-compatible

**NO Prisma**:
```typescript
// ❌ DOES NOT WORK in middleware
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // Error: Prisma not Edge-compatible
```

### Edge Runtime Use Case

**ONLY for**:
- Middleware (auth checks, redirects)

**NOT for**:
- Server components (use Node.js runtime)
- API routes (use Node.js runtime)
- Server actions (use Node.js runtime)

---

## Node.js Runtime

### What Runs on Node.js

**Most components**:
- Server Components (pages, layouts)
- Server Actions (`'use server'`)
- API Routes (`route.ts`)

**Characteristics**:
- **Execution Location**: Vercel Serverless Functions (AWS Lambda)
- **Cold Start**: 500-2000ms (first request after idle)
- **Warm Start**: 50-200ms
- **Timeout**: 10 seconds (Hobby), 60 seconds (Pro)
- **Memory**: Configurable (1024 MB default)
- **APIs**: Full Node.js APIs

### Node.js Runtime Capabilities

**CAN**:
✅ Everything Edge Runtime can do
✅ Use Node.js APIs (fs, path, crypto, etc.)
✅ Use ANY npm package (Stripe, Prisma, etc.)
✅ Access file system (read `data.json`, etc.)
✅ Execute long-running tasks (up to timeout limit)
✅ Use Supabase (both `@supabase/ssr` and `@supabase/supabase-js`)

**Example**:
```typescript
// ✅ WORKS in server component, API route, server action
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const data = fs.readFileSync(path.join(process.cwd(), 'data.json'));
```

### Node.js Runtime Use Case

**For**:
- Server components (data fetching)
- Server actions (mutations, business logic)
- API routes (webhooks, external integrations)

**NOT for**:
- Middleware (use Edge runtime)

---

## Boundary Enforcement

### What Happens at Boundary

**Request Lifecycle**:
1. **Client Request** → `/dashboard`
2. **Middleware** (Edge Runtime):
   - Auth check (session exists?)
   - Role resolution (query `user_roles`)
   - Redirect if unauthorized
   - Set headers, cookies
3. **Server Component** (Node.js Runtime):
   - Render page
   - Fetch data from Supabase
   - Return HTML
4. **Client Hydration** (Browser):
   - React attaches event listeners
   - Interactive components become active

**Key Point**: Middleware and server components run in DIFFERENT runtime environments

### Data Flow Across Boundary

**Middleware → Server Component**:
- **NOT via props** (middleware doesn't render components)
- **Via headers or cookies**:
  - Middleware sets cookie (`user_id`, etc.)
  - Server component reads cookie (`getCurrentUser()`)

**Example**:
```typescript
// middleware.ts (Edge Runtime)
export async function middleware(request: NextRequest) {
  const session = await supabase.auth.getSession();

  // Set header (passed to server component)
  const response = NextResponse.next();
  response.headers.set('x-user-id', session.user.id);

  return response;
}

// Server component (Node.js Runtime)
import { headers } from 'next/headers';

export async function Page() {
  const headersList = headers();
  const userId = headersList.get('x-user-id');

  // Use userId
}
```

**Note**: In V1, we use cookie-based session (Supabase), so middleware and server components both query `user_roles` table directly.

---

## Package Compatibility

### Edge-Compatible Packages

**Used in Middleware**:
- `@supabase/ssr` - ✅ Supabase client for Edge runtime
- `zod` - ✅ Validation (pure JavaScript)
- `date-fns` - ✅ Date utilities (pure JavaScript)

**NOT Used**:
- `stripe` - ❌ Node.js SDK (not Edge-compatible)
- `@supabase/supabase-js` - ⚠️ Works, but `@supabase/ssr` preferred for SSR

### Node.js-Only Packages

**Used in Server Components, Actions, API Routes**:
- `stripe` - Stripe Node.js SDK
- `@supabase/supabase-js` - Full Supabase client
- Any npm package (no restrictions)

**Example**:
```typescript
// Server action (Node.js Runtime)
'use server';

import Stripe from 'stripe';

export async function createPaymentIntent(eventId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // ✅ Works

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 10000,
    currency: 'usd',
  });

  return paymentIntent.client_secret;
}
```

---

## Performance Characteristics

### Edge Runtime Performance

**Advantages**:
- **Low Latency**: 20-100ms (globally distributed)
- **Fast Cold Start**: <10ms
- **Always Warm**: No cold starts

**Trade-offs**:
- **Limited APIs**: No Node.js APIs
- **Limited Packages**: Only Edge-compatible npm packages

**Best For**:
- Auth checks (fast, minimal logic)
- Redirects (no heavy computation)
- Header manipulation

### Node.js Runtime Performance

**Advantages**:
- **Full APIs**: All Node.js APIs available
- **Any Packages**: No package restrictions
- **More Memory**: Configurable (up to 3008 MB on Pro)

**Trade-offs**:
- **Cold Starts**: 500-2000ms (first request after idle)
- **Higher Latency**: 50-200ms (warm), 500-2000ms (cold)

**Best For**:
- Data fetching (database queries)
- Business logic (mutations, validations)
- Heavy computation (if needed)

### Cold Start Mitigation

**Vercel Warm-Up**:
- Functions kept warm with traffic
- Low-traffic functions may cold start

**No Manual Warm-Up** (V1):
- V1 does not implement manual warm-up (added cost, complexity)
- Accept cold starts as acceptable trade-off

**Future Optimization** (V2+):
- Cron job to ping functions every 5 minutes (keep warm)
- OR upgrade to Enterprise plan (always-warm functions)

---

## Deployment Topology

### Edge Network

**Locations**: 300+ globally (Vercel Edge Network)
**Routing**: Anycast (request routed to nearest edge location)
**Execution**: Middleware runs on edge location closest to user

**Example**:
- User in Tokyo → Middleware runs on Tokyo edge server
- User in New York → Middleware runs on New York edge server

**Result**: Low latency regardless of user location

### Serverless Functions

**Locations**: Single region (Vercel default, typically `us-east-1`)
**Routing**: Request forwarded to serverless function region
**Execution**: Server component/action runs on serverless function

**Example**:
- User in Tokyo → Middleware runs in Tokyo → Server component runs in `us-east-1`
- User in New York → Middleware runs in New York → Server component runs in `us-east-1`

**Result**: Middleware is fast (local edge), server component latency depends on user location

**Future Optimization** (V2+):
- Deploy serverless functions to multiple regions (Edge Functions)

---

## Error Handling

### Edge Runtime Errors

**Middleware Error**:
```typescript
export async function middleware(request: NextRequest) {
  try {
    const session = await supabase.auth.getSession();
    // ...
  } catch (error) {
    console.error('[MIDDLEWARE ERROR]', error);
    // Redirect to error page or allow request (graceful degradation)
    return NextResponse.redirect(new URL('/', request.url));
  }
}
```

**Fallback**: If middleware errors, redirect to safe route (landing page)

### Node.js Runtime Errors

**Server Component Error**:
```typescript
export default async function Page() {
  try {
    const data = await fetchData();
    return <div>{data.title}</div>;
  } catch (error) {
    console.error('[SERVER COMPONENT ERROR]', error);
    return <div>Error loading data</div>;
  }
}
```

**Error Boundary** (Next.js):
- `error.tsx` file catches unhandled errors
- Displays fallback UI

---

## Debugging

### Identifying Runtime

**Console Logs**:
```typescript
// Middleware (Edge Runtime)
console.log('[EDGE]', 'Middleware executing');

// Server Component (Node.js Runtime)
console.log('[NODE]', 'Server component executing');
```

**Log Locations**:
- **Edge**: Vercel Edge logs (Dashboard → Functions → Edge Middleware)
- **Node.js**: Vercel Function logs (Dashboard → Functions → `/api/...` or page)

### Common Errors

**Error**: "Module 'fs' not found" (in middleware)
**Cause**: Middleware runs on Edge, `fs` not available
**Fix**: Move logic to server component or API route

**Error**: "Prisma is not compatible with Edge Runtime"
**Cause**: Prisma uses Node.js APIs, not Edge-compatible
**Fix**: Use `@supabase/ssr` instead (Edge-compatible)

---

## Constraints

### Edge Runtime Constraints

**Timeout**: 30 seconds (enforced by Vercel)
**Memory**: Limited (no configuration, sufficient for auth checks)
**Bundle Size**: Limited (avoid large dependencies in middleware)

**Best Practice**: Keep middleware minimal (auth checks only, no business logic)

### Node.js Runtime Constraints

**Timeout**: 10 seconds (Hobby), 60 seconds (Pro)
**Memory**: 1024 MB (default), up to 3008 MB (Pro)
**Cold Start**: Unavoidable (serverless limitation)

**Best Practice**: Optimize database queries, minimize dependencies

---

**Authority**: This edge boundary model is fixed for V1. Changes to runtime selection require scope unlock.

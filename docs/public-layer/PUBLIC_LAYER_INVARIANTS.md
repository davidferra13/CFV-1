# Public Layer - Invariants

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines **non-negotiable rules** for the Public Layer. These invariants MUST be enforced at all times. Violation of any invariant is a critical defect that blocks deployment.

---

## Invariant 1: Public Pages Require No Authentication

### Rule
ALL routes under `app/(public)/` MUST render successfully for unauthenticated users.

### Enforcement
- NO `getUser()` calls that throw errors if user is not authenticated
- NO database queries that depend on `auth.uid()`
- NO conditional rendering based on session state (except for "Sign In" vs "Sign Out" button)

### Verification
```bash
# Test: Visit all public routes without signing in
curl -I http://localhost:3000/
curl -I http://localhost:3000/services
curl -I http://localhost:3000/pricing
# All should return 200 OK
```

### Violations (Examples)
❌ `const user = await requireAuth()` on public page
❌ `if (!session) throw new Error("Unauthorized")`
❌ Querying `events` table in page render function

---

## Invariant 2: No User-Specific Data on Public Pages

### Rule
Public pages MUST NOT display user-specific data, even if user is authenticated.

### Enforcement
- NO `SELECT ... WHERE tenant_id = ...` queries on public pages
- NO personalized greetings ("Welcome back, John!")
- NO user-specific content recommendations

### Exception
The header MAY display "Hi, [name]" if user is signed in, but this is optional and NOT required.

### Verification
```typescript
// ❌ VIOLATION
const events = await supabase
  .from('events')
  .select('*')
  .eq('tenant_id', session.user.id);

// ✅ CORRECT (no queries on public pages)
// Static content only
```

---

## Invariant 3: Static-First Rendering (No Database Queries in Page Components)

### Rule
Marketing pages (Home, Services, How It Works, Pricing) MUST use Static Site Generation (SSG).

### Enforcement
- NO `export const dynamic = 'force-dynamic'`
- NO database fetches in page component render
- Content is defined in JSX, not fetched from database

### Exception
Form submissions (POST requests) MAY query database, but page render MUST NOT.

### Verification
```bash
# Build the app and check for static pages
npm run build
# Check .next/server/app/(public)/page.html exists (static output)
```

### Violations (Examples)
❌ `const chefs = await supabase.from('chefs').select('*')`
❌ `export const revalidate = 60` (implies dynamic)
✅ Static JSX content only

---

## Invariant 4: All Forms Have CSRF Protection

### Rule
ALL form submissions from public pages MUST include CSRF protection.

### Enforcement
- Server Actions automatically include CSRF tokens (Next.js built-in)
- API routes MUST validate `Origin` and `Referer` headers
- NO unprotected POST endpoints

### Verification
```typescript
// In API route
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigins = [process.env.NEXT_PUBLIC_URL];

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  // ... handle request
}
```

---

## Invariant 5: All User Input is Sanitized

### Rule
ALL user input MUST be sanitized before database insertion.

### Enforcement
- Strip HTML tags from text inputs
- Validate email format with regex
- Escape special characters in SQL queries (use parameterized queries)
- Validate Zod schemas on both client and server

### Verification
```typescript
import { z } from 'zod';

const inquirySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(1000),
});

// Server-side validation
const validated = inquirySchema.parse(formData);

// Sanitization
const sanitizedMessage = validated.message
  .replace(/<[^>]*>/g, '') // Strip HTML tags
  .trim();
```

### Violations (Examples)
❌ Direct database insert without validation
❌ String interpolation in SQL queries
❌ Accepting raw HTML input

---

## Invariant 6: Middleware Redirects Before Page Render

### Rule
Authenticated users accessing `/signin` or `/signup` MUST be redirected BEFORE page HTML is sent.

### Enforcement
- Middleware runs on EVERY request
- `NextResponse.redirect()` returns 307 Temporary Redirect
- NO "flash of wrong page" - redirect happens at edge

### Verification
```bash
# Sign in, then visit /signin
curl -i http://localhost:3000/signin
# Should return 307 redirect, NOT 200 OK
```

### Implementation
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const session = await getSession();
  const path = req.nextUrl.pathname;

  if (session && (path === '/signin' || path === '/signup')) {
    const role = await getUserRole(session.user.id);
    const redirectUrl = role === 'chef' ? '/dashboard' : '/my-events';
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  return NextResponse.next();
}
```

---

## Invariant 7: Role Resolution is Authoritative (Never Inferred)

### Rule
User role MUST be determined by querying `user_roles` table. NEVER infer role from URL, session claims, or client state.

### Enforcement
- Middleware queries `user_roles.role` using `auth.uid()`
- Server Actions query `user_roles` table before authorization checks
- NO hardcoded role in session cookies or JWT

### Verification
```typescript
// ✅ CORRECT
async function getUserRole(authUserId: string): Promise<'chef' | 'client'> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', authUserId)
    .single();

  return data.role;
}

// ❌ VIOLATION
const role = session.user.role; // Role not in session!
const role = path.startsWith('/dashboard') ? 'chef' : 'client'; // Inferred!
```

---

## Invariant 8: No Sensitive Data in Client-Side JavaScript

### Rule
API keys, database credentials, service role keys MUST NOT be exposed to client-side code.

### Enforcement
- `NEXT_PUBLIC_*` prefix only for public values (Supabase URL, publishable Stripe key)
- Supabase service role key ONLY used in Server Components/Actions
- NO environment variables in client components without `NEXT_PUBLIC_` prefix

### Verification
```bash
# Search for service role key in client-side bundles
grep -r "service_role" .next/static/
# Should return NO results
```

### Violations (Examples)
❌ `const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY` in client component
❌ Hardcoded API keys in source code
❌ Service role key in `NEXT_PUBLIC_*` variable

---

## Invariant 9: Email Validation is Multi-Layered

### Rule
Email inputs MUST be validated at THREE layers:
1. Client-side (HTML5 `type="email"`)
2. Client-side validation (Zod schema)
3. Server-side validation (Zod + regex check)

### Enforcement
```typescript
// Client component
<input type="email" required />

// Validation schema
const emailSchema = z.string().email();

// Server Action
const result = emailSchema.safeParse(formData.email);
if (!result.success) {
  return { error: 'Invalid email format' };
}
```

### Verification
Submit form with invalid emails:
- `test@` → Should fail validation
- `test@.com` → Should fail validation
- `test` → Should fail validation

---

## Invariant 10: Rate Limiting on Form Submissions

### Rule
Inquiry form submissions MUST be rate-limited to prevent abuse.

### Enforcement
- Maximum 3 submissions per IP address per hour
- Use in-memory store (Map) or database to track submissions
- Return 429 Too Many Requests if limit exceeded

### Implementation
```typescript
const submissionCache = new Map<string, number[]>();

export async function submitInquiry(ip: string, data: InquiryData) {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  const recentSubmissions = submissionCache.get(ip)?.filter(t => t > hourAgo) || [];

  if (recentSubmissions.length >= 3) {
    throw new Error('Rate limit exceeded. Try again later.');
  }

  // Record submission
  submissionCache.set(ip, [...recentSubmissions, now]);

  // Insert into database
  // ...
}
```

---

## Invariant 11: Idempotency on Inquiry Submissions

### Rule
Duplicate inquiry submissions within 5 minutes MUST be rejected.

### Enforcement
- Hash submission data (email + message + timestamp)
- Check if hash exists in recent submissions
- If duplicate, return cached response (don't insert again)

### Implementation
```typescript
const idempotencyCache = new Map<string, { timestamp: number; response: any }>();

export async function submitInquiry(data: InquiryData) {
  const hash = createHash('sha256')
    .update(data.email + data.message)
    .digest('hex');

  const cached = idempotencyCache.get(hash);
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  if (cached && cached.timestamp > fiveMinutesAgo) {
    return cached.response; // Return cached response
  }

  // Insert into database
  const response = await db.insert('inquiries', data);

  // Cache response
  idempotencyCache.set(hash, { timestamp: Date.now(), response });

  return response;
}
```

---

## Invariant 12: Honeypot Field for Spam Protection

### Rule
Inquiry form MUST include a hidden honeypot field to catch bots.

### Enforcement
- Add `<input type="text" name="website" style="display:none" />`
- Server-side check: if `website` field is filled, reject submission
- NO error message (fail silently or show generic success)

### Implementation
```typescript
export async function submitInquiry(formData: FormData) {
  const honeypot = formData.get('website');

  if (honeypot) {
    // Bot detected - fail silently
    return { success: true }; // Fake success
  }

  // Proceed with real submission
  // ...
}
```

---

## Invariant 13: Signed-In Users Cannot Access /signin or /signup

### Rule
If user has active session, middleware MUST redirect away from auth pages.

### Enforcement
- Check session in middleware
- If session exists, redirect to appropriate portal
- NO scenario where signed-in user sees signin form

### Verification
```bash
# Sign in as chef, then visit /signin
curl -i http://localhost:3000/signin -H "Cookie: sb-access-token=..."
# Should return 307 redirect to /dashboard
```

---

## Invariant 14: XSS Prevention (Content Security Policy)

### Rule
All pages MUST have Content Security Policy headers to prevent XSS attacks.

### Enforcement
```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://*.supabase.co;
`;

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader.replace(/\s{2,}/g, ' ').trim() }
        ],
      },
    ];
  },
};
```

---

## Invariant 15: Mobile-First Responsive Design

### Rule
ALL pages MUST be fully functional on mobile devices (320px width minimum).

### Enforcement
- Tailwind CSS breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Touch-friendly targets: min 44x44px for buttons/links
- No horizontal scrolling on mobile viewports
- Hamburger menu for navigation on mobile

### Verification
```bash
# Test with Chrome DevTools
# Set viewport to iPhone SE (375x667)
# Verify all pages are usable
```

---

## Verification Checklist

Before deploying Public Layer:

- [ ] All public pages render without authentication
- [ ] No user-specific data on public pages
- [ ] All marketing pages are static (SSG)
- [ ] All forms have CSRF protection
- [ ] All inputs are sanitized
- [ ] Middleware redirects before page render
- [ ] Role resolution queries `user_roles` table
- [ ] No service role key in client-side code
- [ ] Email validation works at all 3 layers
- [ ] Rate limiting blocks >3 submissions/hour
- [ ] Idempotency prevents duplicate submissions
- [ ] Honeypot field catches bots
- [ ] Signed-in users redirected away from auth pages
- [ ] CSP headers prevent XSS
- [ ] Mobile-responsive design works on 320px viewport

---

**Status**: These invariants are LOCKED. Violations block deployment.

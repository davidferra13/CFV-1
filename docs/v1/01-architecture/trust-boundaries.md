# Trust Boundaries

**Document ID**: 012
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines WHAT is trusted and WHAT is NEVER trusted in ChefFlow V1, establishing clear security boundaries.

## Trust Model

ChefFlow V1 follows a **zero-trust input** model:
- NEVER trust client-submitted data
- ALWAYS validate server-side
- ALWAYS derive security-critical values from authenticated sessions
- Defense in depth: Multiple layers enforce same rules

---

## Trusted Sources

### 1. Database (Authoritative)

**What**: PostgreSQL via Supabase
**Why Trusted**: Single source of truth, enforced by RLS policies and triggers
**Scope**: ALL data queries return database state (no caching in V1)

**Examples**:
- User role (`user_roles` table)
- Tenant ID (`chefs.id`)
- Event status (`events.status`)
- Ledger entries (`ledger_entries`)

**Trust Guarantee**: If database says user is `chef`, user IS chef

---

### 2. Supabase Auth (Session)

**What**: Session tokens stored in HTTP-only cookies
**Why Trusted**: Managed by Supabase, cryptographically signed
**Scope**: Session identifies authenticated user (`auth.users.id`)

**Trust Guarantee**: If session exists, user is authenticated

**NOT Trusted**: JWT custom claims (not used in V1)
- Reason: Custom claims can be stale if role changes
- V1 queries `user_roles` table instead (always fresh)

---

### 3. Stripe Webhook Signatures

**What**: `Stripe-Signature` header on webhook requests
**Why Trusted**: Verified via `stripe.webhooks.constructEvent()` with webhook secret
**Scope**: Confirms request originated from Stripe

**Trust Guarantee**: If signature verifies, webhook is from Stripe (not forged)

**Code**:
```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
);
// If no error, event is trusted
```

---

### 4. Server-Side Code

**What**: Server components, server actions, API routes
**Why Trusted**: Executes on server, not modifiable by client
**Scope**: Business logic, validation, authorization

**Trust Guarantee**: Server code runs as written (client cannot modify)

---

### 5. Environment Variables (Server-Only)

**What**: `.env.local` or Vercel environment variables
**Why Trusted**: Not exposed to client, managed by developer/platform
**Scope**: Secrets (API keys, database credentials)

**Trust Guarantee**: Client cannot read or modify server-only env vars

---

## NEVER Trusted Sources

### 1. Client-Submitted Data

**What**: Form inputs, query params, request bodies, headers (except auth)
**Why NOT Trusted**: Client controls all outgoing data, can be forged
**Scope**: ALL user input

**Examples**:
- Form field: `<input name="tenant_id">`
- URL param: `/events?tenant_id=uuid`
- Request header: `X-Tenant-ID: uuid`
- Cookie: `tenant_id=uuid` (if set client-side)

**Attack Scenario**:
```typescript
// ❌ WRONG (trusts client input)
export async function createEvent(formData: FormData) {
  const tenantId = formData.get('tenant_id'); // Client-controlled!

  await supabase.from('events').insert({ tenant_id: tenantId, ... });
  // Client can insert event for ANY tenant (bypassing isolation)
}

// ✅ CORRECT (derives from session)
export async function createEvent(formData: FormData) {
  const user = await getCurrentUser();
  const tenantId = user.tenantId; // From database via session (trusted)

  await supabase.from('events').insert({ tenant_id: tenantId, ... });
  // Tenant ID is authoritative, cannot be forged
}
```

**Rule**: NEVER use client-submitted `tenant_id`, `client_id`, `role`, or any security-critical field directly

---

### 2. Client-Side Validation Results

**What**: Validation performed in client components (e.g., "email is valid")
**Why NOT Trusted**: Client code can be bypassed (DevTools, API calls)
**Scope**: ALL client-side checks

**Example**:
```typescript
// Client component (NOT trusted)
'use client';

export function EventForm() {
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ❌ Client-side validation (UX only, NOT security)
    if (title.length === 0) {
      alert('Title required');
      return; // User can bypass (remove this code in DevTools)
    }

    await createEvent(formData);
  };
}

// Server action (MUST re-validate)
'use server';

export async function createEvent(formData: FormData) {
  // ✅ Server-side validation (authoritative)
  const schema = z.object({ title: z.string().min(1) });
  const data = schema.parse({ title: formData.get('title') });

  // Use validated data
}
```

**Rule**: Client-side validation is UX enhancement ONLY. Server MUST re-validate.

---

### 3. URL Paths (For Authorization)

**What**: URL path (e.g., `/dashboard`, `/my-events`)
**Why NOT Trusted**: User can navigate to any URL
**Scope**: Portal routing

**Example**:
```typescript
// ❌ WRONG (infers role from URL)
export async function Layout({ children }) {
  const pathname = usePathname();

  if (pathname.startsWith('/dashboard')) {
    // Assume user is chef ← WRONG, client can navigate to /dashboard
  }

  return <div>{children}</div>;
}

// ✅ CORRECT (queries database for role)
export async function Layout({ children }) {
  const user = await getCurrentUser();

  if (user.role !== 'chef') {
    redirect('/'); // Unauthorized
  }

  return <div>{children}</div>;
}
```

**Rule**: URL indicates INTENT, not AUTHORIZATION. Always verify role from database.

---

### 4. HTTP Referer Header

**What**: `Referer` header (indicates previous page)
**Why NOT Trusted**: Can be spoofed or omitted
**Scope**: CSRF protection (not used in V1)

**Example**:
```typescript
// ❌ WRONG (trusts referer)
export async function POST(request: NextRequest) {
  const referer = request.headers.get('referer');

  if (!referer || !referer.includes('chefflow.app')) {
    return NextResponse.json({ error: 'Invalid referer' }, { status: 403 });
  }

  // Attacker can forge referer header
}

// ✅ CORRECT (use CSRF token or SameSite cookies)
// V1 uses SameSite cookies (Supabase default)
```

**Rule**: Do NOT rely on `Referer` header for security

---

### 5. localStorage / sessionStorage

**What**: Browser storage APIs
**Why NOT Trusted**: Accessible via JavaScript (XSS risk)
**Scope**: Session tokens, sensitive data

**Example**:
```typescript
// ❌ WRONG (stores session in localStorage)
localStorage.setItem('session_token', token);

// Vulnerable to XSS (attacker script can read localStorage)
```

**V1 Approach**: Supabase stores session in HTTP-only cookies (NOT localStorage)
- HTTP-only cookies are NOT accessible via JavaScript
- Mitigates XSS attacks

**Rule**: NEVER store session tokens in localStorage

---

### 6. Client Component State

**What**: React state (`useState`, `useContext`)
**Why NOT Trusted**: Stored in browser memory, modifiable via DevTools
**Scope**: Role, tenant ID, permission flags

**Example**:
```typescript
// ❌ WRONG (stores role in client state)
'use client';

export function Dashboard() {
  const [role, setRole] = useState('chef'); // Client-side, can be modified

  if (role !== 'chef') {
    return <div>Unauthorized</div>; // Client can set role = 'chef' in DevTools
  }

  return <div>Dashboard</div>;
}

// ✅ CORRECT (server component queries database)
export async function Dashboard() {
  const user = await getCurrentUser();

  if (user.role !== 'chef') {
    redirect('/'); // Server-side check, cannot be bypassed
  }

  return <div>Dashboard</div>;
}
```

**Rule**: Client state is for UX only (loading, errors, form values). NEVER for authorization.

---

## Trust Boundary Diagram

```
┌─────────────────────────────────────────────────┐
│ CLIENT (Browser)                                │
│ ┌─────────────────────────────────────────────┐ │
│ │ Client Components                           │ │
│ │ - React state (NOT trusted)                 │ │
│ │ - Form inputs (NOT trusted)                 │ │
│ │ - localStorage (NOT trusted)                │ │
│ │ - Event handlers (NOT trusted)              │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      ↓ HTTP Request
            (Form data, query params, cookies)
                      ↓
┌─────────────────────────────────────────────────┐
│ TRUST BOUNDARY (Middleware)                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ Edge Runtime                                │ │
│ │ - Validates session (TRUSTED)               │ │
│ │ - Resolves role from DB (TRUSTED)           │ │
│ │ - Redirects if unauthorized                 │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ SERVER (Node.js Runtime)                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ Server Components / Actions                 │ │
│ │ - Queries database (TRUSTED)                │ │
│ │ - Derives tenant_id from session (TRUSTED)  │ │
│ │ - Validates input (Zod)                     │ │
│ │ - Enforces RLS (database level)             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ DATABASE (PostgreSQL)                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ Row Level Security (RLS)                    │ │
│ │ - Enforces tenant isolation (TRUSTED)       │ │
│ │ - Prevents cross-tenant queries             │ │
│ │ - Immutability triggers (ledger, audit)     │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Defense in Depth Layers

ChefFlow V1 implements **3 security layers**:

### Layer 1: Middleware (Edge)

**Responsibility**: Auth check, role resolution, portal enforcement
**Enforcement**: Redirects before page renders
**Failure Mode**: User redirected to landing page

**Example**:
- Client tries to access `/dashboard`
- Middleware checks role → `client`
- Redirects to `/my-events` (before HTML sent)

---

### Layer 2: Layout/Page (Server)

**Responsibility**: Double-check auth and role (defense in depth)
**Enforcement**: Query `getCurrentUser()`, redirect if unauthorized
**Failure Mode**: User sees error page or redirected

**Example**:
```typescript
// app/(chef)/layout.tsx

export default async function ChefLayout({ children }) {
  const user = await getCurrentUser();

  if (user.role !== 'chef') {
    redirect('/'); // Second line of defense
  }

  return <div>{children}</div>;
}
```

---

### Layer 3: Database (RLS)

**Responsibility**: Enforce tenant isolation at data layer
**Enforcement**: RLS policies filter queries by `tenant_id`
**Failure Mode**: Query returns zero rows (not other tenant's data)

**Example**:
```sql
-- RLS policy on events table
CREATE POLICY events_chef_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Result**: Even if middleware and layout fail (impossible), database blocks cross-tenant access

---

## Input Validation Rules

### Rule 1: Validate on Server

**ALWAYS validate input server-side** (server actions, API routes)

```typescript
'use server';

import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(200),
  email: z.string().email(),
  guest_count: z.number().int().positive(),
});

export async function createEvent(formData: FormData) {
  const data = schema.parse({
    title: formData.get('title'),
    email: formData.get('email'),
    guest_count: Number(formData.get('guest_count')),
  });

  // Use validated data
}
```

### Rule 2: Sanitize Inputs

**Prevent XSS**: Escape user input before rendering
- React automatically escapes JSX text (safe by default)
- NEVER use `dangerouslySetInnerHTML` with user input

**Prevent SQL Injection**: Use parameterized queries
- Supabase client uses parameterized queries (safe by default)
- NEVER concatenate user input into SQL strings

**Example (SAFE)**:
```typescript
// ✅ SAFE (Supabase uses parameterized query)
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('title', userInput);
```

**Example (UNSAFE)**:
```typescript
// ❌ UNSAFE (SQL injection)
const query = `SELECT * FROM events WHERE title = '${userInput}'`;
await supabase.rpc('execute_sql', { query }); // DON'T DO THIS
```

### Rule 3: Type Coercion

**Convert strings to correct types** (numbers, booleans, dates)

```typescript
const schema = z.object({
  guest_count: z.number().int().positive(),
  event_date: z.string().datetime(),
});

const data = schema.parse({
  guest_count: Number(formData.get('guest_count')), // String → Number
  event_date: formData.get('event_date'), // String (ISO format)
});
```

---

## Authorization Rules

### Rule 1: Derive Security-Critical Values from Session

**NEVER trust client for**:
- `tenant_id`
- `client_id`
- `role`

**Example**:
```typescript
'use server';

export async function createEvent(formData: FormData) {
  const user = await getCurrentUser();

  // ✅ CORRECT (derive from session)
  const tenantId = user.tenantId; // From database
  const role = user.role; // From database

  // ❌ WRONG (trust client)
  const tenantId = formData.get('tenant_id'); // Client-controlled
}
```

### Rule 2: Check Ownership Before Mutations

**Verify resource belongs to user's tenant** (chef) or user (client)

```typescript
'use server';

export async function updateEvent(eventId: string, formData: FormData) {
  const user = await getCurrentUser();

  // Fetch event
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .single();

  // ✅ Ownership check
  if (event.tenant_id !== user.tenantId) {
    throw new Error('Unauthorized: event not in your tenant');
  }

  // Proceed with update
}
```

### Rule 3: Validate State Transitions

**Enforce business rules server-side**

```typescript
'use server';

export async function transitionEventStatus(
  eventId: string,
  toStatus: EventStatus
) {
  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single();

  // ✅ Validate transition
  if (!isValidTransition(event.status, toStatus)) {
    throw new Error(`Invalid transition: ${event.status} → ${toStatus}`);
  }

  // Proceed with transition
}
```

---

## Secrets Management

### Server-Only Secrets

**NEVER expose**:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Storage**:
- Local: `.env.local` (gitignored)
- Production: Vercel environment variables (encrypted)

**Access**:
- Server components: ✅ `process.env.STRIPE_SECRET_KEY`
- Client components: ❌ undefined

### Client-Safe Values

**CAN expose** (prefix with `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS enforced, safe to expose)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Access**:
- Server components: ✅
- Client components: ✅

---

## Testing Trust Boundaries

### Manual Testing

**Test 1: Client modifies form input**
1. Open DevTools → Network tab
2. Submit form
3. Edit request in DevTools (change `tenant_id`)
4. Expected: Server rejects (derives tenant_id from session, ignores client value)

**Test 2: Client navigates to wrong portal**
1. Log in as chef
2. Navigate to `/my-events` (client portal)
3. Expected: Middleware redirects to `/dashboard` (before HTML sent)

**Test 3: Client bypasses client-side validation**
1. Remove `required` attribute in DevTools
2. Submit empty form
3. Expected: Server returns validation error

### Automated Testing (V2+)

**Tool**: Playwright, Cypress
**Tests**: Attempt unauthorized actions, verify rejections

---

**Authority**: These trust boundaries are non-negotiable. Any code trusting client input is a critical security bug.

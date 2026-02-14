# ChefFlow V1 - Security Documentation

**Version**: 1.0
**Last Updated**: 2026-02-13

## Table of Contents

- [Overview](#overview)
- [Defense in Depth Architecture](#defense-in-depth-architecture)
- [Layer 1: Network (Middleware)](#layer-1-network-middleware)
- [Layer 2: Application (Layouts)](#layer-2-application-layouts)
- [Layer 3: Database (RLS)](#layer-3-database-rls)
- [Role Resolution](#role-resolution)
- [Multi-Tenant Isolation](#multi-tenant-isolation)
- [Webhook Security](#webhook-security)
- [Service Role Protection](#service-role-protection)
- [Security Verification](#security-verification)
- [Threat Model](#threat-model)

---

## Overview

ChefFlow V1 implements a **defense-in-depth security model** with three independent layers of protection. Each layer can independently prevent unauthorized access, ensuring that even if one layer fails, the others will block the attack.

### Security Guarantees

1. **No Cross-Portal Access** - Chefs cannot access client portal, clients cannot access chef portal
2. **No Cross-Tenant Data Leaks** - Chef A cannot see Chef B's data, even with direct database queries
3. **No Client-Side Role Inference** - Roles stored only in database, never in client state
4. **No Flash of Wrong Portal** - Middleware blocks before any HTML is sent
5. **Immutable Financial Records** - Ledger and transitions cannot be modified or deleted
6. **Service Role Key Protection** - Admin key never exposed to client

---

## Defense in Depth Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Request                       │
│          GET /chef/dashboard (with session cookie)      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: MIDDLEWARE (Network Level)                    │
│  ┌────────────────────────────────────────────────┐    │
│  │  1. Check auth session                         │    │
│  │  2. Query user_roles table                     │    │
│  │  3. Verify role matches route pattern          │    │
│  │  4. Redirect if mismatch OR Allow              │    │
│  └────────────────────────────────────────────────┘    │
│  Result: 302 Redirect OR Next()                         │
└──────────────────┬──────────────────────────────────────┘
                   │ (if allowed)
                   ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: LAYOUT (Application Level)                    │
│  ┌────────────────────────────────────────────────┐    │
│  │  1. Server Component executes                  │    │
│  │  2. Call requireChef() or requireClient()      │    │
│  │  3. Query user_roles again (defense in depth)  │    │
│  │  4. Throw error OR Render children             │    │
│  └────────────────────────────────────────────────┘    │
│  Result: 302 Redirect OR Render page                    │
└──────────────────┬──────────────────────────────────────┘
                   │ (if allowed)
                   ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: DATABASE (RLS Policies)                       │
│  ┌────────────────────────────────────────────────┐    │
│  │  1. Page queries Supabase (SELECT events)     │    │
│  │  2. RLS policy evaluates:                      │    │
│  │     - get_current_user_role() = 'chef'         │    │
│  │     - tenant_id = get_current_tenant_id()      │    │
│  │  3. Return matching rows OR Empty set          │    │
│  └────────────────────────────────────────────────┘    │
│  Result: Tenant-scoped data ONLY                        │
└─────────────────────────────────────────────────────────┘
```

### Failure Mode Analysis

| Layer | Can Fail How? | Defense | Impact if Bypassed |
|-------|---------------|---------|-------------------|
| **Middleware** | Logic bug, direct API call | Layer 2 + 3 block | HTML might render wrong portal |
| **Layout** | Forgot requireChef() call | Layer 3 blocks | Client code ships but data empty |
| **RLS** | Policy misconfiguration | Minimal policy surface | **CRITICAL** - data leak |

**Conclusion**: All 3 layers must fail simultaneously for data leak to occur.

---

## Layer 1: Network (Middleware)

**File**: [`middleware.ts`](middleware.ts:1)

### Responsibilities

1. **Block unauthenticated users** before any page loads
2. **Enforce role-based routing** (chef/client portal separation)
3. **Prevent "flash of wrong portal"** (redirect before HTML sent)
4. **Protect API routes** (except webhooks which use signature verification)

### Implementation

```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow public routes
  const publicPaths = ['/', '/pricing', '/contact']
  if (publicPaths.some((path) => pathname === path)) {
    return NextResponse.next()
  }

  // 2. Allow webhooks (signature verification instead)
  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next()
  }

  // 3. Create Supabase client
  const supabase = createServerClient(/* ... */)

  // 4. Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // 5. Get authoritative role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  // 6. Enforce role-based routing
  if (pathname.startsWith('/chef') && roleData.role !== 'chef') {
    return NextResponse.redirect(new URL('/client/my-events', request.url))
  }

  if (pathname.startsWith('/client') && roleData.role !== 'client') {
    return NextResponse.redirect(new URL('/chef/dashboard', request.url))
  }

  return NextResponse.next()
}
```

### Protected Route Patterns

- `/chef/*` - Requires `role='chef'`
- `/client/*` - Requires `role='client'`
- `/auth/*` - Allowed for all
- `/` - Public landing page

### Bypass Scenarios

**Q: Can a client directly navigate to `/chef/dashboard`?**
A: No. Middleware redirects to `/client/my-events` before page loads.

**Q: Can middleware be bypassed via API routes?**
A: No. API routes are also protected (except webhooks which verify signatures).

**Q: What if middleware has a logic bug?**
A: Layer 2 (layout) and Layer 3 (RLS) still block unauthorized access.

---

## Layer 2: Application (Layouts)

**Files**:
- [`app/(chef)/layout.tsx`](app/(chef)/layout.tsx:1)
- [`app/(client)/layout.tsx`](app/(client)/layout.tsx:1)

### Responsibilities

1. **Server-side role verification** (before client code ships)
2. **Throw errors** if unauthorized (redirect to signin)
3. **Render portal-specific UI shell** (nav, header, footer)
4. **Second line of defense** if middleware is bypassed

### Implementation

```typescript
// Chef Portal Layout
export default async function ChefLayout({ children }) {
  // Server Component - executes on server ONLY
  let user
  try {
    user = await requireChef() // Throws if not chef
  } catch {
    redirect('/auth/signin?portal=chef')
  }

  return (
    <div>
      <header>
        <nav>Chef Portal Navigation</nav>
        <span>{user.email}</span>
      </header>
      <main>{children}</main>
    </div>
  )
}
```

### Role Guard Functions

**File**: [`lib/auth/get-user.ts`](lib/auth/get-user.ts:1)

```typescript
// Require chef role - throws if not chef
export async function requireChef(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user || user.role !== 'chef') {
    throw new Error('Unauthorized: Chef access required')
  }

  return user
}

// Require client role - throws if not client
export async function requireClient(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user || user.role !== 'client') {
    throw new Error('Unauthorized: Client access required')
  }

  return user
}
```

### Why This Layer Matters

- **Defense if middleware bypassed** (e.g., direct API call to Server Action)
- **Prevents client code from shipping** to wrong role
- **Provides user context** to page components
- **Server Component** = no client bundle bloat

---

## Layer 3: Database (RLS)

**File**: [`supabase/migrations/20260213000002_rls_policies.sql`](supabase/migrations/20260213000002_rls_policies.sql:1)

### Responsibilities

1. **Ultimate enforcement** of multi-tenant isolation
2. **Guarantee no data leaks** even if app layers fail
3. **Role-based access control** at query level
4. **Prevent SQL injection** attacks from accessing wrong data

### RLS Policy Pattern (Chef)

```sql
-- Chefs can only SELECT their own tenant's data
CREATE POLICY events_chef_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**What this does:**
- Calls `get_current_user_role()` to verify user is a chef
- Calls `get_current_tenant_id()` to get the chef's tenant ID
- Filters `WHERE tenant_id = <chef's tenant_id>`
- Returns **empty set** if role doesn't match (not an error)

### RLS Policy Pattern (Client)

```sql
-- Clients can only SELECT events where they are the client
CREATE POLICY events_client_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

**What this does:**
- Verifies user is a client
- Gets client ID via `get_current_client_id()`
- Filters `WHERE client_id = <client's id>`
- Scopes client to only their own events

### Helper Functions (Authoritative)

```sql
-- Returns 'chef' or 'client' (or NULL)
CREATE FUNCTION get_current_user_role() RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns chef.id if user is chef, NULL otherwise
CREATE FUNCTION get_current_tenant_id() RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns client.id if user is client, NULL otherwise
CREATE FUNCTION get_current_client_id() RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### All Tables Have RLS Enabled

```sql
ALTER TABLE chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menus ENABLE ROW LEVEL SECURITY;
```

**Verification:**
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All should show rowsecurity = true
```

### RLS Bypass (Service Role)

Service role key bypasses RLS for **server-side operations only**:

- Webhook processing (Stripe event → ledger entry)
- User creation during signup
- System-initiated operations

**Critical**: Service role key NEVER exposed to client.

---

## Role Resolution

### Single Source of Truth: `user_roles` Table

```typescript
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = createServerClient()

  // 1. Get Supabase auth user
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // 2. Get role from authoritative source (NEVER infer from client state)
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', user.id)
    .single()

  if (roleError || !roleData) {
    console.error('[AUTH] User has no role assigned:', user.id)
    return null
  }

  // 3. Get tenant_id based on role
  let tenantId: string | null = null

  if (roleData.role === 'chef') {
    tenantId = roleData.entity_id // Chef's own ID is the tenant
  } else if (roleData.role === 'client') {
    // Fetch client's tenant_id from clients table
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
    tenantId,
  }
})
```

### Caching Strategy

- `getCurrentUser()` is wrapped with React `cache()`
- One database query per request (not per component)
- Cache scoped to request lifetime (server-side only)
- No caching in localStorage or client state

### Prohibited Patterns

```typescript
// ❌ WRONG - Inferring role from URL
const isChef = pathname.includes('/chef')

// ❌ WRONG - Storing role in client state
localStorage.setItem('role', 'chef')

// ❌ WRONG - Trusting client-provided role
const role = request.body.role // Client can manipulate this

// ✅ CORRECT - Always query user_roles table
const user = await getCurrentUser()
if (user.role === 'chef') { /* ... */ }
```

---

## Multi-Tenant Isolation

### Tenant Model

- **Tenant = Chef** (each chef is a separate tenant)
- **Clients belong to one tenant** via `clients.tenant_id`
- **All data scoped to tenant** via `tenant_id` column

### Tenant ID Propagation

```typescript
// Server Action: Create event
export async function createEvent(data: EventData) {
  const user = await requireChef() // Gets role and tenantId

  // NEVER trust client-provided tenant_id
  const event = await supabase
    .from('events')
    .insert({
      ...data,
      tenant_id: user.tenantId, // From server-side user object
      created_by: user.id,
    })

  // RLS policy will verify tenant_id matches user's tenant
  return event
}
```

### Cross-Tenant Prevention

```sql
-- Constraint: Event's client must belong to same tenant
ALTER TABLE events
  ADD CONSTRAINT fk_client_tenant CHECK (
    (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
  );
```

**Effect**: Prevents Chef A from creating events for Chef B's clients.

---

## Webhook Security

### Stripe Webhook Signature Verification

**File**: `app/api/webhooks/stripe/route.ts` (to be implemented)

```typescript
import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    // Verify signature - prevents spoofed webhooks
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response('Webhook signature invalid', { status: 400 })
  }

  // Process webhook with service role (bypasses RLS)
  // ...
}
```

### Why Webhooks Bypass Middleware

- Webhooks come from Stripe servers, not authenticated users
- No session cookie to validate
- Security via **signature verification** instead
- Service role used to write to ledger (bypasses RLS)

---

## Service Role Protection

### Service Role Key Usage

**ONLY** used for:
1. **Webhook processing** (Stripe → ledger writes)
2. **User creation during signup** (create user, assign role)
3. **System operations** (no user context)

### Protection Measures

```typescript
// ✅ CORRECT - Server-side only
// app/api/webhooks/stripe/route.ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
)

// ❌ WRONG - Exposed to client
// lib/supabase/client.ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER in client code
)
```

### Verification

```bash
# Grep codebase for service role key usage
grep -r "SUPABASE_SERVICE_ROLE_KEY" .

# Should ONLY appear in:
# - .env.local.example (documentation)
# - app/api/webhooks/stripe/route.ts (webhook handler)
# - lib/auth/* (server-side user creation)
```

---

## Security Verification

### Manual Testing

1. **Cross-Portal Access Test**
   ```bash
   # As chef, try to access client portal
   curl -H "Cookie: session=<chef-session>" http://localhost:3000/client/my-events
   # Expected: 302 redirect to /chef/dashboard
   ```

2. **Cross-Tenant Data Leak Test**
   ```sql
   -- As Chef A, try to query Chef B's events
   SELECT * FROM events WHERE tenant_id = '<chef-b-id>';
   -- Expected: Empty result (RLS blocks)
   ```

3. **Role Escalation Test**
   ```sql
   -- As client, try to UPDATE user_roles
   UPDATE user_roles SET role = 'chef' WHERE auth_user_id = auth.uid();
   -- Expected: ERROR - no UPDATE policy for clients
   ```

### Automated Verification Scripts

```bash
# Verify RLS enabled on all tables
npm run verify:rls

# Verify RLS policies block cross-tenant access
npm run verify:rls-strict

# Verify immutability triggers work
npm run verify:immutability
```

See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) for details.

---

## Threat Model

### Threats Mitigated

| Threat | Mitigation | Layer |
|--------|------------|-------|
| **Cross-portal access** | Middleware role check | 1 |
| **Cross-tenant data leak** | RLS policies | 3 |
| **Role escalation** | No user-facing UPDATE on user_roles | 3 |
| **Client-side role tampering** | Never trust client state | 1, 2, 3 |
| **SQL injection** | Supabase client (parameterized queries) | N/A |
| **Session hijacking** | Supabase secure cookies (httpOnly, sameSite) | N/A |
| **Webhook spoofing** | Stripe signature verification | Webhook |
| **Service key exposure** | Server-side only, env vars | Build |
| **Financial record tampering** | Immutability triggers | 3 |

### Threats NOT Mitigated (Out of Scope for V1)

- **DDoS attacks** - Use Vercel rate limiting (future)
- **Email spoofing** - Use SPF/DKIM (future)
- **Brute force login** - Use Supabase rate limiting (built-in)
- **XSS attacks** - Next.js auto-escapes (built-in)
- **CSRF attacks** - SameSite cookies (built-in)

---

## Best Practices

1. **Always use `requireChef()` or `requireClient()`** in Server Components and Server Actions
2. **Never infer role from URL, pathname, or client state**
3. **Always derive `tenant_id` from `getCurrentUser().tenantId`** (never trust client input)
4. **Use service role ONLY in API routes** (never in client code)
5. **Verify RLS policies** before deploying schema changes
6. **Test multi-tenant isolation** with multiple test accounts

---

## Related Documentation

- [RLS Policies](RLS_POLICIES.md) - Detailed RLS policy reference
- [Database Schema](DATABASE.md) - Table structure and relationships
- [Authentication](AUTHENTICATION.md) - Auth flow and user creation
- [Multi-Tenant Guide](MULTI_TENANT_GUIDE.md) - Tenant isolation patterns

---

**Document Status**: ✅ Complete
**Governance**: Governed by [CHEFFLOW_V1_SCOPE_LOCK.md](CHEFFLOW_V1_SCOPE_LOCK.md)
**Security Review**: Required before production deployment

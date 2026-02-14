# Defense in Depth: Middleware + Layout + RLS (V1)

This document explains how the Chef Portal achieves **defense in depth** through three independent layers of security enforcement: Middleware, Server Layouts, and Row-Level Security (RLS).

**Core Principle:** Each layer acts as an independent failsafe. Even if one layer fails, the others prevent unauthorized access.

---

## 1) Why Defense in Depth?

### 1.1 Single-Layer Security is Fragile

**Bad Example (Single Layer):**
```typescript
// ❌ Only checking role in client component
'use client';
export function EventsList({ events, userRole }) {
  if (userRole !== 'chef') return <div>Access denied</div>;
  return <div>{events.map(e => ...)}</div>;
}
```

**Problem:** Client code can be bypassed (inspect element, modify JavaScript). Attacker sees data anyway.

### 1.2 Defense in Depth is Resilient

**Good Example (Three Layers):**

```
Layer 1: Middleware → Checks role, redirects if wrong portal
Layer 2: Server Layout → Confirms role before rendering
Layer 3: RLS → Database blocks cross-tenant queries

Even if attacker bypasses Middleware and Layout,
RLS still prevents data leak.
```

---

## 2) The Three Layers

### 2.1 Overview

| Layer | When It Runs | What It Does | Bypassed If... | Protected By... |
|-------|--------------|--------------|----------------|-----------------|
| **Middleware** | On every request | Route guard; role check; redirect | Application bug | Layers 2 & 3 |
| **Server Layout** | On page render | Portal selection; role confirmation | Middleware bug | Layer 3 (RLS) |
| **RLS (Database)** | On every query | Tenant isolation; row filtering | Service role | Nothing (absolute) |

**Result:** Three independent checks. All three must fail for a breach to occur.

---

## 3) Layer 1: Middleware

### 3.1 Purpose

Middleware is the **first line of defense**. It intercepts every HTTP request and enforces role-based routing before any page renders.

### 3.2 What Middleware Does

1. **Authenticate:** Verify user has a valid session
2. **Resolve Role:** Query `user_roles` table for role and tenant_id
3. **Route Guard:** Check if user's role is allowed for requested path
4. **Redirect or Deny:** Redirect to correct portal or deny access

### 3.3 Implementation Example

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserRole } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Public routes (no auth required)
  if (path === '/' || path.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  // 1. Authenticate
  const user = await getUser(req);
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. Resolve role
  const roleData = await getUserRole(user.id);
  if (!roleData) {
    return NextResponse.redirect(new URL('/error?code=no_role', req.url));
  }

  const { role } = roleData;

  // 3. Route guard: Chef Portal
  if (path.startsWith('/chef')) {
    if (role === 'client') {
      return NextResponse.redirect(new URL('/client', req.url));
    }
    if (role !== 'chef' && role !== 'chef_subaccount') {
      return NextResponse.redirect(new URL('/error?code=unauthorized', req.url));
    }
  }

  // 3. Route guard: Client Portal
  if (path.startsWith('/client')) {
    if (role === 'chef' || role === 'chef_subaccount') {
      return NextResponse.redirect(new URL('/chef/dashboard', req.url));
    }
    if (role !== 'client') {
      return NextResponse.redirect(new URL('/error?code=unauthorized', req.url));
    }
  }

  // 4. Allow request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 3.4 What Middleware Protects Against

✅ **Unauthorized portal access**
- Client trying to access `/chef/events`
- Chef trying to access `/client/my-events`

✅ **Unauthenticated access**
- No session → redirect to login

✅ **Unknown roles**
- User with no `user_roles` entry → error page

### 3.5 What Middleware CANNOT Protect Against

❌ **Cross-tenant data access within same portal**
- Example: Chef A accessing Chef B's events via crafted API request
- **Protected by:** Layers 2 and 3 (Layout + RLS)

❌ **SQL injection or direct database access**
- **Protected by:** Layer 3 (RLS)

---

## 4) Layer 2: Server Layout

### 4.1 Purpose

Server layouts are the **second line of defense**. Even if middleware fails or is bypassed, the layout confirms role before rendering any portal-specific UI.

### 4.2 What Server Layout Does

1. **Re-check Role:** Query `user_roles` again (independent of middleware)
2. **Confirm Portal Match:** Ensure role matches portal
3. **Render Portal UI:** Load portal-specific navigation, components
4. **Deny if Mismatch:** Redirect or throw error if role doesn't match

### 4.3 Implementation Example

**Chef Portal Layout:**

```typescript
// app/(chef)/layout.tsx
import { getUser, getUserRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChefNavigation from '@/components/chef/ChefNavigation';

export default async function ChefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Re-authenticate
  const user = await getUser();
  if (!user) redirect('/login');

  // 2. Re-check role
  const roleData = await getUserRole(user.id);
  if (!roleData) redirect('/error?code=no_role');

  const { role, tenant_id } = roleData;

  // 3. Confirm role is chef or chef_subaccount
  if (role !== 'chef' && role !== 'chef_subaccount') {
    redirect('/error?code=wrong_portal');
  }

  // 4. Render Chef Portal UI
  return (
    <div className="chef-portal">
      <ChefNavigation role={role} tenantId={tenant_id} />
      <main>{children}</main>
    </div>
  );
}
```

**Client Portal Layout:**

```typescript
// app/(client)/layout.tsx
import { getUser, getUserRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ClientNavigation from '@/components/client/ClientNavigation';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const roleData = await getUserRole(user.id);
  if (!roleData) redirect('/error?code=no_role');

  const { role, tenant_id } = roleData;

  // Confirm role is client
  if (role !== 'client') {
    redirect('/error?code=wrong_portal');
  }

  return (
    <div className="client-portal">
      <ClientNavigation tenantId={tenant_id} />
      <main>{children}</main>
    </div>
  );
}
```

### 4.4 What Server Layout Protects Against

✅ **Middleware bypass**
- If middleware has a bug and allows wrong role through
- Layout re-checks role and blocks rendering

✅ **Wrong portal flash**
- Without layout gating, user might briefly see Chef Portal nav before redirect
- Layout prevents any Chef Portal UI from rendering to clients

✅ **Direct component access**
- If attacker directly imports and renders a Chef Portal component
- Layout ensures component is only rendered in correct context

### 4.5 What Server Layout CANNOT Protect Against

❌ **Cross-tenant queries**
- Example: Chef A queries Chef B's events via API
- **Protected by:** Layer 3 (RLS)

---

## 5) Layer 3: Row-Level Security (RLS)

### 5.1 Purpose

RLS is the **absolute last line of defense**. Even if middleware and layout both fail, RLS ensures the database itself enforces tenant isolation.

### 5.2 What RLS Does

1. **Filter Queries:** Automatically add `WHERE tenant_id = current_tenant` to all queries
2. **Block Cross-Tenant Access:** Queries cannot return rows from other tenants
3. **Enforce on All Operations:** SELECT, INSERT, UPDATE, DELETE all filtered
4. **Cannot Be Bypassed:** Unless using service role key (which is server-only)

### 5.3 Implementation Example

**Enable RLS on Table:**

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

**Create Policy for Chef Access:**

```sql
CREATE POLICY chef_access ON events
FOR ALL
USING (
  tenant_id = (
    SELECT tenant_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('chef', 'chef_subaccount')
  )
);
```

**What This Does:**

- `auth.uid()` returns the authenticated user's ID from Supabase session
- Policy looks up user's `tenant_id` from `user_roles`
- Query is filtered: `WHERE events.tenant_id = user's tenant_id`
- User can ONLY see/modify events in their tenant

### 5.4 RLS for Different Roles

**Chef and Subaccount Access:**

```sql
CREATE POLICY chef_access ON events
FOR ALL
USING (
  tenant_id = (
    SELECT tenant_id FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('chef', 'chef_subaccount')
  )
);
```

**Client Access (No Direct Access to Events):**

```sql
-- Clients do NOT have a policy on the events table
-- They access events via a client-safe view instead
```

**Service Role Bypass:**

```sql
-- Service role bypasses RLS (used for webhooks, admin operations)
-- No policy needed; service role key has full access
```

### 5.5 What RLS Protects Against

✅ **Cross-tenant queries**
- Chef A tries: `SELECT * FROM events WHERE tenant_id = 'chef-b'`
- RLS filters result: zero rows returned (even though rows exist)

✅ **Application bugs**
- Developer forgets to add `WHERE tenant_id = ?` in query
- RLS adds it automatically

✅ **SQL injection**
- Attacker injects malicious SQL
- RLS still filters by tenant_id

✅ **Direct database access**
- If attacker gains database credentials (non-service role)
- RLS still enforces tenant isolation

### 5.6 What RLS CANNOT Protect Against

❌ **Service role misuse**
- If service role key is leaked or misused
- Service role bypasses RLS entirely
- **Mitigation:** Protect service role key (server-only, never exposed to client)

---

## 6) How the Layers Work Together

### 6.1 Normal Request Flow (All Layers Work)

```
User (Chef A) requests /chef/events
   ↓
Middleware checks role → role = 'chef', tenant_id = 'tenant-a'
   ↓
Middleware allows request to proceed
   ↓
Server Layout re-checks role → role = 'chef' ✓
   ↓
Server Layout renders Chef Portal UI
   ↓
Server Component queries events:
  SELECT * FROM events WHERE tenant_id = 'tenant-a'
   ↓
RLS policy filters query → only tenant-a events returned
   ↓
User sees their events (correct behavior)
```

### 6.2 Attack Scenario 1: Middleware Bypassed

**Attacker bypasses middleware (e.g., crafted request):**

```
Attacker (Client role) sends request to /chef/events
   ↓
Middleware bypassed (hypothetical bug)
   ↓
Server Layout checks role → role = 'client' ❌
   ↓
Server Layout redirects to /error
   ↓
Request blocked (Layer 2 saved us)
```

### 6.3 Attack Scenario 2: Middleware + Layout Bypassed

**Attacker bypasses both middleware and layout (e.g., direct API call):**

```
Attacker (Chef A) sends API request:
  POST /api/events/update { event_id: 'chef-b-event-123' }
   ↓
Middleware and Layout bypassed (API route)
   ↓
Server action queries:
  UPDATE events SET status = 'canceled' WHERE id = 'chef-b-event-123'
   ↓
RLS policy filters query → WHERE tenant_id = 'tenant-a'
   ↓
Zero rows affected (event belongs to tenant-b)
   ↓
Attack blocked (Layer 3 saved us)
```

### 6.4 Attack Scenario 3: All Layers Bypassed

**Attacker gains service role key (catastrophic breach):**

```
Attacker uses service role key to query database directly
   ↓
RLS bypassed (service role has full access)
   ↓
Attacker can see all tenants' data
   ↓
BREACH OCCURRED
```

**Mitigation:**
- ✅ Service role key is stored server-side only (never in client code)
- ✅ Service role key is in `.env.local` (gitignored)
- ✅ Service role key is rotated regularly
- ✅ Service role usage is logged and monitored

---

## 7) Redundancy by Design

### 7.1 Why Redundancy Matters

**Single Point of Failure:**
- If only middleware checks role, one bug = total breach

**Multiple Points of Enforcement:**
- Middleware, Layout, and RLS all check independently
- One bug = other layers still protect

### 7.2 Redundancy Matrix

| Layer | Independent? | Can Be Bypassed? | Fallback |
|-------|--------------|------------------|----------|
| Middleware | ✅ Yes | ⚠️ Possible (bug) | Layout + RLS |
| Server Layout | ✅ Yes | ⚠️ Possible (bug) | RLS |
| RLS | ✅ Yes | ⚠️ Only by service role | None (absolute) |

---

## 8) Testing Defense in Depth

### 8.1 Test Each Layer Independently

**Test 1: Middleware Alone**

```typescript
describe('Middleware', () => {
  it('blocks client from /chef/events', async () => {
    const req = mockRequest('/chef/events', { role: 'client' });
    const res = await middleware(req);
    expect(res.status).toBe(307); // redirect
  });
});
```

**Test 2: Server Layout Alone**

```typescript
describe('Chef Layout', () => {
  it('redirects if role is client', async () => {
    mockUserRole({ role: 'client' });
    expect(() => renderChefLayout()).toThrow(); // or redirect
  });
});
```

**Test 3: RLS Alone (SQL Test)**

```sql
-- Simulate user A trying to access user B's events
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-a';

SELECT * FROM events WHERE tenant_id = 'tenant-b';
-- Expected: zero rows (RLS blocks)
```

### 8.2 Test Bypass Scenarios

**Test: Middleware bypassed, but Layout blocks**

```typescript
it('Layout blocks access even if middleware is bypassed', async () => {
  // Simulate middleware bypass by directly calling layout
  mockUserRole({ role: 'client' });
  const layout = await renderChefLayout();
  expect(layout).toRedirect('/error');
});
```

**Test: Middleware + Layout bypassed, but RLS blocks**

```typescript
it('RLS blocks cross-tenant query even if app layer fails', async () => {
  mockUserRole({ role: 'chef', tenant_id: 'tenant-a' });
  const events = await db.events.findMany({
    where: { tenant_id: 'tenant-b' }, // attacker crafted query
  });
  expect(events).toHaveLength(0); // RLS blocks
});
```

---

## 9) Performance Considerations

### 9.1 Does Redundancy Slow Down Requests?

**Answer:** Minimal impact.

**Middleware:** ~5-10ms (one DB query for role resolution)
**Layout:** ~5-10ms (redundant role check, cached in same request)
**RLS:** ~0-2ms (PostgreSQL policy evaluation is fast)

**Total Overhead:** ~10-20ms per request

**Trade-off:** Security > Speed. 20ms is acceptable for protection.

### 9.2 Optimizations

**Cache role in request context:**

```typescript
// Middleware resolves role once
const roleData = await getUserRole(user.id);
req.roleData = roleData; // attach to request

// Layout reads from request (no second DB query)
const roleData = req.roleData;
```

**Result:** Only one role query per request, not three.

---

## 10) Failure Modes and Fallbacks

### 10.1 What Happens If Layer Fails?

| Failure | Impact | Fallback | Recovery |
|---------|--------|----------|----------|
| **Middleware bug** | Wrong users might reach layout | Layout blocks | Fix middleware, deploy |
| **Layout bug** | Wrong users might render UI | RLS blocks data | Fix layout, deploy |
| **RLS bug** | Data leak possible | None (critical) | Fix policy, audit exposure |
| **Service role leaked** | Total breach | None (critical) | Rotate key, audit logs |

### 10.2 Incident Response

**If Layer 3 (RLS) fails:**

1. **Immediate:** Disable affected feature or table
2. **Investigate:** Review RLS policies, identify scope of exposure
3. **Fix:** Correct policy, deploy immediately
4. **Audit:** Review logs to identify if any cross-tenant queries occurred
5. **Notify:** Inform affected users if data was exposed

---

## 11) Summary: Defense in Depth at a Glance

### 11.1 Three Layers

1. **Middleware** — First defense; route guard; redirect wrong roles
2. **Server Layout** — Second defense; confirm role before rendering
3. **RLS** — Absolute defense; database enforces tenant isolation

### 11.2 Why It Works

- ✅ **Independent:** Each layer operates independently
- ✅ **Redundant:** All three must fail for breach to occur
- ✅ **Comprehensive:** Protects against app bugs, injection, bypasses
- ✅ **Provable:** Each layer can be tested in isolation

### 11.3 One-Sentence Summary

**The Chef Portal achieves defense in depth by enforcing role-based access control at three independent layers—Middleware (route guard), Server Layout (portal confirmation), and RLS (database tenant isolation)—ensuring that even if one or two layers fail, the remaining layer(s) prevent unauthorized access or data leaks.**

---

**End of Defense in Depth**

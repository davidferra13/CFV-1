# Client Role Resolution Flow

## Document Identity
- **File**: `CLIENT_ROLE_RESOLUTION_FLOW.md`
- **Category**: Identity & Linking (19/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **complete flow** for resolving client roles from authentication to authorization in the ChefFlow system.

It specifies:
- Step-by-step role resolution process
- Where role resolution occurs (middleware, layout, RLS)
- What happens when role cannot be resolved
- Performance considerations
- Security guarantees

---

## Role Resolution Overview

### What is Role Resolution?

**Role Resolution** is the process of determining:
1. **Who** the authenticated user is (`auth_user_id`)
2. **What role** they have (`'client'` or `'chef'`)
3. **Which entity** they are linked to (`client_id` or `chef_id`)
4. **Which tenant** they belong to (`tenant_id`)

### Why is Role Resolution Critical?

**System Law #2**: Role is authoritative and single-source-of-truth.

**Guarantees**:
- ✅ No "flash of wrong portal" (role resolved before render)
- ✅ No unauthorized access (RLS filters by resolved role)
- ✅ No role spoofing (resolved from database, not client state)

---

## Role Resolution Layers

### Layer 1: Middleware (Network Level)

**Purpose**: Validate session and resolve role before page render.

**Location**: `middleware.ts`

**Timing**: Before any HTML sent to client

**Flow**:
```typescript
export async function middleware(request: NextRequest) {
  const supabase = createServerClient();

  // 1. Validate auth session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Not authenticated → redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const auth_user_id = session.user.id;

  // 2. Resolve role from database (authoritative)
  const { data: userRole, error } = await supabase
    .from('user_roles')
    .select('role, entity_id, tenant_id')
    .eq('auth_user_id', auth_user_id)
    .single();

  if (error || !userRole) {
    // No role assigned → orphaned account
    return NextResponse.redirect(new URL('/account-setup-incomplete', request.url));
  }

  // 3. Route to correct portal based on role
  const path = request.nextUrl.pathname;

  if (userRole.role === 'client' && !path.startsWith('/my-events')) {
    // Client trying to access non-client route → redirect
    return NextResponse.redirect(new URL('/my-events', request.url));
  }

  if (userRole.role === 'chef' && !path.startsWith('/dashboard')) {
    // Chef trying to access client route → redirect
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 4. Attach role to request headers (for layout)
  const response = NextResponse.next();
  response.headers.set('x-user-role', userRole.role);
  response.headers.set('x-user-entity-id', userRole.entity_id);
  response.headers.set('x-user-tenant-id', userRole.tenant_id);

  return response;
}
```

**Key Points**:
- Session validated before role resolution
- Role queried from `user_roles` table (database)
- Redirect happens before HTML rendered (no flash)
- Role attached to request headers for downstream use

---

### Layer 2: Layout (Application Level)

**Purpose**: Validate role again and fetch user data before rendering UI.

**Location**: `app/(client)/layout.tsx`

**Timing**: Before page component rendered (server component)

**Flow**:
```typescript
// app/(client)/layout.tsx
export default async function ClientLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();

  // 1. Re-validate auth session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // 2. Re-resolve role (defense in depth)
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, entity_id, tenant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!userRole || userRole.role !== 'client') {
    // Not a client → redirect to error
    redirect('/unauthorized');
  }

  // 3. Fetch client profile
  const { data: client } = await supabase
    .from('clients')
    .select('id, email, full_name, tenant_id')
    .eq('id', userRole.entity_id)
    .single();

  if (!client || client.is_deleted) {
    // Profile deleted or missing → deny access
    redirect('/account-deleted');
  }

  // 4. Render client portal with user context
  return (
    <div>
      <ClientHeader client={client} />
      <main>{children}</main>
    </div>
  );
}
```

**Key Points**:
- Role validated again (defense in depth)
- Client profile fetched and validated
- Soft-deleted profiles denied access
- Layout blocks before page component rendered

---

### Layer 3: RLS (Database Level)

**Purpose**: Filter database queries by resolved role.

**Location**: PostgreSQL Row-Level Security policies

**Timing**: On every database query

**Helper Functions**:
```sql
-- Returns: 'chef' | 'client' | NULL
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns: clients.id | NULL
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns: tenant_id | NULL
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**RLS Policy Example**:
```sql
-- Clients can only SELECT events where they are the client
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id() AND
    tenant_id = get_current_tenant_id()
  );
```

**Key Points**:
- Role resolved on every query (from JWT `auth.uid()`)
- RLS filters results automatically
- No application code can bypass RLS
- Queries return empty set (not error) if unauthorized

---

## Detailed Resolution Flow

### Step 1: User Logs In

```
User submits credentials
  ↓
Supabase Auth validates
  ↓
JWT issued with auth_user_id in 'sub' claim
  ↓
Session cookie set (HTTP-only)
  ↓
User redirected to /my-events
```

---

### Step 2: Request Reaches Middleware

```
Request: GET /my-events
  ↓
Middleware extracts session cookie
  ↓
Supabase validates JWT signature
  ↓
Session valid → extract auth_user_id
  ↓
Query user_roles table:
  SELECT role, entity_id, tenant_id
  FROM user_roles
  WHERE auth_user_id = {auth_user_id}
  ↓
Result:
  role = 'client'
  entity_id = 'ccc-333'
  tenant_id = 'ttt-999'
  ↓
Attach to request headers
  ↓
Proceed to layout
```

---

### Step 3: Layout Fetches Client Profile

```
Layout (server component) executes
  ↓
Re-validate session (defense in depth)
  ↓
Re-resolve role from user_roles
  ↓
Verify role = 'client'
  ↓
Fetch client profile:
  SELECT * FROM clients
  WHERE id = {entity_id}
  ↓
RLS automatically filters:
  - get_current_user_role() = 'client'
  - id = get_current_client_id()
  ↓
Result: Client profile or empty set
  ↓
If profile exists and not deleted:
  → Render layout with client context
Else:
  → Redirect to error page
```

---

### Step 4: Page Component Queries Data

```
Page component executes (server component)
  ↓
Query events for client:
  SELECT * FROM events
  WHERE client_id = {client_id}
  ↓
RLS policy enforces:
  - get_current_user_role() = 'client'
  - client_id = get_current_client_id()
  - tenant_id = get_current_tenant_id()
  ↓
Database returns only client's events
  ↓
Render page with filtered data
```

---

## Role Resolution Performance

### Caching Strategy

**Problem**: Role resolution queries database on every request.

**Solution**: Cache role in session or request context.

**V1 Approach**: No caching (query database every time).

**Reason**: Simplicity and security (always fresh data).

**V2 Consideration**: Cache role in request headers or short-lived session.

---

### Query Performance

**Query**:
```sql
SELECT role, entity_id, tenant_id
FROM user_roles
WHERE auth_user_id = 'aaa-111';
```

**Index**:
```sql
CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);
```

**Performance**: O(1) lookup via unique index (very fast).

**Typical Latency**: < 1ms

---

### RLS Function Performance

**Functions**:
- `get_current_user_role()`
- `get_current_client_id()`
- `get_current_tenant_id()`

**Marked as**: `STABLE SECURITY DEFINER`

**Caching**: PostgreSQL may cache function results within transaction.

**Performance Impact**: Minimal (< 1ms per query).

---

## Error Handling

### Error 1: No Session

**Scenario**: User not authenticated.

**Detection**: `session` is `null`

**Action**: Redirect to `/login`

**User Experience**: Seamless redirect, no error message.

---

### Error 2: No Role Assigned

**Scenario**: Auth user exists but no role in `user_roles`.

**Detection**: `userRole` is `null` or `error`

**Cause**: Signup incomplete, role manually deleted, data corruption.

**Action**: Redirect to `/account-setup-incomplete`

**User Experience**:
```
"Account Setup Incomplete

Your account was created but setup was not completed.
Please contact support or complete the signup process."
```

---

### Error 3: Wrong Role for Portal

**Scenario**: Chef trying to access client portal.

**Detection**: `userRole.role !== 'client'`

**Action**: Redirect to correct portal (`/dashboard` for chef)

**User Experience**: Automatic redirect, no error shown.

---

### Error 4: Profile Deleted

**Scenario**: Client profile soft-deleted.

**Detection**: `client.is_deleted === true`

**Action**: Redirect to `/account-deleted`

**User Experience**:
```
"Account Deleted

Your account has been deleted and is no longer accessible.
If you believe this is an error, please contact support."
```

---

### Error 5: Profile Not Found

**Scenario**: `entity_id` references non-existent client.

**Detection**: `client` is `null`

**Cause**: Data corruption, profile hard-deleted.

**Action**: Redirect to `/account-error`

**User Experience**:
```
"Account Error

We encountered an error accessing your account.
Please contact support for assistance."
```

---

## Security Guarantees

### Guarantee 1: No Role Spoofing

**Attack**: Client modifies JWT to claim `role = 'chef'`.

**Prevention**:
- ✅ JWT does not contain role (only `auth_user_id`)
- ✅ Role resolved from database (not JWT)
- ✅ JWT signature validated by Supabase

**Result**: Attack fails (role always resolved from database).

---

### Guarantee 2: No Cross-Tenant Access

**Attack**: Client changes `tenant_id` in request to access another tenant's data.

**Prevention**:
- ✅ `tenant_id` resolved from database (not request)
- ✅ RLS filters by resolved `tenant_id`
- ✅ Application code does not trust client-provided `tenant_id`

**Result**: Attack fails (RLS blocks cross-tenant queries).

---

### Guarantee 3: No Flash of Wrong Portal

**Attack**: Client sees chef portal HTML before redirect.

**Prevention**:
- ✅ Middleware resolves role before HTML rendered
- ✅ Redirect occurs at network level (302 response)
- ✅ No HTML sent to client before role validated

**Result**: Client never sees wrong portal (clean redirect).

---

### Guarantee 4: Defense in Depth

**Layers**:
1. **Middleware** → Validates and redirects
2. **Layout** → Validates and blocks render
3. **RLS** → Filters database queries

**Even if middleware bypassed**:
- Layout will block render
- RLS will return empty results

**Even if layout bypassed**:
- RLS will prevent data leakage

**Result**: Multiple layers prevent unauthorized access.

---

## Testing Role Resolution

### Test 1: Middleware Resolves Client Role

```typescript
test('Middleware resolves client role correctly', async () => {
  // 1. Log in as client
  const { session } = await signIn('client@example.com', 'password');

  // 2. Make request to client portal
  const response = await fetch('/my-events', {
    headers: { Cookie: `supabase-auth-token=${session.access_token}` }
  });

  // 3. Verify no redirect (role resolved correctly)
  expect(response.status).toBe(200);
  expect(response.url).toBe('/my-events');
});
```

---

### Test 2: Chef Redirected from Client Portal

```typescript
test('Chef redirected to dashboard when accessing client portal', async () => {
  // 1. Log in as chef
  const { session } = await signIn('chef@example.com', 'password');

  // 2. Attempt to access client portal
  const response = await fetch('/my-events', {
    headers: { Cookie: `supabase-auth-token=${session.access_token}` }
  });

  // 3. Verify redirect to chef portal
  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/dashboard');
});
```

---

### Test 3: Orphaned User Redirected

```typescript
test('User without role redirected to setup page', async () => {
  // 1. Create auth user (no profile, no role)
  const { user } = await supabase.auth.signUp({
    email: 'orphan@example.com',
    password: 'password123'
  });

  // 2. Attempt to access portal
  const response = await fetch('/my-events', {
    headers: { Authorization: `Bearer ${user.access_token}` }
  });

  // 3. Verify redirect to setup page
  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/account-setup-incomplete');
});
```

---

### Test 4: RLS Filters by Role

```typescript
test('RLS returns only client own events', async () => {
  // 1. Log in as client
  await signIn('client@example.com', 'password');

  // 2. Query events (should only see own events)
  const { data: events } = await supabase
    .from('events')
    .select('*');

  // 3. Verify only own events returned
  expect(events.length).toBe(2); // Client has 2 events
  expect(events.every(e => e.client_id === clientId)).toBe(true);
});
```

---

## Role Resolution Sequence Diagram

```
User          Browser        Middleware       Database         Layout          Page
  |              |               |               |                |              |
  | Log In       |               |               |                |              |
  |------------->|               |               |                |              |
  |              | Validate      |               |                |              |
  |              |-------------->|               |                |              |
  |              |               | Check session |                |              |
  |              |               |-------------->|                |              |
  |              |               |               |                |              |
  |              |               | Resolve role  |                |              |
  |              |               |-------------->|                |              |
  |              |               |<--------------|                |              |
  |              |               | role='client' |                |              |
  |              |               |               |                |              |
  |              |<--------------|               |                |              |
  |              | Proceed       |               |                |              |
  |              |               |               |                |              |
  |              | Render Layout |               |                |              |
  |              |------------------------------>|                |              |
  |              |               |               | Validate role  |              |
  |              |               |               |<---------------|              |
  |              |               |               |--------------->|              |
  |              |               |               | Fetch profile  |              |
  |              |               |               |<---------------|              |
  |              |               |               |--------------->|              |
  |              |               |               |                | Render Page  |
  |              |               |               |                |------------->|
  |              |               |               |                |              | Query Events
  |              |               |               |                |              |------------->|
  |              |               |               |                |              | RLS Filter   |
  |              |               |               |<-------------------------------|
  |              |               |               |                |<-------------|
  |<-------------|<-------------------------------|<-------------------------------|
  | HTML rendered with client events
```

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_AUTH_FLOW.md](./CLIENT_AUTH_FLOW.md)
- [CLIENT_USER_ROLES_MAPPING.md](./CLIENT_USER_ROLES_MAPPING.md)
- [CLIENT_AUTHORIZATION_INVARIANTS.md](./CLIENT_AUTHORIZATION_INVARIANTS.md)
- [CLIENT_ACCOUNT_LINKING_RULES.md](./CLIENT_ACCOUNT_LINKING_RULES.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

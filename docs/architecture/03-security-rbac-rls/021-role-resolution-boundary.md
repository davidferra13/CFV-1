# Role Resolution Boundary

**Document ID**: 021
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the authoritative boundary for role resolution in ChefFlow V1. This document specifies WHERE, WHEN, and HOW user roles (chef vs client) are determined. Role resolution MUST be deterministic, server-side, and database-backed.

---

## Core Principle

**Single Source of Truth**: The `user_roles` table in PostgreSQL is the ONLY authoritative source for user roles. No other location (JWT claims, localStorage, URL paths, cookies) may be used for role determination.

---

## The user_roles Table (Authoritative)

### Schema

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('chef', 'client')),
  chef_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT user_roles_auth_user_id_key UNIQUE (auth_user_id),
  CONSTRAINT user_roles_role_check CHECK (
    (role = 'chef' AND chef_id IS NOT NULL AND client_id IS NULL) OR
    (role = 'client' AND client_id IS NOT NULL AND chef_id IS NULL)
  )
);
```

### Invariants

1. **One Role Per User**: `auth_user_id` unique constraint ensures each user has exactly one role
2. **Role Consistency**: CHECK constraint ensures `chef` role has `chef_id`, `client` role has `client_id`
3. **No Null Roles**: `role` column NOT NULL
4. **Immutable**: Once set, role CANNOT change (no UPDATE policy in V1)

### Data Examples

**Chef**:
```sql
INSERT INTO user_roles (auth_user_id, role, chef_id)
VALUES ('auth-uuid-123', 'chef', 'chef-uuid-456');
```

**Client**:
```sql
INSERT INTO user_roles (auth_user_id, role, client_id)
VALUES ('auth-uuid-789', 'client', 'client-uuid-012');
```

---

## Role Resolution Function

### Implementation

**File**: `lib/auth/get-user.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'chef' | 'client';

export interface CurrentUser {
  id: string;              // auth.users.id
  email: string;           // auth.users.email
  role: UserRole;          // user_roles.role
  tenantId: string | null; // chef_id (if chef) or tenant_id (if client)
  clientId: string | null; // client_id (if client)
}

/**
 * Get the current authenticated user with their role.
 * This is the ONLY way to determine user role in the application.
 *
 * @throws Error if user is not authenticated or has no role
 * @returns CurrentUser object with role and IDs
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = createClient();

  // Step 1: Get authenticated user from session
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Step 2: Query role from user_roles table (authoritative)
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, chef_id, client_id')
    .eq('auth_user_id', user.id)
    .single();

  if (roleError || !roleData) {
    throw new Error('User has no role assigned');
  }

  // Step 3: Determine tenant ID based on role
  let tenantId: string | null = null;
  if (roleData.role === 'chef') {
    tenantId = roleData.chef_id;
  } else if (roleData.role === 'client') {
    // Clients need to lookup their tenant_id from clients table
    const { data: clientData } = await supabase
      .from('clients')
      .select('tenant_id')
      .eq('id', roleData.client_id)
      .single();
    tenantId = clientData?.tenant_id || null;
  }

  return {
    id: user.id,
    email: user.email!,
    role: roleData.role as UserRole,
    tenantId,
    clientId: roleData.client_id,
  };
}

/**
 * Require user to be authenticated and optionally have a specific role.
 *
 * @param requiredRole - Optional role requirement
 * @throws Error if user is not authenticated or doesn't have required role
 * @returns CurrentUser object
 */
export async function requireUser(requiredRole?: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (requiredRole && user.role !== requiredRole) {
    throw new Error(`Access denied. Required role: ${requiredRole}`);
  }

  return user;
}
```

### Usage Patterns

**In Server Components**:
```typescript
// app/(chef)/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await requireUser('chef');

  // user.role is guaranteed to be 'chef'
  // user.tenantId is the chef's ID

  return <div>Welcome, Chef {user.email}</div>;
}
```

**In API Routes**:
```typescript
// app/api/events/route.ts
export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (user.role === 'chef') {
    // Return all events for chef's tenant
  } else {
    // Return events where client is assigned
  }
}
```

**In Server Actions**:
```typescript
'use server';

export async function createEvent(formData: FormData) {
  const user = await requireUser('chef');

  // Only chefs can create events
  // user.tenantId is automatically used for event.tenant_id
}
```

---

## Prohibited Role Sources

### ❌ NEVER Use These for Role Determination

**1. JWT Claims**:
```typescript
// WRONG: JWT role is always "authenticated", not chef/client
const token = parseJwt(session.access_token);
const role = token.role; // ❌ This is "authenticated", not "chef"
```

**2. URL Path**:
```typescript
// WRONG: User can manually navigate to wrong portal
if (pathname.startsWith('/dashboard')) {
  role = 'chef'; // ❌ Client can visit /dashboard URL
}
```

**3. localStorage/sessionStorage**:
```typescript
// WRONG: Client can modify browser storage
const role = localStorage.getItem('role'); // ❌ Not secure
```

**4. Client Component State**:
```typescript
// WRONG: State is client-side, not authoritative
const [role, setRole] = useState('chef'); // ❌ Not from database
```

**5. Cookies (Custom)**:
```typescript
// WRONG: Cookies can be manipulated
const role = cookies.get('user_role'); // ❌ Not verified
```

**6. Query Parameters**:
```typescript
// WRONG: User can change URL
const role = searchParams.get('role'); // ❌ User-provided
```

### ✅ ONLY Use Database

```typescript
// CORRECT: Query user_roles table
const user = await getCurrentUser();
const role = user.role; // ✅ From database
```

---

## Role Assignment (Creation)

### Chef Signup

**Trigger**: User signs up via `/signup`

**Database Trigger**:
```sql
CREATE OR REPLACE FUNCTION handle_new_chef()
RETURNS TRIGGER AS $$
BEGIN
  -- Create chef record
  INSERT INTO chefs (id, auth_user_id, business_name, email)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.raw_user_meta_data->>'business_name',
    NEW.email
  );

  -- Assign chef role
  INSERT INTO user_roles (auth_user_id, role, chef_id)
  VALUES (NEW.id, 'chef', (SELECT id FROM chefs WHERE auth_user_id = NEW.id));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
WHEN (NEW.raw_user_meta_data->>'signup_type' = 'chef')
EXECUTE FUNCTION handle_new_chef();
```

**Result**: `user_roles` entry created automatically on signup

---

### Client Invitation

**Trigger**: Chef sends invitation via `/api/invitations`

**Server Action**:
```typescript
export async function createClientInvitation(email: string) {
  const chef = await requireUser('chef');

  // Create client record (pre-registration)
  const { data: client } = await supabase
    .from('clients')
    .insert({
      tenant_id: chef.tenantId,
      email,
      name: '', // Filled in on signup
    })
    .select()
    .single();

  // Create invitation token
  const token = crypto.randomUUID();
  await supabase.from('client_invitations').insert({
    token,
    client_id: client.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // Send email (implementation in V1)
  await sendInvitationEmail(email, token);
}
```

**Client Accepts Invitation**:
```typescript
export async function acceptInvitation(token: string, password: string) {
  // Validate token
  const { data: invitation } = await supabase
    .from('client_invitations')
    .select('*, clients(*)')
    .eq('token', token)
    .is('used_at', null)
    .single();

  if (!invitation) throw new Error('Invalid invitation');

  // Create auth user
  const { data: authData } = await supabase.auth.signUp({
    email: invitation.clients.email,
    password,
  });

  // Assign client role
  await supabase.from('user_roles').insert({
    auth_user_id: authData.user.id,
    role: 'client',
    client_id: invitation.client_id,
  });

  // Mark invitation used
  await supabase
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token);
}
```

---

## Middleware Integration

### Portal Gating

**File**: `middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session (authenticated check only)
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // CRITICAL: Middleware cannot call getCurrentUser() (Edge Runtime limitation)
  // Role gating happens in layout.tsx (Node.js runtime)

  return NextResponse.next();
}
```

**Limitation**: Middleware runs on Edge Runtime (no database access). Role resolution deferred to layout.

---

## Layout Integration

### Chef Portal Layout

**File**: `app/(chef)/layout.tsx`

```typescript
import { getCurrentUser } from '@/lib/auth/get-user';
import { redirect } from 'next/navigation';

export default async function ChefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Enforce chef-only access
  if (user.role !== 'chef') {
    redirect('/my-events'); // Client portal
  }

  return (
    <div>
      <ChefNav user={user} />
      {children}
    </div>
  );
}
```

**Effect**: Clients redirected to their portal BEFORE rendering chef HTML

---

### Client Portal Layout

**File**: `app/(client)/layout.tsx`

```typescript
import { getCurrentUser } from '@/lib/auth/get-user';
import { redirect } from 'next/navigation';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Enforce client-only access
  if (user.role !== 'client') {
    redirect('/dashboard'); // Chef portal
  }

  return (
    <div>
      <ClientNav user={user} />
      {children}
    </div>
  );
}
```

---

## Database Helper Functions

### PostgreSQL Functions (RLS Support)

```sql
-- Get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_roles
  WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current tenant ID (chef_id if chef, clients.tenant_id if client)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT CASE
    WHEN role = 'chef' THEN chef_id
    WHEN role = 'client' THEN (SELECT tenant_id FROM clients WHERE id = client_id)
  END
  FROM user_roles
  WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current client ID (NULL if chef)
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Usage in RLS Policies**:
```sql
CREATE POLICY events_chef_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

## Performance Considerations

### Caching

**React Server Components**: `getCurrentUser()` result is cached per request (automatic)

**Database Query**: Each request makes 1-2 queries (auth.getUser + user_roles lookup)

**Optimization**: Create view or materialized view (post-V1)

### Connection Pooling

**Supabase**: PgBouncer enabled (transaction mode)

**Effect**: Role queries don't exhaust connection pool

---

## Error Handling

### No Role Assigned

**Scenario**: User exists in auth.users but not in user_roles

**Cause**: Database trigger failed during signup

**Response**:
```typescript
if (!roleData) {
  console.error('User has no role:', user.id);
  throw new Error('Account configuration error. Please contact support.');
}
```

**Action**: Manual intervention required (assign role via Supabase Studio)

---

### Role Mismatch

**Scenario**: `user_roles.role = 'chef'` but `chef_id` is NULL

**Cause**: CHECK constraint violation (should be impossible)

**Prevention**: Database constraint prevents this

**If Occurs**: Critical bug, data integrity issue

---

## Verification Checklist

Before production:

- [ ] `getCurrentUser()` queries `user_roles` table
- [ ] No role determination from JWT claims
- [ ] No role determination from URL path
- [ ] No role determination from client storage
- [ ] Chef layout redirects clients
- [ ] Client layout redirects chefs
- [ ] RLS policies use `get_current_user_role()`
- [ ] Database constraints enforce role consistency
- [ ] Signup triggers create `user_roles` entry
- [ ] Invitation flow creates `user_roles` entry

---

## References

- **Auth Surface**: `020-auth-surface.md`
- **RLS Enforcement Philosophy**: `022-rls-enforcement-philosophy.md`
- **Multi-Tenant Isolation**: `024-multi-tenant-isolation.md`
- **Session Management**: `025-session-management.md`

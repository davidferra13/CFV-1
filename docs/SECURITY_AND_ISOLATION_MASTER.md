# ChefFlow V1 - Security, Isolation & Enforcement Master Document

**Version**: 1.0
**Date**: 2026-02-14
**Status**: ENFORCEMENT CONSTITUTION
**Authority**: This document defines the security model of ChefFlow V1. If this document is wrong, the entire system is compromised.

---

## Document Purpose

This is **not** a feature specification. This is an **enforcement constitution**.

**If any rule in this document is violated, the system is insecure.**

All security enforcement is server-side or database-level. No frontend trust. No soft enforcement. No implicit trust between subsystems.

---

## 1. Threat Model (V1 Scope Only)

### 1.1 External Attacker (Unauthenticated)

**Attack Vector**: Attempt to access protected routes without authentication.

**Protection Layer**:
- **Middleware**: Redirects to `/auth/signin` before any protected code executes
- **Database RLS**: Denies all queries (no `auth.uid()` = no rows returned)

**Enforcement Location**:
- Middleware (`middleware.ts`)
- RLS policies (`USING` clause requires `auth.uid()`)

**Invariant**: No protected data accessible without valid Supabase session.

---

### 1.2 Authenticated Client - Privilege Escalation

**Attack Vector**: Client attempts to access chef portal or chef-only data.

**Attack Example**:
```
Client manually navigates to /chef/dashboard
Client calls server action with forged tenant_id
Client queries events table with another client's client_id
```

**Protection Layer**:
- **Middleware**: Detects `role = 'client'` and redirects to `/client/my-events`
- **Layout Guards**: `requireChef()` throws error if `role != 'chef'`
- **RLS Policies**: `USING (get_current_user_role() = 'chef')`

**Enforcement Location**:
- Middleware (`middleware.ts` lines 106-109)
- Layout (`lib/auth/get-user.ts` `requireChef()`)
- RLS (`supabase/migrations/20260213000002_rls_policies.sql`)

**Invariant**: Client CANNOT:
- Access `/chef/*` routes (middleware blocks)
- Execute chef-only server actions (layout guard blocks)
- Query tenant-scoped data (RLS denies)

**Test Case**:
1. Authenticate as client
2. Manually modify browser URL to `/chef/dashboard`
3. Expected: 307 redirect to `/client/my-events` (NO HTML rendered)
4. Direct DB query as client user: `SELECT * FROM events WHERE tenant_id = 'other-chef-id'`
5. Expected: 0 rows (RLS denies)

---

### 1.3 Chef - Cross-Tenant Data Access

**Attack Vector**: Chef A attempts to access Chef B's tenant data.

**Attack Example**:
```
Chef A forges API request with Chef B's tenant_id in body
Chef A modifies event_id in URL to Chef B's event
Chef A queries clients table for all clients (no tenant_id filter)
```

**Protection Layer**:
- **Server Actions**: Derive `tenant_id` from `getCurrentUser().tenantId`, NEVER trust request body
- **RLS Policies**: `USING (tenant_id = get_current_tenant_id())`
- **Database Constraints**: Foreign key checks ensure client belongs to same tenant

**Enforcement Location**:
- Server actions (derive tenant_id from session, not request)
- RLS helper (`get_current_tenant_id()` returns chef's own ID only)
- Constraint (`events` table: `CONSTRAINT fk_client_tenant`)

**Invariant**: Chef A CANNOT:
- See Chef B's events (RLS filters by `tenant_id`)
- Modify Chef B's data (RLS denies INSERT/UPDATE where `tenant_id != A`)
- Reference Chef B's clients in events (foreign key constraint fails)

**Test Case**:
1. Authenticate as Chef A (tenant_id = UUID_A)
2. Create event with forged `tenant_id = UUID_B` in request body
3. Expected: Server derives `tenant_id = UUID_A` from session, ignores request body
4. Direct DB query: `UPDATE events SET tenant_id = 'UUID_B' WHERE id = 'event_id'`
5. Expected: RLS denies UPDATE (policy checks `tenant_id = UUID_A`)

---

### 1.4 JWT Manipulation

**Attack Vector**: Attacker modifies JWT claims to change role or tenant_id.

**Attack Example**:
```
Attacker decodes JWT, changes payload to {"role": "chef"}
Attacker replays old JWT after role change
Attacker forges JWT with admin role
```

**Protection Layer**:
- **JWT Signature Validation**: Supabase verifies JWT signature on every request
- **Role NOT in JWT**: Role stored in `user_roles` table, NOT in JWT claims
- **Database Query**: Every request queries `user_roles` for authoritative role

**Enforcement Location**:
- Supabase Auth (signature verification, automatic)
- `lib/auth/get-user.ts` (queries `user_roles` table)
- Middleware (queries DB, not JWT)

**Invariant**: JWT contains ONLY `auth.users.id`. Role is derived from DB query.

**Test Case**:
1. Capture valid JWT for client user
2. Decode JWT and modify payload (will break signature)
3. Send request with modified JWT
4. Expected: Supabase rejects (invalid signature)
5. OR: JWT valid but role still queried from DB (JWT claims ignored)

---

### 1.5 ID Enumeration

**Attack Vector**: Attacker guesses UUIDs to access other users' data.

**Attack Example**:
```
Attacker iterates through event IDs: /events/{uuid}
Attacker guesses client_id and attempts to view event
Attacker enumerates chef IDs to find all tenants
```

**Protection Layer**:
- **RLS Policies**: Even if attacker guesses correct UUID, RLS denies access
- **UUIDs are random**: Not sequential, hard to enumerate
- **No error leakage**: 404 for both "not found" and "access denied" (prevents leaking existence)

**Enforcement Location**:
- RLS policies (filter by tenant_id and client_id)
- Server actions (return 404 if RLS returns empty, don't reveal "exists but denied")

**Invariant**: Knowing a UUID grants NO access without proper role and tenant_id.

**Test Case**:
1. Authenticate as Chef A
2. Obtain event_id for Chef B's event (via separate test setup)
3. Attempt to query: `SELECT * FROM events WHERE id = 'chef_b_event_id'`
4. Expected: 0 rows (RLS denies)
5. Attempt to access via UI: `/events/{chef_b_event_id}`
6. Expected: 404 (don't leak "exists but forbidden")

---

### 1.6 Stripe Webhook Spoofing

**Attack Vector**: Attacker sends fake webhook to mark event as paid without payment.

**Attack Example**:
```
POST /api/webhooks/stripe
{
  "type": "payment_intent.succeeded",
  "data": { "object": { "id": "pi_fake", "amount": 10000 } }
}
```

**Protection Layer**:
- **Signature Verification**: Every webhook MUST verify `stripe-signature` header
- **Secret Key**: Only Stripe knows `STRIPE_WEBHOOK_SECRET`
- **Reject Invalid**: Return 400 if signature invalid

**Enforcement Location**:
- Webhook handler (`/api/webhooks/stripe`)

**Invariant**: Only webhooks signed by Stripe are processed.

**Test Case**:
1. Send POST to `/api/webhooks/stripe` without signature header
2. Expected: 400 Bad Request
3. Send POST with forged signature header
4. Expected: 400 Bad Request (signature verification fails)
5. Send POST with valid signature from Stripe CLI test
6. Expected: 200 OK (webhook processed)

---

### 1.7 Malicious File Uploads

**Attack Vector**: User uploads malicious file (XSS, virus, shell script).

**Protection Layer**: **NOT APPLICABLE (V1)**

**Status**: File uploads are EXCLUDED from V1 scope.

**If Implemented in Future**:
- Server-side MIME type validation
- File size limits
- Virus scanning
- Storage isolation (tenant-scoped buckets)
- Signed URLs with expiration
- No direct file serving (prevent XSS via SVG/HTML)

**Current Enforcement**: No file upload endpoints exist.

---

### 1.8 Race Condition Exploitation

**Attack Vector**: Client submits duplicate payment to charge twice.

**Attack Example**:
```
Client clicks "Pay" button twice rapidly
Two webhook events fire simultaneously
Both attempt to create ledger entry
```

**Protection Layer**:
- **Database Constraint**: `UNIQUE(stripe_event_id)` on `ledger_entries`
- **Atomic INSERT**: Only one INSERT succeeds, second fails with constraint violation
- **Idempotent Handler**: Catch constraint error, return 200 (already processed)

**Enforcement Location**:
- Database constraint (`ledger_entries` table)
- Webhook handler (idempotency logic)

**Invariant**: One Stripe event → exactly one ledger entry (no duplicates).

**Test Case**:
1. Send same webhook event twice simultaneously
2. Expected: First INSERT succeeds, second fails with unique constraint
3. Expected: Both webhook responses are 200 OK
4. Query ledger: Exactly 1 entry with that `stripe_event_id`

---

## 2. Role-Based Access Control (RBAC) Model

### 2.1 Canonical Roles in V1

**Roles** (ENUM):
```sql
CREATE TYPE user_role AS ENUM ('chef', 'client');
```

**Count**: Exactly 2 roles in V1.

**EXCLUDED (V1)**:
- `admin` role (no super-admin in V1)
- `staff` role (no multi-chef collaboration)
- Multiple roles per user (1 user = 1 role)

### 2.2 Role Assignment Rules

**Rule 1**: One auth user → exactly **one primary role** in V1.

**Enforcement**:
```sql
CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);
```

**Consequence**: Second INSERT with same `auth_user_id` fails with unique constraint.

**Rule 2**: Role stored ONLY in `user_roles` table.

**NEVER**:
- Store role in JWT claims
- Infer role from URL path
- Cache role in client state (localStorage, cookies)
- Derive role from table existence (e.g., "if row in chefs table, user is chef")

**ALWAYS**:
- Query `user_roles` table on server
- Use `get_current_user_role()` helper in RLS

**Rule 3**: Role is immutable post-signup.

**No User-Facing Role Changes**:
- User cannot "switch" from client to chef
- User cannot have multiple roles
- Role change requires admin intervention (DB console in V1)

**Enforcement**: No UPDATE policy on `user_roles` for regular users.

### 2.3 Access Control Matrix

| Table | Chef Access | Client Access | Service Role |
|-------|-------------|---------------|--------------|
| `chefs` | SELECT/UPDATE own | None | Full |
| `clients` | SELECT/INSERT/UPDATE (tenant-scoped) | SELECT/UPDATE own | Full |
| `user_roles` | SELECT own | SELECT own | Full |
| `client_invitations` | Full CRUD (tenant-scoped) | None (public reads by token) | Full |
| `events` | Full CRUD (tenant-scoped) | SELECT/UPDATE limited (own events) | Full |
| `event_transitions` | SELECT (tenant-scoped) | SELECT (own events) | INSERT-only (system) |
| `ledger_entries` | SELECT (tenant-scoped), INSERT (adjustments) | SELECT (own entries) | Full |
| `menus` | Full CRUD (tenant-scoped) | SELECT (active, from own chef) | Full |
| `event_menus` | Full CRUD (tenant-scoped) | SELECT (own events) | Full |

**Legend**:
- **Full CRUD**: SELECT, INSERT, UPDATE, DELETE
- **SELECT only**: Read-only
- **None**: No access (RLS denies)
- **Service Role**: Bypasses RLS (backend-only)

### 2.4 Prohibited Actions

**Client CANNOT**:
- Create events (only chef can)
- Transition events to `confirmed` (only chef can)
- View other clients' events (even within same tenant)
- Modify pricing on events
- Access chef portal routes
- Insert ledger entries (only chef adjustments or webhook)
- View internal notes (FUTURE - not in V1 schema)

**Chef CANNOT**:
- Access other tenants' data
- Modify immutable ledger entries (UPDATE blocked by trigger)
- Delete financial history (DELETE blocked by trigger)
- Bypass RLS (only service role can)
- Change their own role (UPDATE on user_roles denied)

**Service Role (Backend) CAN**:
- Insert ledger entries from webhooks
- Bypass RLS for admin operations
- Modify user_roles (for signup flow)

**Service Role CANNOT**:
- Be used from client-side code (API key never exposed to frontend)

---

## 3. Multi-Tenant Isolation Model

### 3.1 Tenant Identity

**Definition**: `chefs.id = canonical tenant_id`

**Scope**: All data except identity tables is scoped to a tenant.

**Tables Requiring `tenant_id`**:
- `clients` (which chef invited them)
- `events` (which chef owns this booking)
- `event_transitions` (which tenant's event history)
- `ledger_entries` (which chef's financials)
- `menus` (which chef's menu templates)
- `client_invitations` (which chef sent invitation)

**Tables WITHOUT `tenant_id`** (global):
- `chefs` (IS the tenant)
- `user_roles` (global identity mapping)

### 3.2 Isolation Invariants

**Invariant 1**: Chef A can **never** see Chef B's data.

**Enforcement**:
- RLS policies filter by `tenant_id = get_current_tenant_id()`
- Returns 0 rows for Chef B's data when Chef A queries

**Test**:
```sql
-- Authenticate as Chef A
SET ROLE authenticated;
SET request.jwt.claims.sub = 'chef_a_auth_user_id';

SELECT * FROM events; -- Should see ONLY Chef A's events
```

**Invariant 2**: Client A1 can **never** see Client A2's data (even within same tenant).

**Enforcement**:
- RLS policies filter by `client_id = get_current_client_id()`
- Events table: `USING (client_id = get_current_client_id())`

**Test**:
```sql
-- Authenticate as Client A1 (tenant = Chef A)
SELECT * FROM events WHERE tenant_id = 'chef_a_id';
-- Should see ONLY events where client_id = 'client_a1_id'
```

**Invariant 3**: Cross-tenant joins are structurally impossible.

**Enforcement**:
- Foreign key constraints ensure client belongs to same tenant as event
- Constraint: `fk_client_tenant CHECK ((SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id)`

**Test**:
```sql
-- Attempt to insert event with cross-tenant client
INSERT INTO events (tenant_id, client_id, ...)
VALUES ('chef_a_id', 'client_from_chef_b_id', ...);
-- Expected: CHECK constraint violation
```

### 3.3 Blast Radius Analysis

**Question**: If one RLS policy fails, what is the blast radius?

**Scenario 1**: `events_chef_select` policy is accidentally dropped.

**Impact**:
- Chefs can no longer SELECT events
- Default deny applies (RLS enabled, no policy = no access)
- **Blast Radius**: Chef portal breaks (cannot load events), but NO data leak
- **Mitigation**: Default deny prevents cross-tenant access

**Scenario 2**: `events_chef_select` policy is misconfigured (removes `tenant_id` check).

**Impact**:
```sql
-- Misconfigured policy (WRONG)
CREATE POLICY events_chef_select ON events
  FOR SELECT
  USING (get_current_user_role() = 'chef'); -- Missing tenant_id check
```
- Chef A can SELECT Chef B's events
- **Blast Radius**: CATASTROPHIC - full cross-tenant data leak
- **Mitigation**: Policy review in code review, RLS verification harness

**Scenario 3**: RLS is accidentally disabled on `events` table.

**Impact**:
```sql
ALTER TABLE events DISABLE ROW LEVEL SECURITY; -- CATASTROPHIC
```
- All users can see all events (no filtering)
- **Blast Radius**: CATASTROPHIC - full data leak
- **Mitigation**: Verification checklist (check `SELECT rowsecurity FROM pg_tables`)

**Defense in Depth**:
- Even if RLS fails, middleware still blocks wrong-portal access
- Even if middleware fails, layout guards throw errors
- But if RLS fails, direct DB queries bypass other layers

**Conclusion**: RLS is the **final enforcement layer**. Failure is catastrophic. Must be verified.

### 3.4 Cross-Tenant Prevention Guarantees

**Guarantee 1**: Chef A cannot reference Chef B's clients in events.

**Enforcement**:
```sql
CONSTRAINT fk_client_tenant CHECK (
  (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
)
```

**Test**:
```sql
INSERT INTO events (tenant_id, client_id, ...)
VALUES ('chef_a_id', 'client_of_chef_b', ...);
-- Expected: CHECK constraint violation
```

**Guarantee 2**: Ledger entries MUST reference correct tenant.

**Enforcement**:
- Foreign keys: `event_id` → `events(id)` (events already scoped by tenant)
- Derived: If event belongs to tenant A, ledger entry inherits tenant A
- Direct inserts MUST specify correct `tenant_id` (RLS verifies)

**Guarantee 3**: No shared resources between tenants.

**V1 Status**: No shared menus, no shared clients, no shared anything.

**FUTURE**: If shared resources added (e.g., marketplace menus), must have explicit permission model.

---

## 4. RLS Enforcement Model

### 4.1 RLS Enabled on ALL Tables

**Verification Query**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**Expected**: All tables show `rowsecurity = true`.

**Enforcement**:
```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
```

**Exception**: System tables (auth.users, storage.objects) managed by Supabase.

### 4.2 Deny-by-Default Policies

**Philosophy**: No policy = no access.

**Default Behavior**:
- RLS enabled
- No policies created
- Result: ALL operations denied (SELECT, INSERT, UPDATE, DELETE)

**Explicit Allow**:
- Create policies for specific roles and operations
- Each policy explicitly grants access

**Example**:
```sql
-- Table with RLS enabled but no policies
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Any user query:
SELECT * FROM new_table; -- Returns 0 rows (denied)
```

### 4.3 Helper Functions (Authoritative)

**Function 1**: `get_current_user_role()`

**Returns**: `'chef'` or `'client'` or NULL

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Usage**: Every RLS policy MUST call this to check role.

**NEVER**: Infer role from table existence or other heuristics.

---

**Function 2**: `get_current_tenant_id()`

**Returns**: `chefs.id` (UUID) if user is chef, NULL if client.

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Usage**: Chef-scoped policies filter by `tenant_id = get_current_tenant_id()`.

---

**Function 3**: `get_current_client_id()`

**Returns**: `clients.id` (UUID) if user is client, NULL if chef.

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Usage**: Client-scoped policies filter by `client_id = get_current_client_id()`.

### 4.4 Service Role Bypass Rules

**Service Role Key**: Special Supabase API key that bypasses RLS.

**When to Use**:
- Webhook handlers (insert ledger entries)
- Signup flow (insert into `user_roles`)
- Admin operations (manual data fixes)

**When NOT to Use**:
- NEVER in client-side code
- NEVER exposed via API responses
- NEVER used for regular user operations

**Enforcement**:
- Service role key stored in `.env` (server-side only)
- Never sent to browser
- Used only in backend API routes and server actions

**Verification**:
```bash
# Search codebase for service role usage
grep -r "SUPABASE_SERVICE_ROLE_KEY" .
# Should ONLY appear in:
# - .env files
# - Backend API routes (/api/*)
# - Server-only utilities
# NEVER in:
# - Client components
# - Middleware (uses anon key)
# - Browser-accessible files
```

### 4.5 Prevention of RLS Bypass via Direct API

**Attack**: User obtains Supabase anon key and makes direct API calls.

**Protection**:
- Anon key is safe to expose (public)
- RLS enforced on anon key queries
- Even direct API calls go through RLS

**Test**:
```javascript
// Client-side code (malicious)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('tenant_id', 'other-chef-id') // Attempt to access other tenant

// Expected: data = [] (RLS denies)
```

**Invariant**: Anon key + RLS = safe. Service role key + RLS bypass = dangerous (backend-only).

---

## 5. Middleware & Layout Enforcement

### 5.1 Layer 1 - Middleware

**File**: `middleware.ts`

**Execution**: Runs on **every request** before page code.

**Responsibilities**:
1. Check authentication (valid Supabase session)
2. Query `user_roles` for authoritative role
3. Enforce role-based routing
4. Redirect wrong-portal access at network level

**Blocks**:
- `/chef/*` if `role != 'chef'` → redirect to `/client/my-events`
- `/client/*` if `role != 'client'` → redirect to `/chef/dashboard`
- Any protected route if not authenticated → redirect to `/auth/signin`

**Returns**: HTTP 307 redirect (no HTML sent).

**Verification**:
- Network tab shows 307 response
- No page HTML in response body
- Browser never executes page JavaScript

### 5.2 Layer 2 - Layout Guards

**Functions**: `requireChef()`, `requireClient()`, `requireAuth()`

**File**: `lib/auth/get-user.ts`

**Execution**: Called in layout components before rendering.

**Responsibilities**:
1. Query `getCurrentUser()` (authoritative role)
2. Check role matches requirement
3. Throw error if mismatch

**Example**:
```typescript
// In /chef/layout.tsx
const user = await requireChef() // Throws if not chef
```

**Behavior**:
- If role matches: return user object, continue
- If role doesn't match: throw error, return 500 (or error page)

**Why Needed**:
- Middleware might have bugs
- Direct link might bypass middleware (edge case)
- Layout guard is defense in depth

### 5.3 Layer 3 - Database RLS

**Execution**: On every database query.

**Responsibilities**:
1. Filter rows by role and tenant_id
2. Deny operations not allowed by policies

**Example**:
```typescript
// User is client, attempts to query chef data
const { data } = await supabase.from('events').select('*')
// RLS filters: WHERE client_id = get_current_client_id()
// Returns only client's events, not all events
```

**Why Needed**:
- Middleware and layout might be bypassed
- Direct DB access (admin console, SQL client)
- Final enforcement layer

### 5.4 Defense in Depth Rationale

**Why Three Layers?**

| Failure Scenario | Layer 1 (Middleware) | Layer 2 (Layout) | Layer 3 (RLS) |
|------------------|---------------------|------------------|---------------|
| Middleware bug allows wrong portal | **FAILS** | ✅ Blocks | ✅ Blocks |
| Layout guard not called | ✅ Blocks | **FAILS** | ✅ Blocks |
| Direct DB query (bypasses app) | ✅ N/A | ✅ N/A | ✅ Blocks |
| All three layers fail | ❌ COMPROMISED | ❌ COMPROMISED | ❌ COMPROMISED |

**Conclusion**: If any one layer fails, others compensate. All three must fail for breach.

### 5.5 Wrong-Portal Flash Prevention

**Problem**: User briefly sees wrong portal content before redirect.

**Root Cause**: Client-side routing shows page before auth check.

**Solution**: Server-side middleware redirects before page loads.

**Flow**:
1. User requests `/chef/dashboard`
2. Middleware executes (server-side)
3. Middleware detects `role = 'client'`
4. Middleware returns `NextResponse.redirect('/client/my-events')`
5. Browser receives 307 redirect (NO page HTML)
6. Browser follows redirect
7. User sees client portal (never saw chef portal)

**Verification**:
- Open DevTools Network tab
- Attempt to access wrong portal
- Check response: should be 307, not 200
- Check response body: should be empty redirect, not page HTML

**NO Flash Occurs**.

---

## 6. Data Visibility Partitioning

### 6.1 Chef-Private vs Client-Visible Fields

**Chef-Private** (NEVER visible to clients):
- FUTURE: `internal_notes` (not in V1 schema)
- FUTURE: `cost_margins` (not in V1 schema)
- Event lifecycle audit (transitions viewable by clients, but metadata may be filtered)
- Raw ledger entries (clients see summaries, not full ledger)

**Client-Visible** (Clients CAN see):
- Event: `title`, `event_date`, `guest_count`, `location`, `total_amount_cents`, `deposit_amount_cents`, `status`
- Menus: `name`, `description`, `price_per_person_cents`
- Payment status: `is_deposit_paid`, `is_fully_paid` (derived)

**Implementation**:
- RLS policies allow client SELECT on events WHERE `client_id = current_client_id`
- No explicit field filtering in V1 (entire row returned if allowed)
- FUTURE: Use projections to filter sensitive fields

### 6.2 No SELECT * in Client Queries

**Best Practice**: Explicitly specify columns in SELECT for client queries.

**Rationale**: If sensitive field added later, SELECT * exposes it automatically.

**Example (BAD)**:
```typescript
// Client query
const { data } = await supabase.from('events').select('*')
// Returns ALL columns (may include future sensitive fields)
```

**Example (GOOD)**:
```typescript
// Client query (safe projection)
const { data } = await supabase
  .from('events')
  .select('id, title, event_date, guest_count, location, total_amount_cents, status')
// Returns ONLY specified columns
```

**Enforcement**: Code review (not automated in V1).

### 6.3 Safe Projections Only

**Principle**: Client queries MUST use explicit column lists.

**Future Enhancement**: Create database views for client-safe projections.

**Example**:
```sql
CREATE VIEW events_client_view AS
SELECT
  id, title, event_date, guest_count, location,
  total_amount_cents, deposit_amount_cents, status, client_id
FROM events;
-- Exclude: internal_notes, cost_margins, etc.
```

**Then**:
```typescript
const { data } = await supabase.from('events_client_view').select('*')
// Safe: view only exposes allowed columns
```

**V1 Status**: Not implemented (no sensitive fields in V1 schema).

### 6.4 PDF Generation Security

**V1 Status**: PDF generation EXCLUDED (no invoice PDFs in V1).

**FUTURE (Post-V1)**: If invoice PDFs implemented:
- Generate server-side (never trust client)
- Use safe view for data (client-visible fields only)
- Verify tenant_id before generating
- Store PDFs in tenant-scoped storage
- Serve via signed URLs with expiration

### 6.5 Internal Notes Isolation

**V1 Status**: Internal notes NOT in V1 schema.

**FUTURE**: If `events.internal_notes` added:
- Column must be excluded from client queries
- RLS policy allows chef SELECT/UPDATE
- RLS policy denies client SELECT (return NULL or hide column)
- Explicit projection in client queries (never SELECT *)

**Enforcement**:
```sql
-- Chef policy (can see internal_notes)
CREATE POLICY events_chef_select ON events
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- Client policy (cannot see internal_notes)
-- Option 1: Client queries exclude column (application-level)
-- Option 2: Create view without column (database-level)
```

### 6.6 RLS Bypass Metadata

**Hidden from Users**:
- RLS helper function results (`get_current_tenant_id()` should not be user-visible)
- Policy names and enforcement logic
- Trigger code and constraint details

**Leakage Risk**: Error messages revealing policy logic.

**Mitigation**:
- Catch RLS denials, return generic error: "Access denied"
- Don't reveal: "Row does not match tenant_id policy"

**Example**:
```typescript
try {
  const { data, error } = await supabase.from('events').select('*')
  if (error) throw error
} catch (error) {
  // Don't expose: "RLS policy events_chef_select denied access"
  // Do expose: "Unable to load events"
  console.error('[RLS_ERROR]', error) // Log for debugging
  return { error: 'Access denied' } // Generic user message
}
```

---

## 7. Financial Security Model

### 7.1 Ledger Append-Only Enforcement

**Trigger**: `prevent_ledger_modification()`

**Blocks**: UPDATE and DELETE on `ledger_entries`

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable. Create a new adjustment entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

CREATE TRIGGER ledger_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();
```

**Test**:
```sql
UPDATE ledger_entries SET amount_cents = 5000 WHERE id = 'some-id';
-- Expected: ERROR: Ledger entries are immutable. Create a new adjustment entry instead.

DELETE FROM ledger_entries WHERE id = 'some-id';
-- Expected: ERROR: Ledger entries are immutable. Create a new adjustment entry instead.
```

**Consequence**: Financial history cannot be tampered with.

### 7.2 Minor-Unit Storage (Cents Only)

**Rule**: ALL monetary amounts stored as INTEGER cents.

**Schema**:
```sql
total_amount_cents INTEGER
deposit_amount_cents INTEGER
amount_cents INTEGER -- in ledger_entries
```

**Prohibited**:
- `DECIMAL` or `NUMERIC` types
- `FLOAT` or `REAL` types
- String representations of money

**Why**:
- Prevents floating-point precision errors
- Standard practice (Stripe uses minor units)
- No rounding errors in calculations

**Example**:
```typescript
// User enters: $100.50
const cents = 10050 // Store as integer

// Display to user:
const dollars = cents / 100 // 100.50
const formatted = `$${dollars.toFixed(2)}` // "$100.50"
```

### 7.3 Stripe Webhook Signature Verification

**Endpoint**: `/api/webhooks/stripe`

**Verification**:
```typescript
const signature = request.headers.get('stripe-signature')
const rawBody = await request.text()

const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
)
// If signature invalid, throws error
```

**Reject If**:
- Missing `stripe-signature` header → 400
- Invalid signature → 400
- Replay attack (timestamp too old) → 400

**Accept If**:
- Valid signature
- Timestamp within tolerance (Stripe's default: 5 minutes)

**Security**:
- Only Stripe knows `STRIPE_WEBHOOK_SECRET`
- Attacker cannot forge valid signature
- Prevents fake webhooks from marking events as paid

### 7.4 Idempotency Key Storage

**Column**: `ledger_entries.stripe_event_id`

**Constraint**:
```sql
ALTER TABLE ledger_entries
ADD CONSTRAINT unique_stripe_event UNIQUE(stripe_event_id);
```

**Behavior**:
- First webhook: INSERT succeeds
- Duplicate webhook: INSERT fails with unique constraint error
- Catch error, return 200 OK (already processed)

**Test**:
```sql
INSERT INTO ledger_entries (stripe_event_id, ...) VALUES ('evt_123', ...);
-- Succeeds

INSERT INTO ledger_entries (stripe_event_id, ...) VALUES ('evt_123', ...);
-- Expected: ERROR: duplicate key value violates unique constraint "unique_stripe_event"
```

### 7.5 No Client-Side Financial Calculation Trust

**Principle**: NEVER trust client-provided amounts.

**Prohibited**:
```typescript
// Client sends:
{ eventId: 'abc', amountPaid: 10000 }

// Server uses:
await createLedgerEntry({ amount_cents: request.body.amountPaid }) // ❌ WRONG
```

**Required**:
```typescript
// Server derives amount from event:
const event = await getEvent(eventId)
const amount_cents = event.deposit_amount_cents // ✅ CORRECT

// OR from Stripe webhook:
const amount_cents = paymentIntent.amount // ✅ CORRECT (from Stripe)
```

**Invariant**: Amounts come from DB or Stripe, NEVER from client request body.

### 7.6 Financial Invariants

**Invariant 1**: Ledger is single source of truth.

**Enforcement**: No `balance` or `is_paid` columns on `events` table. All derived from ledger view.

**Invariant 2**: Payment state is derived.

**Enforcement**: `event_financial_summary` VIEW recomputes on every query.

**Invariant 3**: Loyalty derived from settled ledger only.

**V1 Status**: Loyalty NOT implemented.

**FUTURE**: If loyalty points added, compute from `entry_type = 'charge_succeeded'` (not pending or failed).

**Invariant 4**: Never delete financial history.

**Enforcement**: DELETE trigger on `ledger_entries` blocks deletion.

**Invariant 5**: Corrections are append-only.

**Enforcement**: Create `entry_type = 'adjustment'` to offset wrong entry, never UPDATE original.

---

## 8. Storage & File Security

**V1 STATUS**: File uploads are **EXCLUDED** from V1 scope.

**Current Enforcement**: No file upload endpoints exist. No storage buckets configured.

**FUTURE (Post-V1)**: If file uploads implemented, MUST enforce:

### 8.1 Tenant-Scoped Bucket Structure

**Pattern**: `{bucket}/{tenant_id}/{event_id}/{file_id}.ext`

**Example**: `chefflow-uploads/chef-123/event-456/photo-789.jpg`

**RLS on Storage**:
```sql
CREATE POLICY "Chefs can access own tenant files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chefflow-uploads' AND
  (storage.foldername(name))[1] = get_current_tenant_id()::text
);
```

### 8.2 Signed URLs Only

**Principle**: No public file access.

**Implementation**:
- Generate signed URL with expiration: `storage.from('bucket').createSignedUrl(path, expiresIn)`
- Client uses signed URL to download
- URL expires after 1 hour (or configurable)

### 8.3 Time-Limited Access

**Expiration**: 1-24 hours (configurable per use case)

**Rationale**: Prevents long-lived URL sharing.

### 8.4 No Public Buckets

**Enforcement**:
```sql
-- Public access denied
CREATE POLICY "No public access"
ON storage.objects FOR SELECT
USING (false); -- Denies all public SELECT
```

**Access**: Only via signed URLs or authenticated queries.

### 8.5 File Size Limits

**Limits**:
- Max file size: 10 MB (configurable)
- Max files per event: 20 (configurable)

**Enforcement**: Server-side validation before upload.

### 8.6 MIME Restrictions

**Allowed**:
- Images: `image/jpeg`, `image/png`, `image/gif`
- Documents: `application/pdf`

**Prohibited**:
- Executables: `.exe`, `.sh`, `.bat`
- Scripts: `.js`, `.html`, `.svg` (XSS risk)
- Archives: `.zip` (may contain malicious files)

**Validation**: Server-side MIME type check (not client-provided `Content-Type`).

### 8.7 Server-Side Validation

**Required Checks**:
1. File size within limit
2. MIME type allowed
3. File extension matches MIME (prevent .jpg.exe)
4. Tenant_id derived from session (not request body)
5. Event_id belongs to tenant
6. Virus scan (FUTURE - not in V1)

**NEVER**:
- Trust client-provided filename
- Trust client-provided MIME type
- Store files without tenant_id scoping

---

## 9. Session & Token Security

### 9.1 httpOnly Cookies

**Supabase Default**: Session stored in httpOnly cookie.

**Benefit**: JavaScript cannot access cookie (prevents XSS token theft).

**Verification**: Check browser DevTools → Cookies → `sb-access-token` → httpOnly = true.

### 9.2 Secure Flag

**Requirement**: Cookies MUST have `Secure` flag in production.

**Benefit**: Cookie only sent over HTTPS (prevents man-in-the-middle).

**Enforcement**: Supabase sets automatically in production.

### 9.3 CSRF Mitigation

**Supabase Built-In**: Auth endpoints require CSRF token.

**V1 Requirement**: Ensure all forms use Supabase auth methods (no custom auth).

**Custom Endpoints**: If custom POST endpoints added (beyond Supabase), add CSRF protection.

### 9.4 Token Rotation

**Supabase Behavior**: Access tokens expire after 1 hour.

**Refresh**: Refresh token used to obtain new access token.

**Rotation**: Refresh token rotated on each refresh.

**Benefit**: Limits impact of stolen token.

### 9.5 Session Invalidation on Logout

**Requirement**: Logout MUST invalidate session server-side.

**Implementation**:
```typescript
await supabase.auth.signOut()
// Clears client-side session AND invalidates server-side
```

**Verification**: After logout, old access token MUST be invalid.

### 9.6 Idle Timeout Rule

**V1 Status**: No custom idle timeout (Supabase default: 1-hour token expiry).

**FUTURE**: If stricter timeout needed, implement:
- Track last activity timestamp
- Middleware checks if `now() - last_activity > timeout`
- Force logout if idle

**Current**: User stays logged in as long as they refresh within 1 hour.

---

## 10. Injection & XSS Protection

### 10.1 Server-Side Input Validation

**Principle**: Validate ALL inputs on server.

**Examples**:
- Event title: max length, no HTML tags
- Guest count: positive integer only
- Email: valid email format
- UUID: valid UUID format

**Prohibited**:
- Accepting raw HTML from client
- Allowing script tags in text fields
- Trusting client-side validation alone

**Implementation** (using Zod):
```typescript
const schema = z.object({
  title: z.string().min(1).max(200),
  guest_count: z.number().int().positive(),
  email: z.string().email(),
})

const validated = schema.parse(requestBody)
```

### 10.2 Sanitization of Message Content

**V1 Status**: No messaging feature (EXCLUDED).

**FUTURE**: If messaging added:
- Sanitize HTML: use library like DOMPurify
- Strip `<script>`, `<iframe>`, `onclick` attributes
- Allow safe tags only: `<p>`, `<b>`, `<i>`, `<a>` (with safe href)

### 10.3 No dangerouslySetInnerHTML Without Sanitization

**Principle**: NEVER render user input as HTML without sanitization.

**Prohibited**:
```typescript
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // ❌ XSS RISK
```

**Allowed**:
```typescript
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(userInput)
<div dangerouslySetInnerHTML={{ __html: clean }} /> // ✅ Safe
```

**Best**:
```typescript
<div>{userInput}</div> // ✅ React auto-escapes
```

### 10.4 Output Encoding Rules

**Principle**: React auto-escapes by default.

**Safe**:
```typescript
<p>{user.title}</p> // Automatically escapes HTML
```

**Unsafe**:
```typescript
<p dangerouslySetInnerHTML={{ __html: user.title }} /> // Only if sanitized
```

**SQL Injection Prevention**:
- Use Supabase client (parameterized queries)
- NEVER construct SQL with string concatenation

**Example (SAFE)**:
```typescript
supabase.from('events').select('*').eq('id', eventId)
// Supabase uses parameterized query
```

**Example (UNSAFE - don't do this)**:
```sql
-- Raw SQL (don't use)
const query = `SELECT * FROM events WHERE id = '${eventId}'` // ❌ SQL INJECTION RISK
```

---

## 11. Audit & Logging Rules

### 11.1 Event Transitions Immutable

**Table**: `event_transitions`

**Immutability**: Enforced by triggers (prevent UPDATE/DELETE).

**Purpose**: Complete audit trail of all status changes.

**Contents**:
- `from_status`, `to_status`
- `transitioned_by` (user who triggered)
- `transitioned_at` (timestamp)
- `metadata` (reason, context)

**Retention**: Permanent (never deleted).

### 11.2 Ledger Entries Immutable

**Table**: `ledger_entries`

**Immutability**: Enforced by triggers (prevent UPDATE/DELETE).

**Purpose**: Financial audit trail.

**Retention**: Permanent (never deleted, legal requirement).

### 11.3 Identity Linking Logged

**Audit**: Track when users are linked to entities.

**V1 Status**: `user_roles.created_at` records when role assigned.

**FUTURE**: Log IP address, signup source, invitation token used.

### 11.4 No Audit Log Deletion

**Rule**: Audit tables CANNOT be truncated or dropped.

**Enforcement**: Immutability triggers + policy.

**Recovery**: If audit data lost, treat as security incident.

### 11.5 Financial Changes Timestamped

**All Ledger Entries**: Include `created_at` timestamp.

**Event Transitions**: Include `transitioned_at` timestamp.

**Purpose**: Reconstruct timeline of financial events.

---

## 12. Catastrophic Failure Scenarios

### 12.1 Scenario 1: Cross-Tenant Read

**What Breaks**: RLS policy on `events` table misconfigured (missing `tenant_id` check).

**Why Catastrophic**: Chef A can see Chef B's events, clients, financials.

**Preventing Invariant**: RLS policy MUST include `tenant_id = get_current_tenant_id()`.

**Test**:
```sql
-- Verify policy includes tenant_id filter
SELECT policy_name, cmd, qual FROM pg_policies WHERE tablename = 'events';
-- Check qual (USING clause) includes get_current_tenant_id()
```

**Recovery**: Immediately drop broken policy, recreate correct policy.

---

### 12.2 Scenario 2: Ledger Mutation

**What Breaks**: Immutability trigger on `ledger_entries` is accidentally dropped.

**Why Catastrophic**: Attacker can modify or delete financial records, destroying audit trail.

**Preventing Invariant**: Triggers `ledger_immutable_update` and `ledger_immutable_delete` MUST exist.

**Test**:
```sql
-- Verify triggers exist
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'ledger_entries';
-- Expected: ledger_immutable_update, ledger_immutable_delete

-- Attempt UPDATE (should fail)
UPDATE ledger_entries SET amount_cents = 1 WHERE id = 'some-id';
-- Expected: ERROR
```

**Recovery**: Restore from backup, recreate trigger, audit all ledger entries for tampering.

---

### 12.3 Scenario 3: Service Role Exposure

**What Breaks**: `SUPABASE_SERVICE_ROLE_KEY` leaked in client-side code.

**Why Catastrophic**: Attacker bypasses ALL RLS, can read/write all data, impersonate any user.

**Preventing Invariant**: Service role key NEVER exposed to client.

**Test**:
```bash
# Search for service role key in client code
grep -r "SERVICE_ROLE" app/ components/ lib/client/
# Should return 0 matches

# Check .env exposure
git log --all -p | grep "SERVICE_ROLE"
# Should return 0 matches (never committed)
```

**Recovery**: Immediately revoke exposed key, rotate key in Supabase dashboard, audit all actions with that key.

---

### 12.4 Scenario 4: Wrong-Portal Access

**What Breaks**: Middleware bug allows client to access `/chef/dashboard`.

**Why Catastrophic**: Client sees chef-only UI, may expose sensitive data or actions.

**Preventing Invariant**: Middleware MUST redirect wrong-portal before rendering HTML.

**Test**:
```typescript
// Authenticate as client
// Navigate to /chef/dashboard
// Expected: 307 redirect to /client/my-events
// Network tab shows NO HTML for /chef/dashboard
```

**Recovery**: Fix middleware bug, verify layout guards still block (defense in depth).

---

### 12.5 Scenario 5: JWT Role Spoofing

**What Breaks**: System infers role from JWT claim instead of `user_roles` table.

**Why Catastrophic**: Attacker modifies JWT to claim `role: 'chef'`, gains admin access.

**Preventing Invariant**: Role MUST be queried from `user_roles` table, NEVER from JWT.

**Test**:
```typescript
// Verify role resolution:
const user = await getCurrentUser()
// Should query: SELECT role FROM user_roles WHERE auth_user_id = ...
// Should NOT read: jwt.claims.role (doesn't exist)
```

**Recovery**: Remove any code that reads role from JWT, ensure all role checks query DB.

---

## APPENDIX A: Security Checklist (Pre-Production)

### A.1 Authentication
- [ ] All protected routes require authentication (middleware enforces)
- [ ] Session stored in httpOnly, Secure cookies
- [ ] No service role key in client-side code (grep verification)
- [ ] Logout invalidates session server-side

### A.2 Authorization
- [ ] RLS enabled on ALL tables
- [ ] RLS policies include tenant_id filtering (chef access)
- [ ] RLS policies include client_id filtering (client access)
- [ ] Service role used ONLY in backend (webhook handlers, migrations)

### A.3 Multi-Tenant Isolation
- [ ] Chef A cannot see Chef B's data (verified via direct query)
- [ ] Client A1 cannot see Client A2's data (verified via direct query)
- [ ] Cross-tenant foreign keys blocked by constraints

### A.4 Financial Security
- [ ] Ledger entries immutable (UPDATE/DELETE triggers verified)
- [ ] Webhook signature verification works (Stripe CLI test)
- [ ] Idempotency prevents duplicate ledger entries (duplicate webhook test)
- [ ] Amounts stored as INTEGER cents (no DECIMAL in schema)

### A.5 Input Validation
- [ ] Server-side validation on ALL inputs (Zod schemas)
- [ ] No SQL injection (Supabase parameterized queries only)
- [ ] No XSS (React auto-escapes, no dangerouslySetInnerHTML without sanitization)

### A.6 Audit & Logging
- [ ] Event transitions immutable (triggers verified)
- [ ] Ledger entries timestamped and permanent
- [ ] No audit log deletion possible

---

## APPENDIX B: Threat Matrix Summary

| Threat | Attack Vector | Protection | Enforcement | Severity |
|--------|--------------|-----------|-------------|----------|
| Unauthenticated access | Direct URL to protected route | Middleware redirect | `middleware.ts` | HIGH |
| Client privilege escalation | Access `/chef/*` | Middleware + Layout + RLS | 3 layers | CRITICAL |
| Cross-tenant data leak | Chef A reads Chef B data | RLS `tenant_id` filter | RLS policies | CRITICAL |
| JWT manipulation | Forge role in JWT | Role queried from DB | `get-user.ts` | HIGH |
| ID enumeration | Guess UUIDs | RLS denies even if valid UUID | RLS policies | MEDIUM |
| Webhook spoofing | Fake payment webhook | Signature verification | `/api/webhooks/stripe` | CRITICAL |
| Ledger tampering | Modify financial records | Immutability triggers | DB triggers | CRITICAL |
| Service role leak | Expose key in client code | Never expose to frontend | `.env` security | CRITICAL |

---

**END OF DOCUMENT**

This document is the **enforcement constitution** for ChefFlow V1 security. Violations are security defects.

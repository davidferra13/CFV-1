# RLS Enforcement Philosophy

**Document ID**: 022
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the philosophical approach and practical implementation of Row Level Security (RLS) in ChefFlow V1. RLS is the FINAL enforcement layer for multi-tenant isolation and access control. This document establishes non-negotiable principles for RLS usage.

---

## Core Philosophy

### Defense in Depth, Database as Last Line

**Principle**: Even if application code fails, database MUST prevent unauthorized access.

**Layers**:
1. **Network**: Middleware redirects wrong portal access
2. **Application**: Layouts block rendering of wrong portal
3. **Database**: RLS policies prevent data leakage

**Critical Rule**: Layers 1 and 2 may fail (bugs, misconfiguration), but Layer 3 (RLS) MUST NEVER fail.

---

## RLS Enforcement Rules

### Rule 1: RLS Enabled on ALL Tables

**Requirement**: Every table with user data MUST have RLS enabled.

**Command**:
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
-- ... etc for ALL tables
```

**Verification**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

**Expected Result**: Zero rows (all tables have RLS enabled)

**Exception**: System tables without user data (migrations, etc.) may skip RLS

---

### Rule 2: No Default Permissive Policies

**Prohibition**: NEVER create a policy that allows all access by default.

**❌ WRONG**:
```sql
CREATE POLICY events_allow_all ON events
  FOR ALL USING (true);
```

**Why Wrong**: Defeats purpose of RLS, allows cross-tenant access

**✅ CORRECT**:
```sql
CREATE POLICY events_chef_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

### Rule 3: Explicit Deny is Default

**Principle**: If no policy matches, access is DENIED.

**Supabase Default**: With RLS enabled and no matching policy, query returns zero rows (not error).

**Benefit**: Safe by default (new tables protected even without policies)

**Example**:
```typescript
// User is client, events table has chef-only policy
const events = await supabase.from('events').select('*');
// Returns: { data: [], error: null }
// Does NOT return other chefs' events, does NOT throw error
```

---

### Rule 4: Policies are Role-Specific

**Pattern**: Separate policies for each role and operation.

**Example**:
```sql
-- Chef can SELECT their tenant's events
CREATE POLICY events_chef_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Client can SELECT events assigned to them
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );

-- Chef can INSERT events for their tenant
CREATE POLICY events_chef_insert ON events
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Client CANNOT insert events (no policy = deny)
```

**Benefit**: Granular control, easy to audit

---

### Rule 5: WITH CHECK for Mutations

**Requirement**: INSERT and UPDATE policies MUST use `WITH CHECK` clause.

**Purpose**: Validate data AFTER mutation, prevent tenant_id spoofing.

**Example**:
```sql
CREATE POLICY events_chef_insert ON events
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Attack Prevented**:
```typescript
// Malicious chef tries to insert event with wrong tenant_id
await supabase.from('events').insert({
  title: 'Hacked Event',
  tenant_id: 'other-chef-uuid', // ❌ WITH CHECK fails
});
// Result: Error, insert rejected
```

---

## RLS Helper Functions

### Standard Functions (Used in All Policies)

**File**: `supabase/migrations/20260213000002_rls_policies.sql`

```sql
-- Returns current user's role ('chef' or 'client')
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_roles
  WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns current user's tenant_id (chef_id or clients.tenant_id)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT CASE
    WHEN role = 'chef' THEN chef_id
    WHEN role = 'client' THEN (SELECT tenant_id FROM clients WHERE id = client_id)
    ELSE NULL
  END
  FROM user_roles
  WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns current client's ID (NULL if chef)
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Security**: `SECURITY DEFINER` allows functions to read `user_roles` table despite RLS

**Stability**: `STABLE` allows query planner to cache result within transaction

---

## Policy Patterns

### Pattern 1: Tenant-Scoped Resources (Chef)

**Tables**: `events`, `menus`, `ledger_entries`, `event_transitions`

**Policy**:
```sql
CREATE POLICY {table}_chef_select ON {table}
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY {table}_chef_insert ON {table}
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY {table}_chef_update ON {table}
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  ) WITH CHECK (
    tenant_id = get_current_tenant_id() -- Prevent tenant_id change
  );
```

**Effect**: Chefs can only access their own tenant's data

---

### Pattern 2: Client-Assigned Resources

**Tables**: `events` (clients can view assigned events)

**Policy**:
```sql
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

**Effect**: Clients can only see events where they are assigned

---

### Pattern 3: Immutable Audit Tables

**Tables**: `ledger_entries`, `event_transitions`

**Policy**:
```sql
-- Chefs can SELECT their tenant's ledger entries
CREATE POLICY ledger_chef_select ON ledger_entries
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- System can INSERT (via service role key, bypasses RLS)
-- No UPDATE or DELETE policies (enforced immutable)
```

**Effect**: Read-only for users, write-only for system

---

### Pattern 4: Lookup Tables (No Tenant)

**Tables**: `chefs`, `clients`, `user_roles`

**Policy**:
```sql
-- Chefs can SELECT their own chef record
CREATE POLICY chefs_self_select ON chefs
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM user_roles WHERE chef_id = chefs.id)
  );

-- Chefs can SELECT clients in their tenant
CREATE POLICY clients_chef_select ON clients
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Clients can SELECT their own client record
CREATE POLICY clients_self_select ON clients
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM user_roles WHERE client_id = clients.id)
  );
```

---

## Service Role Key (Bypassing RLS)

### When to Use

**Valid Use Cases**:
- Webhook handlers (system-initiated, not user-initiated)
- Database migrations (schema changes)
- Admin operations (manual support actions)
- Signup triggers (creating initial records)

**Invalid Use Cases**:
- User-facing API routes (use RLS instead)
- Regular CRUD operations (use RLS instead)
- "Convenience" (lazy to write RLS policy)

### Implementation

**File**: `lib/supabase/server.ts`

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Anon key client (RLS enforced)
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    }
  );
}

// Service role client (RLS bypassed) - USE WITH EXTREME CAUTION
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

**Example (Webhook)**:
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const supabase = createServiceClient(); // Bypass RLS

  // Create ledger entry (system action, not user action)
  await supabase.from('ledger_entries').insert({
    tenant_id: event.metadata.tenant_id,
    amount: event.amount,
    type: 'charge_succeeded',
  });
}
```

---

## Testing RLS Policies

### Manual Testing

**Setup**:
1. Create two chef accounts (Chef A, Chef B)
2. Create events for each chef
3. Sign in as Chef A
4. Attempt to query Chef B's events

**Expected**: Zero rows returned (not error)

**SQL Test**:
```sql
-- Simulate Chef A's session
SET request.jwt.claim.sub = 'chef-a-auth-uuid';

-- Query events (should only return Chef A's events)
SELECT * FROM events;

-- Attempt to insert event with Chef B's tenant_id
INSERT INTO events (tenant_id, title) VALUES ('chef-b-uuid', 'Hacked');
-- Expected: Error (WITH CHECK fails)
```

---

### Automated Verification

**File**: `scripts/verify-rls.sql`

```sql
-- Verify RLS enabled on all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
  LOOP
    RAISE EXCEPTION 'Table % does not have RLS enabled', r.tablename;
  END LOOP;
END $$;

-- Verify critical tables have policies
DO $$
DECLARE
  tables TEXT[] := ARRAY['events', 'ledger_entries', 'menus', 'clients'];
  t TEXT;
  policy_count INT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = t;
    IF policy_count = 0 THEN
      RAISE EXCEPTION 'Table % has no RLS policies', t;
    END IF;
  END LOOP;
END $$;
```

**Run**:
```bash
psql $DATABASE_URL < scripts/verify-rls.sql
```

**Expected**: No errors

---

## Common RLS Mistakes

### Mistake 1: Forgetting WITH CHECK

```sql
-- ❌ WRONG: No WITH CHECK
CREATE POLICY events_chef_insert ON events
  FOR INSERT USING (
    get_current_user_role() = 'chef'
  );
```

**Attack**:
```typescript
await supabase.from('events').insert({
  tenant_id: 'other-chef-uuid', // ✅ Allowed (no validation)
});
```

**Fix**:
```sql
CREATE POLICY events_chef_insert ON events
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

### Mistake 2: Using Client-Provided tenant_id

```sql
-- ❌ WRONG: Trusts client to pass correct tenant_id
CREATE POLICY events_chef_insert ON events
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
  );
```

**Attack**: Client can specify any `tenant_id`

**Fix**: Always validate against `get_current_tenant_id()`

---

### Mistake 3: Overly Permissive UPDATE

```sql
-- ❌ WRONG: Allows tenant_id change
CREATE POLICY events_chef_update ON events
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
  -- Missing WITH CHECK!
```

**Attack**:
```typescript
// Chef A updates their event to belong to Chef B
await supabase.from('events').update({
  tenant_id: 'chef-b-uuid',
}).eq('id', 'event-id');
```

**Fix**: Add `WITH CHECK (tenant_id = get_current_tenant_id())`

---

## Performance Impact

### Query Performance

**RLS Overhead**: ~10-50ms per query (adds subquery to check permissions)

**Optimization**: Use indexes on `tenant_id` column:
```sql
CREATE INDEX idx_events_tenant_id ON events (tenant_id);
```

**Measurement**: Use `EXPLAIN ANALYZE` to check query plans

---

### Function Caching

**Helper Functions**: Marked as `STABLE` to allow caching within transaction

**Benefit**: `get_current_tenant_id()` called once per transaction, not per row

---

## Verification Checklist

Before production:

- [ ] RLS enabled on all user data tables
- [ ] All tables have at least one policy
- [ ] No policies with `USING (true)`
- [ ] All INSERT policies have `WITH CHECK`
- [ ] All UPDATE policies have `WITH CHECK`
- [ ] Helper functions use `SECURITY DEFINER`
- [ ] Service role key only used in webhooks/system operations
- [ ] Manual cross-tenant test passes (Chef A cannot see Chef B's data)
- [ ] Automated RLS verification script passes

---

## References

- **RLS Policy Contract**: `023-rls-policy-contract.md`
- **Multi-Tenant Isolation**: `024-multi-tenant-isolation.md`
- **Database Authority Rules**: `027-database-authority-rules.md`
- **Role Resolution Boundary**: `021-role-resolution-boundary.md`

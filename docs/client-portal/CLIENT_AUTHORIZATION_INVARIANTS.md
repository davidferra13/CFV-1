# Client Authorization Invariants

## Document Identity
- **File**: `CLIENT_AUTHORIZATION_INVARIANTS.md`
- **Category**: Identity & Linking (20/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **immutable authorization rules** (invariants) that must always hold true for client access in the ChefFlow system.

It specifies:
- What conditions must always be true
- How invariants are enforced
- What happens when invariants are violated
- Testing requirements for each invariant
- Recovery procedures for violations

---

## What is an Authorization Invariant?

An **authorization invariant** is a rule that:
- **Must always be true** at the authorization layer
- **Cannot be violated** without breaking system integrity
- **Is testable** and verifiable programmatically
- **Is enforced** at multiple layers (defense in depth)

**Example Invariant**: "A client can only access events where they are the client."

---

## The 15 Authorization Invariants

### Invariant 1: Session Required for Access

**Rule**: No client portal access without valid authenticated session.

**Enforcement**:
- Middleware checks `session !== null`
- Layout validates session again
- RLS uses `auth.uid()` (NULL if no session)

**Violation Detection**:
```typescript
if (!session) {
  // VIOLATION: No session
  redirect('/login');
}
```

**Testing**:
```typescript
test('Unauthenticated user cannot access client portal', async () => {
  const response = await fetch('/my-events'); // No auth header
  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/login');
});
```

---

### Invariant 2: Email Verification Required

**Rule**: Unverified emails cannot access client portal.

**Enforcement**:
- Middleware checks `session.user.email_confirmed_at !== null`
- Profile creation blocked until verified

**Violation Detection**:
```typescript
if (!session.user.email_confirmed_at) {
  // VIOLATION: Email not verified
  redirect('/verify-email');
}
```

**Testing**:
```typescript
test('Unverified email blocked from portal', async () => {
  // Create user without email verification
  const { user } = await createUnverifiedUser();

  const response = await fetch('/my-events', {
    headers: { Authorization: `Bearer ${user.access_token}` }
  });

  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/verify-email');
});
```

---

### Invariant 3: Role Must Be 'client'

**Rule**: Only users with `role = 'client'` can access client portal.

**Enforcement**:
- Middleware resolves role from `user_roles` table
- Layout validates `role === 'client'`
- RLS uses `get_current_user_role() = 'client'`

**Violation Detection**:
```typescript
if (userRole.role !== 'client') {
  // VIOLATION: Not a client role
  redirect('/unauthorized');
}
```

**Testing**:
```typescript
test('Chef cannot access client portal', async () => {
  await signInAsChef();

  const response = await fetch('/my-events');

  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/dashboard'); // Redirect to chef portal
});
```

---

### Invariant 4: Client Profile Must Exist

**Rule**: `user_roles.entity_id` must reference an existing, active client profile.

**Enforcement**:
- Layout queries `clients` table with `entity_id`
- Checks `is_deleted = false`

**Violation Detection**:
```typescript
if (!client || client.is_deleted) {
  // VIOLATION: Profile missing or deleted
  redirect('/account-error');
}
```

**Testing**:
```typescript
test('Deleted profile denied access', async () => {
  // Soft-delete client profile
  await supabase
    .from('clients')
    .update({ is_deleted: true })
    .eq('id', clientId);

  await signInAsClient();

  const response = await fetch('/my-events');

  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/account-deleted');
});
```

---

### Invariant 5: Client Can Only Access Own Events

**Rule**: Client can only `SELECT` events where `events.client_id = current_client_id`.

**Enforcement**:
- RLS policy filters by `client_id = get_current_client_id()`
- Application code does not bypass RLS

**Violation Detection**:
```typescript
// RLS automatically filters
SELECT * FROM events
WHERE client_id = get_current_client_id(); -- Only returns own events
```

**Testing**:
```typescript
test('Client cannot see other client events', async () => {
  await signInAsClient(client1);

  // Query all events
  const { data: events } = await supabase
    .from('events')
    .select('*');

  // Verify only own events returned
  expect(events.every(e => e.client_id === client1.id)).toBe(true);
});
```

---

### Invariant 6: Client Can Only Access Own Tenant Data

**Rule**: Client can only access data within their `tenant_id`.

**Enforcement**:
- RLS policies filter by `tenant_id = get_current_tenant_id()`
- Cross-tenant queries return empty set

**Violation Detection**:
```sql
-- RLS policy enforces
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id() AND
    tenant_id = get_current_tenant_id()
  );
```

**Testing**:
```typescript
test('Client cannot access cross-tenant data', async () => {
  await signInAsClient(client1); // tenant_id = 'ttt-111'

  // Attempt to query event from different tenant
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventFromDifferentTenant.id)
    .single();

  // RLS blocks access
  expect(event).toBeNull();
});
```

---

### Invariant 7: Client Cannot Modify Immutable Tables

**Rule**: Client cannot `UPDATE` or `DELETE` from immutable tables (`ledger_entries`, `event_transitions`).

**Enforcement**:
- Database triggers block all UPDATE/DELETE
- No RLS policies grant UPDATE/DELETE to clients

**Violation Detection**:
```sql
-- Trigger raises exception
ERROR: Audit log table ledger_entries is immutable. Entries cannot be modified or deleted.
```

**Testing**:
```typescript
test('Client cannot modify ledger entries', async () => {
  await signInAsClient();

  const { error } = await supabase
    .from('ledger_entries')
    .update({ amount_cents: 999999 })
    .eq('id', ledgerId);

  expect(error).toBeDefined();
  expect(error.message).toContain('immutable');
});
```

---

### Invariant 8: Client Cannot Access Chef-Private Fields

**Rule**: Queries must explicitly exclude chef-private fields (no `SELECT *`).

**Enforcement**:
- Application code uses whitelisted projections
- RLS does not expose chef-private columns

**Violation Example** (prevented):
```typescript
// BAD: SELECT * could expose chef-private fields
const { data } = await supabase.from('events').select('*'); // ❌

// GOOD: Explicit safe columns
const { data } = await supabase
  .from('events')
  .select('id, title, event_date, guest_count, location'); // ✅
```

**Testing**:
```typescript
test('Client queries do not use SELECT *', async () => {
  // Static code analysis or linter check
  const queries = getAllDatabaseQueries();
  const clientQueries = queries.filter(q => q.context === 'client');

  clientQueries.forEach(query => {
    expect(query.projection).not.toBe('*');
  });
});
```

---

### Invariant 9: Client Cannot Escalate Privileges

**Rule**: Client cannot change their own `user_roles` to gain elevated access.

**Enforcement**:
- No RLS policies grant client `UPDATE` on `user_roles`
- Only service role can mutate `user_roles`

**Violation Detection**:
```typescript
// Client attempts to change role
const { error } = await supabase
  .from('user_roles')
  .update({ role: 'chef' })
  .eq('auth_user_id', session.user.id);

// RLS denies (no policy grants UPDATE)
expect(error.code).toBe('42501'); // insufficient_privilege
```

**Testing**:
```typescript
test('Client cannot modify user_roles', async () => {
  await signInAsClient();

  const { error } = await supabase
    .from('user_roles')
    .update({ role: 'chef' })
    .eq('auth_user_id', session.user.id);

  expect(error).toBeDefined();
});
```

---

### Invariant 10: Client Can Only Update Own Profile

**Rule**: Client can only `UPDATE` their own `clients` record, not others.

**Enforcement**:
- RLS policy: `id = get_current_client_id()`

**Violation Detection**:
```typescript
// Client attempts to update another client's profile
const { error } = await supabase
  .from('clients')
  .update({ full_name: 'Hacker' })
  .eq('id', otherClientId);

// RLS blocks (no matching rows)
expect(error).toBeNull(); // No error, just no rows updated
```

**Testing**:
```typescript
test('Client cannot update other client profiles', async () => {
  await signInAsClient(client1);

  const { count } = await supabase
    .from('clients')
    .update({ full_name: 'Hacker' })
    .eq('id', client2.id);

  // RLS filters out other client, no rows updated
  expect(count).toBe(0);
});
```

---

### Invariant 11: Client Cannot Delete Financial Records

**Rule**: Client cannot delete events or ledger entries (financial audit trail).

**Enforcement**:
- No RLS policies grant client `DELETE` on `events` or `ledger_entries`
- Soft delete only (via UPDATE to `is_deleted`)

**Violation Detection**:
```typescript
const { error } = await supabase
  .from('events')
  .delete()
  .eq('id', eventId);

// RLS denies
expect(error.code).toBe('42501'); // insufficient_privilege
```

**Testing**:
```typescript
test('Client cannot hard-delete events', async () => {
  await signInAsClient();

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  expect(error).toBeDefined();
});
```

---

### Invariant 12: Client Cannot Bypass RLS

**Rule**: All client queries subject to RLS (no service role access).

**Enforcement**:
- Client uses anon key (not service role key)
- Service role key never exposed to frontend

**Violation Detection**:
```typescript
// Service role key in frontend would allow RLS bypass
if (process.env.SUPABASE_SERVICE_ROLE_KEY in clientBundle) {
  throw new Error('VIOLATION: Service role key exposed to client');
}
```

**Testing**:
```typescript
test('Service role key not in client bundle', () => {
  const clientJS = fs.readFileSync('out/_next/static/chunks/*.js', 'utf8');

  expect(clientJS).not.toContain(process.env.SUPABASE_SERVICE_ROLE_KEY);
});
```

---

### Invariant 13: Client Session Must Match Database Role

**Rule**: JWT `auth.uid()` must match `user_roles.auth_user_id` for queries.

**Enforcement**:
- RLS uses `auth.uid()` from JWT
- JWT signature validated by Supabase
- Role resolution uses `auth.uid()`

**Violation Detection**:
```typescript
// Tampered JWT would fail signature validation
// Even if signature valid, RLS uses auth.uid() to filter
```

**Testing**:
```typescript
test('Tampered JWT rejected', async () => {
  const tamperedToken = modifyJWT(validToken, { sub: 'hacker-id' });

  const response = await fetch('/my-events', {
    headers: { Authorization: `Bearer ${tamperedToken}` }
  });

  expect(response.status).toBe(401); // Unauthorized
});
```

---

### Invariant 14: Client Cannot Create Events Directly

**Rule**: Client cannot `INSERT` into `events` table (only chef can create events).

**Enforcement**:
- No RLS policy grants client `INSERT` on `events`
- Event creation is chef-only action

**Violation Detection**:
```typescript
const { error } = await supabase
  .from('events')
  .insert({
    tenant_id: tenantId,
    client_id: clientId,
    title: 'Fake Event',
    event_date: '2026-12-31',
    guest_count: 10,
    location: 'Fake Location',
    total_amount_cents: 10000,
    deposit_amount_cents: 5000
  });

// RLS denies
expect(error.code).toBe('42501'); // insufficient_privilege
```

**Testing**:
```typescript
test('Client cannot create events', async () => {
  await signInAsClient();

  const { error } = await supabase
    .from('events')
    .insert(eventData);

  expect(error).toBeDefined();
});
```

---

### Invariant 15: Client Cannot Modify Event Lifecycle

**Rule**: Client cannot directly update `events.status` (only chef or system can transition).

**Enforcement**:
- RLS policy blocks client UPDATE on `status` field
- Server-side validation enforces lifecycle transitions

**Violation Detection**:
```typescript
const { error } = await supabase
  .from('events')
  .update({ status: 'completed' })
  .eq('id', eventId);

// RLS may allow UPDATE, but application validation blocks invalid transition
```

**Testing**:
```typescript
test('Client cannot bypass lifecycle transitions', async () => {
  await signInAsClient();

  const { count } = await supabase
    .from('events')
    .update({ status: 'completed' }) // Invalid transition
    .eq('id', eventId);

  // RLS blocks UPDATE on status field
  expect(count).toBe(0);
});
```

---

## Invariant Enforcement Layers

### Layer 1: Database (RLS + Triggers)

**Enforces**:
- Invariants 5, 6, 7, 9, 10, 11, 14, 15

**Mechanisms**:
- Row-Level Security policies
- Immutability triggers
- Foreign key constraints
- Check constraints

**Strength**: Strongest (cannot be bypassed by application code)

---

### Layer 2: Middleware

**Enforces**:
- Invariants 1, 2, 3, 4

**Mechanisms**:
- Session validation
- Role resolution
- Email verification check
- Profile existence check

**Strength**: Strong (runs before HTML rendered)

---

### Layer 3: Application (Layout + Server Actions)

**Enforces**:
- Invariants 3, 4, 8, 12

**Mechanisms**:
- Role validation in layouts
- Whitelisted projections
- Service role key protection
- Profile deletion checks

**Strength**: Moderate (can be bypassed if middleware fails, but RLS still protects)

---

## Testing All Invariants

### Automated Test Suite

```typescript
describe('Authorization Invariants', () => {
  test('Invariant 1: Session required', async () => {
    // Test unauthenticated access
  });

  test('Invariant 2: Email verification required', async () => {
    // Test unverified email blocked
  });

  test('Invariant 3: Role must be client', async () => {
    // Test chef blocked from client portal
  });

  test('Invariant 4: Profile must exist', async () => {
    // Test deleted profile denied access
  });

  test('Invariant 5: Client can only access own events', async () => {
    // Test cross-client data blocked
  });

  test('Invariant 6: Client can only access own tenant', async () => {
    // Test cross-tenant data blocked
  });

  test('Invariant 7: Client cannot modify immutable tables', async () => {
    // Test ledger update blocked
  });

  test('Invariant 8: Client cannot access chef-private fields', async () => {
    // Test SELECT * not used
  });

  test('Invariant 9: Client cannot escalate privileges', async () => {
    // Test user_roles update blocked
  });

  test('Invariant 10: Client can only update own profile', async () => {
    // Test cross-client profile update blocked
  });

  test('Invariant 11: Client cannot delete financial records', async () => {
    // Test event/ledger delete blocked
  });

  test('Invariant 12: Client cannot bypass RLS', async () => {
    // Test service role key not exposed
  });

  test('Invariant 13: Session must match database role', async () => {
    // Test tampered JWT rejected
  });

  test('Invariant 14: Client cannot create events', async () => {
    // Test event insert blocked
  });

  test('Invariant 15: Client cannot modify lifecycle', async () => {
    // Test status update blocked
  });
});
```

---

## Violation Response Procedure

### Step 1: Detect Violation

**Mechanisms**:
- Test failures
- Runtime errors (RLS denials)
- Monitoring alerts (unusual query patterns)
- Audit log anomalies

---

### Step 2: Assess Impact

**Questions**:
- Was data exposed?
- Was data modified?
- Was privilege escalated?
- Is this a systemic issue or isolated incident?

---

### Step 3: Contain

**Actions**:
- Block affected user account
- Revoke compromised sessions
- Enable additional logging
- Review audit logs for extent of breach

---

### Step 4: Repair

**Actions**:
- Fix broken RLS policy
- Add missing validation
- Strengthen enforcement layer
- Add regression test

---

### Step 5: Prevent Recurrence

**Actions**:
- Add invariant to automated test suite
- Document fix in audit log
- Review similar code paths
- Update security review checklist

---

## Monitoring Invariant Violations

### Alert 1: RLS Policy Denial

**Trigger**: High rate of RLS `insufficient_privilege` errors

**Query**:
```sql
-- Check Supabase logs for RLS denials
SELECT
  count(*) AS denial_count,
  user_id,
  table_name
FROM supabase_logs
WHERE error_code = '42501' -- insufficient_privilege
  AND timestamp > now() - interval '1 hour'
GROUP BY user_id, table_name
HAVING count(*) > 10;
```

**Action**: Investigate user for attack or application bug.

---

### Alert 2: Orphaned Sessions

**Trigger**: Users accessing portal without valid role

**Query**:
```typescript
// Monitor middleware redirects to /account-setup-incomplete
const orphanedAccess = await getMetrics('redirect_to_setup', '1h');

if (orphanedAccess > 5) {
  alert('Multiple users without roles accessing portal');
}
```

**Action**: Investigate signup flow for bugs.

---

## Recovery from Invariant Violations

### Scenario: Client Accessed Cross-Tenant Data

**Detection**: Audit log shows client querying events from different tenant.

**Cause**: RLS policy misconfigured (missing `tenant_id` filter).

**Recovery**:
1. Fix RLS policy immediately
2. Revoke all client sessions (force re-login)
3. Audit all queries in affected timeframe
4. Notify affected clients if data exposed
5. Add regression test for cross-tenant access

---

### Scenario: Service Role Key Leaked

**Detection**: Service role key found in client-side code.

**Cause**: Developer accidentally committed key to frontend.

**Recovery**:
1. Rotate service role key immediately
2. Revoke all client sessions
3. Audit all database operations in affected timeframe
4. Review all commits for similar leaks
5. Add pre-commit hook to prevent key leaks

---

## Invariant Documentation

### Invariant Checklist

| # | Invariant | Enforcement | Test Coverage |
|---|-----------|-------------|---------------|
| 1 | Session required | Middleware | ✅ |
| 2 | Email verified | Middleware | ✅ |
| 3 | Role = 'client' | Middleware + RLS | ✅ |
| 4 | Profile exists | Layout | ✅ |
| 5 | Own events only | RLS | ✅ |
| 6 | Own tenant only | RLS | ✅ |
| 7 | No immutable table mutation | Triggers | ✅ |
| 8 | No chef-private fields | Application | ✅ |
| 9 | No privilege escalation | RLS | ✅ |
| 10 | Own profile only | RLS | ✅ |
| 11 | No financial record deletion | RLS | ✅ |
| 12 | No RLS bypass | Application | ✅ |
| 13 | Session matches role | JWT + RLS | ✅ |
| 14 | No event creation | RLS | ✅ |
| 15 | No lifecycle manipulation | RLS | ✅ |

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_AUTH_FLOW.md](./CLIENT_AUTH_FLOW.md)
- [CLIENT_ROLE_RESOLUTION_FLOW.md](./CLIENT_ROLE_RESOLUTION_FLOW.md)
- [CLIENT_USER_ROLES_MAPPING.md](./CLIENT_USER_ROLES_MAPPING.md)
- [CLIENT_ACCOUNT_LINKING_RULES.md](./CLIENT_ACCOUNT_LINKING_RULES.md)
- [CLIENT_PORTAL_CONSTITUTION.md](./CLIENT_PORTAL_CONSTITUTION.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

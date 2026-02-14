# System Invariants

**Document ID**: 003
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines **immutable system laws** that MUST hold true at all times. Violation of any invariant is a critical bug requiring immediate fix.

These are not features. These are non-negotiable constraints on the system's behavior.

## Invariant Categories

Invariants are organized into 7 categories:
1. Multi-Tenant Isolation
2. Financial Integrity
3. Role & Permission Enforcement
4. Data Immutability
5. State Machine Enforcement
6. Idempotency Guarantees
7. Security Boundaries

---

## 1. Multi-Tenant Isolation Invariants

### I-MT-001: Tenant ID is Required
**Statement**: Every table except `chefs`, `clients`, and `user_roles` MUST have a `tenant_id` column.

**Enforcement**:
- Database schema constraint (NOT NULL on `tenant_id`)
- Migration verification script checks all tables

**Test**:
```sql
-- This query MUST return zero rows (all tables have tenant_id or are exempt)
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT IN ('chefs', 'clients', 'user_roles', 'event_menus')
  AND column_name != 'tenant_id';
```

**Exception List**:
- `chefs` - Is the tenant root
- `clients` - Has `tenant_id` but is conceptually a cross-tenant table (client invited by specific chef)
- `user_roles` - Maps auth.users to role ('chef' or 'client'), no tenant scoping
- `event_menus` - Join table, inherits tenant from events/menus

---

### I-MT-002: RLS is Enabled on All Tables
**Statement**: Row Level Security MUST be enabled on every public table.

**Enforcement**:
```sql
-- Enable RLS on all tables
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;
```

**Test**:
```sql
-- This query MUST return zero rows (all tables have RLS enabled)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

**Violation Impact**: Without RLS, tenant isolation is broken. Chef A can query Chef B's data.

---

### I-MT-003: Tenant Scoping is Database-Enforced
**Statement**: A chef MUST NOT be able to query another chef's data, even if they know the `tenant_id`.

**Enforcement**:
- RLS policies use `get_current_tenant_id()` helper (returns chef.id from session)
- NEVER trust `tenant_id` from request body or query params

**Test**:
```sql
-- As chef A, attempt to query chef B's events by injecting tenant_id
SELECT * FROM events WHERE tenant_id = 'chef-b-uuid';

-- Expected result: Zero rows (RLS blocks query)
```

**Violation Impact**: Cross-tenant data leak, privacy violation, regulatory breach.

---

### I-MT-004: Client Belongs to Single Tenant
**Statement**: A client MUST be associated with exactly one chef (via `clients.tenant_id`).

**Enforcement**:
- `clients.tenant_id` is NOT NULL and references `chefs.id`
- A client invited by Chef A cannot see events from Chef B

**Test**:
```sql
-- This query MUST return zero rows (no clients without tenant_id)
SELECT * FROM clients WHERE tenant_id IS NULL;
```

**Future Consideration**: V2 may allow clients to have multiple chefs, but V1 enforces 1:1.

---

### I-MT-005: No Cross-Tenant Foreign Keys
**Statement**: Events MUST reference clients within the same tenant.

**Enforcement**:
```sql
-- CHECK constraint on events table
ALTER TABLE events
ADD CONSTRAINT fk_client_same_tenant
CHECK (
  (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
);
```

**Test**:
```sql
-- Attempt to create event for Chef A with Client B (different tenant)
INSERT INTO events (tenant_id, client_id, ...)
VALUES ('chef-a-uuid', 'client-of-chef-b-uuid', ...);

-- Expected result: Constraint violation error
```

**Violation Impact**: Event references client from wrong tenant, breaking isolation.

---

## 2. Financial Integrity Invariants

### I-FIN-001: Ledger is Append-Only
**Statement**: Ledger entries MUST be immutable. UPDATE and DELETE operations MUST fail.

**Enforcement**:
```sql
CREATE TRIGGER ledger_entries_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER ledger_entries_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

**Test**:
```sql
-- Attempt to update a ledger entry
UPDATE ledger_entries SET amount_cents = 5000 WHERE id = 'some-uuid';

-- Expected result: Error "Table ledger_entries is immutable"
```

**Violation Impact**: Financial audit trail is compromised, regulatory non-compliance.

---

### I-FIN-002: Amounts in Minor Units
**Statement**: All monetary amounts MUST be stored as INTEGER (cents, not dollars).

**Enforcement**:
- `amount_cents` column is type INTEGER, NOT DECIMAL or FLOAT
- Application code NEVER uses floating point for money

**Test**:
```sql
-- This query MUST return zero rows (no DECIMAL/FLOAT money columns)
SELECT column_name, data_type
FROM information_schema.columns
WHERE column_name LIKE '%amount%'
  AND data_type NOT IN ('integer', 'bigint');
```

**Examples**:
- $100.00 → `10000`
- $15.50 → `1550`
- $0.99 → `99`

**Violation Impact**: Floating point rounding errors, financial discrepancies.

---

### I-FIN-003: Stripe is Source of Truth
**Statement**: Ledger entries MUST only be created by:
1. Stripe webhook events (payment_intent.succeeded, charge.refunded, etc.)
2. Manual adjustments (chef-initiated, with approval metadata)

**Enforcement**:
- Webhook handler creates ledger entries (via server action)
- Manual entries require `entry_type = 'adjustment'` and `metadata.reason`

**Prohibition**:
- NEVER manually INSERT `charge_succeeded` entries
- NEVER create ledger entries from client-submitted data

**Test**:
```sql
-- All charge_succeeded entries MUST have stripe_event_id
SELECT * FROM ledger_entries
WHERE entry_type = 'charge_succeeded'
  AND stripe_event_id IS NULL;

-- Expected result: Zero rows
```

**Violation Impact**: Ledger does not match Stripe, reconciliation fails.

---

### I-FIN-004: Event Payment Status is Computed
**Statement**: Event payment status (paid, unpaid, balance) MUST be derived from ledger, NEVER stored directly.

**Enforcement**:
- `events` table has NO `amount_paid`, `balance`, or `is_paid` columns
- Use `event_financial_summary` view (computes SUM from ledger)

**Test**:
```sql
-- This query MUST return zero rows (no payment state columns on events)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('amount_paid', 'balance', 'is_paid', 'payment_status');
```

**Violation Impact**: Payment state diverges from ledger, incorrect billing.

---

### I-FIN-005: Webhook Idempotency
**Statement**: Processing the same Stripe webhook event multiple times MUST NOT create duplicate ledger entries.

**Enforcement**:
```sql
-- Unique constraint on stripe_event_id
CREATE UNIQUE INDEX idx_ledger_stripe_event
ON ledger_entries(stripe_event_id)
WHERE stripe_event_id IS NOT NULL;
```

**Test**:
```sql
-- Attempt to insert duplicate stripe_event_id
INSERT INTO ledger_entries (stripe_event_id, ...)
VALUES ('evt_abc123', ...);

INSERT INTO ledger_entries (stripe_event_id, ...)
VALUES ('evt_abc123', ...); -- Same event ID

-- Expected result: Second insert fails with unique constraint violation
```

**Violation Impact**: Double-charging, incorrect balances, ledger corruption.

---

## 3. Role & Permission Enforcement Invariants

### I-ROLE-001: Role is Database-Authoritative
**Statement**: User role ('chef' or 'client') MUST be stored ONLY in `user_roles` table.

**Enforcement**:
- `getCurrentUser()` queries `user_roles` table
- NEVER infer role from URL path, client state, or JWT custom claims

**Prohibition**:
- NO role stored in cookies
- NO role stored in localStorage
- NO role stored in URL parameters

**Test**:
```typescript
// Given: User auth_user_id is in database as 'chef'
// When: Client attempts to access /client/my-events with forged cookie
// Then: Middleware resolves role from database, detects mismatch, redirects to /dashboard
```

**Violation Impact**: Unauthorized portal access, privilege escalation.

---

### I-ROLE-002: Single Role Per User
**Statement**: A user MUST have exactly one role (chef XOR client), never both, never none.

**Enforcement**:
```sql
-- Unique constraint on auth_user_id
CREATE UNIQUE INDEX idx_user_roles_auth_user
ON user_roles(auth_user_id);

-- NOT NULL constraint on role column
ALTER TABLE user_roles ALTER COLUMN role SET NOT NULL;
```

**Test**:
```sql
-- This query MUST return zero rows (no users with multiple roles)
SELECT auth_user_id, COUNT(*)
FROM user_roles
GROUP BY auth_user_id
HAVING COUNT(*) > 1;
```

**Future Consideration**: V2 may support users with multiple roles (e.g., chef who is also client of another chef).

---

### I-ROLE-003: No Flash of Wrong Portal
**Statement**: A user accessing the wrong portal MUST be redirected BEFORE any HTML is rendered.

**Enforcement**:
- Middleware checks role and redirects (runs before layout/page components)
- Layout-level auth check (double defense)
- NEVER render then redirect

**Test**:
1. Chef user navigates to `/client/my-events`
2. Network tab shows `302 Redirect` (not `200 OK`)
3. Client never receives HTML for client portal

**Violation Impact**: User sees brief flash of wrong UI, confusion, perceived security issue.

---

### I-ROLE-004: Permission Checks are Server-Side
**Statement**: ALL permission checks (can edit event, can view ledger, can invite client) MUST be performed server-side.

**Enforcement**:
- Server Actions validate user role before mutations
- API routes validate role before queries
- Client-side checks are UI-only (hide buttons, disable forms), NEVER authoritative

**Test**:
```typescript
// Given: Client user attempts to call server action createEvent()
// When: Server action executes
// Then: Role check fails, action returns error, no event created
```

**Violation Impact**: Unauthorized mutations, data corruption.

---

## 4. Data Immutability Invariants

### I-IMM-001: Ledger Entries Cannot Be Modified
**Statement**: See I-FIN-001 (financial ledger is append-only).

---

### I-IMM-002: Event Transitions Cannot Be Modified
**Statement**: Event state change audit log (`event_transitions`) is immutable.

**Enforcement**:
```sql
CREATE TRIGGER event_transitions_immutable_update
BEFORE UPDATE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER event_transitions_immutable_delete
BEFORE DELETE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

**Test**:
```sql
-- Attempt to update event transition
UPDATE event_transitions SET to_status = 'confirmed' WHERE id = 'some-uuid';

-- Expected result: Error "Table event_transitions is immutable"
```

**Violation Impact**: Audit trail is compromised, cannot prove who changed event state when.

---

### I-IMM-003: User Roles Cannot Be Changed
**Statement**: Once a user is assigned a role, it CANNOT be changed (no UPDATE on `user_roles`).

**Enforcement**:
```sql
CREATE TRIGGER user_roles_immutable_update
BEFORE UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

**Exception**: Initial role assignment during signup is INSERT, not UPDATE.

**Future Consideration**: V2 may allow role changes (e.g., client becomes chef), but requires audit trail.

**Test**:
```sql
-- Attempt to change user from 'client' to 'chef'
UPDATE user_roles SET role = 'chef' WHERE auth_user_id = 'some-uuid';

-- Expected result: Error "Table user_roles is immutable"
```

**Violation Impact**: User gains unauthorized access, role changes are not audited.

---

## 5. State Machine Enforcement Invariants

### I-SM-001: Event Status Follows Defined Transitions
**Statement**: Event status changes MUST follow the valid state machine paths.

**Valid Transitions**:
```
draft → proposed → accepted → paid → confirmed → in_progress → completed
  ↓        ↓          ↓        ↓        ↓            ↓
  └────────┴──────────┴────────┴────────┴────────────→ cancelled
```

**Prohibited Transitions** (examples):
- `draft → paid` (cannot skip proposal and acceptance)
- `completed → in_progress` (cannot reverse terminal state)
- `cancelled → confirmed` (cannot resurrect cancelled event)

**Enforcement**:
- Server action `transitionEventStatus()` validates transitions
- Rejects invalid transitions with error

**Test**:
```typescript
// Given: Event is in 'draft' status
// When: Attempt to transition directly to 'paid'
// Then: Transition fails with error "Invalid transition: draft → paid"
```

**Violation Impact**: Events skip required steps (e.g., payment), business logic breaks.

---

### I-SM-002: Terminal States are Final
**Statement**: Events in `completed` or `cancelled` status CANNOT transition to any other state.

**Enforcement**:
- `transitionEventStatus()` checks if current state is terminal
- Returns error if attempting to transition from terminal state

**Test**:
```typescript
// Given: Event is in 'completed' status
// When: Attempt to transition to 'in_progress'
// Then: Error "Cannot transition from terminal state: completed"
```

**Violation Impact**: Completed events are reopened, audit trail is confusing.

---

### I-SM-003: State Changes are Audited
**Statement**: Every event status change MUST create a row in `event_transitions` table.

**Enforcement**:
- `transitionEventStatus()` creates transition record after updating event
- Transition includes `from_status`, `to_status`, `transitioned_by`, `reason`

**Test**:
```sql
-- Every event MUST have at least one transition (creation = draft)
SELECT e.id FROM events e
LEFT JOIN event_transitions et ON e.id = et.event_id
WHERE et.id IS NULL;

-- Expected result: Zero rows
```

**Violation Impact**: Cannot audit who changed event status when, compliance failure.

---

## 6. Idempotency Guarantees

### I-IDP-001: Webhook Processing is Idempotent
**Statement**: See I-FIN-005 (duplicate Stripe webhooks do not create duplicate ledger entries).

---

### I-IDP-002: Client Invitations are Single-Use
**Statement**: An invitation token MUST be usable exactly once.

**Enforcement**:
- Invitation has `used_at` timestamp (NULL initially)
- Signup checks `used_at IS NULL`, sets `used_at = NOW()` on use
- Concurrent signups prevented by transaction isolation

**Test**:
```typescript
// Given: Invitation token 'inv_abc123' is unused
// When: Two concurrent signups attempt to use same token
// Then: First succeeds, second fails with error "Invitation already used"
```

**Violation Impact**: Multiple clients sign up with same invitation, chef loses control.

---

### I-IDP-003: Role Assignment is Idempotent
**Statement**: Assigning a role to a user who already has that role MUST succeed (no-op).

**Enforcement**:
- `INSERT INTO user_roles ON CONFLICT (auth_user_id) DO NOTHING`

**Test**:
```sql
-- Insert role for user (first time)
INSERT INTO user_roles (auth_user_id, role) VALUES ('user-uuid', 'chef');

-- Insert same role again (idempotent)
INSERT INTO user_roles (auth_user_id, role)
VALUES ('user-uuid', 'chef')
ON CONFLICT (auth_user_id) DO NOTHING;

-- Expected result: Second insert is no-op, no error
```

**Violation Impact**: Signup flow fails on retry, user cannot complete registration.

---

## 7. Security Boundaries Invariants

### I-SEC-001: Service Role Key is Server-Only
**Statement**: Supabase service role key MUST NEVER be exposed to client.

**Enforcement**:
- Service role key stored in `SUPABASE_SERVICE_ROLE_KEY` environment variable
- Only used in server actions, API routes, middleware
- NEVER imported in client components

**Test**:
```bash
# Grep codebase for service role key usage in client components
grep -r "SUPABASE_SERVICE_ROLE_KEY" app/ | grep -v "use server"

# Expected result: Zero matches (only used in server contexts)
```

**Violation Impact**: Client gains admin access, can bypass RLS, read all data.

---

### I-SEC-002: User Input is Never Trusted
**Statement**: ALL user-provided data (form inputs, query params, headers) MUST be validated before use.

**Enforcement**:
- Server actions use Zod schemas to validate input
- SQL queries use parameterized queries (no string interpolation)
- NEVER trust `tenant_id`, `client_id`, or `role` from request

**Test**:
```typescript
// Given: Client submits createEvent form with malicious tenant_id
// When: Server action executes
// Then: Ignores submitted tenant_id, derives from getCurrentUser().tenantId
```

**Violation Impact**: SQL injection, cross-tenant data leak, privilege escalation.

---

### I-SEC-003: Passwords are Never Logged
**Statement**: Password fields MUST NEVER appear in logs, error messages, or database audit trails.

**Enforcement**:
- Supabase Auth handles password hashing (never stored plaintext)
- Application code NEVER receives password (Supabase Auth API handles it)

**Test**:
```bash
# Grep codebase for password logging
grep -r "console.log.*password" .

# Expected result: Zero matches
```

**Violation Impact**: Password leak, account takeover.

---

### I-SEC-004: Sessions are HTTP-Only Cookies
**Statement**: Supabase session tokens MUST be stored in HTTP-only cookies, NEVER in localStorage.

**Enforcement**:
- `@supabase/ssr` package handles cookie storage automatically
- Cookies have `httpOnly: true`, `secure: true` (production), `sameSite: 'lax'`

**Test**:
```javascript
// In browser console
console.log(localStorage.getItem('supabase-auth-token'));

// Expected result: null (token is in HTTP-only cookie, not accessible to JS)
```

**Violation Impact**: XSS attacks can steal session, account takeover.

---

## Invariant Verification

All invariants MUST be verified before deployment:

**Automated Checks**:
- `verify-immutability.sql` - Tests I-IMM-001, I-IMM-002, I-IMM-003
- `verify-rls.sql` - Tests I-MT-002, I-MT-003
- `verify-migrations.sql` - Tests I-MT-001, I-FIN-002

**Manual Checks**:
- Code review checklist references this document
- PR template includes "Invariant Compliance" section

**Failure Response**:
- Any invariant violation is a **blocker**
- Code MUST NOT be merged until violation is fixed
- Post-deployment violations require immediate hotfix

---

**Authority**: These invariants are non-negotiable. Any code change that violates an invariant is rejected.
**Enforcement**: Verification scripts run in CI/CD pipeline. Failures block deployment.

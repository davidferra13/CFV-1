# ChefFlow V1 - Verification Scripts

## Prerequisites

You need a Supabase project with the ChefFlow migrations applied.

## Running Verifications

### 1. Migration Verification

Verifies all tables, enums, functions, triggers, and views exist.

```sql
-- Run in Supabase SQL Editor
-- File: verify-migrations.sql
```

**Expected Output**: All checks should show `PASS ✓`

### 2. RLS (Multi-Tenant Isolation) Verification

Proves that:

- Chef A cannot access Chef B's data
- Client A1 cannot access Client A2's events
- Service role can bypass RLS for webhooks

```sql
-- Run in Supabase SQL Editor (as service role)
-- File: verify-rls.sql
```

**Expected Output**:

- TEST 1 PASS ✓: Chef A cannot see Chef B events
- TEST 2 PASS ✓: Client A1 cannot see Client A2 events
- TEST 3 PASS ✓: Service role sees all events

**Note**: This script creates test data with placeholder auth_user_ids. In production, users must be created via Supabase Auth API.

### 3. Immutability Verification

Proves that:

- UPDATE on `ledger_entries` is blocked
- DELETE on `ledger_entries` is blocked
- UPDATE on `event_transitions` is blocked
- DELETE on `event_transitions` is blocked
- INSERT still works (append-only)

```sql
-- Run in Supabase SQL Editor (as service role)
-- File: verify-immutability.sql
```

**Expected Output**:

- TEST 1 PASS ✓: UPDATE on ledger_entries blocked
- TEST 2 PASS ✓: DELETE on ledger_entries blocked
- TEST 3 PASS ✓: UPDATE on event_transitions blocked
- TEST 4 PASS ✓: DELETE on event_transitions blocked
- TEST 5 PASS ✓: INSERT still works

### 4. Role Resolution Verification

This requires actual Supabase Auth users. See `test-role-resolution.md` for manual testing steps.

## Cleanup

After running tests, you can clean up test data:

```sql
-- Clean up immutability test data
DELETE FROM ledger_entries WHERE tenant_id = '99999999-0000-0000-0000-000000000001'::uuid;
DELETE FROM event_transitions WHERE tenant_id = '99999999-0000-0000-0000-000000000001'::uuid;
DELETE FROM events WHERE tenant_id = '99999999-0000-0000-0000-000000000001'::uuid;
DELETE FROM clients WHERE tenant_id = '99999999-0000-0000-0000-000000000001'::uuid;
DELETE FROM chefs WHERE id = '99999999-0000-0000-0000-000000000001'::uuid;

-- Clean up RLS test data
DELETE FROM event_menus WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'TEST:%');
DELETE FROM event_transitions WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'TEST:%');
DELETE FROM ledger_entries WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'TEST:%');
DELETE FROM events WHERE title LIKE 'TEST:%';
DELETE FROM menus WHERE name LIKE 'TEST:%';
DELETE FROM clients WHERE email LIKE 'test%@example.com';
DELETE FROM user_roles WHERE entity_id IN (SELECT id FROM chefs WHERE email LIKE 'test%@example.com');
DELETE FROM chefs WHERE email LIKE 'test%@example.com';
```

## Troubleshooting

### RLS tests show "0 affected rows"

This is expected when testing cross-tenant access. RLS policies should prevent rows from being returned.

### Tests fail with "permission denied"

Ensure you're running the scripts as service role in Supabase SQL Editor.

### Migration scripts show errors

Verify migrations were applied in order:

1. `20260213000001_initial_schema.sql`
2. `20260213000002_rls_policies.sql`

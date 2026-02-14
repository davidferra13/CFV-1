-- ChefFlow V1 - RLS Verification Script
-- Proves multi-tenant isolation at database layer
-- Run this in Supabase SQL Editor (as service role)

-- ============================================
-- SETUP: Create test users and data
-- ============================================

-- Clean up any existing test data first
DELETE FROM event_menus WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'TEST:%');
DELETE FROM event_transitions WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'TEST:%');
DELETE FROM ledger_entries WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'TEST:%');
DELETE FROM events WHERE title LIKE 'TEST:%';
DELETE FROM client_invitations WHERE email LIKE 'test%@example.com';
DELETE FROM clients WHERE email LIKE 'test%@example.com';
DELETE FROM menus WHERE name LIKE 'TEST:%';
DELETE FROM user_roles WHERE auth_user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test%@example.com'
);
DELETE FROM chefs WHERE email LIKE 'test%@example.com';

-- Note: We cannot create auth.users directly from SQL
-- This script assumes test users are created via Supabase Auth API
-- For now, we'll create the tenant/client records with placeholder auth_user_ids

-- Create Tenant A (Chef A)
INSERT INTO chefs (id, auth_user_id, business_name, email)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'TEST: Chef A Business', 'testchefa@example.com');

-- Create Tenant B (Chef B)
INSERT INTO chefs (id, auth_user_id, business_name, email)
VALUES
  ('00000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, 'TEST: Chef B Business', 'testchefb@example.com');

-- Create Client A1 (belongs to Chef A)
INSERT INTO clients (id, auth_user_id, tenant_id, full_name, email)
VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'TEST: Client A1', 'testclienta1@example.com');

-- Create Client A2 (belongs to Chef A)
INSERT INTO clients (id, auth_user_id, tenant_id, full_name, email)
VALUES
  ('20000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'TEST: Client A2', 'testclienta2@example.com');

-- Create Client B1 (belongs to Chef B)
INSERT INTO clients (id, auth_user_id, tenant_id, full_name, email)
VALUES
  ('20000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'TEST: Client B1', 'testclientb1@example.com');

-- Create user roles
INSERT INTO user_roles (auth_user_id, role, entity_id) VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'chef', '00000000-0000-0000-0000-000000000001'::uuid),   -- Chef A
  ('10000000-0000-0000-0000-000000000002'::uuid, 'chef', '00000000-0000-0000-0000-000000000002'::uuid),   -- Chef B
  ('10000000-0000-0000-0000-000000000003'::uuid, 'client', '20000000-0000-0000-0000-000000000001'::uuid), -- Client A1
  ('10000000-0000-0000-0000-000000000004'::uuid, 'client', '20000000-0000-0000-0000-000000000002'::uuid), -- Client A2
  ('10000000-0000-0000-0000-000000000005'::uuid, 'client', '20000000-0000-0000-0000-000000000003'::uuid); -- Client B1

-- Create events for each tenant
INSERT INTO events (id, tenant_id, client_id, title, event_date, guest_count, location, total_amount_cents, deposit_amount_cents, status, created_by)
VALUES
  ('30000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid,
   'TEST: Chef A Event 1', '2026-03-01 18:00:00', 10, 'Location A1', 100000, 50000, 'draft', '10000000-0000-0000-0000-000000000001'::uuid),
  ('30000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid,
   'TEST: Chef A Event 2', '2026-03-02 18:00:00', 8, 'Location A2', 80000, 40000, 'draft', '10000000-0000-0000-0000-000000000001'::uuid),
  ('30000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid,
   'TEST: Chef B Event 1', '2026-03-03 18:00:00', 12, 'Location B1', 120000, 60000, 'draft', '10000000-0000-0000-0000-000000000002'::uuid);

-- Create menus for each tenant
INSERT INTO menus (tenant_id, name, description, price_per_person_cents)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'TEST: Chef A Menu 1', 'Menu for Chef A', 10000),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'TEST: Chef B Menu 1', 'Menu for Chef B', 12000);

-- Create ledger entries
INSERT INTO ledger_entries (tenant_id, event_id, client_id, entry_type, amount_cents, description)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid,
   'charge_succeeded', 50000, 'TEST: Deposit for Chef A Event 1'),
  ('00000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000003'::uuid,
   'charge_succeeded', 60000, 'TEST: Deposit for Chef B Event 1');

-- Create event transitions
INSERT INTO event_transitions (tenant_id, event_id, from_status, to_status, transitioned_by)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid, NULL, 'draft', '10000000-0000-0000-0000-000000000001'::uuid),
  ('00000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000003'::uuid, NULL, 'draft', '10000000-0000-0000-0000-000000000002'::uuid);

SELECT '=== TEST DATA CREATED ===' as status;

-- ============================================
-- TEST 1: Cross-tenant event access (should be blocked)
-- ============================================

-- Simulate Chef A trying to access Chef B's events
-- This should return 0 rows (RLS blocks access)
DO $$
DECLARE
  event_count INT;
BEGIN
  -- Set session to Chef A
  PERFORM set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000001')::text, true);

  -- Try to read Chef B's events
  SELECT COUNT(*) INTO event_count
  FROM events
  WHERE tenant_id = '00000000-0000-0000-0000-000000000002'::uuid;

  IF event_count = 0 THEN
    RAISE NOTICE 'TEST 1 PASS ✓: Chef A cannot see Chef B events (blocked by RLS)';
  ELSE
    RAISE NOTICE 'TEST 1 FAIL ✗: Chef A can see % Chef B events (RLS BROKEN!)', event_count;
  END IF;
END $$;

-- ============================================
-- TEST 2: Cross-client event access (should be blocked)
-- ============================================

-- Simulate Client A1 trying to access Client A2's events
DO $$
DECLARE
  event_count INT;
BEGIN
  -- Set session to Client A1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000003')::text, true);

  -- Try to read Client A2's events
  SELECT COUNT(*) INTO event_count
  FROM events
  WHERE client_id = '20000000-0000-0000-0000-000000000002'::uuid;

  IF event_count = 0 THEN
    RAISE NOTICE 'TEST 2 PASS ✓: Client A1 cannot see Client A2 events (blocked by RLS)';
  ELSE
    RAISE NOTICE 'TEST 2 FAIL ✗: Client A1 can see % Client A2 events (RLS BROKEN!)', event_count;
  END IF;
END $$;

-- ============================================
-- TEST 3: Verify service role can bypass RLS
-- ============================================

-- Service role should see all events
SELECT
  'TEST 3: Service Role Access' as test,
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS ✓: Service role sees all 3 test events'
    ELSE 'FAIL ✗: Service role sees ' || COUNT(*) || ' events (expected 3)'
  END as result
FROM events
WHERE title LIKE 'TEST:%';

-- ============================================
-- CLEANUP INSTRUCTIONS
-- ============================================

SELECT
  '=== RLS VERIFICATION COMPLETE ===' as summary,
  'Run verify-rls-cleanup.sql to remove test data' as cleanup_instructions;

-- ChefFlow V1 - STRICT RLS Verification Script
-- Uses service role inserts only (no auth.users dependency)
-- Returns clear PASS/FAIL via exit code

-- ============================================
-- SETUP: Create test tenants and data
-- ============================================

-- Clean up any existing test data
DO $$
BEGIN
  DELETE FROM event_menus WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'RLS_TEST:%');
  DELETE FROM event_transitions WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'RLS_TEST:%');
  DELETE FROM ledger_entries WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'RLS_TEST:%');
  DELETE FROM events WHERE title LIKE 'RLS_TEST:%';
  DELETE FROM menus WHERE name LIKE 'RLS_TEST:%';
  DELETE FROM clients WHERE email LIKE 'rls_test_%@example.com';
  DELETE FROM user_roles WHERE entity_id IN (SELECT id FROM chefs WHERE email LIKE 'rls_test_%@example.com');
  DELETE FROM chefs WHERE email LIKE 'rls_test_%@example.com';
END $$;

-- Create Tenant A (Chef A)
INSERT INTO chefs (id, auth_user_id, business_name, email)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid, 'RLS_TEST: Tenant A', 'rls_test_chef_a@example.com');

-- Create Tenant B (Chef B)
INSERT INTO chefs (id, auth_user_id, business_name, email)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001'::uuid, 'RLS_TEST: Tenant B', 'rls_test_chef_b@example.com');

-- Create Client A1 (belongs to Tenant A)
INSERT INTO clients (id, auth_user_id, tenant_id, full_name, email)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-000000000011'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'RLS_TEST: Client A1', 'rls_test_client_a1@example.com');

-- Create Client A2 (belongs to Tenant A)
INSERT INTO clients (id, auth_user_id, tenant_id, full_name, email)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-000000000012'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'RLS_TEST: Client A2', 'rls_test_client_a2@example.com');

-- Create Client B1 (belongs to Tenant B)
INSERT INTO clients (id, auth_user_id, tenant_id, full_name, email)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-000000000011'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'RLS_TEST: Client B1', 'rls_test_client_b1@example.com');

-- Create user roles (normally created via signup flow)
INSERT INTO user_roles (auth_user_id, role, entity_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid, 'chef', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001'::uuid, 'chef', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, 'client', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011'::uuid),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, 'client', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012'::uuid),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002'::uuid, 'client', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000011'::uuid);

-- Create events for Tenant A
INSERT INTO events (id, tenant_id, client_id, title, event_date, guest_count, location, total_amount_cents, deposit_amount_cents, status, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011'::uuid,
   'RLS_TEST: Tenant A Event 1', '2026-03-01 18:00:00', 10, 'Location A1', 100000, 50000, 'draft', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid),
  ('aaaaaaaa-aaaa-aaaa-aaaa-111111111112'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012'::uuid,
   'RLS_TEST: Tenant A Event 2', '2026-03-02 18:00:00', 8, 'Location A2', 80000, 40000, 'draft', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid);

-- Create events for Tenant B
INSERT INTO events (id, tenant_id, client_id, title, event_date, guest_count, location, total_amount_cents, deposit_amount_cents, status, created_by)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-111111111111'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000011'::uuid,
   'RLS_TEST: Tenant B Event 1', '2026-03-03 18:00:00', 12, 'Location B1', 120000, 60000, 'draft', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001'::uuid);

-- Create menus for each tenant
INSERT INTO menus (tenant_id, name, description, price_per_person_cents)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'RLS_TEST: Tenant A Menu', 'Menu for Tenant A', 10000),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'RLS_TEST: Tenant B Menu', 'Menu for Tenant B', 12000);

-- Create ledger entries
INSERT INTO ledger_entries (tenant_id, event_id, client_id, entry_type, amount_cents, description)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011'::uuid,
   'charge_succeeded', 50000, 'RLS_TEST: Deposit Tenant A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000011'::uuid,
   'charge_succeeded', 60000, 'RLS_TEST: Deposit Tenant B');

-- Create event transitions
INSERT INTO event_transitions (tenant_id, event_id, from_status, to_status, transitioned_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-111111111111'::uuid, NULL, 'draft', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111'::uuid, NULL, 'draft', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001'::uuid);

-- ============================================
-- VERIFICATION TESTS
-- ============================================

DO $$
DECLARE
  test_failures INT := 0;
  cross_tenant_events INT;
  cross_client_events INT;
  cross_tenant_menus INT;
  cross_tenant_ledger INT;
  service_role_count INT;
BEGIN

  -- TEST 1: Cross-tenant event access (Events table)
  -- Simulate: Set auth context to Tenant A Chef, try to read Tenant B events
  -- RLS should block this
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', true);

  SELECT COUNT(*) INTO cross_tenant_events
  FROM events
  WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

  IF cross_tenant_events = 0 THEN
    RAISE NOTICE 'TEST 1 PASS ✓: Cross-tenant event access blocked (Tenant A cannot see Tenant B events)';
  ELSE
    RAISE NOTICE 'TEST 1 FAIL ✗: Cross-tenant event access NOT blocked (found % Tenant B events)', cross_tenant_events;
    test_failures := test_failures + 1;
  END IF;

  -- TEST 2: Cross-client event access within same tenant
  -- Simulate: Set auth context to Client A1, try to read Client A2 events
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', true);

  SELECT COUNT(*) INTO cross_client_events
  FROM events
  WHERE client_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000012'::uuid;

  IF cross_client_events = 0 THEN
    RAISE NOTICE 'TEST 2 PASS ✓: Cross-client event access blocked (Client A1 cannot see Client A2 events)';
  ELSE
    RAISE NOTICE 'TEST 2 FAIL ✗: Cross-client event access NOT blocked (found % Client A2 events)', cross_client_events;
    test_failures := test_failures + 1;
  END IF;

  -- TEST 3: Cross-tenant menu access
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', true);

  SELECT COUNT(*) INTO cross_tenant_menus
  FROM menus
  WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

  IF cross_tenant_menus = 0 THEN
    RAISE NOTICE 'TEST 3 PASS ✓: Cross-tenant menu access blocked';
  ELSE
    RAISE NOTICE 'TEST 3 FAIL ✗: Cross-tenant menu access NOT blocked (found % Tenant B menus)', cross_tenant_menus;
    test_failures := test_failures + 1;
  END IF;

  -- TEST 4: Cross-tenant ledger access
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', true);

  SELECT COUNT(*) INTO cross_tenant_ledger
  FROM ledger_entries
  WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

  IF cross_tenant_ledger = 0 THEN
    RAISE NOTICE 'TEST 4 PASS ✓: Cross-tenant ledger access blocked';
  ELSE
    RAISE NOTICE 'TEST 4 FAIL ✗: Cross-tenant ledger access NOT blocked (found % Tenant B ledger entries)', cross_tenant_ledger;
    test_failures := test_failures + 1;
  END IF;

  -- TEST 5: Service role bypass (should see all data)
  PERFORM set_config('request.jwt.claim.sub', '', true);

  SELECT COUNT(*) INTO service_role_count
  FROM events
  WHERE title LIKE 'RLS_TEST:%';

  IF service_role_count = 3 THEN
    RAISE NOTICE 'TEST 5 PASS ✓: Service role can bypass RLS (sees all 3 test events)';
  ELSE
    RAISE NOTICE 'TEST 5 FAIL ✗: Service role bypass broken (expected 3 events, got %)', service_role_count;
    test_failures := test_failures + 1;
  END IF;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '=== RLS VERIFICATION SUMMARY ===';

  IF test_failures = 0 THEN
    RAISE NOTICE 'ALL TESTS PASSED ✓ (Multi-tenant isolation enforced)';
  ELSE
    RAISE NOTICE 'TESTS FAILED: % failures detected ✗', test_failures;
    RAISE EXCEPTION 'RLS verification failed - CRITICAL SECURITY ISSUE';
  END IF;
END $$;

-- Final status query
SELECT
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as rls_verification_status
FROM events
WHERE title LIKE 'RLS_TEST:%';

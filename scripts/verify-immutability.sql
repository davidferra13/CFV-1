-- ChefFlow V1 - Immutability Verification Script
-- Proves ledger_entries and event_transitions cannot be modified
-- Run this in Supabase SQL Editor (as service role)

-- ============================================
-- SETUP: Create test ledger entry
-- ============================================

-- First, ensure we have a test tenant
INSERT INTO chefs (id, auth_user_id, business_name, email)
VALUES ('99999999-0000-0000-0000-000000000001'::uuid, '19999999-0000-0000-0000-000000000001'::uuid, 'TEST: Immutability Chef', 'testimm@example.com')
ON CONFLICT (id) DO NOTHING;

-- Insert test ledger entry
INSERT INTO ledger_entries (
  id,
  tenant_id,
  entry_type,
  amount_cents,
  description
)
VALUES (
  '99999999-0000-0000-0000-000000000001'::uuid,
  '99999999-0000-0000-0000-000000000001'::uuid,
  'charge_succeeded',
  50000,
  'TEST: Immutability test entry'
)
ON CONFLICT (id) DO NOTHING;

-- Insert test event and transition
INSERT INTO clients (id, auth_user_id, tenant_id, full_name, email)
VALUES ('99999999-0000-0000-0000-000000000002'::uuid, '19999999-0000-0000-0000-000000000002'::uuid,
        '99999999-0000-0000-0000-000000000001'::uuid, 'TEST: Imm Client', 'testimmc@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (
  id,
  tenant_id,
  client_id,
  title,
  event_date,
  guest_count,
  location,
  total_amount_cents,
  deposit_amount_cents,
  status,
  created_by
)
VALUES (
  '99999999-0000-0000-0000-000000000003'::uuid,
  '99999999-0000-0000-0000-000000000001'::uuid,
  '99999999-0000-0000-0000-000000000002'::uuid,
  'TEST: Immutability Event',
  '2026-03-01 18:00:00',
  10,
  'Test Location',
  100000,
  50000,
  'draft',
  '19999999-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_transitions (
  id,
  tenant_id,
  event_id,
  from_status,
  to_status,
  transitioned_by
)
VALUES (
  '99999999-0000-0000-0000-000000000004'::uuid,
  '99999999-0000-0000-0000-000000000001'::uuid,
  '99999999-0000-0000-0000-000000000003'::uuid,
  NULL,
  'draft',
  '19999999-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (id) DO NOTHING;

SELECT '=== TEST DATA CREATED ===' as status;

-- ============================================
-- TEST 1: Attempt to UPDATE ledger_entries (should FAIL)
-- ============================================

DO $$
BEGIN
  -- Try to update the test ledger entry
  UPDATE ledger_entries
  SET amount_cents = 99999
  WHERE id = '99999999-0000-0000-0000-000000000001'::uuid;

  -- If we get here, the trigger FAILED
  RAISE NOTICE 'TEST 1 FAIL ✗: UPDATE on ledger_entries succeeded (trigger not working!)';
EXCEPTION
  WHEN OTHERS THEN
    -- Expected: trigger should block UPDATE
    IF SQLERRM LIKE '%immutable%' THEN
      RAISE NOTICE 'TEST 1 PASS ✓: UPDATE on ledger_entries blocked by trigger';
    ELSE
      RAISE NOTICE 'TEST 1 FAIL ✗: Unexpected error: %', SQLERRM;
    END IF;
END $$;

-- ============================================
-- TEST 2: Attempt to DELETE ledger_entries (should FAIL)
-- ============================================

DO $$
BEGIN
  -- Try to delete the test ledger entry
  DELETE FROM ledger_entries
  WHERE id = '99999999-0000-0000-0000-000000000001'::uuid;

  -- If we get here, the trigger FAILED
  RAISE NOTICE 'TEST 2 FAIL ✗: DELETE on ledger_entries succeeded (trigger not working!)';
EXCEPTION
  WHEN OTHERS THEN
    -- Expected: trigger should block DELETE
    IF SQLERRM LIKE '%immutable%' THEN
      RAISE NOTICE 'TEST 2 PASS ✓: DELETE on ledger_entries blocked by trigger';
    ELSE
      RAISE NOTICE 'TEST 2 FAIL ✗: Unexpected error: %', SQLERRM;
    END IF;
END $$;

-- ============================================
-- TEST 3: Attempt to UPDATE event_transitions (should FAIL)
-- ============================================

DO $$
BEGIN
  -- Try to update the test transition
  UPDATE event_transitions
  SET to_status = 'completed'
  WHERE id = '99999999-0000-0000-0000-000000000004'::uuid;

  -- If we get here, the trigger FAILED
  RAISE NOTICE 'TEST 3 FAIL ✗: UPDATE on event_transitions succeeded (trigger not working!)';
EXCEPTION
  WHEN OTHERS THEN
    -- Expected: trigger should block UPDATE
    IF SQLERRM LIKE '%immutable%' THEN
      RAISE NOTICE 'TEST 3 PASS ✓: UPDATE on event_transitions blocked by trigger';
    ELSE
      RAISE NOTICE 'TEST 3 FAIL ✗: Unexpected error: %', SQLERRM;
    END IF;
END $$;

-- ============================================
-- TEST 4: Attempt to DELETE event_transitions (should FAIL)
-- ============================================

DO $$
BEGIN
  -- Try to delete the test transition
  DELETE FROM event_transitions
  WHERE id = '99999999-0000-0000-0000-000000000004'::uuid;

  -- If we get here, the trigger FAILED
  RAISE NOTICE 'TEST 4 FAIL ✗: DELETE on event_transitions succeeded (trigger not working!)';
EXCEPTION
  WHEN OTHERS THEN
    -- Expected: trigger should block DELETE
    IF SQLERRM LIKE '%immutable%' THEN
      RAISE NOTICE 'TEST 4 PASS ✓: DELETE on event_transitions blocked by trigger';
    ELSE
      RAISE NOTICE 'TEST 4 FAIL ✗: Unexpected error: %', SQLERRM;
    END IF;
END $$;

-- ============================================
-- TEST 5: Verify INSERTs still work (should SUCCEED)
-- ============================================

DO $$
DECLARE
  new_entry_id UUID;
BEGIN
  -- Try to insert a new ledger entry (should work)
  INSERT INTO ledger_entries (
    tenant_id,
    entry_type,
    amount_cents,
    description
  )
  VALUES (
    '99999999-0000-0000-0000-000000000001'::uuid,
    'adjustment',
    1000,
    'TEST: Verify INSERT works'
  )
  RETURNING id INTO new_entry_id;

  IF new_entry_id IS NOT NULL THEN
    RAISE NOTICE 'TEST 5 PASS ✓: INSERT on ledger_entries still works (append-only)';
  ELSE
    RAISE NOTICE 'TEST 5 FAIL ✗: INSERT on ledger_entries failed';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'TEST 5 FAIL ✗: INSERT on ledger_entries failed with error: %', SQLERRM;
END $$;

-- ============================================
-- SUMMARY
-- ============================================

SELECT
  '=== IMMUTABILITY VERIFICATION COMPLETE ===' as summary,
  'All UPDATE/DELETE tests should show PASS ✓' as expected_result,
  'Ledger and transitions are append-only' as confirmation;

-- Verify the original entry is unchanged
SELECT
  'Ledger Entry Verification' as test,
  CASE
    WHEN amount_cents = 50000 THEN 'PASS ✓: Original entry unchanged (amount still 50000)'
    ELSE 'FAIL ✗: Original entry was modified (amount is ' || amount_cents || ')'
  END as result
FROM ledger_entries
WHERE id = '99999999-0000-0000-0000-000000000001'::uuid;

-- ChefFlow V1 - STRICT Immutability Verification Script
-- Returns clear PASS/FAIL via exit code

-- ============================================
-- SETUP: Create test data
-- ============================================

DO $$
BEGIN
  -- Clean up existing test data
  DELETE FROM event_transitions WHERE tenant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
  DELETE FROM ledger_entries WHERE tenant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
  DELETE FROM events WHERE tenant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
  DELETE FROM clients WHERE tenant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
  DELETE FROM chefs WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
END $$;

-- Create test tenant
INSERT INTO chefs (id, auth_user_id, business_name, email)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'ffffffff-ffff-ffff-ffff-000000000001'::uuid, 'IMMUTABILITY_TEST: Chef', 'imm_test@example.com');

-- Create test client
INSERT INTO clients (id, auth_user_id, tenant_id, full_name, email)
VALUES ('ffffffff-ffff-ffff-ffff-000000000011'::uuid, 'ffffffff-ffff-ffff-ffff-000000000002'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'IMMUTABILITY_TEST: Client', 'imm_test_client@example.com');

-- Create test event
INSERT INTO events (id, tenant_id, client_id, title, event_date, guest_count, location, total_amount_cents, deposit_amount_cents, status, created_by)
VALUES ('ffffffff-ffff-ffff-ffff-111111111111'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'ffffffff-ffff-ffff-ffff-000000000011'::uuid,
        'IMMUTABILITY_TEST: Event', '2026-03-01 18:00:00', 10, 'Test Location', 100000, 50000, 'draft', 'ffffffff-ffff-ffff-ffff-000000000001'::uuid);

-- Create test ledger entry
INSERT INTO ledger_entries (id, tenant_id, entry_type, amount_cents, description)
VALUES ('ffffffff-ffff-ffff-ffff-222222222222'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'charge_succeeded', 50000, 'IMMUTABILITY_TEST: Ledger Entry');

-- Create test event transition
INSERT INTO event_transitions (id, tenant_id, event_id, from_status, to_status, transitioned_by)
VALUES ('ffffffff-ffff-ffff-ffff-333333333333'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'ffffffff-ffff-ffff-ffff-111111111111'::uuid,
        NULL, 'draft', 'ffffffff-ffff-ffff-ffff-000000000001'::uuid);

-- ============================================
-- VERIFICATION TESTS
-- ============================================

DO $$
DECLARE
  test_failures INT := 0;
  original_amount INT;
  new_entry_id UUID;
BEGIN

  -- TEST 1: Attempt UPDATE on ledger_entries (should FAIL)
  BEGIN
    UPDATE ledger_entries
    SET amount_cents = 99999
    WHERE id = 'ffffffff-ffff-ffff-ffff-222222222222'::uuid;

    -- If we reach here, trigger failed
    RAISE NOTICE 'TEST 1 FAIL ✗: UPDATE on ledger_entries succeeded (trigger not working)';
    test_failures := test_failures + 1;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%immutable%' THEN
        RAISE NOTICE 'TEST 1 PASS ✓: UPDATE on ledger_entries blocked by trigger';
      ELSE
        RAISE NOTICE 'TEST 1 FAIL ✗: Unexpected error: %', SQLERRM;
        test_failures := test_failures + 1;
      END IF;
  END;

  -- TEST 2: Attempt DELETE on ledger_entries (should FAIL)
  BEGIN
    DELETE FROM ledger_entries
    WHERE id = 'ffffffff-ffff-ffff-ffff-222222222222'::uuid;

    RAISE NOTICE 'TEST 2 FAIL ✗: DELETE on ledger_entries succeeded (trigger not working)';
    test_failures := test_failures + 1;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%immutable%' THEN
        RAISE NOTICE 'TEST 2 PASS ✓: DELETE on ledger_entries blocked by trigger';
      ELSE
        RAISE NOTICE 'TEST 2 FAIL ✗: Unexpected error: %', SQLERRM;
        test_failures := test_failures + 1;
      END IF;
  END;

  -- TEST 3: Attempt UPDATE on event_transitions (should FAIL)
  BEGIN
    UPDATE event_transitions
    SET to_status = 'completed'
    WHERE id = 'ffffffff-ffff-ffff-ffff-333333333333'::uuid;

    RAISE NOTICE 'TEST 3 FAIL ✗: UPDATE on event_transitions succeeded (trigger not working)';
    test_failures := test_failures + 1;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%immutable%' THEN
        RAISE NOTICE 'TEST 3 PASS ✓: UPDATE on event_transitions blocked by trigger';
      ELSE
        RAISE NOTICE 'TEST 3 FAIL ✗: Unexpected error: %', SQLERRM;
        test_failures := test_failures + 1;
      END IF;
  END;

  -- TEST 4: Attempt DELETE on event_transitions (should FAIL)
  BEGIN
    DELETE FROM event_transitions
    WHERE id = 'ffffffff-ffff-ffff-ffff-333333333333'::uuid;

    RAISE NOTICE 'TEST 4 FAIL ✗: DELETE on event_transitions succeeded (trigger not working)';
    test_failures := test_failures + 1;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%immutable%' THEN
        RAISE NOTICE 'TEST 4 PASS ✓: DELETE on event_transitions blocked by trigger';
      ELSE
        RAISE NOTICE 'TEST 4 FAIL ✗: Unexpected error: %', SQLERRM;
        test_failures := test_failures + 1;
      END IF;
  END;

  -- TEST 5: Verify INSERT still works (append-only)
  BEGIN
    INSERT INTO ledger_entries (tenant_id, entry_type, amount_cents, description)
    VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'adjustment', 1000, 'IMMUTABILITY_TEST: Verify INSERT works')
    RETURNING id INTO new_entry_id;

    IF new_entry_id IS NOT NULL THEN
      RAISE NOTICE 'TEST 5 PASS ✓: INSERT on ledger_entries still works (append-only)';
    ELSE
      RAISE NOTICE 'TEST 5 FAIL ✗: INSERT returned NULL';
      test_failures := test_failures + 1;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'TEST 5 FAIL ✗: INSERT failed with error: %', SQLERRM;
      test_failures := test_failures + 1;
  END;

  -- TEST 6: Verify original entry unchanged
  SELECT amount_cents INTO original_amount
  FROM ledger_entries
  WHERE id = 'ffffffff-ffff-ffff-ffff-222222222222'::uuid;

  IF original_amount = 50000 THEN
    RAISE NOTICE 'TEST 6 PASS ✓: Original ledger entry unchanged (amount still 50000)';
  ELSE
    RAISE NOTICE 'TEST 6 FAIL ✗: Original entry modified (amount is %)', original_amount;
    test_failures := test_failures + 1;
  END IF;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '=== IMMUTABILITY VERIFICATION SUMMARY ===';

  IF test_failures = 0 THEN
    RAISE NOTICE 'ALL TESTS PASSED ✓ (Ledger and transitions are immutable)';
  ELSE
    RAISE NOTICE 'TESTS FAILED: % failures detected ✗', test_failures;
    RAISE EXCEPTION 'Immutability verification failed - AUDIT TRAIL COMPROMISED';
  END IF;
END $$;

-- Final status query
SELECT
  CASE
    WHEN amount_cents = 50000 THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as immutability_verification_status
FROM ledger_entries
WHERE id = 'ffffffff-ffff-ffff-ffff-222222222222'::uuid;

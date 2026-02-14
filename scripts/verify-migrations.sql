-- ChefFlow V1 - Migration Verification Script
-- Run this in Supabase SQL Editor to verify migrations apply cleanly

-- ============================================
-- STEP 1: Verify all tables exist
-- ============================================

SELECT
  'Tables Check' as test,
  CASE
    WHEN COUNT(*) = 9 THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Expected 9 tables, got ' || COUNT(*)::text
  END as result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'chefs', 'clients', 'user_roles', 'client_invitations',
    'events', 'event_transitions', 'ledger_entries',
    'menus', 'event_menus'
  );

-- ============================================
-- STEP 2: Verify RLS is enabled on all tables
-- ============================================

SELECT
  'RLS Enabled Check' as test,
  CASE
    WHEN COUNT(*) = 9 THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Tables without RLS: ' || string_agg(tablename, ', ')
  END as result
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'chefs', 'clients', 'user_roles', 'client_invitations',
    'events', 'event_transitions', 'ledger_entries',
    'menus', 'event_menus'
  )
  AND rowsecurity = false;

-- ============================================
-- STEP 3: Verify enums exist
-- ============================================

SELECT
  'Enums Check' as test,
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Expected 3 enums, got ' || COUNT(*)::text
  END as result
FROM pg_type
WHERE typname IN ('user_role', 'event_status', 'ledger_entry_type');

-- ============================================
-- STEP 4: Verify helper functions exist
-- ============================================

SELECT
  'Helper Functions Check' as test,
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Expected 3 functions, got ' || COUNT(*)::text
  END as result
FROM pg_proc
WHERE proname IN (
  'get_current_user_role',
  'get_current_tenant_id',
  'get_current_client_id'
);

-- ============================================
-- STEP 5: Verify immutability triggers exist
-- ============================================

SELECT
  'Immutability Triggers Check' as test,
  CASE
    WHEN COUNT(*) = 4 THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Expected 4 triggers, got ' || COUNT(*)::text
  END as result
FROM pg_trigger
WHERE tgname IN (
  'ledger_immutable_update',
  'ledger_immutable_delete',
  'transitions_immutable_update',
  'transitions_immutable_delete'
);

-- ============================================
-- STEP 6: Verify view exists
-- ============================================

SELECT
  'Views Check' as test,
  CASE
    WHEN COUNT(*) >= 1 THEN 'PASS ✓'
    ELSE 'FAIL ✗ - event_financial_summary view not found'
  END as result
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'event_financial_summary';

-- ============================================
-- SUMMARY
-- ============================================

SELECT
  '=== MIGRATION VERIFICATION COMPLETE ===' as summary,
  'All checks above should show PASS ✓' as instruction;

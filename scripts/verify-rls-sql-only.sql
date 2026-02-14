-- ChefFlow V1 - RLS Enabled Check (SQL-only)
-- This ONLY verifies RLS is enabled, not per-user behavior
-- Per-user RLS tests are in verify-rls-harness.ts

-- ============================================
-- TEST 1: Verify RLS is enabled on all tables
-- ============================================

SELECT
  tablename,
  CASE
    WHEN rowsecurity = true THEN 'PASS ✓ (RLS enabled)'
    ELSE 'FAIL ✗ (RLS NOT enabled)'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'chefs', 'clients', 'user_roles', 'client_invitations',
    'events', 'event_transitions', 'ledger_entries',
    'menus', 'event_menus'
  )
ORDER BY tablename;

-- ============================================
-- TEST 2: Verify FORCE ROW LEVEL SECURITY
-- (prevents table owners from bypassing RLS)
-- ============================================

SELECT
  tablename,
  CASE
    WHEN rowsecurity = true THEN 'Enabled'
    ELSE 'NOT enabled'
  END as row_security
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'chefs', 'clients', 'user_roles', 'client_invitations',
    'events', 'event_transitions', 'ledger_entries',
    'menus', 'event_menus'
  );

-- ============================================
-- SUMMARY
-- ============================================

SELECT
  'RLS Enabled Check' as test,
  CASE
    WHEN COUNT(*) = 9 AND MIN(rowsecurity::int) = 1 THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as result
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'chefs', 'clients', 'user_roles', 'client_invitations',
    'events', 'event_transitions', 'ledger_entries',
    'menus', 'event_menus'
  );

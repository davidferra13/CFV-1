-- ============================================
-- FIX: Events RLS Infinite Recursion
-- ============================================
-- Root cause: Two RLS policies form a cycle:
--
--   event_owner_manages_collaborators (on event_collaborators)
--     → queries events table
--   collaborators_can_view_events (on events)
--     → queries event_collaborators table
--
-- PostgreSQL detects this as infinite recursion (code 42P17) and
-- aborts every query against events, including all dashboard stats,
-- event lists, financials, and the client portal.
--
-- Fix: Replace the subquery in event_owner_manages_collaborators
-- with a SECURITY DEFINER function. SECURITY DEFINER bypasses RLS
-- on the events table during the ownership check, breaking the cycle.
--
-- No data changes. No schema changes. Policy logic is identical.
-- ============================================

-- ─── Helper function (bypasses RLS to check ownership) ───────────

CREATE OR REPLACE FUNCTION is_event_owner(p_event_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM events e
    JOIN chefs c ON c.id = e.tenant_id
    WHERE e.id = p_event_id
      AND c.auth_user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION is_event_owner(UUID) IS
  'Returns true if the currently authenticated user owns the given event. '
  'Uses SECURITY DEFINER to bypass events RLS and prevent the infinite '
  'recursion that arises from event_owner_manages_collaborators checking '
  'events while collaborators_can_view_events checks event_collaborators.';

GRANT EXECUTE ON FUNCTION is_event_owner(UUID) TO authenticated;

-- ─── Recreate the offending policy using the definer function ─────

DROP POLICY IF EXISTS "event_owner_manages_collaborators" ON event_collaborators;

CREATE POLICY "event_owner_manages_collaborators"
  ON event_collaborators
  FOR ALL
  USING (is_event_owner(event_id));

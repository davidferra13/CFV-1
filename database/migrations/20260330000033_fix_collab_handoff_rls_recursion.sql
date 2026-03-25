-- ============================================
-- FIX: Collaboration handoff RLS infinite recursion
-- ============================================
-- Root cause:
--   handoffs_select on chef_handoffs queries chef_handoff_recipients
--   handoff_recipients_* policies query chef_handoffs
-- PostgreSQL detects the cycle and aborts with 42P17.
--
-- Fix:
--   Move cross-table ownership/participation checks into SECURITY DEFINER
--   helper functions so the policy checks bypass RLS while preserving the
--   same authorization semantics for authenticated chefs.
-- ============================================

CREATE OR REPLACE FUNCTION current_chef_owns_handoff(p_handoff_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    get_current_user_role() = 'chef'
    AND EXISTS (
      SELECT 1
      FROM chef_handoffs h
      WHERE h.id = p_handoff_id
        AND h.from_chef_id = get_current_tenant_id()
    );
$$;
CREATE OR REPLACE FUNCTION current_chef_is_handoff_recipient(p_handoff_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    get_current_user_role() = 'chef'
    AND EXISTS (
      SELECT 1
      FROM chef_handoff_recipients r
      WHERE r.handoff_id = p_handoff_id
        AND r.recipient_chef_id = get_current_tenant_id()
    );
$$;
COMMENT ON FUNCTION current_chef_owns_handoff(UUID) IS
  'Returns true when the current authenticated chef authored the given collaboration handoff. Uses SECURITY DEFINER to avoid recursive RLS checks.';
COMMENT ON FUNCTION current_chef_is_handoff_recipient(UUID) IS
  'Returns true when the current authenticated chef is a recipient of the given collaboration handoff. Uses SECURITY DEFINER to avoid recursive RLS checks.';
GRANT EXECUTE ON FUNCTION current_chef_owns_handoff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION current_chef_is_handoff_recipient(UUID) TO authenticated;
DROP POLICY IF EXISTS handoffs_select ON chef_handoffs;
CREATE POLICY handoffs_select ON chef_handoffs
  FOR SELECT TO authenticated
  USING (
    from_chef_id = get_current_tenant_id()
    OR current_chef_is_handoff_recipient(id)
  );
DROP POLICY IF EXISTS handoff_recipients_select ON chef_handoff_recipients;
CREATE POLICY handoff_recipients_select ON chef_handoff_recipients
  FOR SELECT TO authenticated
  USING (
    recipient_chef_id = get_current_tenant_id()
    OR current_chef_owns_handoff(handoff_id)
  );
DROP POLICY IF EXISTS handoff_recipients_insert ON chef_handoff_recipients;
CREATE POLICY handoff_recipients_insert ON chef_handoff_recipients
  FOR INSERT TO authenticated
  WITH CHECK (current_chef_owns_handoff(handoff_id));
DROP POLICY IF EXISTS handoff_recipients_update ON chef_handoff_recipients;
CREATE POLICY handoff_recipients_update ON chef_handoff_recipients
  FOR UPDATE TO authenticated
  USING (
    recipient_chef_id = get_current_tenant_id()
    OR current_chef_owns_handoff(handoff_id)
  )
  WITH CHECK (
    recipient_chef_id = get_current_tenant_id()
    OR current_chef_owns_handoff(handoff_id)
  );
DROP POLICY IF EXISTS handoff_recipients_delete ON chef_handoff_recipients;
CREATE POLICY handoff_recipients_delete ON chef_handoff_recipients
  FOR DELETE TO authenticated
  USING (current_chef_owns_handoff(handoff_id));
DROP POLICY IF EXISTS handoff_events_select ON chef_handoff_events;
CREATE POLICY handoff_events_select ON chef_handoff_events
  FOR SELECT TO authenticated
  USING (
    current_chef_owns_handoff(handoff_id)
    OR current_chef_is_handoff_recipient(handoff_id)
  );
DROP POLICY IF EXISTS handoff_events_insert ON chef_handoff_events;
CREATE POLICY handoff_events_insert ON chef_handoff_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_chef_id = get_current_tenant_id()
    AND (
      current_chef_owns_handoff(handoff_id)
      OR current_chef_is_handoff_recipient(handoff_id)
    )
  );

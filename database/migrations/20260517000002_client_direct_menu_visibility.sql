-- Client can view menus assigned directly to them via client_id
-- (without requiring an event join). Defense-in-depth RLS policy.

DROP POLICY IF EXISTS "client_can_view_direct_assigned_menu" ON menus;

CREATE POLICY "client_can_view_direct_assigned_menu" ON menus
  FOR SELECT
  USING (
    get_current_user_role() = 'client'
    AND client_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );

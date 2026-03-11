-- CRITICAL FIX: chef_social_notifications SELECT policy uses USING (TRUE)
-- which means ANY authenticated chef can read ANY other chef's notifications.
-- This leaks relationship/interaction data across tenants.
--
-- Fix: Restrict SELECT to only the recipient chef's own notifications.

DROP POLICY IF EXISTS "csp_notifs_self" ON chef_social_notifications;
CREATE POLICY "csp_notifs_self" ON chef_social_notifications
  FOR SELECT TO authenticated
  USING (
    recipient_chef_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

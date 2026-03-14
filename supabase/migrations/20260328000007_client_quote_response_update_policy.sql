-- Allow clients to respond to their own pending quotes.
-- This restores DB-level enforcement for client quote acceptance/rejection flows.

DROP POLICY IF EXISTS quotes_client_can_update_own_pending ON quotes;

CREATE POLICY quotes_client_can_update_own_pending ON quotes
  FOR UPDATE
  USING (
    get_current_user_role() = 'client'
    AND client_id = get_current_client_id()
    AND status = 'sent'
  )
  WITH CHECK (
    get_current_user_role() = 'client'
    AND client_id = get_current_client_id()
    AND status IN ('accepted', 'rejected')
  );

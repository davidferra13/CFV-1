-- Add stable client linkage to feedback requests.
-- Backward compatible: legacy rows can remain null and continue to use name/email fallback logic.

ALTER TABLE feedback_requests
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_requests_client_id
  ON feedback_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_tenant_client_id
  ON feedback_requests(tenant_id, client_id);
COMMENT ON COLUMN feedback_requests.client_id IS
  'Stable link to clients.id when the feedback request can be tied to a known client.';

-- Event Readiness Assistant persistent suggestion dismissals.
-- Scoped per chef and event; advisory only and does not affect readiness scoring.

CREATE TABLE IF NOT EXISTS event_readiness_suggestion_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  suggestion_id TEXT NOT NULL,
  dismissed_by UUID NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_id, suggestion_id)
);

CREATE INDEX IF NOT EXISTS idx_event_readiness_dismissals_event
  ON event_readiness_suggestion_dismissals(tenant_id, event_id);

CREATE INDEX IF NOT EXISTS idx_event_readiness_dismissals_suggestion
  ON event_readiness_suggestion_dismissals(tenant_id, event_id, suggestion_id);

ALTER TABLE event_readiness_suggestion_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_readiness_dismissals_chef_select
  ON event_readiness_suggestion_dismissals;
CREATE POLICY event_readiness_dismissals_chef_select
  ON event_readiness_suggestion_dismissals
  FOR SELECT
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS event_readiness_dismissals_chef_insert
  ON event_readiness_suggestion_dismissals;
CREATE POLICY event_readiness_dismissals_chef_insert
  ON event_readiness_suggestion_dismissals
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS event_readiness_dismissals_chef_update
  ON event_readiness_suggestion_dismissals;
CREATE POLICY event_readiness_dismissals_chef_update
  ON event_readiness_suggestion_dismissals
  FOR UPDATE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id())
  WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS event_readiness_dismissals_chef_delete
  ON event_readiness_suggestion_dismissals;
CREATE POLICY event_readiness_dismissals_chef_delete
  ON event_readiness_suggestion_dismissals
  FOR DELETE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

COMMENT ON TABLE event_readiness_suggestion_dismissals IS
  'Per-chef, per-event dismissed Event Readiness Assistant suggestion IDs.';
COMMENT ON COLUMN event_readiness_suggestion_dismissals.suggestion_id IS
  'Stable assistant suggestion identifier. A changed suggestion ID makes the suggestion visible again.';

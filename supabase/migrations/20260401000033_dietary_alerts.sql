-- ============================================
-- DIETARY CHANGE LOG & TREND ALERTS
-- ============================================
-- Tracks dietary info changes per client so chefs
-- can see alerts and spot trends across their client base.
--
-- FULLY ADDITIVE: No drops, no column modifications, no data at risk.
-- ============================================

CREATE TABLE dietary_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- What changed
  change_type TEXT NOT NULL CHECK (change_type IN (
    'allergy_added', 'allergy_removed',
    'restriction_added', 'restriction_removed',
    'preference_updated', 'note_updated'
  )),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,

  -- Severity: critical (allergens), warning (restrictions), info (preferences)
  severity TEXT CHECK (severity IN ('critical', 'warning', 'info')),

  acknowledged BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dietary_change_log IS
  'Audit log of dietary info changes per client. Enables alerts and trend analysis for chefs.';

-- Primary lookup: unacknowledged alerts for a chef, newest first
CREATE INDEX idx_dietary_change_log_chef_ack
  ON dietary_change_log (chef_id, acknowledged, created_at DESC);

-- Trend queries: recent changes by type
CREATE INDEX idx_dietary_change_log_chef_type
  ON dietary_change_log (chef_id, change_type, created_at DESC);

-- Client timeline
CREATE INDEX idx_dietary_change_log_client
  ON dietary_change_log (client_id, created_at DESC);

-- ─── RLS ──────────────────────────────────────

ALTER TABLE dietary_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY dietary_change_log_chef_select ON dietary_change_log
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY dietary_change_log_chef_insert ON dietary_change_log
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY dietary_change_log_chef_update ON dietary_change_log
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

CREATE POLICY dietary_change_log_chef_delete ON dietary_change_log
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

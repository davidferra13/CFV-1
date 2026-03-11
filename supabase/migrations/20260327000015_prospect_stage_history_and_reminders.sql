-- Prospect Stage History & Follow-Up Reminders
-- Tracks when prospects enter/exit pipeline stages for conversion funnel analytics.
-- Also adds linking column for follow-up → chef_todos integration.

-- Stage history table: records every pipeline stage transition
CREATE TABLE IF NOT EXISTS prospect_stage_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  UUID        NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  chef_id      UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  from_stage   TEXT,
  to_stage     TEXT        NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes        TEXT
);
CREATE INDEX prospect_stage_history_prospect_idx
  ON prospect_stage_history (prospect_id, changed_at DESC);
CREATE INDEX prospect_stage_history_chef_idx
  ON prospect_stage_history (chef_id, to_stage, changed_at DESC);
ALTER TABLE prospect_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_history_select" ON prospect_stage_history
  FOR SELECT USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "stage_history_insert" ON prospect_stage_history
  FOR INSERT WITH CHECK (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Remy Action Audit Log
-- Immutable-enough execution trail for every Remy-approved action.
-- Goal: every physical action executed on behalf of a chef is recorded server-side.

CREATE TABLE IF NOT EXISTS remy_action_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL,
  task_type text NOT NULL,
  source text NOT NULL DEFAULT 'remy.approve_task',
  status text NOT NULL CHECK (status IN ('started', 'success', 'error', 'blocked')),
  request_payload jsonb,
  result_payload jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_remy_action_audit_log_tenant_created
  ON remy_action_audit_log (tenant_id, created_at DESC);

CREATE INDEX idx_remy_action_audit_log_tenant_status_created
  ON remy_action_audit_log (tenant_id, status, created_at DESC);

CREATE INDEX idx_remy_action_audit_log_tenant_task_type
  ON remy_action_audit_log (tenant_id, task_type, created_at DESC);

ALTER TABLE remy_action_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY remy_action_audit_log_select
  ON remy_action_audit_log FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

CREATE POLICY remy_action_audit_log_insert
  ON remy_action_audit_log FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

CREATE POLICY remy_action_audit_log_update
  ON remy_action_audit_log FOR UPDATE
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- No delete policy: audit rows should not be removed through app-level access.

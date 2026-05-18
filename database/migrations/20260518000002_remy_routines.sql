-- Remy Routines Foundation
-- Deterministic tenant-scoped routine data, match audit, execution idempotency, and action events.
-- Migration only. Do not run drizzle push for this change.

CREATE TABLE IF NOT EXISTS remy_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  trigger_type text NOT NULL
    CHECK (trigger_type IN ('signal', 'event', 'schedule', 'manual', 'webhook')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  condition_group jsonb NOT NULL DEFAULT '{"mode":"all","conditions":[]}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority integer NOT NULL DEFAULT 0 CHECK (priority BETWEEN -1000 AND 1000),
  approval_required boolean NOT NULL DEFAULT false,
  idempotency_window_seconds integer NOT NULL DEFAULT 86400
    CHECK (idempotency_window_seconds BETWEEN 60 AND 2592000),
  created_by_auth_user_id uuid,
  updated_by_auth_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remy_routines_tenant_status_trigger
  ON remy_routines (tenant_id, status, trigger_type, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_remy_routines_tenant_updated
  ON remy_routines (tenant_id, updated_at DESC);

DROP TRIGGER IF EXISTS set_remy_routines_updated_at ON remy_routines;
CREATE TRIGGER set_remy_routines_updated_at
  BEFORE UPDATE ON remy_routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE remy_routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remy_routines_tenant_select ON remy_routines;
CREATE POLICY remy_routines_tenant_select
  ON remy_routines FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routines_tenant_insert ON remy_routines;
CREATE POLICY remy_routines_tenant_insert
  ON remy_routines FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routines_tenant_update ON remy_routines;
CREATE POLICY remy_routines_tenant_update
  ON remy_routines FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routines_tenant_delete ON remy_routines;
CREATE POLICY remy_routines_tenant_delete
  ON remy_routines FOR DELETE
  USING (tenant_id = get_current_tenant_id());

CREATE TABLE IF NOT EXISTS remy_routine_match_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  routine_id uuid REFERENCES remy_routines(id) ON DELETE SET NULL,
  auth_user_id uuid,
  trigger_type text NOT NULL
    CHECK (trigger_type IN ('signal', 'event', 'schedule', 'manual', 'webhook')),
  trigger_source text NOT NULL,
  trigger_key text,
  matched boolean NOT NULL,
  reason text NOT NULL,
  condition_results jsonb,
  trigger_context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remy_routine_match_audit_tenant_created
  ON remy_routine_match_audit (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remy_routine_match_audit_routine_created
  ON remy_routine_match_audit (tenant_id, routine_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remy_routine_match_audit_trigger
  ON remy_routine_match_audit (tenant_id, trigger_type, trigger_source, created_at DESC);

ALTER TABLE remy_routine_match_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remy_routine_match_audit_select ON remy_routine_match_audit;
CREATE POLICY remy_routine_match_audit_select
  ON remy_routine_match_audit FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routine_match_audit_insert ON remy_routine_match_audit;
CREATE POLICY remy_routine_match_audit_insert
  ON remy_routine_match_audit FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE TABLE IF NOT EXISTS remy_routine_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES remy_routines(id) ON DELETE CASCADE,
  match_audit_id uuid REFERENCES remy_routine_match_audit(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('approval_required', 'running', 'success', 'error', 'skipped', 'blocked')),
  action_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_payload jsonb,
  error_message text,
  requested_by_auth_user_id uuid,
  approved_by_auth_user_id uuid,
  approved_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, routine_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_remy_routine_executions_tenant_created
  ON remy_routine_executions (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remy_routine_executions_status
  ON remy_routine_executions (tenant_id, status, created_at DESC);

DROP TRIGGER IF EXISTS set_remy_routine_executions_updated_at ON remy_routine_executions;
CREATE TRIGGER set_remy_routine_executions_updated_at
  BEFORE UPDATE ON remy_routine_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE remy_routine_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remy_routine_executions_select ON remy_routine_executions;
CREATE POLICY remy_routine_executions_select
  ON remy_routine_executions FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routine_executions_insert ON remy_routine_executions;
CREATE POLICY remy_routine_executions_insert
  ON remy_routine_executions FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routine_executions_update ON remy_routine_executions;
CREATE POLICY remy_routine_executions_update
  ON remy_routine_executions FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE TABLE IF NOT EXISTS remy_routine_execution_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  routine_id uuid REFERENCES remy_routines(id) ON DELETE SET NULL,
  execution_id uuid REFERENCES remy_routine_executions(id) ON DELETE SET NULL,
  auth_user_id uuid,
  status text NOT NULL
    CHECK (status IN ('approval_required', 'running', 'success', 'error', 'skipped', 'blocked')),
  request_payload jsonb,
  result_payload jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remy_routine_execution_audit_tenant_created
  ON remy_routine_execution_audit (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remy_routine_execution_audit_execution
  ON remy_routine_execution_audit (tenant_id, execution_id, created_at DESC);

ALTER TABLE remy_routine_execution_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remy_routine_execution_audit_select ON remy_routine_execution_audit;
CREATE POLICY remy_routine_execution_audit_select
  ON remy_routine_execution_audit FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routine_execution_audit_insert ON remy_routine_execution_audit;
CREATE POLICY remy_routine_execution_audit_insert
  ON remy_routine_execution_audit FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routine_execution_audit_update ON remy_routine_execution_audit;
CREATE POLICY remy_routine_execution_audit_update
  ON remy_routine_execution_audit FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE TABLE IF NOT EXISTS remy_routine_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES remy_routines(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES remy_routine_executions(id) ON DELETE CASCADE,
  action_id text NOT NULL,
  action_kind text NOT NULL
    CHECK (action_kind IN ('record_routine_event', 'queue_review', 'create_notification_draft', 'create_task_draft')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remy_routine_action_events_tenant_created
  ON remy_routine_action_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remy_routine_action_events_execution
  ON remy_routine_action_events (tenant_id, execution_id, created_at ASC);

ALTER TABLE remy_routine_action_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remy_routine_action_events_select ON remy_routine_action_events;
CREATE POLICY remy_routine_action_events_select
  ON remy_routine_action_events FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS remy_routine_action_events_insert ON remy_routine_action_events;
CREATE POLICY remy_routine_action_events_insert
  ON remy_routine_action_events FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

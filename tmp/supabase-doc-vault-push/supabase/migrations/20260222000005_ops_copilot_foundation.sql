-- ============================================================================
-- Ops Copilot Foundation
-- Run logging + recommendation + action audit tables.
-- This migration only defines persistence primitives. It does not execute logic.
-- ============================================================================

CREATE TABLE IF NOT EXISTS copilot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  run_source TEXT NOT NULL DEFAULT 'scheduled' CHECK (run_source IN ('scheduled', 'manual')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  autonomy_level INTEGER NOT NULL DEFAULT 0 CHECK (autonomy_level IN (0, 1, 2)),
  plan_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);
CREATE TABLE IF NOT EXISTS copilot_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES copilot_runs(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT NOT NULL DEFAULT 'normal' CHECK (severity IN ('critical', 'high', 'normal', 'low')),
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed', 'executed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS copilot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  run_id UUID REFERENCES copilot_runs(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES copilot_recommendations(id) ON DELETE SET NULL,
  action_key TEXT NOT NULL,
  action_mode TEXT NOT NULL CHECK (action_mode IN ('suggested', 'manual_execute', 'auto_execute')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  actor_auth_user_id UUID REFERENCES auth.users(id),
  idempotency_key TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS copilot_run_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES copilot_runs(id) ON DELETE CASCADE,
  error_scope TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_copilot_actions_idempotency
  ON copilot_actions(tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_runs_tenant_started
  ON copilot_runs(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_recommendations_tenant_status
  ON copilot_recommendations(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_actions_tenant_executed
  ON copilot_actions(tenant_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_run_errors_tenant_created
  ON copilot_run_errors(tenant_id, created_at DESC);
ALTER TABLE copilot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_run_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs manage own copilot runs"
  ON copilot_runs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "Chefs manage own copilot recommendations"
  ON copilot_recommendations
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "Chefs manage own copilot actions"
  ON copilot_actions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "Chefs read own copilot run errors"
  ON copilot_run_errors
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY "Service role manages copilot runs"
  ON copilot_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages copilot recommendations"
  ON copilot_recommendations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages copilot actions"
  ON copilot_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages copilot run errors"
  ON copilot_run_errors
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

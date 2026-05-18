-- Autonomy Engine Core
-- Additive migration only. No drops, no renames, no data loss.
-- Supports the deterministic detect, draft, approve, execute, learn loop.

CREATE TABLE IF NOT EXISTS autonomy_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  default_mode TEXT NOT NULL DEFAULT 'approval'
    CHECK (default_mode IN ('auto', 'approval', 'manual')),
  min_auto_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.850
    CHECK (min_auto_confidence >= 0 AND min_auto_confidence <= 1),
  domain_modes JSONB NOT NULL DEFAULT '{}',
  action_policies JSONB NOT NULL DEFAULT '[]',
  blocked_action_types TEXT[] NOT NULL DEFAULT '{}',
  allow_high_risk_auto BOOLEAN NOT NULL DEFAULT false,
  learning_promotion_threshold INTEGER NOT NULL DEFAULT 10
    CHECK (learning_promotion_threshold > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_autonomy_preferences_tenant
  ON autonomy_preferences(tenant_id);

CREATE TABLE IF NOT EXISTS autonomy_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  risk_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high', 'restricted')),
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  draft_method TEXT NOT NULL DEFAULT 'template'
    CHECK (draft_method IN ('template', 'formula', 'ai-enhanced')),
  draft JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL,
  situation JSONB NOT NULL DEFAULT '{}',
  entity_refs JSONB NOT NULL DEFAULT '[]',
  dedup_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'drafted'
    CHECK (
      status IN (
        'drafted',
        'queued',
        'approved',
        'rejected',
        'executed',
        'failed',
        'blocked',
        'awaiting_executor'
      )
    ),
  approval_decision TEXT,
  approval_reason TEXT,
  error_message TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autonomy_actions_tenant_status
  ON autonomy_actions(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomy_actions_tenant_domain
  ON autonomy_actions(tenant_id, domain, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomy_actions_dedup
  ON autonomy_actions(tenant_id, dedup_key, created_at DESC);

CREATE TABLE IF NOT EXISTS approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  autonomy_action_id UUID NOT NULL REFERENCES autonomy_actions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  domain TEXT NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  draft JSONB NOT NULL DEFAULT '{}',
  risk_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high', 'restricted')),
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reason TEXT NOT NULL DEFAULT '',
  entity_refs JSONB NOT NULL DEFAULT '[]',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_queue_tenant_status
  ON approval_queue(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_queue_action
  ON approval_queue(autonomy_action_id);

CREATE INDEX IF NOT EXISTS idx_approval_queue_reviewed
  ON approval_queue(tenant_id, reviewed_at DESC)
  WHERE reviewed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS learning_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  autonomy_action_id UUID REFERENCES autonomy_actions(id) ON DELETE SET NULL,
  approval_queue_id UUID REFERENCES approval_queue(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  action_type TEXT NOT NULL,
  outcome TEXT NOT NULL
    CHECK (
      outcome IN (
        'approved',
        'approved_with_edits',
        'rejected',
        'auto_executed',
        'failed',
        'promotion_suggested'
      )
    ),
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  edited_fields TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_signals_tenant_action
  ON learning_signals(tenant_id, domain, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_signals_tenant_outcome
  ON learning_signals(tenant_id, outcome, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_autonomy_preferences_updated_at'
  ) THEN
    CREATE TRIGGER trg_autonomy_preferences_updated_at
      BEFORE UPDATE ON autonomy_preferences
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_autonomy_actions_updated_at'
  ) THEN
    CREATE TRIGGER trg_autonomy_actions_updated_at
      BEFORE UPDATE ON autonomy_actions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_approval_queue_updated_at'
  ) THEN
    CREATE TRIGGER trg_approval_queue_updated_at
      BEFORE UPDATE ON approval_queue
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE autonomy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomy_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_signals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'autonomy_preferences'
      AND policyname = 'autonomy_preferences_tenant_select'
  ) THEN
    CREATE POLICY autonomy_preferences_tenant_select ON autonomy_preferences
      FOR SELECT USING (tenant_id = get_current_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'autonomy_preferences'
      AND policyname = 'autonomy_preferences_tenant_insert'
  ) THEN
    CREATE POLICY autonomy_preferences_tenant_insert ON autonomy_preferences
      FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'autonomy_preferences'
      AND policyname = 'autonomy_preferences_tenant_update'
  ) THEN
    CREATE POLICY autonomy_preferences_tenant_update ON autonomy_preferences
      FOR UPDATE USING (tenant_id = get_current_tenant_id())
      WITH CHECK (tenant_id = get_current_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'autonomy_actions'
      AND policyname = 'autonomy_actions_tenant_all'
  ) THEN
    CREATE POLICY autonomy_actions_tenant_all ON autonomy_actions
      FOR ALL USING (tenant_id = get_current_tenant_id())
      WITH CHECK (tenant_id = get_current_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'approval_queue'
      AND policyname = 'approval_queue_tenant_all'
  ) THEN
    CREATE POLICY approval_queue_tenant_all ON approval_queue
      FOR ALL USING (tenant_id = get_current_tenant_id())
      WITH CHECK (tenant_id = get_current_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'learning_signals'
      AND policyname = 'learning_signals_tenant_all'
  ) THEN
    CREATE POLICY learning_signals_tenant_all ON learning_signals
      FOR ALL USING (tenant_id = get_current_tenant_id())
      WITH CHECK (tenant_id = get_current_tenant_id());
  END IF;
END $$;

COMMENT ON TABLE autonomy_preferences IS 'Per-chef autonomy settings for deterministic action routing.';
COMMENT ON TABLE autonomy_actions IS 'Detected and drafted autonomy actions before routing, execution, and learning.';
COMMENT ON TABLE approval_queue IS 'Chef approval gate for autonomy actions that cannot safely auto-execute.';
COMMENT ON TABLE learning_signals IS 'Approval, rejection, edit, and execution outcomes used for crystallization suggestions.';

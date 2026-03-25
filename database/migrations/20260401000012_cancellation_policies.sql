-- Cancellation Policy Enforcement
-- Tiered cancellation fees with automatic calculation.
-- Each chef can define their own cancellation policy with customizable tiers
-- and a grace period for full refunds after booking.

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name                TEXT NOT NULL DEFAULT 'Standard Policy',
  is_default          BOOLEAN NOT NULL DEFAULT true,

  -- JSONB array of tier objects:
  -- { min_days: number, max_days: number|null, refund_percent: number, label: string }
  -- Sorted by min_days descending. max_days=null means "or more".
  tiers               JSONB NOT NULL DEFAULT '[
    {"min_days":30,"max_days":null,"refund_percent":100,"label":"30+ days"},
    {"min_days":14,"max_days":29,"refund_percent":50,"label":"14-29 days"},
    {"min_days":0,"max_days":13,"refund_percent":0,"label":"Less than 14 days"}
  ]'::jsonb,

  -- Full refund within this many hours of booking, regardless of tier
  grace_period_hours  INTEGER NOT NULL DEFAULT 48,

  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_policies_chef
  ON cancellation_policies(chef_id);

CREATE INDEX IF NOT EXISTS idx_cancellation_policies_default
  ON cancellation_policies(chef_id, is_default) WHERE is_default = true;

COMMENT ON TABLE cancellation_policies
  IS 'Chef-defined cancellation policies with tiered refund percentages and grace periods.';

COMMENT ON COLUMN cancellation_policies.tiers
  IS 'JSON array of cancellation tiers. Each tier: {min_days, max_days, refund_percent, label}. max_days=null means unlimited.';

COMMENT ON COLUMN cancellation_policies.grace_period_hours
  IS 'Hours after booking during which client gets full refund regardless of tier.';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_cancellation_policies_updated_at ON cancellation_policies;
CREATE TRIGGER trg_cancellation_policies_updated_at
  BEFORE UPDATE ON cancellation_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one default policy per chef
CREATE UNIQUE INDEX IF NOT EXISTS idx_cancellation_policies_one_default
  ON cancellation_policies(chef_id) WHERE is_default = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS cp_chef_select ON cancellation_policies;
  CREATE POLICY cp_chef_select ON cancellation_policies FOR SELECT
    USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS cp_chef_insert ON cancellation_policies;
  CREATE POLICY cp_chef_insert ON cancellation_policies FOR INSERT
    WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS cp_chef_update ON cancellation_policies;
  CREATE POLICY cp_chef_update ON cancellation_policies FOR UPDATE
    USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS cp_chef_delete ON cancellation_policies;
  CREATE POLICY cp_chef_delete ON cancellation_policies FOR DELETE
    USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Preset Automation Rules
-- Config-driven toggle rules: "When X happens, do Y."
-- Chefs enable/disable via settings page with configurable thresholds.
-- Additive only. No drops.
-- ============================================================================

CREATE TABLE IF NOT EXISTS preset_automation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Rule identity (matches PresetRuleType enum)
  rule_type       TEXT NOT NULL,

  -- Toggle
  enabled         BOOLEAN NOT NULL DEFAULT false,

  -- Configurable thresholds (delay hours, staleness days, etc.)
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Execution tracking
  last_triggered_at TIMESTAMPTZ,
  total_triggers    INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per rule type per chef
  UNIQUE (tenant_id, rule_type)
);

CREATE INDEX idx_preset_rules_tenant ON preset_automation_rules(tenant_id);
CREATE INDEX idx_preset_rules_enabled ON preset_automation_rules(tenant_id, enabled)
  WHERE enabled = true;

ALTER TABLE preset_automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own preset rules" ON preset_automation_rules;
CREATE POLICY "Chefs manage own preset rules"
  ON preset_automation_rules
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

DROP POLICY IF EXISTS "Service role manages preset rules" ON preset_automation_rules;
CREATE POLICY "Service role manages preset rules"
  ON preset_automation_rules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_preset_automation_rules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER preset_automation_rules_updated_at
  BEFORE UPDATE ON preset_automation_rules
  FOR EACH ROW EXECUTE FUNCTION set_preset_automation_rules_updated_at();

COMMENT ON TABLE preset_automation_rules IS 'Config-driven automation toggles: auto-draft follow-up, auto-request review, auto-flag stale inquiry, auto-reorder ingredient, auto-block calendar, auto-archive quote.';

-- ============================================================================
-- Add 'archived' to quote_status enum for auto-archive rule
-- ============================================================================

ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'archived';

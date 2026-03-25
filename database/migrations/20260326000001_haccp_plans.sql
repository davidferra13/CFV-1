-- HACCP Plans — auto-generated food safety plans per chef archetype.
-- One plan per chef. JSONB plan_data stores the full 7-principle document.
-- Template-driven: generated from code in lib/haccp/templates.ts, customizable by chef.
-- Free tier feature — no billing gates.

CREATE TABLE IF NOT EXISTS haccp_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  archetype       TEXT NOT NULL,
  plan_data       JSONB NOT NULL DEFAULT '{}',
  last_reviewed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id)
);

COMMENT ON TABLE haccp_plans IS 'Auto-generated HACCP food safety plan per chef, based on business archetype. Structure defined in lib/haccp/types.ts.';
COMMENT ON COLUMN haccp_plans.plan_data IS 'Full HACCP plan document as JSONB — process steps, CCPs, prerequisite programs, record-keeping, and chef overrides.';
COMMENT ON COLUMN haccp_plans.archetype IS 'The chef archetype this plan was generated for (private-chef, caterer, meal-prep, restaurant, food-truck, bakery).';
COMMENT ON COLUMN haccp_plans.last_reviewed_at IS 'Timestamp when the chef last marked the plan as reviewed.';

-- Updated-at trigger
CREATE TRIGGER trg_haccp_plans_updated_at
  BEFORE UPDATE ON haccp_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE haccp_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "haccp_plans_own_chef" ON haccp_plans;
CREATE POLICY "haccp_plans_own_chef" ON haccp_plans
  FOR ALL USING (
    chef_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_haccp_plans_chef ON haccp_plans(chef_id);

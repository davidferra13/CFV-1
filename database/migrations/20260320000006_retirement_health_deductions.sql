-- Migration: 20260320000006_retirement_health_deductions
-- Adds tracking tables for retirement contributions and self-employed health insurance premiums.
-- These are above-the-line deductions that reduce AGI (Schedule 1, not Schedule C).

-- TABLE 1: Retirement contributions (SEP-IRA, Solo 401k, SIMPLE IRA, Traditional IRA)
CREATE TABLE retirement_contributions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tax_year              INTEGER NOT NULL,
  account_type          TEXT NOT NULL
                        CHECK (account_type IN ('sep_ira', 'solo_401k', 'simple_ira', 'traditional_ira')),
  contribution_cents    INTEGER NOT NULL CHECK (contribution_cents >= 0),
  contributed_at        DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TABLE 2: Self-employed health insurance premiums
CREATE TABLE health_insurance_premiums (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tax_year              INTEGER NOT NULL,
  premium_type          TEXT NOT NULL DEFAULT 'self'
                        CHECK (premium_type IN ('self', 'spouse', 'dependents', 'long_term_care')),
  annual_premium_cents  INTEGER NOT NULL CHECK (annual_premium_cents >= 0),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_retirement_chef_year ON retirement_contributions(chef_id, tax_year DESC);
CREATE INDEX idx_health_premium_chef_year ON health_insurance_premiums(chef_id, tax_year DESC);

-- Triggers for updated_at
CREATE TRIGGER trg_retirement_updated_at
  BEFORE UPDATE ON retirement_contributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_health_premium_updated_at
  BEFORE UPDATE ON health_insurance_premiums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: retirement_contributions
ALTER TABLE retirement_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rc_chef_select ON retirement_contributions;
CREATE POLICY rc_chef_select ON retirement_contributions FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rc_chef_insert ON retirement_contributions;
CREATE POLICY rc_chef_insert ON retirement_contributions FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rc_chef_update ON retirement_contributions;
CREATE POLICY rc_chef_update ON retirement_contributions FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rc_chef_delete ON retirement_contributions;
CREATE POLICY rc_chef_delete ON retirement_contributions FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- RLS: health_insurance_premiums
ALTER TABLE health_insurance_premiums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hip_chef_select ON health_insurance_premiums;
CREATE POLICY hip_chef_select ON health_insurance_premiums FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS hip_chef_insert ON health_insurance_premiums;
CREATE POLICY hip_chef_insert ON health_insurance_premiums FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS hip_chef_update ON health_insurance_premiums;
CREATE POLICY hip_chef_update ON health_insurance_premiums FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS hip_chef_delete ON health_insurance_premiums;
CREATE POLICY hip_chef_delete ON health_insurance_premiums FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

COMMENT ON TABLE retirement_contributions IS
  'Tracks self-employment retirement contributions per chef per tax year. Above-the-line deductions (Schedule 1).';
COMMENT ON TABLE health_insurance_premiums IS
  'Tracks self-employed health insurance premium payments per chef per tax year. Above-the-line deduction (Schedule 1, Line 17).';

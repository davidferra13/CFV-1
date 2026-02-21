-- Insurance Module: track chef insurance policies with renewal alerts
CREATE TABLE IF NOT EXISTS chef_insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'general_liability','liquor_liability','vehicle','workers_comp',
    'professional_liability','disability','health','other'
  )),
  carrier TEXT,
  policy_number TEXT,
  coverage_limit_cents BIGINT,
  effective_date DATE,
  expiry_date DATE,
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_insurance_own_tenant" ON chef_insurance_policies
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chef_insurance_tenant ON chef_insurance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_insurance_expiry ON chef_insurance_policies(expiry_date) WHERE expiry_date IS NOT NULL;

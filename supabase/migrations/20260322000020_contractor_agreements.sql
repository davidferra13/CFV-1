-- Contractor Service Agreements: formal engagement terms separate from W9/1099
CREATE TABLE IF NOT EXISTS contractor_service_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  scope_of_work TEXT,
  rate_cents BIGINT,
  payment_terms TEXT,
  has_ip_clause BOOLEAN DEFAULT FALSE,
  has_confidentiality_clause BOOLEAN DEFAULT FALSE,
  document_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','not_on_file')),
  expires_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractor_service_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_agreements_own_tenant" ON contractor_service_agreements
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_contractor_agreements_tenant ON contractor_service_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contractor_agreements_member ON contractor_service_agreements(staff_member_id);

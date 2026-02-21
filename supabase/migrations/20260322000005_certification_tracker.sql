-- Certification Tracker: track professional certifications with renewal reminders
CREATE TABLE IF NOT EXISTS chef_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL CHECK (cert_type IN (
    'food_handler','servsafe','alcohol_service','cpr_first_aid',
    'business_license','culinary','guild_membership','other'
  )),
  cert_name TEXT NOT NULL,
  issuing_body TEXT,
  cert_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  renewal_url TEXT,
  document_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_certifications_own_tenant" ON chef_certifications
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chef_certs_tenant ON chef_certifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_certs_expiry ON chef_certifications(expiry_date) WHERE expiry_date IS NOT NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_chef_certs_type ON chef_certifications(tenant_id, cert_type);

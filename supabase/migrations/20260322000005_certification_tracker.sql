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

-- Add all columns if they don't exist (table may have been created with fewer columns)
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS cert_type TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS cert_name TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS issuing_body TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS cert_number TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS renewal_url TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_certifications' AND column_name = 'chef_id') THEN
    UPDATE chef_certifications SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;

ALTER TABLE chef_certifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_certifications_own_tenant" ON chef_certifications;
CREATE POLICY "chef_certifications_own_tenant" ON chef_certifications
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chef_certs_tenant ON chef_certifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_certs_expiry ON chef_certifications(expiry_date) WHERE expiry_date IS NOT NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_chef_certs_type ON chef_certifications(tenant_id, cert_type);

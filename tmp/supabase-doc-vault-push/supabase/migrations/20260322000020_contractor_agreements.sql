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
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contractor_service_agreements' AND column_name = 'chef_id') THEN
    UPDATE contractor_service_agreements SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS staff_member_id UUID;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS scope_of_work TEXT;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS rate_cents BIGINT;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS has_ip_clause BOOLEAN DEFAULT FALSE;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS has_confidentiality_clause BOOLEAN DEFAULT FALSE;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE contractor_service_agreements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE contractor_service_agreements ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "contractor_agreements_own_tenant" ON contractor_service_agreements;
CREATE POLICY "contractor_agreements_own_tenant" ON contractor_service_agreements
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_contractor_agreements_tenant ON contractor_service_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contractor_agreements_member ON contractor_service_agreements(staff_member_id);

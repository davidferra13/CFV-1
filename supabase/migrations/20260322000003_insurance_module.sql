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

-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;

-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_insurance_policies' AND column_name = 'chef_id') THEN
    UPDATE chef_insurance_policies SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS policy_type TEXT;
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS policy_number TEXT;
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS coverage_limit_cents BIGINT;
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_insurance_policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE chef_insurance_policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_insurance_own_tenant" ON chef_insurance_policies;
CREATE POLICY "chef_insurance_own_tenant" ON chef_insurance_policies
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chef_insurance_tenant ON chef_insurance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_insurance_expiry ON chef_insurance_policies(expiry_date) WHERE expiry_date IS NOT NULL;

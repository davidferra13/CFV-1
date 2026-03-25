-- Business Health Checklist: persistent 13-item checklist for business protection status
CREATE TABLE IF NOT EXISTS chef_business_health_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('complete','incomplete','not_applicable')),
  notes TEXT,
  document_url TEXT,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, item_key)
);

-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_business_health_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;

-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_business_health_items' AND column_name = 'chef_id') THEN
    UPDATE chef_business_health_items SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_business_health_items ADD COLUMN IF NOT EXISTS item_key TEXT;
ALTER TABLE chef_business_health_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'incomplete';
ALTER TABLE chef_business_health_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE chef_business_health_items ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE chef_business_health_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE chef_business_health_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE chef_business_health_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_business_health_own_tenant" ON chef_business_health_items;
CREATE POLICY "chef_business_health_own_tenant" ON chef_business_health_items
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chef_bh_tenant ON chef_business_health_items(tenant_id);

-- Valid item keys (enforced in application layer):
-- LLC_FORMED, SEPARATE_BANK, GENERAL_LIABILITY_INS, FOOD_HANDLER_CERT,
-- SERVSAFE_CERT, ATTORNEY_REVIEWED_CONTRACT, FINANCES_SEPARATED,
-- BACKUP_CHEF_CONTACT, EMERGENCY_CONTACT_DOCUMENTED, PHOTO_PERMISSION_POLICY,
-- DISABILITY_INSURANCE, BUSINESS_CONTINUITY_PLAN, CERTIFICATIONS_CURRENT

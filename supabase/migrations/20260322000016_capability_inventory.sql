-- Capability Inventory: chef self-assessed skill confidence ratings
CREATE TABLE IF NOT EXISTS chef_capability_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  capability_type TEXT NOT NULL CHECK (capability_type IN ('cuisine','dietary','service_size','technique')),
  capability_key TEXT NOT NULL,
  capability_label TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('expert','proficient','learning','not_my_specialty')),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, capability_key)
);

-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_capability_inventory ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;

-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_capability_inventory' AND column_name = 'chef_id') THEN
    UPDATE chef_capability_inventory SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_capability_inventory ADD COLUMN IF NOT EXISTS capability_type TEXT;
ALTER TABLE chef_capability_inventory ADD COLUMN IF NOT EXISTS capability_key TEXT;
ALTER TABLE chef_capability_inventory ADD COLUMN IF NOT EXISTS capability_label TEXT;
ALTER TABLE chef_capability_inventory ADD COLUMN IF NOT EXISTS confidence TEXT;
ALTER TABLE chef_capability_inventory ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE chef_capability_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_capability_inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE chef_capability_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_capability_own_tenant" ON chef_capability_inventory;
CREATE POLICY "chef_capability_own_tenant" ON chef_capability_inventory
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_capability_tenant ON chef_capability_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capability_type ON chef_capability_inventory(tenant_id, capability_type);

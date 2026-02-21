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

ALTER TABLE chef_capability_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_capability_own_tenant" ON chef_capability_inventory
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_capability_tenant ON chef_capability_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capability_type ON chef_capability_inventory(tenant_id, capability_type);

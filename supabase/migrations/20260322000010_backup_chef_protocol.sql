-- Backup Chef Protocol: trusted substitute chef contacts for emergency handoffs
CREATE TABLE IF NOT EXISTS chef_backup_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  specialties TEXT[] DEFAULT '{}',
  max_guest_count INT,
  relationship TEXT,
  availability_notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_backup_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_backup_own_tenant" ON chef_backup_contacts
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

-- Per-event backup plan field
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS backup_plan_notes TEXT,
  ADD COLUMN IF NOT EXISTS backup_contact_id UUID REFERENCES chef_backup_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chef_backup_tenant ON chef_backup_contacts(tenant_id);

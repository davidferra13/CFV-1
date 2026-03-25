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

-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;

-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_backup_contacts' AND column_name = 'chef_id') THEN
    UPDATE chef_backup_contacts SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS max_guest_count INT;
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS relationship TEXT;
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS availability_notes TEXT;
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_backup_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE chef_backup_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_backup_own_tenant" ON chef_backup_contacts;
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

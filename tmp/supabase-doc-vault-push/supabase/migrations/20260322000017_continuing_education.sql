-- Continuing Education Log: track professional learning activities
CREATE TABLE IF NOT EXISTS chef_education_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'online_course','book','stage','travel','conference',
    'workshop','mentorship','experimentation','other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  learned TEXT,
  how_changed_cooking TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_education_log ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_education_log' AND column_name = 'chef_id') THEN
    UPDATE chef_education_log SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_education_log ADD COLUMN IF NOT EXISTS entry_type TEXT;
ALTER TABLE chef_education_log ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE chef_education_log ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE chef_education_log ADD COLUMN IF NOT EXISTS learned TEXT;
ALTER TABLE chef_education_log ADD COLUMN IF NOT EXISTS how_changed_cooking TEXT;
ALTER TABLE chef_education_log ADD COLUMN IF NOT EXISTS entry_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE chef_education_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_education_log ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_education_own_tenant" ON chef_education_log;
CREATE POLICY "chef_education_own_tenant" ON chef_education_log
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_education_tenant ON chef_education_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_education_date ON chef_education_log(tenant_id, entry_date);

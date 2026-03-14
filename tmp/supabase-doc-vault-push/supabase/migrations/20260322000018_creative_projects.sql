-- Creative Project Space ("My Kitchen"): personal cooking experiments not tied to clients
CREATE TABLE IF NOT EXISTS chef_creative_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  cuisine TEXT,
  notes TEXT,
  status TEXT DEFAULT 'experimenting' CHECK (status IN (
    'experimenting','nearly_there','mastered','abandoned'
  )),
  photos TEXT[] DEFAULT '{}',
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_creative_projects' AND column_name = 'chef_id') THEN
    UPDATE chef_creative_projects SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS dish_name TEXT;
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS cuisine TEXT;
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'experimenting';
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS entry_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_creative_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_creative_projects ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_creative_own_tenant" ON chef_creative_projects;
CREATE POLICY "chef_creative_own_tenant" ON chef_creative_projects
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_creative_tenant ON chef_creative_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_creative_date ON chef_creative_projects(tenant_id, entry_date);

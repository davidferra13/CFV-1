-- Quarterly Growth Check-Ins: structured chef reflection on growth and satisfaction
CREATE TABLE IF NOT EXISTS chef_growth_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  satisfaction_score INT CHECK (satisfaction_score BETWEEN 1 AND 10),
  learned_this_quarter TEXT,
  draining_this_quarter TEXT,
  goal_next_quarter TEXT,
  track_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, checkin_date)
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_growth_checkins ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_growth_checkins' AND column_name = 'chef_id') THEN
    UPDATE chef_growth_checkins SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_growth_checkins ADD COLUMN IF NOT EXISTS checkin_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE chef_growth_checkins ADD COLUMN IF NOT EXISTS satisfaction_score INT;
ALTER TABLE chef_growth_checkins ADD COLUMN IF NOT EXISTS learned_this_quarter TEXT;
ALTER TABLE chef_growth_checkins ADD COLUMN IF NOT EXISTS draining_this_quarter TEXT;
ALTER TABLE chef_growth_checkins ADD COLUMN IF NOT EXISTS goal_next_quarter TEXT;
ALTER TABLE chef_growth_checkins ADD COLUMN IF NOT EXISTS track_request TEXT;
ALTER TABLE chef_growth_checkins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_growth_checkins ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_checkins_own_tenant" ON chef_growth_checkins;
CREATE POLICY "chef_checkins_own_tenant" ON chef_growth_checkins
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_growth_checkins_tenant ON chef_growth_checkins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_growth_checkins_date ON chef_growth_checkins(tenant_id, checkin_date);

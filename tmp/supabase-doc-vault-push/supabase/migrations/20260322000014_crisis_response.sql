-- Crisis Response Protocol: activated crisis plans with step-by-step playbooks
CREATE TABLE IF NOT EXISTS chef_crisis_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL CHECK (scenario IN (
    'food_safety_incident','viral_negative_post','false_review_campaign',
    'client_dispute_public','social_media_hacked','other'
  )),
  checklist_progress JSONB DEFAULT '{}',
  activated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE chef_crisis_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chef_crisis_plans' AND column_name = 'chef_id') THEN
    UPDATE chef_crisis_plans SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE chef_crisis_plans ADD COLUMN IF NOT EXISTS scenario TEXT;
ALTER TABLE chef_crisis_plans ADD COLUMN IF NOT EXISTS checklist_progress JSONB DEFAULT '{}';
ALTER TABLE chef_crisis_plans ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE chef_crisis_plans ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE chef_crisis_plans ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE chef_crisis_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_crisis_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE chef_crisis_plans ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "chef_crisis_own_tenant" ON chef_crisis_plans;
CREATE POLICY "chef_crisis_own_tenant" ON chef_crisis_plans
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_crisis_plans_tenant ON chef_crisis_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crisis_active ON chef_crisis_plans(tenant_id, activated_at) WHERE resolved_at IS NULL;

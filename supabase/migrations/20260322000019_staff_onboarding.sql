-- Staff Onboarding Checklist: per-staff vetting and documentation tracking
CREATE TABLE IF NOT EXISTS staff_onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','complete','not_applicable')),
  document_url TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_member_id, item_key)
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE staff_onboarding_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_onboarding_items' AND column_name = 'chef_id') THEN
    UPDATE staff_onboarding_items SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE staff_onboarding_items ADD COLUMN IF NOT EXISTS staff_member_id UUID;
ALTER TABLE staff_onboarding_items ADD COLUMN IF NOT EXISTS item_key TEXT;
ALTER TABLE staff_onboarding_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE staff_onboarding_items ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE staff_onboarding_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE staff_onboarding_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE staff_onboarding_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE staff_onboarding_items ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "staff_onboarding_own_tenant" ON staff_onboarding_items;
CREATE POLICY "staff_onboarding_own_tenant" ON staff_onboarding_items
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
-- Per-event staff code of conduct acknowledgment
ALTER TABLE event_staff_assignments
  ADD COLUMN IF NOT EXISTS coc_acknowledged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coc_acknowledged_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_staff_onboarding_member ON staff_onboarding_items(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_staff_onboarding_tenant ON staff_onboarding_items(tenant_id);

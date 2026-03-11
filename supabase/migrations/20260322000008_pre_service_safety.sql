-- Pre-Service Kitchen Safety Checklists: per-event safety verification before service
CREATE TABLE IF NOT EXISTS event_safety_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  override_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id)
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE event_safety_checklists ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_safety_checklists' AND column_name = 'chef_id') THEN
    UPDATE event_safety_checklists SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE event_safety_checklists ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE event_safety_checklists ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE event_safety_checklists ADD COLUMN IF NOT EXISTS override_reason TEXT;
ALTER TABLE event_safety_checklists ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE event_safety_checklists ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE event_safety_checklists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE event_safety_checklists ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "event_safety_own_tenant" ON event_safety_checklists;
CREATE POLICY "event_safety_own_tenant" ON event_safety_checklists
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
-- Track alcohol service at event level
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS alcohol_being_served BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS safety_checklist_complete BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_event_safety_event ON event_safety_checklists(event_id);

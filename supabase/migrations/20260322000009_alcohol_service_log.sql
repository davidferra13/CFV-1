-- Alcohol Service Log: liability protection record for events with alcohol
CREATE TABLE IF NOT EXISTS event_alcohol_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  log_entries JSONB DEFAULT '[]',
  last_call_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id)
);
-- Add tenant_id if it doesn't exist (table may have been created with chef_id instead)
ALTER TABLE event_alcohol_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE;
-- Backfill tenant_id from chef_id if chef_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_alcohol_logs' AND column_name = 'chef_id') THEN
    UPDATE event_alcohol_logs SET tenant_id = chef_id WHERE tenant_id IS NULL;
  END IF;
END $$;
-- Ensure all columns exist if table was pre-created with fewer columns
ALTER TABLE event_alcohol_logs ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE event_alcohol_logs ADD COLUMN IF NOT EXISTS log_entries JSONB DEFAULT '[]';
ALTER TABLE event_alcohol_logs ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ;
ALTER TABLE event_alcohol_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE event_alcohol_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE event_alcohol_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE event_alcohol_logs ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if present, then recreate
DROP POLICY IF EXISTS "alcohol_log_own_tenant" ON event_alcohol_logs;
CREATE POLICY "alcohol_log_own_tenant" ON event_alcohol_logs
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_alcohol_log_event ON event_alcohol_logs(event_id);

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

ALTER TABLE event_alcohol_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alcohol_log_own_tenant" ON event_alcohol_logs
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_alcohol_log_event ON event_alcohol_logs(event_id);

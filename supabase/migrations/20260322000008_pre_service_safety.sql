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

ALTER TABLE event_safety_checklists ENABLE ROW LEVEL SECURITY;

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

-- Event Day-Of Checklist + Prep Timeline
-- Gear, transport, outfit, and mise en place tracking for off-site events.

CREATE TABLE IF NOT EXISTS event_day_of_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('gear', 'transport', 'outfit', 'mise', 'docs', 'other')),
  checked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_day_of_checklist_event ON event_day_of_checklist(event_id);

ALTER TABLE event_day_of_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_day_of_checklist_tenant ON event_day_of_checklist
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::uuid);

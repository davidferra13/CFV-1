-- Event Prep Timeline
-- Reverse-scheduled preparation checklist for events.
-- Each item represents a task to do N minutes before serve time.

CREATE TABLE IF NOT EXISTS event_prep_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  minutes_before INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  category TEXT NOT NULL DEFAULT 'prep' CHECK (category IN ('prep', 'cook', 'setup', 'transport', 'plate', 'other')),
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_prep_timeline_event ON event_prep_timeline(event_id);
CREATE INDEX IF NOT EXISTS idx_event_prep_timeline_tenant ON event_prep_timeline(tenant_id);

ALTER TABLE event_prep_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_prep_timeline_tenant ON event_prep_timeline
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::uuid);

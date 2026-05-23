-- Event Pause Trails
-- Tracks stop/resume history for event planning.
-- Each row captures a pause event with a state snapshot,
-- and gets updated with resumed_at when the chef resumes.

CREATE TABLE IF NOT EXISTS event_pause_trails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  paused_by uuid NOT NULL,
  paused_at timestamptz NOT NULL DEFAULT now(),
  resumed_at timestamptz,
  reason text,
  state_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fk_event_pause_trails_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_pause_trails_tenant FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE
);

-- Index for quick lookups: active pauses per tenant
CREATE INDEX IF NOT EXISTS idx_event_pause_trails_tenant_active
  ON event_pause_trails (tenant_id)
  WHERE resumed_at IS NULL;

-- Index for pause history per event
CREATE INDEX IF NOT EXISTS idx_event_pause_trails_event
  ON event_pause_trails (event_id, paused_at DESC);

-- RLS
ALTER TABLE event_pause_trails ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_pause_trails_tenant_isolation ON event_pause_trails
  USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT id FROM chefs WHERE id = auth.uid()
  ))
  WITH CHECK (tenant_id = auth.uid() OR tenant_id IN (
    SELECT id FROM chefs WHERE id = auth.uid()
  ));

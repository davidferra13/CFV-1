CREATE TABLE IF NOT EXISTS event_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  description TEXT,
  timing_minutes INTEGER,
  duration_minutes INTEGER,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_touchpoints_event ON event_touchpoints(tenant_id, event_id);

CREATE TABLE IF NOT EXISTS touchpoint_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  touchpoints JSONB NOT NULL DEFAULT '[]',
  times_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_touchpoint_templates_tenant ON touchpoint_templates(tenant_id);

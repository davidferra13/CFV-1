CREATE TABLE IF NOT EXISTS event_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  current_step_key TEXT NOT NULL DEFAULT 'inquiry',
  overall_percent INTEGER NOT NULL DEFAULT 0,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_event_progress_event ON event_progress(tenant_id, event_id);

CREATE TABLE IF NOT EXISTS progress_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_progress_templates_tenant ON progress_templates(tenant_id);
ALTER TABLE event_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_templates ENABLE ROW LEVEL SECURITY;

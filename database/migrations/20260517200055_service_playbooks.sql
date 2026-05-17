CREATE TABLE IF NOT EXISTS service_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  service_style TEXT,
  guest_count_min INTEGER,
  guest_count_max INTEGER,
  menu_template_id UUID,
  prep_timeline_template JSONB DEFAULT '{}',
  equipment_checklist JSONB DEFAULT '[]',
  service_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  times_used INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_playbooks_tenant ON service_playbooks(tenant_id) WHERE deleted_at IS NULL;

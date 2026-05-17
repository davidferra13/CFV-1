CREATE TABLE IF NOT EXISTS session_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  last_route TEXT NOT NULL,
  last_entity_type TEXT,
  last_entity_id UUID,
  scroll_position INTEGER NOT NULL DEFAULT 0,
  tab_index INTEGER,
  filter_state JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_session_states_tenant ON session_states(tenant_id);

CREATE TABLE IF NOT EXISTS session_breadcrumbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  label TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_breadcrumbs_tenant ON session_breadcrumbs(tenant_id, visited_at DESC);

CREATE TABLE IF NOT EXISTS resume_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  label TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resume_points_tenant ON resume_points(tenant_id);
ALTER TABLE session_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_breadcrumbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_points ENABLE ROW LEVEL SECURITY;

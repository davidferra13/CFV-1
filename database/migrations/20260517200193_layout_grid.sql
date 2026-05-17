CREATE TABLE IF NOT EXISTS grid_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  columns INTEGER NOT NULL DEFAULT 12,
  gutter TEXT NOT NULL DEFAULT '16px',
  margin TEXT NOT NULL DEFAULT '24px',
  max_width TEXT NOT NULL DEFAULT '1440px',
  breakpoints JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS container_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  max_width TEXT NOT NULL,
  padding TEXT NOT NULL DEFAULT '16px',
  responsive BOOLEAN DEFAULT TRUE,
  breakpoint_overrides JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS layout_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  grid_compliant BOOLEAN DEFAULT FALSE,
  container_compliant BOOLEAN DEFAULT FALSE,
  issues JSONB DEFAULT '[]',
  score INTEGER DEFAULT 0,
  audited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

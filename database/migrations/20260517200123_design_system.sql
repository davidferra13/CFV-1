CREATE TABLE IF NOT EXISTS density_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  chef_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'comfortable',
  custom_overrides JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS design_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  violations JSONB DEFAULT '[]',
  score INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

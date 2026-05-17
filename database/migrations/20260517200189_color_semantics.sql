CREATE TABLE IF NOT EXISTS color_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  light_value TEXT NOT NULL,
  dark_value TEXT NOT NULL,
  contrast_ratio REAL,
  usage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_color_tokens_name ON color_tokens(tenant_id, name);

CREATE TABLE IF NOT EXISTS color_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  component TEXT,
  violation_type TEXT NOT NULL,
  raw_color TEXT NOT NULL,
  suggested_token TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  resolved BOOLEAN DEFAULT FALSE,
  detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

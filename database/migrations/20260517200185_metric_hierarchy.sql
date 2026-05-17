CREATE TABLE IF NOT EXISTS metric_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'secondary',
  format TEXT NOT NULL DEFAULT 'number',
  icon TEXT,
  route TEXT,
  "order" INTEGER DEFAULT 0,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_metric_configs_key ON metric_configs(tenant_id, key);

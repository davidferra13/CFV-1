CREATE TABLE IF NOT EXISTS table_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  chef_id UUID NOT NULL,
  table_id TEXT NOT NULL,
  columns JSONB DEFAULT '[]',
  page_size INTEGER DEFAULT 25,
  density TEXT DEFAULT 'normal',
  sort_column TEXT,
  sort_direction TEXT DEFAULT 'asc',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_table_prefs_unique ON table_preferences(tenant_id, chef_id, table_id);

CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  chef_id UUID NOT NULL,
  table_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bulk_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  table_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_ids JSONB NOT NULL,
  result JSONB,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS entity_status_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  status_field TEXT NOT NULL,
  status_value TEXT NOT NULL,
  badge_config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_status_mappings_unique ON entity_status_mappings(tenant_id, entity_type, status_field, status_value);

CREATE TABLE IF NOT EXISTS progress_language_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  percent_complete INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_progress_lang_unique ON progress_language_entries(tenant_id, entity_type, stage);

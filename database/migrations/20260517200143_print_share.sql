CREATE TABLE IF NOT EXISTS print_share_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_type TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'pdf',
  template TEXT,
  branding JSONB,
  header_logo TEXT,
  footer_text TEXT,
  color_scheme TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  format TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  token TEXT NOT NULL,
  access_count INTEGER DEFAULT 0,
  max_accesses INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_share_links_token ON share_links(token);

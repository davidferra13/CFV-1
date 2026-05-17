CREATE TABLE IF NOT EXISTS nav_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  chef_id UUID NOT NULL,
  pinned_items JSONB DEFAULT '[]',
  collapsed_sections JSONB DEFAULT '[]',
  recent_pages JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS nav_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  has_header BOOLEAN DEFAULT FALSE,
  header_complete BOOLEAN DEFAULT FALSE,
  missing_fields JSONB DEFAULT '[]',
  checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

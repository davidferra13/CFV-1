CREATE TABLE IF NOT EXISTS icon_definitions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, svg_content TEXT, lucide_icon TEXT, emoji TEXT, meaning TEXT NOT NULL, usage_guidelines TEXT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
CREATE UNIQUE INDEX idx_icon_defs_name ON icon_definitions(tenant_id, name);
CREATE TABLE IF NOT EXISTS icon_mappings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, context TEXT NOT NULL, icon_name TEXT NOT NULL, purpose TEXT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
CREATE UNIQUE INDEX idx_icon_mappings_ctx ON icon_mappings(tenant_id, context);

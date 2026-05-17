-- Menu Builder Workspace: state management + builder templates
-- Supports drag-drop ordering, section management, builder preferences

CREATE TABLE IF NOT EXISTS menu_builder_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  menu_id UUID NOT NULL,
  view_mode TEXT NOT NULL DEFAULT 'edit',
  show_prices BOOLEAN NOT NULL DEFAULT true,
  show_descriptions BOOLEAN NOT NULL DEFAULT true,
  show_allergens BOOLEAN NOT NULL DEFAULT true,
  expanded_sections JSONB NOT NULL DEFAULT '[]',
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_builder_state_menu ON menu_builder_states(tenant_id, menu_id);

CREATE TABLE IF NOT EXISTS menu_builder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_builder_templates_tenant ON menu_builder_templates(tenant_id);

ALTER TABLE menu_builder_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_builder_templates ENABLE ROW LEVEL SECURITY;

-- Lifecycle Visual State Styling System
-- Tables for managing visual state styles and lifecycle-to-visual-state mappings

CREATE TABLE IF NOT EXISTS visual_state_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  state TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT '#ffffff',
  text_color TEXT NOT NULL DEFAULT '#000000',
  border_color TEXT,
  border_width INTEGER NOT NULL DEFAULT 0,
  opacity NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  animation TEXT NOT NULL DEFAULT 'none',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visual_state_styles_tenant_state
  ON visual_state_styles (tenant_id, state);

CREATE TABLE IF NOT EXISTS lifecycle_state_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  visual_state TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lifecycle_state_mappings_tenant_stage
  ON lifecycle_state_mappings (tenant_id, lifecycle_stage);

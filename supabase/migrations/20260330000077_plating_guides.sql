-- Plating Guides
-- Per-dish visual presentation instructions that chefs share with staff.
-- Structured data for vessel, component placement, garnish, sauce technique, etc.

-- =============================================================================
-- TABLE: plating_guides
-- =============================================================================

CREATE TABLE plating_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  dish_name TEXT NOT NULL,
  vessel TEXT,
  components JSONB NOT NULL DEFAULT '[]',
  garnish TEXT,
  sauce_technique TEXT,
  temperature_notes TEXT,
  reference_photo_url TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_plating_guides_chef_id ON plating_guides(chef_id);
CREATE INDEX idx_plating_guides_recipe_id ON plating_guides(recipe_id);

-- Auto-update updated_at
CREATE TRIGGER set_plating_guides_updated_at
  BEFORE UPDATE ON plating_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE plating_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_manages_own_plating_guides ON plating_guides
  FOR ALL
  USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

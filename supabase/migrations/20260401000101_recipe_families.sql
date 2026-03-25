-- Recipe Families: Group related recipe variations together
-- e.g., "Chocolate Lava Cake" family contains: Classic, Vegan, GF, Infused Butter versions
-- Each recipe can optionally belong to one family with a variation label

-- Create the families table
CREATE TABLE IF NOT EXISTS recipe_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS disabled (app-layer tenant scoping, consistent with 20260401000098)
ALTER TABLE recipe_families DISABLE ROW LEVEL SECURITY;

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_recipe_families_tenant ON recipe_families(tenant_id);

-- Unique family name per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_families_tenant_name ON recipe_families(tenant_id, lower(name));

-- Add family columns to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES recipe_families(id) ON DELETE SET NULL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS variation_label TEXT;

-- Index for family lookups
CREATE INDEX IF NOT EXISTS idx_recipes_family ON recipes(family_id) WHERE family_id IS NOT NULL;

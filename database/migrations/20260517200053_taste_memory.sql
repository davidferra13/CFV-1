-- Chef Taste Memory & Preference Learning
-- Tracks per-chef ingredient preferences, ratings, and usage frequency.
-- Flavor affinities and cooking style patterns are derived from
-- recipe_ingredients at query time (no extra table needed).

CREATE TABLE IF NOT EXISTS chef_taste_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  frequency_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_taste_pref_tenant_ingredient
  ON chef_taste_preferences(tenant_id, ingredient_name);

-- RLS policies
ALTER TABLE chef_taste_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select_chef_taste_preferences
  ON chef_taste_preferences FOR SELECT TO public
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_insert_chef_taste_preferences
  ON chef_taste_preferences FOR INSERT TO public
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_update_chef_taste_preferences
  ON chef_taste_preferences FOR UPDATE TO public
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_delete_chef_taste_preferences
  ON chef_taste_preferences FOR DELETE TO public
  USING (tenant_id = get_current_tenant_id());

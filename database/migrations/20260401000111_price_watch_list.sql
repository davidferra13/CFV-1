-- Price Watch List: chef-specific ingredient price alerts
-- Allows chefs to set price thresholds for ingredients they care about.
-- When prices drop below the threshold, the dashboard shows an alert.

CREATE TABLE IF NOT EXISTS price_watch_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  target_price_cents INTEGER NOT NULL,
  price_unit TEXT NOT NULL DEFAULT 'lb',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_alerted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwl_chef ON price_watch_list(chef_id);
CREATE INDEX IF NOT EXISTS idx_pwl_active ON price_watch_list(chef_id, is_active) WHERE is_active = true;

-- Unique: one watch per chef per ingredient name
CREATE UNIQUE INDEX IF NOT EXISTS idx_pwl_chef_ingredient
  ON price_watch_list(chef_id, lower(ingredient_name));

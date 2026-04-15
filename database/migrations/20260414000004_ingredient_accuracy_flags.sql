-- Ingredient accuracy flags
-- Persists chef-reported data quality issues on Tier 1 openclaw entries.
-- Flagged entries are excluded from Tier 1 resolution for that chef and
-- demoted to Tier 2 (treated as stale signal) until admin review.

CREATE TABLE IF NOT EXISTS ingredient_accuracy_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  store_product_id bigint,
  vendor_name text,
  source text NOT NULL DEFAULT 'openclaw',
  reason text,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingredient_accuracy_flags_chef_ingredient
  ON ingredient_accuracy_flags(chef_id, ingredient_name);

CREATE INDEX IF NOT EXISTS ingredient_accuracy_flags_store_product
  ON ingredient_accuracy_flags(store_product_id)
  WHERE store_product_id IS NOT NULL;

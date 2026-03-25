-- Multi-Vendor Ingredient Pricing
-- Extends vendor_preferred_ingredients with per-vendor pricing data,
-- enabling price comparison across multiple suppliers for the same ingredient.

-- Add pricing columns to existing junction table
ALTER TABLE vendor_preferred_ingredients
  ADD COLUMN IF NOT EXISTS ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER CHECK (unit_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS price_unit TEXT,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER CHECK (lead_time_days >= 0),
  ADD COLUMN IF NOT EXISTS min_order_qty NUMERIC(10,3) CHECK (min_order_qty >= 0),
  ADD COLUMN IF NOT EXISTS min_order_unit TEXT,
  ADD COLUMN IF NOT EXISTS last_ordered_at DATE,
  ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for looking up all vendors for a specific ingredient
CREATE INDEX IF NOT EXISTS idx_vpi_ingredient ON vendor_preferred_ingredients(chef_id, ingredient_id)
  WHERE ingredient_id IS NOT NULL;

-- Drop the old unique constraint (ingredient_name only) and add a new one that includes vendor_id
-- This allows the same ingredient to have multiple vendor entries
DO $$ BEGIN
  ALTER TABLE vendor_preferred_ingredients DROP CONSTRAINT IF EXISTS vendor_preferred_ingredients_chef_id_ingredient_name_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- New unique constraint: one entry per chef + ingredient_name + vendor combo
-- (Using IF NOT EXISTS pattern for idempotency)
DO $$ BEGIN
  ALTER TABLE vendor_preferred_ingredients
    ADD CONSTRAINT vpi_chef_ingredient_vendor_unique UNIQUE (chef_id, ingredient_name, vendor_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- View: Best price per ingredient across all vendors
CREATE OR REPLACE VIEW ingredient_best_vendor_price AS
SELECT DISTINCT ON (chef_id, ingredient_name)
  chef_id,
  ingredient_name,
  ingredient_id,
  vendor_id,
  unit_price_cents,
  price_unit,
  lead_time_days,
  min_order_qty,
  min_order_unit,
  is_preferred
FROM vendor_preferred_ingredients
WHERE unit_price_cents IS NOT NULL
ORDER BY chef_id, ingredient_name, unit_price_cents ASC;

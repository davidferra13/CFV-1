-- Receipt Intelligence + Recipe Scaling Engine
-- Additive migration: new columns and one new table. No drops, no renames.
--
-- 1. receipt_line_items: add quantity + unit (previously discarded at persistence)
-- 2. receipt_ingredient_mappings: learning table for durable receipt-to-ingredient matches
-- 3. ingredients: scaling_category for non-linear scaling, price_flag for sanity guard

-- =====================================================================================
-- 1. receipt_line_items: structured quantity + unit
-- =====================================================================================

ALTER TABLE receipt_line_items
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS unit TEXT;

COMMENT ON COLUMN receipt_line_items.quantity IS
  'Extracted quantity from receipt (e.g. 2.31 for "2.31 LB chicken"). NULL = unknown.';
COMMENT ON COLUMN receipt_line_items.unit IS
  'Extracted unit from receipt (e.g. "lb", "oz", "each"). NULL = unknown.';

-- =====================================================================================
-- 2. receipt_ingredient_mappings: learning table
-- =====================================================================================
-- Remembers manual corrections so the same receipt text auto-matches next time.
-- Scoped per tenant, optionally per store (same product name at different stores
-- may map to different ingredients).

CREATE TABLE IF NOT EXISTS receipt_ingredient_mappings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  receipt_text  TEXT NOT NULL,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  store_name    TEXT,
  match_count   INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Same receipt text at the same store maps to one ingredient per tenant.
  -- store_name NULL = store-agnostic mapping (fallback).
  UNIQUE (tenant_id, receipt_text, store_name)
);

CREATE INDEX IF NOT EXISTS idx_rim_tenant_text
  ON receipt_ingredient_mappings(tenant_id, receipt_text);
CREATE INDEX IF NOT EXISTS idx_rim_tenant_store
  ON receipt_ingredient_mappings(tenant_id, store_name);

ALTER TABLE receipt_ingredient_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY rim_tenant_select ON receipt_ingredient_mappings
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY rim_tenant_insert ON receipt_ingredient_mappings
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY rim_tenant_update ON receipt_ingredient_mappings
  FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY rim_tenant_delete ON receipt_ingredient_mappings
  FOR DELETE USING (tenant_id = get_current_tenant_id());

COMMENT ON TABLE receipt_ingredient_mappings IS
  'Learned mappings from receipt product text to chef ingredients. Manual corrections create durable mappings that improve auto-matching over time.';

-- =====================================================================================
-- 3. ingredients: scaling category + price flag
-- =====================================================================================

-- scaling_category: how this ingredient scales when recipes are multiplied
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS scaling_category TEXT DEFAULT 'linear';

-- Constrain valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ingredients_scaling_category_check'
  ) THEN
    ALTER TABLE ingredients
      ADD CONSTRAINT ingredients_scaling_category_check
      CHECK (scaling_category IN ('linear', 'sublinear', 'fixed', 'by_pan'));
  END IF;
END $$;

COMMENT ON COLUMN ingredients.scaling_category IS
  'How this ingredient scales when recipe is multiplied. linear=standard, sublinear=seasonings/spices (75-90%), fixed=constant regardless of batch size, by_pan=constrained by pan capacity.';

-- price_flag: sanity guard for auto-applied prices from receipts
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS price_flag_pending BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_flag_new_cents INTEGER,
  ADD COLUMN IF NOT EXISTS price_flag_reason TEXT;

COMMENT ON COLUMN ingredients.price_flag_pending IS
  'True when a new price from receipt approval exceeds the sanity threshold (50% deviation from average) and awaits chef review.';
COMMENT ON COLUMN ingredients.price_flag_new_cents IS
  'The proposed new price (per unit, in cents) that triggered the flag.';
COMMENT ON COLUMN ingredients.price_flag_reason IS
  'Human-readable reason why the price was flagged (e.g. "72% above 90-day average").';

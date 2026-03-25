-- Ingredient Price History Enhancement
-- The ingredient_price_history table already exists with tenant_id, ingredient_id,
-- price_cents, unit, expense_id, store_name, quantity, price_per_unit_cents, purchase_date.
-- This migration adds columns needed for unified price tracking:
-- source tracking, vendor linkage, notes, and analytical indexes/views.

-- Add new columns (additive only)
ALTER TABLE ingredient_price_history
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill source for existing rows that came from expense receipts
UPDATE ingredient_price_history SET source = 'grocery_entry' WHERE expense_id IS NOT NULL AND source = 'manual';

-- Primary query pattern: price history for one ingredient, newest first
CREATE INDEX IF NOT EXISTS idx_iph_ingredient_date ON ingredient_price_history(tenant_id, ingredient_id, purchase_date DESC);

-- Secondary: price history by vendor across all ingredients
CREATE INDEX IF NOT EXISTS idx_iph_vendor_date ON ingredient_price_history(vendor_id, purchase_date DESC)
  WHERE vendor_id IS NOT NULL;

-- Seasonal analysis: group by month
CREATE INDEX IF NOT EXISTS idx_iph_seasonal ON ingredient_price_history(tenant_id, ingredient_id, (EXTRACT(MONTH FROM purchase_date)));

-- RLS already enabled with existing policy. Add granular policies if missing.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'iph_chef_insert' AND tablename = 'ingredient_price_history') THEN
    CREATE POLICY iph_chef_insert ON ingredient_price_history
      FOR INSERT WITH CHECK (tenant_id = auth.uid() OR tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'iph_chef_delete' AND tablename = 'ingredient_price_history') THEN
    CREATE POLICY iph_chef_delete ON ingredient_price_history
      FOR DELETE USING (tenant_id = auth.uid() OR tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
      ));
  END IF;
END $$;

-- View: Monthly average prices per ingredient (for trend charts)
CREATE OR REPLACE VIEW ingredient_monthly_price_avg AS
SELECT
  tenant_id,
  ingredient_id,
  EXTRACT(YEAR FROM purchase_date)::INT AS year,
  EXTRACT(MONTH FROM purchase_date)::INT AS month,
  ROUND(AVG(price_cents))::INT AS avg_price_cents,
  MIN(price_cents) AS min_price_cents,
  MAX(price_cents) AS max_price_cents,
  COUNT(*) AS data_points
FROM ingredient_price_history
GROUP BY tenant_id, ingredient_id, EXTRACT(YEAR FROM purchase_date), EXTRACT(MONTH FROM purchase_date);

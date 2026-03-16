-- Ingredient Price History
-- Unified price tracking table that logs every price change for an ingredient,
-- regardless of source (PO receipt, vendor invoice, grocery entry, manual update).
-- Enables: seasonal price trends, vendor comparison, cost forecasting.

CREATE TABLE IF NOT EXISTS ingredient_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  unit TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'po_receipt', 'vendor_invoice', 'grocery_entry', 'import')),
  source_id UUID,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  recorded_at DATE NOT NULL DEFAULT current_date,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query pattern: price history for one ingredient, newest first
CREATE INDEX idx_iph_ingredient_date ON ingredient_price_history(chef_id, ingredient_id, recorded_at DESC);

-- Secondary: price history by vendor across all ingredients
CREATE INDEX idx_iph_vendor_date ON ingredient_price_history(vendor_id, recorded_at DESC)
  WHERE vendor_id IS NOT NULL;

-- Seasonal analysis: group by month
CREATE INDEX idx_iph_seasonal ON ingredient_price_history(chef_id, ingredient_id, (EXTRACT(MONTH FROM recorded_at)));

-- RLS
ALTER TABLE ingredient_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY iph_chef_select ON ingredient_price_history
  FOR SELECT USING (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY iph_chef_insert ON ingredient_price_history
  FOR INSERT WITH CHECK (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY iph_chef_delete ON ingredient_price_history
  FOR DELETE USING (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

-- View: Monthly average prices per ingredient (for trend charts)
CREATE OR REPLACE VIEW ingredient_monthly_price_avg AS
SELECT
  chef_id,
  ingredient_id,
  EXTRACT(YEAR FROM recorded_at)::INT AS year,
  EXTRACT(MONTH FROM recorded_at)::INT AS month,
  ROUND(AVG(price_cents))::INT AS avg_price_cents,
  MIN(price_cents) AS min_price_cents,
  MAX(price_cents) AS max_price_cents,
  COUNT(*) AS data_points
FROM ingredient_price_history
GROUP BY chef_id, ingredient_id, EXTRACT(YEAR FROM recorded_at), EXTRACT(MONTH FROM recorded_at);

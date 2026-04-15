-- Performance: indexes for OpenClaw materialized view refresh
-- The regional_price_averages view scans ingredient_price_history filtered
-- by source LIKE 'openclaw_%' + purchase_date. Without indexes this is a
-- full 9M+ row scan (took 36 min). A partial index on the openclaw_ rows
-- cuts the scan to ~272K rows.

-- Partial index: openclaw source rows only, ordered by purchase_date DESC
-- This directly serves both materialized views.
CREATE INDEX IF NOT EXISTS idx_iph_openclaw_date
  ON ingredient_price_history(ingredient_id, purchase_date DESC, price_per_unit_cents)
  WHERE source LIKE 'openclaw_%';

-- Covering index for the mat view GROUP BY ingredient_id, unit scan
CREATE INDEX IF NOT EXISTS idx_iph_openclaw_unit
  ON ingredient_price_history(ingredient_id, unit)
  WHERE source LIKE 'openclaw_%' AND price_per_unit_cents > 0;

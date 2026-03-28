-- 20260401000110_iph_dedup_add_store.sql
-- Adds store_name to the OpenClaw dedup index so multi-store syncs
-- don't silently overwrite each other.

-- Drop the old index (missing store_name)
DROP INDEX IF EXISTS idx_iph_openclaw_dedup;

-- Recreate with store_name included
CREATE UNIQUE INDEX idx_iph_openclaw_dedup
  ON ingredient_price_history(ingredient_id, tenant_id, source, store_name, purchase_date)
  WHERE source LIKE 'openclaw_%';

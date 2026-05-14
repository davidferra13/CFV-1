-- Ingredient provenance tracking on inventory transactions
-- Captures source, producer, and region at the point of purchase/receipt
-- All columns nullable. Additive-only. Safe migration.

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS source_name TEXT;

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS source_producer TEXT;

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS source_region TEXT;

COMMENT ON COLUMN inventory_transactions.source_name
  IS 'Source location name (farm, market, fishmonger, specialty shop)';

COMMENT ON COLUMN inventory_transactions.source_producer
  IS 'Producer, grower, or maker name';

COMMENT ON COLUMN inventory_transactions.source_region
  IS 'Geographic region or address of source';

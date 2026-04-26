-- Add configurable overhead % and hourly labor rate to chef pricing config.
-- These were previously hardcoded as 15% overhead and $50/hr (5000 cents).
-- Defaults match the old hardcoded values so existing data is unchanged.

ALTER TABLE chef_pricing_config
  ADD COLUMN IF NOT EXISTS overhead_percent INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS hourly_rate_cents INTEGER NOT NULL DEFAULT 5000;

COMMENT ON COLUMN chef_pricing_config.overhead_percent IS 'Overhead as % of ingredient cost (e.g. 15 = 15%). Used in true plate cost.';
COMMENT ON COLUMN chef_pricing_config.hourly_rate_cents IS 'Chef hourly labor rate in cents (e.g. 5000 = $50/hr). Used in true plate cost.';

-- Loyalty Program Generalization: Add program_mode and earn_mode
-- This makes the loyalty system universal for all chefs on the platform.
-- Fully additive — zero impact on existing data. All defaults match current behavior.

-- Program mode: full (points+tiers+rewards), lite (tiers only), off (disabled)
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS program_mode text NOT NULL DEFAULT 'full'
    CHECK (program_mode IN ('full', 'lite', 'off'));
-- Earn mode: how points are calculated in full mode
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS earn_mode text NOT NULL DEFAULT 'per_guest'
    CHECK (earn_mode IN ('per_guest', 'per_dollar', 'per_event'));
-- Points-per-dollar rate (for per_dollar earn mode)
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS points_per_dollar numeric(5,2) NOT NULL DEFAULT 1.0;
-- Flat points per event (for per_event earn mode)
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS points_per_event integer NOT NULL DEFAULT 100;
-- Documentation
COMMENT ON COLUMN loyalty_config.program_mode IS 'full = points + tiers + rewards, lite = tiers + recognition only (no points), off = disabled';
COMMENT ON COLUMN loyalty_config.earn_mode IS 'per_guest = X pts per guest, per_dollar = X pts per dollar spent, per_event = flat pts per event';
COMMENT ON COLUMN loyalty_config.points_per_dollar IS 'Points earned per dollar spent (earn_mode = per_dollar)';
COMMENT ON COLUMN loyalty_config.points_per_event IS 'Flat points earned per completed event (earn_mode = per_event)';

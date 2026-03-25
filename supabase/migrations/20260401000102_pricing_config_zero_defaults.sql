-- Change chef_pricing_config defaults from hardcoded rates to zero.
-- New chefs start with empty pricing and must configure their own rates
-- through the guided pricing setup wizard.
-- Existing rows (already populated with real values) are not affected.
--
-- Rates/prices: zeroed out (chef-specific, must be configured)
-- Policies: kept at industry-standard defaults (deposit 50%, balance 24h, IRS mileage)
-- Thresholds: kept at reasonable defaults (large group 8-14)

ALTER TABLE chef_pricing_config
  -- Zero out all rate/price columns (chef must set their own)
  ALTER COLUMN couples_rate_3_course SET DEFAULT 0,
  ALTER COLUMN couples_rate_4_course SET DEFAULT 0,
  ALTER COLUMN couples_rate_5_course SET DEFAULT 0,
  ALTER COLUMN group_rate_3_course SET DEFAULT 0,
  ALTER COLUMN group_rate_4_course SET DEFAULT 0,
  ALTER COLUMN group_rate_5_course SET DEFAULT 0,
  ALTER COLUMN weekly_standard_min SET DEFAULT 0,
  ALTER COLUMN weekly_standard_max SET DEFAULT 0,
  ALTER COLUMN weekly_commit_min SET DEFAULT 0,
  ALTER COLUMN weekly_commit_max SET DEFAULT 0,
  ALTER COLUMN cook_and_leave_rate SET DEFAULT 0,
  ALTER COLUMN pizza_rate SET DEFAULT 0,
  ALTER COLUMN minimum_booking_cents SET DEFAULT 0,
  ALTER COLUMN weekend_premium_pct SET DEFAULT 0,
  ALTER COLUMN holiday_tier1_pct SET DEFAULT 0,
  ALTER COLUMN holiday_tier2_pct SET DEFAULT 0,
  ALTER COLUMN holiday_tier3_pct SET DEFAULT 0,
  ALTER COLUMN add_on_catalog SET DEFAULT '[]'::jsonb;

-- Keep these at industry-standard defaults (not chef-specific):
-- deposit_percentage: 50 (industry standard)
-- balance_due_hours: 24 (common default)
-- mileage_rate_cents: 70 (IRS 2026 rate)
-- large_group_min: 8 (reasonable default)
-- large_group_max: 14 (reasonable default)
-- holiday_proximity_days: 2 (reasonable default)

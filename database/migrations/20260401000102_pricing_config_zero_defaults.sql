-- Change chef_pricing_config defaults from hardcoded rates to zero.
-- New chefs start with empty pricing and must configure their own rates.
-- Existing rows (already populated with real values) are not affected.

ALTER TABLE chef_pricing_config
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
  ALTER COLUMN mileage_rate_cents SET DEFAULT 0,
  ALTER COLUMN weekend_premium_pct SET DEFAULT 0,
  ALTER COLUMN holiday_tier1_pct SET DEFAULT 0,
  ALTER COLUMN holiday_tier2_pct SET DEFAULT 0,
  ALTER COLUMN holiday_tier3_pct SET DEFAULT 0,
  ALTER COLUMN add_on_catalog SET DEFAULT '[]'::jsonb;

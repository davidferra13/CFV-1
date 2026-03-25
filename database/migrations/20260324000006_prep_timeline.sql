-- Migration: Add structured prep timeline fields to components
-- Additive only: three new nullable columns
-- Inherits existing components RLS policies automatically
--
-- These fields replace the need to interpret is_make_ahead + make_ahead_window_hours
-- as a timeline. The old fields are preserved for backward compatibility.
--
-- prep_day_offset: 0 = day-of, -1 = one day before, -3 = three days before
-- prep_time_of_day: when during the prep day this should happen
-- prep_station: which kitchen station handles this component

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS prep_day_offset INTEGER DEFAULT 0;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS prep_time_of_day TEXT;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS prep_station TEXT;

-- Validate prep_time_of_day values
ALTER TABLE components
  ADD CONSTRAINT components_prep_time_of_day_valid
  CHECK (prep_time_of_day IS NULL OR prep_time_of_day IN (
    'early_morning', 'morning', 'afternoon', 'evening', 'service'
  ));

-- prep_day_offset must be 0 or negative (can't prep AFTER service)
ALTER TABLE components
  ADD CONSTRAINT components_prep_day_offset_valid
  CHECK (prep_day_offset IS NULL OR prep_day_offset <= 0);

COMMENT ON COLUMN components.prep_day_offset IS
  'Days before service when this component should be prepped. 0 = day-of service. -1 = one day before. -3 = three days before.';

COMMENT ON COLUMN components.prep_time_of_day IS
  'When during the prep day: early_morning (6-9am), morning (9am-12pm), afternoon (12-4pm), evening (4-8pm), service (during service/à la minute).';

COMMENT ON COLUMN components.prep_station IS
  'Kitchen station assignment. Free text: e.g. "sauté", "grill", "pastry", "cold", "prep".';

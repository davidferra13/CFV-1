-- Add recurrence_rule JSONB to event_series
-- Stores the pattern (frequency, days, times) for recurring service mode.
-- Additive only: adds one column, no existing data modified.

ALTER TABLE event_series
  ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;

COMMENT ON COLUMN event_series.recurrence_rule IS
  'Recurrence pattern for service_mode=recurring. Shape: { frequency, days_of_week, day_of_month, meal_slot, start_time, end_time }';

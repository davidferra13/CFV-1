-- Analytics: Chef Preferences — Capacity + Hourly Rate
-- Adds max_events_per_month and owner_hourly_rate_cents for utilization
-- and true labor cost calculations.
-- Purely additive — no existing rows or data modified.

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS max_events_per_month     INTEGER CHECK (max_events_per_month > 0),
  ADD COLUMN IF NOT EXISTS owner_hourly_rate_cents  INTEGER CHECK (owner_hourly_rate_cents > 0);
COMMENT ON COLUMN chef_preferences.max_events_per_month IS
  'Chef-configured capacity ceiling: maximum events they can take per calendar month. Used to compute capacity utilization %.';
COMMENT ON COLUMN chef_preferences.owner_hourly_rate_cents IS
  'Chef''s own imputed hourly rate in cents. Used to compute true labor cost per event (owner hours × rate) for net profit after labor calculations.';

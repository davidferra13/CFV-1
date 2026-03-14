-- Change historical scan default from 730 days (2 years) to 0 (full inbox scan).
-- 0 = no date limit — scan the entire Gmail history.
-- This only changes the default for NEW connections; existing rows keep their value.

ALTER TABLE google_connections
  ALTER COLUMN historical_scan_lookback_days SET DEFAULT 0;
-- Also update any existing rows that still have the old 730 default
-- and haven't started scanning yet (idle/not enabled).
UPDATE google_connections
  SET historical_scan_lookback_days = 0
  WHERE historical_scan_lookback_days = 730
    AND historical_scan_enabled = false;

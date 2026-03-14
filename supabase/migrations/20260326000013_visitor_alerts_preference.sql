-- Visitor Alerts Preference — allows chefs to toggle real-time visitor alerts
-- Default: enabled (true)

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS visitor_alerts_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN chef_preferences.visitor_alerts_enabled
  IS 'When true, chef receives email + push alerts when clients visit the portal';

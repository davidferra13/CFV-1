-- Menu Engine Feature Toggles
-- Adds a JSONB column to chef_preferences allowing each operator to enable/disable
-- individual menu intelligence features (seasonal warnings, prep estimates, etc.)
-- All features default to enabled. Operators opt OUT of features they don't need.

ALTER TABLE chef_preferences
ADD COLUMN IF NOT EXISTS menu_engine_features jsonb
DEFAULT '{
  "seasonal_warnings": true,
  "prep_estimate": true,
  "client_taste": true,
  "menu_history": true,
  "vendor_hints": true,
  "allergen_validation": true,
  "stock_alerts": true,
  "scale_mismatch": true,
  "inquiry_link": true
}'::jsonb;

COMMENT ON COLUMN chef_preferences.menu_engine_features IS
  'Per-operator toggles for menu intelligence features. Keys: seasonal_warnings, prep_estimate, client_taste, menu_history, vendor_hints, allergen_validation, stock_alerts, scale_mismatch, inquiry_link. All default true.';

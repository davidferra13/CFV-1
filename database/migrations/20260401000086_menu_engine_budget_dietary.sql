-- Menu Engine: Budget Compliance + Dietary Conflict feature toggles
-- Adds two new keys to the menu_engine_features JSONB default.
-- Existing rows keep their current values; new keys default to true via
-- the getMenuEngineFeaturesFromUnknown() merge in lib/chef/actions.ts.

-- Update the column default so NEW rows get the expanded feature set
ALTER TABLE chef_preferences
ALTER COLUMN menu_engine_features
SET DEFAULT '{
  "seasonal_warnings": true,
  "prep_estimate": true,
  "client_taste": true,
  "menu_history": true,
  "vendor_hints": true,
  "allergen_validation": true,
  "stock_alerts": true,
  "scale_mismatch": true,
  "inquiry_link": true,
  "budget_compliance": true,
  "dietary_conflicts": true
}'::jsonb;

COMMENT ON COLUMN chef_preferences.menu_engine_features IS
  'Per-operator toggles for menu intelligence features. Keys: seasonal_warnings, prep_estimate, client_taste, menu_history, vendor_hints, allergen_validation, stock_alerts, scale_mismatch, inquiry_link, budget_compliance, dietary_conflicts. All default true.';

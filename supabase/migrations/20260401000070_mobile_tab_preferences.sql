-- Add mobile_tab_hrefs to chef_preferences
-- Stores the user's preferred mobile bottom tab bar items (up to 5 hrefs).
-- NULL or empty = use default mobileTabItems from nav-config.tsx.
-- Additive migration: adds column, no existing data affected.

ALTER TABLE chef_preferences
ADD COLUMN IF NOT EXISTS mobile_tab_hrefs JSONB DEFAULT NULL;

COMMENT ON COLUMN chef_preferences.mobile_tab_hrefs IS 'Custom mobile bottom tab bar items (array of href strings, max 5). NULL = use defaults.';

-- Add archetype column to chef_preferences
-- Tracks which chef persona was selected (preset nav defaults).
-- NULL = not yet selected (triggers onboarding selector).
-- Also adds saved_custom_nav_hrefs for "Save as My Default" feature.

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS archetype text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saved_custom_nav_hrefs jsonb DEFAULT NULL;

-- Validate archetype values
ALTER TABLE chef_preferences
  ADD CONSTRAINT chef_preferences_archetype_check
  CHECK (archetype IS NULL OR archetype IN (
    'private-chef', 'caterer', 'meal-prep', 'restaurant', 'food-truck', 'bakery'
  ));

COMMENT ON COLUMN chef_preferences.archetype IS 'Chef persona preset — controls default nav layout. NULL = not yet selected.';
COMMENT ON COLUMN chef_preferences.saved_custom_nav_hrefs IS 'Chef-saved custom nav layout they can restore anytime.';

-- Add guest preference columns to hub_guest_profiles
-- These mirror the richer client preference model for portable guest identity

ALTER TABLE hub_guest_profiles
  ADD COLUMN IF NOT EXISTS dislikes TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS favorites TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spice_tolerance TEXT DEFAULT NULL
    CHECK (spice_tolerance IS NULL OR spice_tolerance IN ('mild', 'medium', 'hot', 'extra_hot')),
  ADD COLUMN IF NOT EXISTS cuisine_preferences TEXT[] DEFAULT NULL;

COMMENT ON COLUMN hub_guest_profiles.dislikes IS 'Ingredients or foods the guest dislikes (not allergies)';
COMMENT ON COLUMN hub_guest_profiles.favorites IS 'Ingredients or foods the guest loves';
COMMENT ON COLUMN hub_guest_profiles.spice_tolerance IS 'Spice preference: mild, medium, hot, extra_hot';
COMMENT ON COLUMN hub_guest_profiles.cuisine_preferences IS 'Preferred cuisine types (e.g. Italian, Japanese, Mexican)';

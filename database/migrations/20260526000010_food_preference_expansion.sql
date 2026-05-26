-- Food Preference Expansion
-- Adds texture aversions, portion preference, alcohol/wine preference,
-- and cooking style preference to hub_guest_profiles.
-- Also adds kids_present and spice_tolerance to client_worksheets.
-- All columns nullable, additive only.

-- Hub guest profiles: new preference columns
ALTER TABLE hub_guest_profiles
  ADD COLUMN IF NOT EXISTS texture_aversions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS portion_preference text,
  ADD COLUMN IF NOT EXISTS alcohol_preference text,
  ADD COLUMN IF NOT EXISTS cooking_style_preference text;

COMMENT ON COLUMN hub_guest_profiles.texture_aversions IS 'Texture aversions: mushy, slimy, crunchy, chewy, etc.';
COMMENT ON COLUMN hub_guest_profiles.portion_preference IS 'Portion size: light, moderate, hearty';
COMMENT ON COLUMN hub_guest_profiles.alcohol_preference IS 'Alcohol/wine: none, wine_pairing, cocktails, beer, open_bar, byob';
COMMENT ON COLUMN hub_guest_profiles.cooking_style_preference IS 'Cooking style: any, rare_ok, medium_preferred, well_done, no_raw';

-- Client worksheets: add spice tolerance and kids present
ALTER TABLE client_worksheets
  ADD COLUMN IF NOT EXISTS spice_tolerance text,
  ADD COLUMN IF NOT EXISTS kids_present boolean DEFAULT false;

-- Booking requests: add spice tolerance, cuisine preferences, kids present
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS spice_tolerance text,
  ADD COLUMN IF NOT EXISTS cuisine_preferences text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kids_present boolean DEFAULT false;

-- Chef public portal theme customization
-- Adds configurable brand color and background options for public chef pages.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS portal_primary_color TEXT,
  ADD COLUMN IF NOT EXISTS portal_background_color TEXT,
  ADD COLUMN IF NOT EXISTS portal_background_image_url TEXT;
COMMENT ON COLUMN chefs.portal_primary_color IS 'Hex color used for public chef portal primary actions';
COMMENT ON COLUMN chefs.portal_background_color IS 'Hex color used as public chef portal page background';
COMMENT ON COLUMN chefs.portal_background_image_url IS 'Optional background image URL for public chef portal';

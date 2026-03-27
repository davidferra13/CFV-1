-- Change focus_mode default from true to false
-- New chefs should see the full application sidebar, not a restricted view.
-- Focus mode can be enabled in Settings by chefs who prefer a simpler layout.

ALTER TABLE chef_preferences ALTER COLUMN focus_mode SET DEFAULT false;

-- Also update all existing chefs who have never explicitly toggled focus mode
-- (their focus_mode is true only because the column default was true).
UPDATE chef_preferences SET focus_mode = false WHERE focus_mode = true;

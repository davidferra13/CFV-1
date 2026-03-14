-- Add 'culinary' module to enabled_modules
-- Culinary is a free-tier, default-ON module (core to the app).

-- 1. Update column default to include 'culinary' for new signups
ALTER TABLE chef_preferences
ALTER COLUMN enabled_modules
SET DEFAULT ARRAY['dashboard','pipeline','events','culinary','calendar','clients','finance'];

-- 2. Backfill existing chefs: add 'culinary' to anyone who doesn't already have it
UPDATE chef_preferences
SET enabled_modules = array_append(enabled_modules, 'culinary')
WHERE enabled_modules IS NOT NULL
  AND NOT ('culinary' = ANY(enabled_modules));

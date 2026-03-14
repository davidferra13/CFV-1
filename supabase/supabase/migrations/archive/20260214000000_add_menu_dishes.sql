-- Add dishes support to menus table
-- Stores dishes as JSONB array

ALTER TABLE menus ADD COLUMN IF NOT EXISTS dishes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN menus.dishes IS 'Array of dish objects: [{name, description, dietary_tags}]';

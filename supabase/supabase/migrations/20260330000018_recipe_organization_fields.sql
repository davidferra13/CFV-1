-- Recipe Organization Fields
-- Adds cuisine, meal_type, season, and occasion_tags for recipe browsing/filtering
-- Additive only — no drops, no renames, no data loss

-- Cuisine enum (single-select)
DO $$ BEGIN
  CREATE TYPE recipe_cuisine AS ENUM (
    'italian',
    'french',
    'mexican',
    'japanese',
    'chinese',
    'indian',
    'mediterranean',
    'thai',
    'korean',
    'american',
    'southern',
    'middle_eastern',
    'fusion',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Meal type enum (single-select)
DO $$ BEGIN
  CREATE TYPE recipe_meal_type AS ENUM (
    'breakfast',
    'brunch',
    'lunch',
    'dinner',
    'snack_passed',
    'any'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS cuisine       recipe_cuisine,
  ADD COLUMN IF NOT EXISTS meal_type     recipe_meal_type,
  ADD COLUMN IF NOT EXISTS season        TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS occasion_tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN recipes.cuisine IS 'Cuisine classification (Italian, French, etc.)';
COMMENT ON COLUMN recipes.meal_type IS 'Meal type (breakfast, lunch, dinner, etc.)';
COMMENT ON COLUMN recipes.season IS 'Applicable seasons (Spring, Summer, Fall, Winter, Year-Round)';
COMMENT ON COLUMN recipes.occasion_tags IS 'Occasion tags (Date Night, Wedding, Corporate, etc.)';

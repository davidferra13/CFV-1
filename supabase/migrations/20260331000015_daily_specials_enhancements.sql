-- Daily Specials Enhancements
-- Adds sort_order column, recipe_id FK, and unique constraint for specials calendar.

-- Add sort_order for ordering specials within a day
ALTER TABLE daily_specials ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Add recipe_id to link specials to the chef's recipe book
ALTER TABLE daily_specials ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL;

-- Unique constraint: one special name per date per chef (prevents duplicates)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_daily_specials_chef_date_name'
  ) THEN
    ALTER TABLE daily_specials
      ADD CONSTRAINT uq_daily_specials_chef_date_name UNIQUE (chef_id, special_date, name);
  END IF;
END $$;

-- Index on recipe_id for join lookups
CREATE INDEX IF NOT EXISTS idx_daily_specials_recipe ON daily_specials(recipe_id) WHERE recipe_id IS NOT NULL;

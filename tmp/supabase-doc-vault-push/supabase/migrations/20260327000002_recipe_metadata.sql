-- Recipe Metadata Enhancement
-- Adds servings, calories, difficulty rating, and equipment to recipes
-- Additive only — no drops, no renames, no data loss

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS servings             INTEGER,
  ADD COLUMN IF NOT EXISTS calories_per_serving  INTEGER,
  ADD COLUMN IF NOT EXISTS difficulty            SMALLINT CHECK (difficulty >= 1 AND difficulty <= 5),
  ADD COLUMN IF NOT EXISTS equipment             TEXT[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN recipes.servings IS 'Number of people this recipe serves';
COMMENT ON COLUMN recipes.calories_per_serving IS 'Manual calorie count per serving (USDA auto-calc also available)';
COMMENT ON COLUMN recipes.difficulty IS 'Difficulty rating 1-5 (1=easy, 5=expert)';
COMMENT ON COLUMN recipes.equipment IS 'Required equipment (e.g. stand mixer, food processor)';

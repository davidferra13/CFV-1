-- Add head_count and prep_notes to hub_meal_board
-- head_count: how many people eating this meal (NULL = use group default)
-- prep_notes: chef-only private notes (not shown to family)

ALTER TABLE hub_meal_board ADD COLUMN IF NOT EXISTS head_count INTEGER DEFAULT NULL;
ALTER TABLE hub_meal_board ADD COLUMN IF NOT EXISTS prep_notes TEXT DEFAULT NULL;

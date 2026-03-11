-- Migration: closure_streaks
-- Adds event closure streak tracking fields to the chefs table.
-- current_closure_streak: consecutive events closed within 48h of completion
-- longest_closure_streak: all-time best streak
-- last_closure_date: date of most recent financial close (for streak gap detection)
-- Additive only — no drops, no type changes.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS current_closure_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_closure_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_closure_date DATE;
COMMENT ON COLUMN chefs.current_closure_streak IS 'Consecutive events financially closed within 48h of completion';
COMMENT ON COLUMN chefs.longest_closure_streak IS 'All-time longest closure streak';
COMMENT ON COLUMN chefs.last_closure_date IS 'Date of most recent event financial close (used for gap detection)';

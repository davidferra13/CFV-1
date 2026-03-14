-- Migration: Add beverage pairing fields to dishes
-- Additive only: two new nullable TEXT columns
-- Inherits existing dishes RLS policies automatically

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS beverage_pairing TEXT;

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS beverage_pairing_notes TEXT;

COMMENT ON COLUMN dishes.beverage_pairing IS
  'Beverage pairing suggestion for this course. E.g. "2022 Sancerre" or "Negroni."';

COMMENT ON COLUMN dishes.beverage_pairing_notes IS
  'Notes on the pairing choice: why this wine, flavor bridge, client preference, etc.';

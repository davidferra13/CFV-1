-- Migration: Add plating instructions to dishes
-- Additive only: new nullable TEXT column
-- Inherits existing dishes RLS policies automatically

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS plating_instructions TEXT;

COMMENT ON COLUMN dishes.plating_instructions IS
  'Free-text plating guide for the dish. E.g. "Smear purée left, protein center-right, sauce dots around, microgreens on top." Works alongside photo_url for visual reference.';

-- Migration: Public charity visibility preference
-- Keeps charity data in the system while letting chefs opt into public display.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS show_public_charity boolean NOT NULL DEFAULT false;

UPDATE chefs
SET show_public_charity = true
WHERE show_public_charity = false
  AND (
    public_charity_percent IS NOT NULL
    OR public_charity_note IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM charity_hours
      WHERE charity_hours.chef_id = chefs.id
    )
  );

COMMENT ON COLUMN chefs.show_public_charity IS
  'Controls whether public charity impact is shown on public profile and inquiry surfaces.';

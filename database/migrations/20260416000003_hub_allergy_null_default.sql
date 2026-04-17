-- Q64 Life Safety Fix: Change known_allergies default from '{}' to NULL
--
-- PROBLEM: DDL defaults known_allergies to '{}' (empty array). This means
-- every new guest profile starts as "confirmed no allergies" when they should
-- be "never answered" (NULL). The dietary dashboard cannot distinguish between
-- a guest who explicitly said "I have no allergies" and one who never answered.
-- A chef who sees "confirmed no allergies" when the guest never responded
-- could serve allergens that trigger anaphylaxis.
--
-- FIX: Change the DEFAULT to NULL. Update existing empty-array profiles
-- that were never explicitly saved (created_at = updated_at means the user
-- never edited their profile, so '{}' came from the DDL default, not from
-- an intentional "no allergies" confirmation).

-- Step 1: Change the column default for new rows
ALTER TABLE hub_guest_profiles
  ALTER COLUMN known_allergies SET DEFAULT NULL;

ALTER TABLE hub_guest_profiles
  ALTER COLUMN known_dietary SET DEFAULT NULL;

-- Step 2: Convert existing '{}' to NULL for profiles that were never
-- manually updated (conservative: only where created_at = updated_at,
-- meaning the user never edited their profile after creation)
UPDATE hub_guest_profiles
  SET known_allergies = NULL
  WHERE known_allergies = '{}'
    AND (updated_at IS NULL OR updated_at = created_at);

UPDATE hub_guest_profiles
  SET known_dietary = NULL
  WHERE known_dietary = '{}'
    AND (updated_at IS NULL OR updated_at = created_at);

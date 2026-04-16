-- D1 fix: Prevent hub_groups from becoming orphaned when creator profile is deleted.
-- Changes created_by_profile_id FK from RESTRICT to ON DELETE SET NULL.
-- When a guest profile is deleted, the group survives (members can still use it).
-- UI should handle null creator gracefully (promote oldest member to owner).

-- Step 1: Make column nullable
ALTER TABLE hub_groups ALTER COLUMN created_by_profile_id DROP NOT NULL;

-- Step 2: Drop existing FK constraint and re-add with ON DELETE SET NULL.
-- The constraint name follows PostgreSQL auto-naming: hub_groups_created_by_profile_id_fkey
DO $$ BEGIN
  ALTER TABLE hub_groups
    DROP CONSTRAINT IF EXISTS hub_groups_created_by_profile_id_fkey;
EXCEPTION WHEN undefined_object THEN
  -- Constraint might have a different name; try the common alternatives
  NULL;
END $$;

ALTER TABLE hub_groups
  ADD CONSTRAINT hub_groups_created_by_profile_id_fkey
  FOREIGN KEY (created_by_profile_id) REFERENCES hub_guest_profiles(id) ON DELETE SET NULL;

-- Add 'vip' to the platform_admins access_level CHECK constraint.
-- VIP = inner circle users who get all features unlocked but no admin panel access.
-- Part of the 6-tier role hierarchy: Owner > Admin > VIP > Pro > Comped > Free.

-- Drop the old constraint and add the expanded one.
ALTER TABLE platform_admins
  DROP CONSTRAINT IF EXISTS platform_admins_access_level_check;

ALTER TABLE platform_admins
  ADD CONSTRAINT platform_admins_access_level_check
  CHECK (access_level IN ('owner', 'admin', 'vip'));

-- Update the column comment to reflect the 3 levels.
COMMENT ON COLUMN platform_admins.access_level IS
  'owner = founder/break-glass operator, admin = platform administration, vip = inner circle (all features, no admin panel).';

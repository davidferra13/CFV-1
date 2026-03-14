-- ============================================================================
-- ChefFlow V1 - Add public_display flag to chef_feedback
-- Migration: 20260322000055_chef_feedback_public_display.sql
-- Description:
--   Adds a public_display BOOLEAN column to chef_feedback so chefs can
--   choose which manually-imported reviews appear on their public profile.
--   Defaults to false (opt-in, not opt-out).
-- Additive only: no DROP TABLE, no DROP COLUMN, no DELETE, no TRUNCATE.
-- ============================================================================

ALTER TABLE chef_feedback
  ADD COLUMN IF NOT EXISTS public_display BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN chef_feedback.public_display IS
  'When true, this feedback entry is visible on the chef public profile page.
   Defaults to false — chefs must opt-in each entry for public display.';

CREATE INDEX IF NOT EXISTS idx_chef_feedback_public_display
  ON chef_feedback(tenant_id)
  WHERE public_display = true;

-- Note: No separate public RLS policy needed — the public profile page uses
-- createServerClient({ admin: true }) which bypasses RLS. The public_display
-- column is filtered in the application query layer instead.

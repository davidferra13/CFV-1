-- ============================================================
-- Migration: Onboarding wizard gate + Stripe Connect Express
-- Adds onboarding_completed_at and Stripe account fields
-- to the chefs table.
--
-- SAFE: Additive only. No drops, no deletes, no truncates.
-- BACKFILL: Existing chefs are marked as onboarding complete
--           so they are NOT forced through the wizard on
--           next login.
-- ============================================================

-- ── Feature 1: Onboarding wizard gate ────────────────────────────────────────

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN chefs.onboarding_completed_at IS
  'NULL = onboarding wizard not yet completed. Set to now() when the chef '
  'finishes the 5-step onboarding wizard. Existing chefs are backfilled to '
  'now() so they are not interrupted on next login.';

-- Backfill: mark all existing chefs as having completed onboarding.
-- New chefs will have onboarding_completed_at = NULL (the column default)
-- and will be directed through the wizard after sign-up.
UPDATE chefs
  SET onboarding_completed_at = now()
  WHERE onboarding_completed_at IS NULL;

-- ── Feature 4: Stripe Connect Express ────────────────────────────────────────

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN chefs.stripe_account_id IS
  'Stripe Express connected account ID (acct_...). NULL = not connected.';

COMMENT ON COLUMN chefs.stripe_onboarding_complete IS
  'TRUE when Stripe reports charges_enabled = true on the connected account. '
  'Updated by the account.updated webhook and the Connect callback route.';

CREATE INDEX IF NOT EXISTS idx_chefs_stripe_account_id
  ON chefs(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- Subscription tiers (Free/Pro/Business)
-- Relocated from lib/db/migrations/0002_subscription_tiers.sql, which is the ABANDONED
-- drizzle stub dir (journal frozen at idx 1, April 2026). The real runner
-- (scripts/apply-custom-migrations.mjs) only reads database/migrations/, so the original
-- would never have been applied and lib/billing/check-access.ts would have read a
-- non-existent column.
--
-- ADDITIVE ONLY. No drops, no type changes, no data loss. Idempotent.
-- Backfills every existing chef to 'free', which matches the prior hardcoded behaviour
-- of resolveChefTier(), so this is a no-op change in effective access.

ALTER TABLE "chefs" ADD COLUMN IF NOT EXISTS "subscription_tier" text DEFAULT 'free' NOT NULL;

-- Constrain to the SubscriptionTier union in lib/billing/subscription-tiers.ts.
-- Without this, a typo in a Stripe webhook silently grants or denies access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chefs_subscription_tier_check'
  ) THEN
    ALTER TABLE "chefs"
      ADD CONSTRAINT "chefs_subscription_tier_check"
      CHECK ("subscription_tier" IN ('free', 'pro', 'business'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "chefs_subscription_tier_idx" ON "chefs" ("subscription_tier");

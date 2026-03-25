-- SaaS Billing Infrastructure
-- Adds subscription tracking columns to chefs table.
-- Existing chefs → 'grandfathered' (no trial, no banner ever).
-- New signups → startTrial() sets 'trialing' + trial_ends_at at signup.
-- No hard feature gating: the system works fully regardless of subscription status.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ DEFAULT NULL;

-- All existing chefs are grandfathered — they signed up before billing was introduced.
-- 'grandfathered' means the trial banner never shows for them.
UPDATE chefs
SET subscription_status = 'grandfathered'
WHERE subscription_status IS NULL;

-- Unique partial indexes (only for rows where the value is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chefs_stripe_customer_id
  ON chefs(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chefs_stripe_subscription_id
  ON chefs(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Index for subscription status queries (billing page, trial banner)
CREATE INDEX IF NOT EXISTS idx_chefs_subscription_status
  ON chefs(subscription_status)
  WHERE subscription_status IS NOT NULL;

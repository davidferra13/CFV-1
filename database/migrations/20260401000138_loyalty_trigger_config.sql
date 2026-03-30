-- Loyalty Trigger Expansion
-- Adds configurable per-trigger settings and idempotency guards for automatic point awards.
-- All additive. No existing data affected.

-- Trigger configuration on loyalty_config: JSONB object storing per-trigger overrides.
-- Each key is a trigger_key, value is { enabled: boolean, points: number }.
-- Defaults are applied in application code, not in the DB default.
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS trigger_config JSONB NOT NULL DEFAULT '{}';

-- One-time trigger guards on clients (same pattern as has_received_welcome_points)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS loyalty_profile_complete_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_fun_qa_awarded BOOLEAN NOT NULL DEFAULT false;

-- Per-event trigger guards on events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS loyalty_review_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_public_consent_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_google_review_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_menu_approved_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_quote_accepted_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_tip_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_ontime_payment_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_chat_engagement_awarded BOOLEAN NOT NULL DEFAULT false;

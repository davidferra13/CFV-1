-- Hub push subscriptions for unauthenticated guests
-- Hub guests access the circle via profile tokens, not auth sessions.
-- This table stores their Web Push subscriptions keyed by profile_id.
-- Delivery is handled by circle-notification-actions.ts alongside email.

CREATE TABLE IF NOT EXISTS hub_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- Web Push subscription fields from PushSubscription.toJSON()
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  -- State
  is_active BOOLEAN DEFAULT true NOT NULL,
  failed_count INTEGER DEFAULT 0 NOT NULL,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE hub_push_subscriptions IS
  'Web Push subscriptions for hub guests (no auth required). One guest may have multiple active subscriptions.';

CREATE INDEX IF NOT EXISTS idx_hub_push_subscriptions_profile
  ON hub_push_subscriptions(profile_id) WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_push_subscriptions_endpoint
  ON hub_push_subscriptions(endpoint);

-- Out-of-App Notification Channels — Phase 1 Foundation
-- Adds infrastructure for browser push, SMS, and per-channel preferences.
-- All changes are additive. No existing tables or columns are modified destructively.
--
-- Tables added:
--   push_subscriptions     — Web Push API subscription objects per user per device
--   sms_send_log           — Rate-limit log; prevents SMS floods
--
-- Tables extended (additive ALTER TABLE ADD COLUMN):
--   notification_preferences  — adds tier + per-channel enable flags
--   chef_preferences          — adds SMS contact + opt-in consent

-- ─── Push Subscriptions ─────────────────────────────────────────────────────
-- Stores Web Push API subscription objects per user per browser/device.
-- One user can have multiple active subscriptions (phone + laptop, etc.)

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Web Push subscription fields from PushSubscription.toJSON()
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,    -- ECDH public key (base64url)
  auth_key TEXT NOT NULL,  -- auth secret (base64url)

  -- Optional device label set by the client
  device_label TEXT,

  -- State
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_used_at TIMESTAMPTZ,
  failed_count INTEGER DEFAULT 0 NOT NULL,  -- incremented on delivery failure; deactivated at 5

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE push_subscriptions IS 'Web Push API subscription endpoints per user per device. One user may have multiple active subscriptions.';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service URL. Unique identifier for a subscription.';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Client public key for payload encryption (RFC 8291).';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Auth secret for payload encryption (RFC 8291).';
COMMENT ON COLUMN push_subscriptions.failed_count IS 'Delivery failure count. Subscription deactivated when >= 5 or on 410 Gone.';

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(auth_user_id) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_tenant ON push_subscriptions(tenant_id);

CREATE TRIGGER push_subscriptions_updated_at
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage their own subscriptions
CREATE POLICY push_subs_self_select ON push_subscriptions
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY push_subs_self_insert ON push_subscriptions
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY push_subs_self_update ON push_subscriptions
  FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY push_subs_self_delete ON push_subscriptions
  FOR DELETE USING (auth_user_id = auth.uid());


-- ─── SMS Rate Limit Log ──────────────────────────────────────────────────────
-- Prevents SMS spam. One row per (tenant, action) per rate window.
-- Rows older than 48 hours are cleaned up by the activity-cleanup cron.

CREATE TABLE sms_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,         -- matches NotificationAction value
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE sms_send_log IS 'Rate-limit audit log for SMS notifications. Queried before every SMS send to prevent flooding.';

CREATE INDEX idx_sms_send_log_tenant_action ON sms_send_log(tenant_id, action, sent_at DESC);

ALTER TABLE sms_send_log ENABLE ROW LEVEL SECURITY;

-- Service role only; never exposed to client sessions
CREATE POLICY sms_send_log_service_only ON sms_send_log
  FOR ALL USING (false);


-- ─── Extend notification_preferences ────────────────────────────────────────
-- Adds channel enable flags and optional tier override.
-- NULL on a channel column = inherit from tier default (see tier-config.ts).

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('critical', 'alert', 'info')),
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN;

COMMENT ON COLUMN notification_preferences.tier IS 'Optional tier override for this category. NULL = use DEFAULT_TIER_MAP from tier-config.ts.';
COMMENT ON COLUMN notification_preferences.email_enabled IS 'Email channel override. NULL = inherit from tier default.';
COMMENT ON COLUMN notification_preferences.push_enabled IS 'Browser push channel override. NULL = inherit from tier default.';
COMMENT ON COLUMN notification_preferences.sms_enabled IS 'SMS channel override. NULL = inherit from tier default.';


-- ─── Extend chef_preferences ────────────────────────────────────────────────
-- Adds SMS contact information and explicit opt-in consent.
-- SMS will never be sent without sms_opt_in = true.

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS sms_notify_phone TEXT,
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ;

COMMENT ON COLUMN chef_preferences.sms_notify_phone IS 'E.164 phone number for SMS notifications. May differ from business phone.';
COMMENT ON COLUMN chef_preferences.sms_opt_in IS 'Explicit SMS consent flag. SMS is never sent without this being true.';
COMMENT ON COLUMN chef_preferences.sms_opt_in_at IS 'Timestamp when chef opted in to SMS.';

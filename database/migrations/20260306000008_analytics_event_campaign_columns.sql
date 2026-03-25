-- Analytics: Event operational columns + Campaign bounce/spam tracking
-- Adds menu deviation notes, parking costs, inquiry timestamp to events.
-- Adds bounced_at and spam_at to campaign_recipients for Resend webhook.
-- Purely additive — no existing data modified.

-- ============================================================
-- 1. EVENTS: operational analytics columns
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS actual_menu_deviations  TEXT,
  ADD COLUMN IF NOT EXISTS parking_tolls_cents      INTEGER CHECK (parking_tolls_cents >= 0),
  ADD COLUMN IF NOT EXISTS inquiry_received_at      TIMESTAMPTZ;

COMMENT ON COLUMN events.actual_menu_deviations IS
  'Free-text notes on what changed from the proposed menu to what was actually served. Null = no deviations.';

COMMENT ON COLUMN events.parking_tolls_cents IS
  'Parking fees and tolls paid for this event. Used in true cost-per-event calculations.';

COMMENT ON COLUMN events.inquiry_received_at IS
  'When the inquiry that led to this event was first received. Copied from inquiries.first_contact_at at event creation. Used for booking lead time analytics.';

CREATE INDEX IF NOT EXISTS events_inquiry_received_at_idx
  ON events (tenant_id, inquiry_received_at)
  WHERE inquiry_received_at IS NOT NULL;

-- ============================================================
-- 2. CAMPAIGN RECIPIENTS: bounce + spam tracking
-- ============================================================

ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS bounced_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS spam_at     TIMESTAMPTZ;

COMMENT ON COLUMN campaign_recipients.bounced_at IS
  'Timestamp when Resend reported a bounce for this recipient. Set by the /api/webhooks/resend handler.';

COMMENT ON COLUMN campaign_recipients.spam_at IS
  'Timestamp when Resend reported a spam complaint for this recipient. Set by the /api/webhooks/resend handler.';

CREATE INDEX IF NOT EXISTS cr_bounced_idx
  ON campaign_recipients (chef_id, bounced_at)
  WHERE bounced_at IS NOT NULL;

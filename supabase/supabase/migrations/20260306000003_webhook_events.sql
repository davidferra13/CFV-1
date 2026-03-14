-- ============================================================
-- Migration: Webhook Event Audit Log
-- Created:   2026-03-06
-- Purpose:   Create an immutable audit trail of all incoming
--            webhooks (Stripe, Resend, Wix, generic providers).
--
--            If financial data is ever corrupted or a payment
--            is disputed, this table provides the ability to
--            trace exactly which webhook event caused it —
--            when it arrived, what type it was, and what the
--            outcome was.
--
--            We do NOT store full payloads here. Stripe already
--            stores payloads in its dashboard. Storing PII-heavy
--            payloads in a user-accessible DB is unnecessary risk.
--            We store the event_id (provider's own ID) + event_type
--            + outcome summary — enough to trace any issue.
-- ============================================================

CREATE TABLE webhook_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider            TEXT        NOT NULL,
                      -- 'stripe' | 'resend' | 'wix' | 'generic'
  event_type          TEXT        NOT NULL,
                      -- e.g. 'payment_intent.succeeded', 'email.opened', 'form_submission'
  provider_event_id   TEXT,
                      -- The provider's own event ID (Stripe event.id, etc.)
                      -- Used to correlate this log with the provider's own dashboard
  status              TEXT        NOT NULL DEFAULT 'received'
                      CHECK (status IN ('received', 'processed', 'failed', 'skipped')),
  result              JSONB,      -- Brief summary of what was done (not full payload)
  error_text          TEXT,       -- Populated when status = 'failed'
  payload_size_bytes  INTEGER,    -- Payload size for monitoring (full payload not stored)
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE webhook_events IS
  'Immutable audit trail of all incoming webhooks. '
  'Full payloads are NOT stored here — only event metadata and outcome summaries. '
  'Used for debugging, compliance, and payment dispute resolution.';

COMMENT ON COLUMN webhook_events.provider_event_id IS
  'The external provider''s own event identifier. '
  'For Stripe: the event.id (e.g. evt_1234). '
  'For Wix: the wix_submission_id. '
  'Allows cross-referencing this log with the provider''s dashboard.';

-- Fast lookup: all events for a given provider in time order
CREATE INDEX idx_webhook_events_provider_received
  ON webhook_events (provider, received_at DESC);

-- Fast lookup: find a specific provider event (e.g. "did we see evt_1234?")
CREATE INDEX idx_webhook_events_provider_event_id
  ON webhook_events (provider_event_id)
  WHERE provider_event_id IS NOT NULL;

-- Fast lookup: all failed events for monitoring
CREATE INDEX idx_webhook_events_failed
  ON webhook_events (received_at DESC)
  WHERE status = 'failed';

-- Chronological index for audit queries
CREATE INDEX idx_webhook_events_received
  ON webhook_events (received_at DESC);

-- RLS: System/operational table. Only accessible via service_role.
-- Chefs and clients cannot read webhook event logs.
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: Keep only 90 days of webhook logs.
-- Older records are rarely needed; Stripe dashboard covers longer history.
-- This trigger prevents unbounded table growth.
CREATE OR REPLACE FUNCTION purge_old_webhook_events()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE received_at < now() - INTERVAL '90 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purge_old_webhook_events IS
  'Auto-purges webhook_events rows older than 90 days on each INSERT. '
  'Keeps the table lean without a separate cleanup cron.';

CREATE TRIGGER auto_purge_webhook_events
  AFTER INSERT ON webhook_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION purge_old_webhook_events();

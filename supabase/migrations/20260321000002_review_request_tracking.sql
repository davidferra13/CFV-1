-- Review Request Tracking
-- Adds a dedup column to track whether an automated review request email
-- has been sent for a completed event. Prevents duplicate sends across cron runs.
-- Pattern mirrors payment_reminder_*d_sent_at columns in migration 20260228000006.

ALTER TABLE events ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN events.review_request_sent_at IS
  'Timestamp when the automated post-event review request email was sent. NULL = not yet sent.';

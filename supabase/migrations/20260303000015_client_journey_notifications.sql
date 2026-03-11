-- Client Journey Notifications
-- Extends the notification system to support client recipients and adds
-- dedup tracking columns for pre-event reminder emails and quote expiry warnings.
-- All changes are purely additive — no existing columns or policies touched.

-- ─── 1. Add recipient_role discriminator to notifications ─────────────────────
-- Allows the client bell panel to filter to its own notifications,
-- and makes intent clear when creating notifications via createClientNotification().

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS recipient_role TEXT NOT NULL DEFAULT 'chef'
    CHECK (recipient_role IN ('chef', 'client'));
COMMENT ON COLUMN notifications.recipient_role IS
  'Role of the recipient: chef or client. All existing rows default to chef.';
-- ─── 2. Pre-event reminder dedup tracking on events ──────────────────────────
-- Mirrors the payment_reminder_*d_sent_at pattern (added in 20260228000006).
-- NULL = reminder not yet sent. Populated (timestamptz) = already sent.
-- Prevents duplicate emails if the lifecycle cron runs multiple times per day.
-- client_reminder_1d_sent_at also replaces the current date-match dedup for
-- the 24h reminder, making all three reminder tiers idempotent and consistent.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS client_reminder_7d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_reminder_2d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_reminder_1d_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN events.client_reminder_7d_sent_at IS
  '7-day pre-event reminder email sent to client. NULL = not yet sent.';
COMMENT ON COLUMN events.client_reminder_2d_sent_at IS
  '2-day pre-event reminder email sent to client. NULL = not yet sent.';
COMMENT ON COLUMN events.client_reminder_1d_sent_at IS
  '1-day (24h) pre-event reminder email sent to client. NULL = not yet sent.';
-- ─── 3. Quote expiry warning dedup on quotes ─────────────────────────────────
-- Tracks when the 48-hour expiry warning email was sent to the client.
-- NULL = not yet sent. Prevents duplicate sends across cron runs.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN quotes.expiry_warning_sent_at IS
  'When the 48-hour expiry warning email was sent to the client. NULL = not yet sent.';
-- ─── RLS note ─────────────────────────────────────────────────────────────────
-- The existing notifications SELECT policy is: recipient_id = auth.uid()
-- Clients have auth.users entries, so a notification created with
-- recipient_id = client_auth_user_id is readable by that client automatically.
-- All inserts use the admin client (service role bypasses RLS), so no insert
-- policy changes are needed.
-- ─────────────────────────────────────────────────────────────────────────────;

-- Payment & Cancellation Policy Migration
-- Adds cancellation policy config to chefs and payment reminder tracking to events.
-- All changes are ADDITIVE (no drops, no modifies, no data loss).

-- ── Chef cancellation policy config ─────────────────────────────────────────
-- cancellation_cutoff_days: number of days before event where full refund applies (default 15)
-- deposit_refundable: whether deposits can be refunded (default false)
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS cancellation_cutoff_days INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS deposit_refundable BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN chefs.cancellation_cutoff_days IS
  'Days before event where full balance refund applies (default 15). Within this window: no refund.';
COMMENT ON COLUMN chefs.deposit_refundable IS
  'Whether deposits are refundable at all. Default false (non-refundable).';

-- ── Event payment reminder tracking ──────────────────────────────────────────
-- Tracks which automated payment reminder emails have been sent.
-- Populated by the lifecycle cron when it sends each reminder.
-- NULL = not yet sent; populated = sent at that timestamp.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_reminder_7d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reminder_3d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reminder_1d_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN events.payment_reminder_7d_sent_at IS
  'When the 7-day payment reminder was sent. NULL = not yet sent.';
COMMENT ON COLUMN events.payment_reminder_3d_sent_at IS
  'When the 3-day payment reminder was sent. NULL = not yet sent.';
COMMENT ON COLUMN events.payment_reminder_1d_sent_at IS
  'When the 1-day payment reminder was sent. NULL = not yet sent.';

-- ── RLS: existing chefs policies already cover the new columns ────────────────
-- No new RLS needed — chefs table already has per-tenant RLS,
-- events table already has per-tenant and per-client RLS.

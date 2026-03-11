-- Migration: Add 3 additional built-in automation toggles to chef_automation_settings
-- Additive only — no existing columns changed.

ALTER TABLE chef_automation_settings
  ADD COLUMN IF NOT EXISTS receipt_upload_reminders_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS closure_deadline_alerts_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS closure_deadline_days             INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS weekly_summary_enabled            BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN chef_automation_settings.receipt_upload_reminders_enabled IS
  'Alert chef when a completed/in-progress event has no receipts uploaded within 24 hours.';
COMMENT ON COLUMN chef_automation_settings.closure_deadline_alerts_enabled IS
  'Alert chef when a completed event has not been closed out within N days.';
COMMENT ON COLUMN chef_automation_settings.closure_deadline_days IS
  'Days after completion before closure deadline alert fires (default 3).';
COMMENT ON COLUMN chef_automation_settings.weekly_summary_enabled IS
  'Send a weekly digest of upcoming events, pending follow-ups, and key financials.';

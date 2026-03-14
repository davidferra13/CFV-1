-- Migration: Payment Reminder Automation Settings
-- Adds payment reminder fields to chef_automation_settings.
-- Survey data: "chasing final payments" is a top frustration across
--   budget/family, small-dinner, and farm-to-table archetypes.

ALTER TABLE chef_automation_settings
  ADD COLUMN IF NOT EXISTS payment_reminder_enabled         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_reminder_days_before     INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS payment_overdue_alert_enabled    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_overdue_alert_days_after INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN chef_automation_settings.payment_reminder_enabled IS 'Send reminder N days before balance is due';
COMMENT ON COLUMN chef_automation_settings.payment_reminder_days_before IS 'Days before event to send payment reminder (default 2)';
COMMENT ON COLUMN chef_automation_settings.payment_overdue_alert_enabled IS 'Alert chef when balance goes overdue';
COMMENT ON COLUMN chef_automation_settings.payment_overdue_alert_days_after IS 'Days after event date before flagging as overdue (default 1)';

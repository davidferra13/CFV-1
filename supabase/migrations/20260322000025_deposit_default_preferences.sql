-- Deposit Default Preferences
-- Adds per-chef deposit defaults to chef_automation_settings.
-- These auto-populate on new events/quotes. Fully optional, fully overridable.
-- Additive only — no existing columns modified.

ALTER TABLE chef_automation_settings
  ADD COLUMN IF NOT EXISTS default_deposit_enabled       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_deposit_type          TEXT NOT NULL DEFAULT 'percentage'
                                                         CHECK (default_deposit_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS default_deposit_percentage    INTEGER NOT NULL DEFAULT 0
                                                         CHECK (default_deposit_percentage BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS default_deposit_amount_cents  INTEGER NOT NULL DEFAULT 0
                                                         CHECK (default_deposit_amount_cents >= 0);

COMMENT ON COLUMN chef_automation_settings.default_deposit_enabled IS
  'When true, new events auto-fill deposit from these defaults. Chef can always override or remove.';
COMMENT ON COLUMN chef_automation_settings.default_deposit_type IS
  'Whether the default deposit is a percentage of quoted price or a fixed dollar amount.';
COMMENT ON COLUMN chef_automation_settings.default_deposit_percentage IS
  'Default deposit as a percentage (0-100) of quoted price. Used when default_deposit_type = percentage.';
COMMENT ON COLUMN chef_automation_settings.default_deposit_amount_cents IS
  'Default deposit as a fixed amount in cents. Used when default_deposit_type = fixed.';

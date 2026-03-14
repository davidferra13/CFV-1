-- Automation Settings Migration
-- Adds per-chef toggles for built-in automations and per-client email opt-out.
-- All columns default to enabled (opt-out model, not opt-in).

-- ── 1. Chef Automation Settings ────────────────────────────────────────────
-- Stores each chef's preferences for the built-in (system) automations.
-- One row per chef. Missing row = all defaults (fully enabled).

CREATE TABLE IF NOT EXISTS chef_automation_settings (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Follow-up reminders (built-in: follow-ups cron)
  follow_up_reminders_enabled     boolean     NOT NULL DEFAULT true,
  follow_up_reminder_interval_hours integer   NOT NULL DEFAULT 48
                                              CHECK (follow_up_reminder_interval_hours BETWEEN 1 AND 336),

  -- No-response timeout alerts (built-in: automations cron)
  no_response_alerts_enabled      boolean     NOT NULL DEFAULT true,
  no_response_threshold_days      integer     NOT NULL DEFAULT 3
                                              CHECK (no_response_threshold_days BETWEEN 1 AND 30),

  -- Event approaching alerts (built-in: automations cron)
  event_approaching_alerts_enabled boolean    NOT NULL DEFAULT true,
  event_approaching_hours          integer    NOT NULL DEFAULT 48
                                              CHECK (event_approaching_hours BETWEEN 1 AND 168),

  -- Inquiry auto-expiry (built-in: lifecycle cron)
  inquiry_auto_expiry_enabled     boolean     NOT NULL DEFAULT true,
  inquiry_expiry_days             integer     NOT NULL DEFAULT 30
                                              CHECK (inquiry_expiry_days BETWEEN 7 AND 365),

  -- Quote auto-expiry (built-in: lifecycle cron)
  quote_auto_expiry_enabled       boolean     NOT NULL DEFAULT true,

  -- Client day-before reminder emails (built-in: lifecycle cron)
  client_event_reminders_enabled  boolean     NOT NULL DEFAULT true,

  -- Chef time-tracking reminders (built-in: automations cron)
  time_tracking_reminders_enabled boolean     NOT NULL DEFAULT true,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id)
);

-- ── 2. RLS for chef_automation_settings ────────────────────────────────────

ALTER TABLE chef_automation_settings ENABLE ROW LEVEL SECURITY;

-- Chefs read and write their own settings row
CREATE POLICY "chef_automation_settings_chef_rw"
  ON chef_automation_settings
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Service role (crons, webhooks) can read all settings
CREATE POLICY "chef_automation_settings_service_all"
  ON chef_automation_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 3. Client automated-email opt-out ─────────────────────────────────────
-- Chef can disable automated reminder emails for a specific client.
-- Default: true (opt-out model).

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS automated_emails_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN clients.automated_emails_enabled IS
  'When false, this client is excluded from all automated system emails (e.g. day-before reminders). Chef-controlled only.';

-- ── 4. Deduplication index on automation_executions ───────────────────────
-- Used by the engine cooldown check: look up recent successful executions
-- for the same rule + entity combination.

CREATE INDEX IF NOT EXISTS automation_executions_dedup_idx
  ON automation_executions (rule_id, trigger_entity_id, status, executed_at DESC);

-- ── 5. Updated_at trigger for chef_automation_settings ────────────────────

CREATE OR REPLACE FUNCTION set_chef_automation_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER chef_automation_settings_updated_at
  BEFORE UPDATE ON chef_automation_settings
  FOR EACH ROW EXECUTE FUNCTION set_chef_automation_settings_updated_at();

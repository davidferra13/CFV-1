-- Waiting State Command Surface (Lifecycle #8)
-- Tracks what is being waited on, who owns it, escalation, nudges, timeouts

CREATE TABLE IF NOT EXISTS waiting_state_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  event_id      UUID,
  lifecycle_stage TEXT NOT NULL,
  reason        TEXT NOT NULL,
  waiting_on    TEXT NOT NULL,
  description   TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  last_nudge_at TIMESTAMPTZ,
  timeout_at    TIMESTAMPTZ,
  timeout_action TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waiting_state_tenant_event
  ON waiting_state_entries (tenant_id, event_id);

CREATE INDEX IF NOT EXISTS idx_waiting_state_tenant_resolved
  ON waiting_state_entries (tenant_id, resolved_at);

CREATE TABLE IF NOT EXISTS nudge_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  reason        TEXT NOT NULL,
  channel       TEXT NOT NULL,
  template_text TEXT NOT NULL,
  delay_days    INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nudge_templates_tenant_reason_channel
  ON nudge_templates (tenant_id, reason, channel);

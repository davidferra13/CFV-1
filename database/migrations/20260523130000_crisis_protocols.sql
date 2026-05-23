-- Crisis Protocols table for bus-factor / delegation planning (P79)
-- Each tenant has one active crisis protocol with pre-written plans
-- for client notifications, event dispositions, and access delegation.

CREATE TABLE IF NOT EXISTS crisis_protocols (
  id            UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  protocol_data JSONB NOT NULL,
  last_reviewed_at TIMESTAMPTZ,
  tested_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_protocols_tenant
  ON crisis_protocols (tenant_id);

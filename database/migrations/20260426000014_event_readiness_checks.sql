-- Event Readiness Engine: deterministic go/no-go checks per event
-- Stores computed check results so the UI can render without re-evaluating every time

CREATE TABLE IF NOT EXISTS event_readiness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  check_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'warning')),

  blocking BOOLEAN NOT NULL DEFAULT true,
  message TEXT,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_id, check_key)
);

CREATE INDEX IF NOT EXISTS idx_event_readiness_checks_event
  ON event_readiness_checks (event_id);

CREATE INDEX IF NOT EXISTS idx_event_readiness_checks_tenant
  ON event_readiness_checks (tenant_id);

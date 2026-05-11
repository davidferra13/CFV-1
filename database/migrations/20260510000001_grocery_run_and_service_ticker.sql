-- Grocery Run Mode: track checked-off items during shopping
-- Service Ticker: track completed service steps during events

CREATE TABLE IF NOT EXISTS grocery_run_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by UUID,
  UNIQUE(event_id, ingredient_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_grocery_run_checks_event
  ON grocery_run_checks(event_id, tenant_id);

CREATE TABLE IF NOT EXISTS service_ticker_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by UUID,
  UNIQUE(event_id, step_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_service_ticker_steps_event
  ON service_ticker_steps(event_id, tenant_id);

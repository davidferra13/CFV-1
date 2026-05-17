-- Service Execution Tracker
-- Tracks day-of service stages (en_route -> arrived -> prepping -> cooking -> plating -> serving -> cleanup -> done)
-- Stage transitions are IMMUTABLE (append-only)

CREATE TABLE IF NOT EXISTS service_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL DEFAULT 'en_route'
    CHECK (current_stage IN ('en_route', 'arrived', 'prepping', 'cooking', 'plating', 'serving', 'cleanup', 'done')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_executions_event ON service_executions(event_id);
CREATE INDEX idx_service_executions_tenant ON service_executions(tenant_id);

-- One execution per event
CREATE UNIQUE INDEX idx_service_executions_event_unique ON service_executions(event_id);

CREATE TABLE IF NOT EXISTS service_stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES service_executions(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL
    CHECK (to_stage IN ('en_route', 'arrived', 'prepping', 'cooking', 'plating', 'serving', 'cleanup', 'done')),
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  photo_url TEXT
);

CREATE INDEX idx_service_stage_transitions_execution ON service_stage_transitions(execution_id);
CREATE INDEX idx_service_stage_transitions_time ON service_stage_transitions(transitioned_at);

CREATE TABLE IF NOT EXISTS operating_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  phase TEXT NOT NULL DEFAULT 'setup',
  active_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  team_members JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_status JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_operating_states_tenant_event ON operating_states(tenant_id, event_id);

CREATE TABLE IF NOT EXISTS operating_state_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  from_phase TEXT,
  to_phase TEXT NOT NULL,
  changed_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_operating_state_logs_tenant_event ON operating_state_logs(tenant_id, event_id);

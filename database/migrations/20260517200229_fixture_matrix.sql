-- Fixture Matrix: finish-gate proof tracking
-- Tables: gate_criteria, gate_results, finish_gates

CREATE TABLE gate_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  lifecycle_stage TEXT NOT NULL,
  criterion_name TEXT NOT NULL,
  description TEXT,
  check_type TEXT NOT NULL DEFAULT 'manual' CHECK (check_type IN ('manual', 'automated', 'data-driven')),
  required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_gate_criteria_tenant_stage_name
  ON gate_criteria (tenant_id, lifecycle_stage, criterion_name);

CREATE INDEX idx_gate_criteria_tenant_stage
  ON gate_criteria (tenant_id, lifecycle_stage);

ALTER TABLE gate_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY gate_criteria_chef_all ON gate_criteria
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- ----

CREATE TABLE gate_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  criterion_id UUID NOT NULL REFERENCES gate_criteria(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL DEFAULT false,
  evidence JSONB,
  checked_by UUID,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gate_results_tenant_event
  ON gate_results (tenant_id, event_id);

CREATE INDEX idx_gate_results_criterion
  ON gate_results (criterion_id);

ALTER TABLE gate_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY gate_results_chef_all ON gate_results
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- ----

CREATE TABLE finish_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  total_criteria INTEGER NOT NULL DEFAULT 0,
  passed_criteria INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'passed', 'failed', 'waived')),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_finish_gates_tenant_event_stage
  ON finish_gates (tenant_id, event_id, lifecycle_stage);

CREATE INDEX idx_finish_gates_tenant_event
  ON finish_gates (tenant_id, event_id);

ALTER TABLE finish_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY finish_gates_chef_all ON finish_gates
  FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

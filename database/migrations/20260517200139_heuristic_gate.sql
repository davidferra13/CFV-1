CREATE TABLE IF NOT EXISTS heuristic_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  phase TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  details TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_heuristic_evals_route ON heuristic_evaluations(tenant_id, route, evaluated_at DESC);

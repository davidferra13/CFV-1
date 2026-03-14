-- Sim-to-Real Loop: Simulation Tables
-- Three tables that power the AI quality feedback loop:
--   simulation_runs      — metadata for each batch run
--   simulation_results   — per-scenario evaluation results
--   fine_tuning_examples — curated high-quality examples for future model training
--
-- All tables tenant-scoped via chefs(id) FK.
-- Runs/results are append-only (no UPDATE triggers needed — AI feedback is historical).

-- ── simulation_runs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_runs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  scenario_count   integer     NOT NULL DEFAULT 0,
  passed_count     integer     NOT NULL DEFAULT 0,
  pass_rate        numeric(5,2),
  module_breakdown jsonb       NOT NULL DEFAULT '{}',
  status           text        NOT NULL DEFAULT 'running'
                               CHECK (status IN ('running', 'completed', 'failed')),
  config           jsonb       NOT NULL DEFAULT '{}'
);
CREATE INDEX simulation_runs_tenant_idx ON simulation_runs (tenant_id, started_at DESC);
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "simulation_runs_chef_rls" ON simulation_runs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ── simulation_results ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_results (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           uuid        NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  tenant_id        uuid        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  module           text        NOT NULL,
  scenario_payload text        NOT NULL,
  raw_output       jsonb,
  score            integer     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  passed           boolean     NOT NULL DEFAULT false,
  failures         jsonb       NOT NULL DEFAULT '[]',
  duration_ms      integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX simulation_results_run_idx    ON simulation_results (run_id);
CREATE INDEX simulation_results_tenant_idx ON simulation_results (tenant_id, module, created_at DESC);
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "simulation_results_chef_rls" ON simulation_results
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ── fine_tuning_examples ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fine_tuning_examples (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source        text        NOT NULL CHECK (source IN ('simulation', 'real')),
  module        text        NOT NULL,
  input_text    text        NOT NULL,
  output_json   jsonb       NOT NULL,
  quality_score integer     NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fine_tuning_examples_tenant_idx ON fine_tuning_examples (tenant_id, module, quality_score DESC);
ALTER TABLE fine_tuning_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fine_tuning_examples_chef_rls" ON fine_tuning_examples
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

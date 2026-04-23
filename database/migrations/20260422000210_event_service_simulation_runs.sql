CREATE TABLE IF NOT EXISTS event_service_simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  engine_version text NOT NULL DEFAULT 'v1',
  context_hash text NOT NULL,
  context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulation_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE event_service_simulation_runs IS
  'Append-only service rehearsal runs for event detail Service Simulation.';

COMMENT ON COLUMN event_service_simulation_runs.context_hash IS
  'Deterministic hash of material event inputs used to decide whether a saved simulation is stale.';

COMMENT ON COLUMN event_service_simulation_runs.context_snapshot IS
  'Normalized material inputs captured at simulate time for stale-reason diffing.';

COMMENT ON COLUMN event_service_simulation_runs.simulation_payload IS
  'Deterministic phase-by-phase walkthrough generated from current event truth when the chef simulated service.';

CREATE INDEX IF NOT EXISTS idx_event_service_simulation_runs_event_created
  ON event_service_simulation_runs(event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_service_simulation_runs_tenant_created
  ON event_service_simulation_runs(tenant_id, created_at DESC);

ALTER TABLE event_service_simulation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_service_simulation_runs_chef_all
  ON event_service_simulation_runs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
    )
  );

GRANT SELECT, INSERT ON event_service_simulation_runs TO authenticated;

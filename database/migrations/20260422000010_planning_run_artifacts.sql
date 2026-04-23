CREATE TABLE IF NOT EXISTS planning_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  run_type text NOT NULL,
  run_source text NOT NULL DEFAULT 'interactive',
  status text NOT NULL DEFAULT 'running',
  scope_key text NOT NULL DEFAULT 'default',
  as_of_date date NOT NULL,
  horizon_months integer NOT NULL,
  generator_version text NOT NULL,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT planning_runs_run_source_check CHECK (
    run_source = ANY (ARRAY['interactive'::text, 'scheduled'::text, 'manual'::text, 'repair'::text])
  ),
  CONSTRAINT planning_runs_status_check CHECK (
    status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])
  ),
  CONSTRAINT planning_runs_horizon_months_check CHECK (horizon_months > 0),
  CONSTRAINT planning_runs_scope_key_check CHECK (length(scope_key) > 0),
  CONSTRAINT planning_runs_run_type_check CHECK (length(run_type) > 0)
);

CREATE INDEX IF NOT EXISTS idx_planning_runs_tenant_type_completed
  ON planning_runs (tenant_id, run_type, completed_at DESC, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_planning_runs_scope_horizon
  ON planning_runs (tenant_id, scope_key, horizon_months, as_of_date DESC);

CREATE TABLE IF NOT EXISTS planning_run_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES planning_runs(id) ON DELETE CASCADE,
  artifact_key text NOT NULL,
  artifact_version text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_quality jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planning_run_artifacts_artifact_key_check CHECK (length(artifact_key) > 0),
  CONSTRAINT planning_run_artifacts_artifact_version_check CHECK (length(artifact_version) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planning_run_artifacts_run_key
  ON planning_run_artifacts (run_id, artifact_key);

CREATE INDEX IF NOT EXISTS idx_planning_run_artifacts_tenant_created
  ON planning_run_artifacts (tenant_id, created_at DESC);

ALTER TABLE planning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_run_artifacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Chefs manage own planning runs" ON planning_runs
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (
      tenant_id IN (
        SELECT user_roles.entity_id
        FROM user_roles
        WHERE user_roles.auth_user_id = auth.uid()
          AND user_roles.role = 'chef'::user_role
      )
    )
    WITH CHECK (
      tenant_id IN (
        SELECT user_roles.entity_id
        FROM user_roles
        WHERE user_roles.auth_user_id = auth.uid()
          AND user_roles.role = 'chef'::user_role
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE POLICY "Service role manages planning runs" ON planning_runs
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE POLICY "Chefs manage own planning run artifacts" ON planning_run_artifacts
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (
      tenant_id IN (
        SELECT user_roles.entity_id
        FROM user_roles
        WHERE user_roles.auth_user_id = auth.uid()
          AND user_roles.role = 'chef'::user_role
      )
    )
    WITH CHECK (
      tenant_id IN (
        SELECT user_roles.entity_id
        FROM user_roles
        WHERE user_roles.auth_user_id = auth.uid()
          AND user_roles.role = 'chef'::user_role
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE POLICY "Service role manages planning run artifacts" ON planning_run_artifacts
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

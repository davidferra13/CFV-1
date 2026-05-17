-- Graph security: regression tests, security audit entries, graph doc entries

CREATE TABLE IF NOT EXISTS regression_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  input_state JSONB NOT NULL DEFAULT '{}',
  expected_output JSONB NOT NULL DEFAULT '{}',
  last_result TEXT NOT NULL DEFAULT 'skip',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_regression_test_cases_tenant_name
  ON regression_test_cases (tenant_id, name);

CREATE TABLE IF NOT EXISTS security_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  audit_type TEXT NOT NULL,
  finding TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  mitigated BOOLEAN NOT NULL DEFAULT false,
  mitigated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_audit_entries_tenant_stage
  ON security_audit_entries (tenant_id, lifecycle_stage);

CREATE TABLE IF NOT EXISTS graph_doc_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_graph_doc_entries_tenant
  ON graph_doc_entries (tenant_id);

CREATE TABLE IF NOT EXISTS lint_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  pattern TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'warning',
  auto_fixable BOOLEAN DEFAULT FALSE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX idx_lint_rules_name ON lint_rules(tenant_id, name);

CREATE TABLE IF NOT EXISTS lint_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  rule_id UUID NOT NULL,
  route TEXT NOT NULL,
  component TEXT DEFAULT '',
  line INTEGER DEFAULT 0,
  "column" INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  auto_fixed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_lint_violations_route ON lint_violations(tenant_id, route);

CREATE TABLE IF NOT EXISTS lint_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  routes_scanned INTEGER DEFAULT 0,
  violations_found INTEGER DEFAULT 0,
  auto_fixed INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

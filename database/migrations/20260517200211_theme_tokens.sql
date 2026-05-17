-- Theme Token Management (UI SYSTEM #43)

CREATE TABLE theme_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('color', 'spacing', 'typography', 'shadow', 'border', 'animation')),
  light_value text NOT NULL,
  dark_value text,
  description text,
  inherits_from text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_theme_tokens_tenant_name ON theme_tokens (tenant_id, token_name);
CREATE INDEX idx_theme_tokens_tenant_category ON theme_tokens (tenant_id, category);

CREATE TABLE theme_consistency_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token_name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('light', 'dark', 'system')),
  issue text NOT NULL CHECK (issue IN ('missing-dark', 'missing-light', 'contrast-fail', 'orphaned', 'override-conflict')),
  severity text NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  route text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_theme_consistency_issues_tenant_resolved ON theme_consistency_issues (tenant_id, resolved_at);
CREATE INDEX idx_theme_consistency_issues_tenant_created ON theme_consistency_issues (tenant_id, created_at DESC);

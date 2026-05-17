-- Perceived Performance: skeleton configs, performance budgets, performance metrics

CREATE TABLE IF NOT EXISTS skeleton_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  route text NOT NULL,
  component text NOT NULL,
  skeleton_type text NOT NULL DEFAULT 'card',
  layout_hint jsonb DEFAULT '{}',
  animation_type text NOT NULL DEFAULT 'pulse',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT skeleton_configs_skeleton_type_check
    CHECK (skeleton_type IN ('card', 'list', 'table', 'form', 'chart', 'custom')),
  CONSTRAINT skeleton_configs_animation_type_check
    CHECK (animation_type IN ('pulse', 'wave', 'none'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skeleton_configs_tenant_route_component
  ON skeleton_configs (tenant_id, route, component);

CREATE INDEX IF NOT EXISTS idx_skeleton_configs_tenant_route
  ON skeleton_configs (tenant_id, route);

CREATE TABLE IF NOT EXISTS performance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  route text NOT NULL,
  max_fcp integer NOT NULL DEFAULT 1500,
  max_lcp integer NOT NULL DEFAULT 2500,
  max_tti integer NOT NULL DEFAULT 3500,
  max_cls numeric(5,3) NOT NULL DEFAULT 0.1,
  max_bundle_size integer NOT NULL DEFAULT 250,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT performance_budgets_max_fcp_positive CHECK (max_fcp > 0),
  CONSTRAINT performance_budgets_max_lcp_positive CHECK (max_lcp > 0),
  CONSTRAINT performance_budgets_max_tti_positive CHECK (max_tti > 0),
  CONSTRAINT performance_budgets_max_cls_positive CHECK (max_cls >= 0),
  CONSTRAINT performance_budgets_max_bundle_size_positive CHECK (max_bundle_size > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_budgets_tenant_route
  ON performance_budgets (tenant_id, route);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  route text NOT NULL,
  fcp integer,
  lcp integer,
  tti integer,
  cls numeric(5,3),
  bundle_size integer,
  viewport text,
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant_route
  ON performance_metrics (tenant_id, route);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant_measured
  ON performance_metrics (tenant_id, measured_at DESC);

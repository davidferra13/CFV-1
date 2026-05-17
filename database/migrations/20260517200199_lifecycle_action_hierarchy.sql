-- Lifecycle Action Hierarchy Visual System (UI SYSTEM #13)

CREATE TABLE IF NOT EXISTS lifecycle_action_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  action_name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'secondary' CHECK (tier IN ('primary', 'secondary', 'tertiary', 'hidden')),
  visual_weight INTEGER NOT NULL DEFAULT 5 CHECK (visual_weight BETWEEN 1 AND 10),
  sort_order INTEGER NOT NULL DEFAULT 0,
  context_condition JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, lifecycle_stage, action_name)
);

CREATE INDEX idx_lifecycle_action_rules_tenant_stage
  ON lifecycle_action_rules (tenant_id, lifecycle_stage);

CREATE TABLE IF NOT EXISTS action_group_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  group_name TEXT NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  max_visible INTEGER NOT NULL DEFAULT 3,
  collapse_behavior TEXT NOT NULL DEFAULT 'overflow' CHECK (collapse_behavior IN ('dropdown', 'overflow', 'hide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, lifecycle_stage, group_name)
);

CREATE INDEX idx_action_group_configs_tenant_stage
  ON action_group_configs (tenant_id, lifecycle_stage);

CREATE TABLE IF NOT EXISTS ownership_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  owner_id UUID NOT NULL,
  owner_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'lead',
  active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_ownership_event ON ownership_assignments(tenant_id, event_id);

CREATE TABLE IF NOT EXISTS merge_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL,
  title TEXT NOT NULL,
  source_stages JSONB DEFAULT '[]',
  target_stage TEXT NOT NULL DEFAULT '',
  strategy TEXT NOT NULL DEFAULT 'sequential',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_merge_plans_event ON merge_plans(tenant_id, event_id);

CREATE TABLE IF NOT EXISTS handoff_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  requires_approval BOOLEAN DEFAULT FALSE,
  checklist JSONB DEFAULT '{}',
  auto_assign_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX idx_handoff_rules_stages ON handoff_rules(tenant_id, from_stage, to_stage);

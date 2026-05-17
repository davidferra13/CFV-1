-- Lifecycle Naming & Surface Decisions
-- Tables for managing how lifecycle stages/states are labeled across surfaces

CREATE TABLE IF NOT EXISTS lifecycle_name_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  internal_name TEXT NOT NULL,
  chef_label TEXT NOT NULL,
  client_label TEXT NOT NULL,
  surface_context TEXT NOT NULL DEFAULT 'dashboard',
  icon TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lifecycle_name_tenant_ctx
  ON lifecycle_name_entries (tenant_id, internal_name, surface_context);

CREATE INDEX IF NOT EXISTS idx_lifecycle_name_tenant
  ON lifecycle_name_entries (tenant_id);

CREATE TABLE IF NOT EXISTS naming_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  internal_name TEXT NOT NULL,
  decision TEXT NOT NULL,
  rationale TEXT,
  decided_by TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_naming_decisions_tenant
  ON naming_decisions (tenant_id);

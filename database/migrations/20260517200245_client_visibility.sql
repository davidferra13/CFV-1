-- Client Visibility and Redaction Rules (Lifecycle #12)
-- Controls what lifecycle data clients can see per stage/field/entity.

CREATE TABLE IF NOT EXISTS visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  field_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'menu', 'invoice', 'note', 'timeline')),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'client-visible', 'chef-only', 'system-only')),
  redact_with TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visibility_rules_tenant_stage_field_entity
  ON visibility_rules (tenant_id, lifecycle_stage, field_name, entity_type);

CREATE INDEX IF NOT EXISTS idx_visibility_rules_tenant
  ON visibility_rules (tenant_id);

CREATE TABLE IF NOT EXISTS redaction_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]',
  applies_to JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_redaction_policies_tenant_name
  ON redaction_policies (tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_redaction_policies_tenant
  ON redaction_policies (tenant_id);

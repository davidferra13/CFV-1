-- Side-effect observability table
-- Tracks mutation-level side effects (emails, notifications, webhooks, state changes, etc.)

CREATE TABLE IF NOT EXISTS side_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('email', 'notification', 'webhook', 'file', 'external_api', 'state_change', 'scheduled_job')),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb,
  triggered_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_side_effects_tenant_created ON side_effects (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_side_effects_entity ON side_effects (tenant_id, entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_side_effects_category ON side_effects (tenant_id, category);

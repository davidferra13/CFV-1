-- Workflow Step Overrides
-- Persists manual skip/reorder actions on compound workflow steps.
-- Step completion is derived from domain state; only overrides need storage.

CREATE TABLE IF NOT EXISTS workflow_step_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('post_event_follow_up', 'new_booking_pipeline', 'event_prep_countdown')),
  entity_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'skip' CHECK (action IN ('skip')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE (tenant_id, workflow_type, entity_id, step_id)
);

CREATE INDEX idx_workflow_step_overrides_lookup
  ON workflow_step_overrides (tenant_id, workflow_type, entity_id);

-- RLS
ALTER TABLE workflow_step_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_step_overrides_tenant_isolation
  ON workflow_step_overrides
  FOR ALL
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

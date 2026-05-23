-- Workflow Trails: Stop/Resume state persistence
-- When a chef stops mid-workflow, the system saves exact position.
-- Resume picks up where they left off instead of starting over.
-- Tracks: last active page, form state, scroll position, active step.

CREATE TABLE IF NOT EXISTS workflow_trails (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  actor_id      uuid NOT NULL,

  -- What workflow this trail tracks
  workflow_type text NOT NULL,            -- 'recipe_edit' | 'menu_build' | 'event_setup' | 'inquiry_response' | 'quote_draft'
  entity_id     uuid,                     -- the recipe/menu/event/inquiry ID being worked on
  entity_type   text,                     -- 'recipe' | 'menu' | 'event' | 'inquiry' | 'quote'

  -- Position state
  active_path   text NOT NULL,            -- current route path
  active_step   text,                     -- step identifier within a multi-step flow
  step_index    integer DEFAULT 0,        -- numeric step position
  scroll_y      integer DEFAULT 0,        -- scroll position

  -- Form state (serialized partial form data)
  form_state    jsonb DEFAULT '{}'::jsonb, -- partial form values at time of stop
  metadata      jsonb DEFAULT '{}'::jsonb, -- additional context (tab, panel, etc.)

  -- Lifecycle
  status        text NOT NULL DEFAULT 'paused'
    CHECK (status IN ('paused', 'resumed', 'completed', 'abandoned')),
  paused_at     timestamptz DEFAULT now() NOT NULL,
  resumed_at    timestamptz,
  completed_at  timestamptz,

  -- Upsert: one active trail per workflow_type + entity_id per tenant
  UNIQUE (tenant_id, workflow_type, entity_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_workflow_trails_tenant_status
  ON workflow_trails (tenant_id, status, paused_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_trails_entity
  ON workflow_trails (tenant_id, entity_type, entity_id);

COMMENT ON TABLE workflow_trails IS 'Persists chef workflow position for stop/resume. One active trail per workflow+entity.';

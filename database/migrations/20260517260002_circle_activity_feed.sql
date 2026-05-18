CREATE TABLE IF NOT EXISTS circle_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_id UUID NOT NULL REFERENCES events(id),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action_verb TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_label TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circle_activity_event ON circle_activity(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_activity_tenant ON circle_activity(tenant_id);

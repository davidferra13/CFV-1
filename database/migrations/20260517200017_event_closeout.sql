-- Event Closeout: post-service checklist for closing out completed events
-- ADDITIVE ONLY: no drops, no deletes, no column modifications

CREATE TABLE IF NOT EXISTS event_closeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete')),
  checklist_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_event_closeouts_event ON event_closeouts (event_id);
CREATE INDEX IF NOT EXISTS idx_event_closeouts_tenant ON event_closeouts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_closeouts_status ON event_closeouts (tenant_id, status);

-- RLS
ALTER TABLE event_closeouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ec_chef_select ON event_closeouts
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY ec_chef_insert ON event_closeouts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY ec_chef_update ON event_closeouts
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id());

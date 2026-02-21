-- Incident Documentation: formal log for in-service incidents with resolution tracking
CREATE TABLE IF NOT EXISTS chef_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  incident_date TIMESTAMPTZ NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'food_safety','guest_injury','property_damage',
    'equipment_failure','near_miss','other'
  )),
  description TEXT NOT NULL,
  parties_involved TEXT,
  immediate_action TEXT,
  follow_up_steps JSONB DEFAULT '[]',
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open','in_progress','resolved')),
  document_urls TEXT[] DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chef_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_incidents_own_tenant" ON chef_incidents
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chef_incidents_tenant ON chef_incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_incidents_event ON chef_incidents(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chef_incidents_status ON chef_incidents(tenant_id, resolution_status);

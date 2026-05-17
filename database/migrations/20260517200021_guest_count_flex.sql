-- Guest Count Flex: living guest counts, change history, cutoff policies
-- ADDITIVE ONLY: no DROP, DELETE, or TRUNCATE

-- Change history: every guest count modification with impact assessment
CREATE TABLE IF NOT EXISTS guest_count_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  from_count integer NOT NULL,
  to_count integer NOT NULL,
  stage text NOT NULL CHECK (stage IN ('quoted', 'confirmed', 'final', 'actual')),
  changed_by uuid NOT NULL,
  reason text,
  impact_json jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_count_changes_event ON guest_count_changes(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_count_changes_tenant ON guest_count_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_count_changes_time ON guest_count_changes(changed_at DESC);

-- Cutoff policies: per-event rules for when changes are restricted
CREATE TABLE IF NOT EXISTS event_cutoff_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  cutoff_date timestamptz NOT NULL,
  mode text NOT NULL CHECK (mode IN ('hard', 'soft', 'flexible')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_event_cutoff_policies_event ON event_cutoff_policies(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cutoff_policies_tenant ON event_cutoff_policies(tenant_id);

-- RLS policies for tenant isolation
ALTER TABLE guest_count_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cutoff_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_guest_count_changes ON guest_count_changes
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

CREATE POLICY tenant_isolation_event_cutoff_policies ON event_cutoff_policies
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

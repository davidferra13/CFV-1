-- Guest Count Flex: living guest counts, change history, cutoff policies
-- ADDITIVE ONLY: no DROP, DELETE, or TRUNCATE

-- Change history: guest_count_changes is created by 20260401000067_menu_collaboration.sql,
-- which is the canonical shape (previous_count/new_count/requested_by/created_at). The
-- from_count/to_count/changed_at definition that used to sit here never took effect: the
-- CREATE TABLE IF NOT EXISTS no-opped against the existing table and the index below then
-- failed on a column that did not exist, taking the rest of this migration with it.
CREATE INDEX IF NOT EXISTS idx_guest_count_changes_event ON guest_count_changes(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_count_changes_tenant ON guest_count_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_count_changes_time ON guest_count_changes(created_at DESC);

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

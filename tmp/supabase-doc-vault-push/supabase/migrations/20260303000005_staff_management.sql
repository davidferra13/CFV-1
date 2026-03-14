-- Staff & Team Management
-- Enables chefs to maintain a roster of sous chefs, kitchen assistants, and service staff,
-- assign them to events, and track actual hours + labor costs per event.

-- ============================================
-- ENUM: Staff roles
-- ============================================

CREATE TYPE staff_role AS ENUM (
  'sous_chef',
  'kitchen_assistant',
  'service_staff',
  'server',
  'bartender',
  'dishwasher',
  'other'
);
-- ENUM: Staff assignment status
CREATE TYPE staff_assignment_status AS ENUM (
  'scheduled',   -- Tentatively assigned
  'confirmed',   -- Staff confirmed attendance
  'completed',   -- Event complete, hours logged
  'no_show'      -- Staff did not appear
);
-- ============================================
-- TABLE 1: STAFF MEMBERS (Chef's Roster)
-- ============================================

CREATE TABLE staff_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  role                staff_role NOT NULL DEFAULT 'other',
  phone               TEXT,
  email               TEXT,
  hourly_rate_cents   INTEGER NOT NULL DEFAULT 0
                      CHECK (hourly_rate_cents >= 0),
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'inactive')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_members_chef   ON staff_members(chef_id, status);
COMMENT ON TABLE staff_members IS 'Chef''s roster of sous chefs, assistants, and service staff.';
COMMENT ON COLUMN staff_members.hourly_rate_cents IS 'Default hourly rate in cents. Can be overridden per event assignment.';
CREATE TRIGGER trg_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 2: EVENT STAFF ASSIGNMENTS
-- ============================================

CREATE TABLE event_staff_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id       UUID NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,

  -- Role and rate for this specific event (may differ from staff member defaults)
  role_override         staff_role,       -- NULL = use staff_member.role
  rate_override_cents   INTEGER           -- NULL = use staff_member.hourly_rate_cents
                        CHECK (rate_override_cents IS NULL OR rate_override_cents >= 0),

  -- Hours
  scheduled_hours       NUMERIC(5,2),
  actual_hours          NUMERIC(5,2),

  -- Pay (computed from actual_hours × effective rate — stored for snapshots)
  pay_amount_cents      INTEGER
                        CHECK (pay_amount_cents IS NULL OR pay_amount_cents >= 0),

  -- Status
  status                staff_assignment_status NOT NULL DEFAULT 'scheduled',

  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_id, staff_member_id)  -- one assignment per staff per event
);
CREATE INDEX idx_staff_assignments_event ON event_staff_assignments(event_id);
CREATE INDEX idx_staff_assignments_chef  ON event_staff_assignments(chef_id);
CREATE INDEX idx_staff_assignments_staff ON event_staff_assignments(staff_member_id);
COMMENT ON TABLE event_staff_assignments IS 'Links staff members to events with role, rate, hours, and pay tracking.';
COMMENT ON COLUMN event_staff_assignments.role_override IS 'NULL = use the staff member''s default role.';
COMMENT ON COLUMN event_staff_assignments.rate_override_cents IS 'NULL = use the staff member''s default hourly_rate_cents.';
COMMENT ON COLUMN event_staff_assignments.pay_amount_cents IS 'Stored computed pay = actual_hours × effective_rate. Set when hours are logged.';
CREATE TRIGGER trg_staff_assignments_updated_at
  BEFORE UPDATE ON event_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE staff_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff_assignments ENABLE ROW LEVEL SECURITY;
-- ---- staff_members: chef-only ----

CREATE POLICY sm_chef_select ON staff_members
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY sm_chef_insert ON staff_members
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY sm_chef_update ON staff_members
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY sm_chef_delete ON staff_members
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
-- ---- event_staff_assignments: chef-only ----

CREATE POLICY esa_chef_select ON event_staff_assignments
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY esa_chef_insert ON event_staff_assignments
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY esa_chef_update ON event_staff_assignments
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
CREATE POLICY esa_chef_delete ON event_staff_assignments
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

-- Staff scheduling and time tracking
-- Extends the staff management system with shift scheduling,
-- availability tracking, and payroll-ready time tracking.
-- NOTE: staff_availability already exists from earlier migrations.
-- This adds missing columns idempotently.

-- ============================================
-- TABLE 1: STAFF SCHEDULES (Shift-level tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistant',
  status TEXT NOT NULL DEFAULT 'scheduled',
  hourly_rate_cents INTEGER,
  notes TEXT,
  actual_start TIME,
  actual_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_staff_schedules_updated_at ON staff_schedules;
CREATE TRIGGER trg_staff_schedules_updated_at
  BEFORE UPDATE ON staff_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: STAFF AVAILABILITY (add missing columns)
-- ============================================

ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS day_of_week INTEGER;
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS specific_date DATE;
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS end_time TIME;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ss_chef_select ON staff_schedules;
CREATE POLICY ss_chef_select ON staff_schedules
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ss_chef_insert ON staff_schedules;
CREATE POLICY ss_chef_insert ON staff_schedules
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ss_chef_update ON staff_schedules;
CREATE POLICY ss_chef_update ON staff_schedules
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ss_chef_delete ON staff_schedules;
CREATE POLICY ss_chef_delete ON staff_schedules
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS sa_chef_select ON staff_availability;
CREATE POLICY sa_chef_select ON staff_availability
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS sa_chef_insert ON staff_availability;
CREATE POLICY sa_chef_insert ON staff_availability
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS sa_chef_update ON staff_availability;
CREATE POLICY sa_chef_update ON staff_availability
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS sa_chef_delete ON staff_availability;
CREATE POLICY sa_chef_delete ON staff_availability
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id()
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON staff_schedules(chef_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_member ON staff_schedules(staff_member_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_event ON staff_schedules(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_member ON staff_availability(staff_member_id);

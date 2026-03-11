-- Staff Enhancements: Availability, Clock In/Out, Performance Scoring
-- Closes gaps identified in competitive analysis vs 7shifts

-- ============================================
-- ALTER: Add contractor tracking to staff_members
-- ============================================

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS contractor_type TEXT DEFAULT 'contractor' CHECK (contractor_type IN ('contractor', 'employee'));
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS ytd_payments_cents INTEGER DEFAULT 0;
-- ============================================
-- TABLE 1: STAFF AVAILABILITY
-- ============================================

CREATE TABLE IF NOT EXISTS staff_availability (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id   UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  is_available      BOOLEAN NOT NULL DEFAULT true,
  recurring_rule    TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_member_id, date)
);
CREATE INDEX idx_staff_availability_chef_date ON staff_availability(chef_id, date);
CREATE INDEX idx_staff_availability_member ON staff_availability(staff_member_id, date);
CREATE TRIGGER trg_staff_availability_updated_at
  BEFORE UPDATE ON staff_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 2: STAFF CLOCK ENTRIES
-- ============================================

CREATE TABLE IF NOT EXISTS staff_clock_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id   UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  clock_in_at       TIMESTAMPTZ NOT NULL,
  clock_out_at      TIMESTAMPTZ,
  gps_lat           NUMERIC(10,7),
  gps_lng           NUMERIC(10,7),
  total_minutes     INTEGER,
  status            TEXT NOT NULL DEFAULT 'clocked_in'
                    CHECK (status IN ('clocked_in', 'completed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_clock_chef ON staff_clock_entries(chef_id);
CREATE INDEX idx_staff_clock_event ON staff_clock_entries(event_id);
CREATE INDEX idx_staff_clock_member ON staff_clock_entries(staff_member_id);
CREATE TRIGGER trg_staff_clock_updated_at
  BEFORE UPDATE ON staff_clock_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 3: STAFF PERFORMANCE SCORES
-- ============================================

CREATE TABLE IF NOT EXISTS staff_performance_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id   UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  on_time_rate      NUMERIC(5,2) DEFAULT 100.00,
  cancellation_count INTEGER NOT NULL DEFAULT 0,
  avg_rating        NUMERIC(3,2),
  total_events      INTEGER NOT NULL DEFAULT 0,
  last_computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_member_id, chef_id)
);
CREATE INDEX idx_staff_performance_chef ON staff_performance_scores(chef_id);
CREATE TRIGGER trg_staff_performance_updated_at
  BEFORE UPDATE ON staff_performance_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE staff_availability       ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_clock_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_scores ENABLE ROW LEVEL SECURITY;
-- staff_availability
CREATE POLICY sa_chef_select ON staff_availability FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sa_chef_insert ON staff_availability FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sa_chef_update ON staff_availability FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sa_chef_delete ON staff_availability FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- staff_clock_entries
CREATE POLICY sce_chef_select ON staff_clock_entries FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sce_chef_insert ON staff_clock_entries FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sce_chef_update ON staff_clock_entries FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sce_chef_delete ON staff_clock_entries FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- staff_performance_scores
CREATE POLICY sps_chef_select ON staff_performance_scores FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sps_chef_insert ON staff_performance_scores FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sps_chef_update ON staff_performance_scores FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sps_chef_delete ON staff_performance_scores FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

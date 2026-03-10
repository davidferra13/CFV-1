-- Staff Shift Scheduling
-- Weekly schedule builder with shift templates, availability preferences,
-- swap requests, and labor cost tracking.

-- ============================================
-- TABLE 1: SHIFT TEMPLATES
-- ============================================

CREATE TABLE shift_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  color         TEXT NOT NULL DEFAULT '#3B82F6',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_templates_tenant ON shift_templates(tenant_id);

COMMENT ON TABLE shift_templates IS 'Reusable shift templates (Morning, Evening, Split, etc.) for scheduling.';

CREATE TRIGGER trg_shift_templates_updated_at
  BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: SCHEDULED SHIFTS
-- ============================================

CREATE TABLE scheduled_shifts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id  UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  template_id      UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
  shift_date       DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  break_minutes    INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  role             TEXT CHECK (role IN ('cook', 'server', 'prep', 'dishwasher', 'manager', 'driver')),
  status           TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'confirmed', 'swap_requested', 'covered', 'cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_shifts_tenant_date ON scheduled_shifts(tenant_id, shift_date);
CREATE INDEX idx_scheduled_shifts_staff_date ON scheduled_shifts(tenant_id, staff_member_id, shift_date);

COMMENT ON TABLE scheduled_shifts IS 'Individual shift assignments for staff on specific dates.';

CREATE TRIGGER trg_scheduled_shifts_updated_at
  BEFORE UPDATE ON scheduled_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 3: STAFF AVAILABILITY
-- ============================================

CREATE TABLE staff_availability (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id  UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  day_of_week      INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  available        BOOLEAN NOT NULL DEFAULT true,
  preferred_start  TIME,
  preferred_end    TIME,
  notes            TEXT,

  UNIQUE (tenant_id, staff_member_id, day_of_week)
);

CREATE INDEX idx_staff_availability_tenant ON staff_availability(tenant_id);

COMMENT ON TABLE staff_availability IS 'Weekly availability preferences per staff member. day_of_week: 0=Sunday through 6=Saturday.';

-- ============================================
-- TABLE 4: SHIFT SWAP REQUESTS
-- ============================================

CREATE TABLE shift_swap_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  shift_id            UUID NOT NULL REFERENCES scheduled_shifts(id) ON DELETE CASCADE,
  requesting_staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  covering_staff_id   UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'claimed', 'approved', 'denied')),
  reason              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_swap_requests_tenant ON shift_swap_requests(tenant_id);

COMMENT ON TABLE shift_swap_requests IS 'Shift swap/coverage requests between staff members.';

CREATE TRIGGER trg_shift_swap_requests_updated_at
  BEFORE UPDATE ON shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE shift_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_shifts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests   ENABLE ROW LEVEL SECURITY;

-- shift_templates: tenant-scoped
CREATE POLICY st_select ON shift_templates FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY st_insert ON shift_templates FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY st_update ON shift_templates FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY st_delete ON shift_templates FOR DELETE USING (tenant_id = get_current_tenant_id());

-- scheduled_shifts: tenant-scoped
CREATE POLICY ss_select ON scheduled_shifts FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY ss_insert ON scheduled_shifts FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY ss_update ON scheduled_shifts FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY ss_delete ON scheduled_shifts FOR DELETE USING (tenant_id = get_current_tenant_id());

-- staff_availability: tenant-scoped
CREATE POLICY sa_select ON staff_availability FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY sa_insert ON staff_availability FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY sa_update ON staff_availability FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY sa_delete ON staff_availability FOR DELETE USING (tenant_id = get_current_tenant_id());

-- shift_swap_requests: tenant-scoped
CREATE POLICY ssr_select ON shift_swap_requests FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY ssr_insert ON shift_swap_requests FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY ssr_update ON shift_swap_requests FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY ssr_delete ON shift_swap_requests FOR DELETE USING (tenant_id = get_current_tenant_id());

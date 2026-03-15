-- Client Booking System
-- Adds event types (services a chef offers), weekly availability rules with time slots,
-- date overrides, and daily caps. Extends the existing booking page infrastructure.
-- All tables are new (additive only).

-- ============================================
-- TABLE 1: BOOKING EVENT TYPES
-- ============================================
-- Different types of bookings a chef offers (Tasting, Dinner Party, Cooking Class, etc.)

CREATE TABLE IF NOT EXISTS booking_event_types (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  duration_minutes      INTEGER NOT NULL DEFAULT 180,
  price_cents           INTEGER,
  guest_count_min       INTEGER NOT NULL DEFAULT 1,
  guest_count_max       INTEGER NOT NULL DEFAULT 50,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes  INTEGER NOT NULL DEFAULT 0,
  min_notice_hours      INTEGER NOT NULL DEFAULT 168,  -- 7 days default
  color                 TEXT,  -- hex color for calendar display
  sort_order            INTEGER NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE booking_event_types
  ADD CONSTRAINT bet_duration_pos CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  ADD CONSTRAINT bet_price_nonneg CHECK (price_cents IS NULL OR price_cents >= 0),
  ADD CONSTRAINT bet_guest_range CHECK (guest_count_min >= 1 AND guest_count_max >= guest_count_min),
  ADD CONSTRAINT bet_buffer_nonneg CHECK (buffer_before_minutes >= 0 AND buffer_after_minutes >= 0),
  ADD CONSTRAINT bet_notice_nonneg CHECK (min_notice_hours >= 0);
CREATE INDEX idx_booking_event_types_chef ON booking_event_types(chef_id, is_active, sort_order);
CREATE TRIGGER trg_booking_event_types_updated_at
  BEFORE UPDATE ON booking_event_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 2: BOOKING AVAILABILITY RULES
-- ============================================
-- Weekly recurring availability (e.g. Mondays 9am-5pm, Tuesdays 10am-8pm)

CREATE TABLE IF NOT EXISTS booking_availability_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  day_of_week           INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sun ... 6=Sat
  start_time            TIME NOT NULL DEFAULT '09:00',
  end_time              TIME NOT NULL DEFAULT '21:00',
  is_available          BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE booking_availability_rules
  ADD CONSTRAINT bar_time_order CHECK (start_time < end_time);
CREATE UNIQUE INDEX idx_booking_availability_rules_unique
  ON booking_availability_rules(chef_id, day_of_week);
CREATE TRIGGER trg_booking_availability_rules_updated_at
  BEFORE UPDATE ON booking_availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 3: BOOKING DATE OVERRIDES
-- ============================================
-- Specific date blocks or extra availability windows

CREATE TABLE IF NOT EXISTS booking_date_overrides (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  override_date         DATE NOT NULL,
  is_available          BOOLEAN NOT NULL DEFAULT false,
  start_time            TIME,   -- NULL means all day blocked/open
  end_time              TIME,
  reason                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_date_overrides_chef_date
  ON booking_date_overrides(chef_id, override_date);
-- ============================================
-- TABLE 4: BOOKING DAILY CAPS
-- ============================================
-- Max events per day/week for a chef

CREATE TABLE IF NOT EXISTS booking_daily_caps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,
  max_per_day           INTEGER NOT NULL DEFAULT 2,
  max_per_week          INTEGER NOT NULL DEFAULT 10,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE booking_daily_caps
  ADD CONSTRAINT bdc_max_per_day_pos CHECK (max_per_day > 0),
  ADD CONSTRAINT bdc_max_per_week_pos CHECK (max_per_week > 0);
CREATE TRIGGER trg_booking_daily_caps_updated_at
  BEFORE UPDATE ON booking_daily_caps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE booking_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_date_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_daily_caps ENABLE ROW LEVEL SECURITY;
-- Chef can manage own event types
DROP POLICY IF EXISTS "Chef manages own event types" ON booking_event_types;
CREATE POLICY "Chef manages own event types"
  ON booking_event_types FOR ALL
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'))
  WITH CHECK (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'));
-- Chef can manage own availability rules
DROP POLICY IF EXISTS "Chef manages own availability rules" ON booking_availability_rules;
CREATE POLICY "Chef manages own availability rules"
  ON booking_availability_rules FOR ALL
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'))
  WITH CHECK (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'));
-- Chef can manage own date overrides
DROP POLICY IF EXISTS "Chef manages own date overrides" ON booking_date_overrides;
CREATE POLICY "Chef manages own date overrides"
  ON booking_date_overrides FOR ALL
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'))
  WITH CHECK (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'));
-- Chef can manage own daily caps
DROP POLICY IF EXISTS "Chef manages own daily caps" ON booking_daily_caps;
CREATE POLICY "Chef manages own daily caps"
  ON booking_daily_caps FOR ALL
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'))
  WITH CHECK (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'));
-- Grants
GRANT ALL ON booking_event_types TO authenticated;
GRANT ALL ON booking_availability_rules TO authenticated;
GRANT ALL ON booking_date_overrides TO authenticated;
GRANT ALL ON booking_daily_caps TO authenticated;

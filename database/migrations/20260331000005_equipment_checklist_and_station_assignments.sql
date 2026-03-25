-- Equipment Checklist Per Event + Station-to-Staff Assignment
-- Two new tables for caterer archetype features

-- ═══════════════════════════════════════════════════
-- 1. event_equipment_checklist
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_equipment_checklist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  equipment_name text NOT NULL,
  category    text NOT NULL DEFAULT 'other'
    CHECK (category IN ('cooking', 'serving', 'transport', 'setup', 'cleaning', 'other')),
  quantity    int NOT NULL DEFAULT 1,
  source      text NOT NULL DEFAULT 'owned'
    CHECK (source IN ('owned', 'rental', 'venue_provided')),
  packed      boolean NOT NULL DEFAULT false,
  returned    boolean NOT NULL DEFAULT false,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (event_id, equipment_name, chef_id)
);
-- RLS
ALTER TABLE event_equipment_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chef owns equipment checklist" ON event_equipment_checklist;
CREATE POLICY "Chef owns equipment checklist"
  ON event_equipment_checklist
  FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
-- Indexes
CREATE INDEX idx_equip_checklist_event ON event_equipment_checklist(event_id);
CREATE INDEX idx_equip_checklist_chef  ON event_equipment_checklist(chef_id);
-- ═══════════════════════════════════════════════════
-- 2. event_station_assignments
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_station_assignments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id          uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  station_id       uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  staff_member_id  uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  role_notes       text,
  created_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (event_id, station_id, staff_member_id)
);
-- RLS
ALTER TABLE event_station_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chef owns station assignments" ON event_station_assignments;
CREATE POLICY "Chef owns station assignments"
  ON event_station_assignments
  FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
-- Indexes
CREATE INDEX idx_station_assign_event   ON event_station_assignments(event_id);
CREATE INDEX idx_station_assign_chef    ON event_station_assignments(chef_id);
CREATE INDEX idx_station_assign_station ON event_station_assignments(station_id);
CREATE INDEX idx_station_assign_staff   ON event_station_assignments(staff_member_id);

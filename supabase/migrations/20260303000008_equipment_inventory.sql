-- Equipment Inventory
-- Chefs can track owned equipment (with maintenance schedules) and
-- log rental costs per event. Both feed into event profit analysis.

CREATE TYPE equipment_category AS ENUM (
  'cookware',
  'knives',
  'smallwares',
  'appliances',
  'serving',
  'transport',
  'linen',
  'other'
);

-- ============================================
-- TABLE 1: OWNED EQUIPMENT
-- ============================================

CREATE TABLE equipment_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                  UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name                     TEXT NOT NULL,
  category                 equipment_category NOT NULL DEFAULT 'other',
  purchase_date            DATE,
  purchase_price_cents     INTEGER CHECK (purchase_price_cents >= 0),
  current_value_cents      INTEGER CHECK (current_value_cents >= 0),
  serial_number            TEXT,
  notes                    TEXT,

  -- Maintenance tracking
  maintenance_interval_days INTEGER,  -- e.g. 365 for annual sharpening
  last_maintained_at       DATE,

  status                   TEXT NOT NULL DEFAULT 'owned'
                           CHECK (status IN ('owned', 'retired')),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_chef_category ON equipment_items(chef_id, category);
CREATE INDEX idx_equipment_chef_status   ON equipment_items(chef_id, status);

COMMENT ON TABLE equipment_items IS 'Chef-owned equipment inventory with maintenance schedule tracking.';
COMMENT ON COLUMN equipment_items.maintenance_interval_days IS 'How often this item needs maintenance. NULL = no schedule.';
COMMENT ON COLUMN equipment_items.last_maintained_at IS 'Date of last maintenance. Used to compute next due date.';

CREATE TRIGGER trg_equipment_updated_at
  BEFORE UPDATE ON equipment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: EQUIPMENT RENTALS (per event)
-- ============================================

CREATE TABLE equipment_rentals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id        UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- What was rented
  equipment_name TEXT NOT NULL,
  vendor_name    TEXT,
  rental_date    DATE NOT NULL,
  return_date    DATE,
  cost_cents     INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),

  -- Optional event linkage
  event_id       UUID REFERENCES events(id) ON DELETE SET NULL,
  notes          TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_rentals_chef  ON equipment_rentals(chef_id, rental_date DESC);
CREATE INDEX idx_equipment_rentals_event ON equipment_rentals(event_id);

COMMENT ON TABLE equipment_rentals IS 'Tracks rented equipment costs, optionally linked to a specific event.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE equipment_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_rentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eq_chef_select ON equipment_items;
CREATE POLICY eq_chef_select ON equipment_items FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS eq_chef_insert ON equipment_items;
CREATE POLICY eq_chef_insert ON equipment_items FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS eq_chef_update ON equipment_items;
CREATE POLICY eq_chef_update ON equipment_items FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS eq_chef_delete ON equipment_items;
CREATE POLICY eq_chef_delete ON equipment_items FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS er_chef_select ON equipment_rentals;
CREATE POLICY er_chef_select ON equipment_rentals FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS er_chef_insert ON equipment_rentals;
CREATE POLICY er_chef_insert ON equipment_rentals FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS er_chef_update ON equipment_rentals;
CREATE POLICY er_chef_update ON equipment_rentals FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS er_chef_delete ON equipment_rentals;
CREATE POLICY er_chef_delete ON equipment_rentals FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

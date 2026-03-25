-- Phase 3: Scaling Engine Extensions
-- 1. Equipment assignment to events (checklist)
-- 2. Shareable menu links (client-facing view)
-- 3. Post-event leftover tracking (waste feedback loop)

-- ============================================
-- TABLE 1: EVENT EQUIPMENT ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS event_equipment_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  equipment_item_id UUID REFERENCES equipment_items(id) ON DELETE SET NULL,

  -- For items not in inventory (disposables, rentals, borrowed)
  custom_name      TEXT,
  category         TEXT,
  quantity         INTEGER NOT NULL DEFAULT 1,

  notes            TEXT,
  checked_off      BOOLEAN NOT NULL DEFAULT false,
  checked_at       TIMESTAMPTZ,

  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Must have either an equipment_item_id or custom_name
  CONSTRAINT eq_assignment_has_item
    CHECK (equipment_item_id IS NOT NULL OR custom_name IS NOT NULL)
);
CREATE INDEX idx_eq_assign_event ON event_equipment_assignments(event_id);
CREATE INDEX idx_eq_assign_chef  ON event_equipment_assignments(chef_id, event_id);
ALTER TABLE event_equipment_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eq_assign_chef_all ON event_equipment_assignments;
CREATE POLICY eq_assign_chef_all ON event_equipment_assignments
  FOR ALL USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
DROP TRIGGER IF EXISTS trg_eq_assign_updated_at ON event_equipment_assignments;
CREATE TRIGGER trg_eq_assign_updated_at
  BEFORE UPDATE ON event_equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 2: SHAREABLE MENU LINK COLUMNS
-- ============================================

ALTER TABLE front_of_house_menus
  ADD COLUMN IF NOT EXISTS share_token     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pricing_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_foh_share_token
  ON front_of_house_menus(share_token) WHERE share_token IS NOT NULL;
-- Public access policy for shared menus (no auth required, token-based)
DROP POLICY IF EXISTS foh_public_share ON front_of_house_menus;
CREATE POLICY foh_public_share ON front_of_house_menus
  FOR SELECT USING (
    share_token IS NOT NULL
    AND (share_expires_at IS NULL OR share_expires_at > now())
  );
-- ============================================
-- TABLE 3: EVENT LEFTOVER DETAILS
-- ============================================

CREATE TABLE IF NOT EXISTS event_leftover_details (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  component_id     UUID REFERENCES components(id) ON DELETE SET NULL,

  item_name        TEXT NOT NULL,
  quantity_leftover DECIMAL NOT NULL CHECK (quantity_leftover >= 0),
  unit             TEXT NOT NULL,
  original_quantity DECIMAL,

  disposition      TEXT NOT NULL DEFAULT 'discarded'
                   CHECK (disposition IN (
                     'discarded', 'donated', 'repurposed',
                     'carried_forward', 'staff_meal', 'composted'
                   )),
  next_event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  storage_method   TEXT CHECK (storage_method IN ('fridge', 'freezer', 'room_temp', 'other')),
  shelf_life_hours INTEGER,
  notes            TEXT,

  captured_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leftover_event ON event_leftover_details(event_id);
CREATE INDEX idx_leftover_chef  ON event_leftover_details(chef_id, captured_at DESC);
ALTER TABLE event_leftover_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leftover_chef_all ON event_leftover_details;
CREATE POLICY leftover_chef_all ON event_leftover_details
  FOR ALL USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );

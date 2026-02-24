-- Migration: Batch/FIFO Tracking + Staff Meals
-- Tracks ingredient batches for FIFO and expiry management.
-- Tracks staff/family meals as a separate cost category.

-- ============================================
-- TABLE: inventory_batches
-- FIFO tracking with expiry management
-- ============================================
CREATE TABLE inventory_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id     UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name   TEXT NOT NULL,

  received_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date       DATE,
  lot_number        TEXT,

  vendor_id         UUID REFERENCES vendors(id) ON DELETE SET NULL,
  purchase_order_id UUID,
  vendor_invoice_id UUID REFERENCES vendor_invoices(id) ON DELETE SET NULL,

  initial_qty       NUMERIC(10,3) NOT NULL,
  remaining_qty     NUMERIC(10,3) NOT NULL,
  unit              TEXT NOT NULL,
  unit_cost_cents   INTEGER,

  location_id       UUID REFERENCES storage_locations(id) ON DELETE SET NULL,

  is_depleted       BOOLEAN NOT NULL DEFAULT false,
  is_expired        BOOLEAN NOT NULL DEFAULT false,

  photo_url         TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_batches_chef_ingredient ON inventory_batches(chef_id, ingredient_id, is_depleted);
CREATE INDEX idx_batches_expiry ON inventory_batches(chef_id, expiry_date)
  WHERE NOT is_depleted AND expiry_date IS NOT NULL;
CREATE INDEX idx_batches_fifo ON inventory_batches(chef_id, ingredient_id, received_date ASC)
  WHERE NOT is_depleted;

CREATE TRIGGER trg_batches_updated_at
  BEFORE UPDATE ON inventory_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: staff_meals
-- ============================================
CREATE TABLE staff_meals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  meal_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  staff_count     INTEGER NOT NULL DEFAULT 1,
  description     TEXT,
  recipe_id       UUID REFERENCES recipes(id) ON DELETE SET NULL,
  total_cost_cents INTEGER,
  photo_url       TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_meals_chef ON staff_meals(chef_id, meal_date DESC);
CREATE INDEX idx_staff_meals_event ON staff_meals(event_id) WHERE event_id IS NOT NULL;

-- ============================================
-- TABLE: staff_meal_items
-- ============================================
CREATE TABLE staff_meal_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_meal_id   UUID NOT NULL REFERENCES staff_meals(id) ON DELETE CASCADE,
  ingredient_id   UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name TEXT NOT NULL,
  quantity        NUMERIC(10,3) NOT NULL,
  unit            TEXT NOT NULL,
  cost_cents      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_meal_items_meal ON staff_meal_items(staff_meal_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_meal_items ENABLE ROW LEVEL SECURITY;

-- inventory_batches: chef-only
CREATE POLICY ib_chef_select ON inventory_batches FOR SELECT
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY ib_chef_insert ON inventory_batches FOR INSERT
  WITH CHECK (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY ib_chef_update ON inventory_batches FOR UPDATE
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));

-- staff_meals: chef-only
CREATE POLICY sm_chef_select ON staff_meals FOR SELECT
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY sm_chef_insert ON staff_meals FOR INSERT
  WITH CHECK (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
CREATE POLICY sm_chef_update ON staff_meals FOR UPDATE
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));

-- staff_meal_items: via parent join
CREATE POLICY smi_chef_select ON staff_meal_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff_meals sm
    WHERE sm.id = staff_meal_id
    AND sm.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));
CREATE POLICY smi_chef_insert ON staff_meal_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM staff_meals sm
    WHERE sm.id = staff_meal_id
    AND sm.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));

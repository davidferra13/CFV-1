-- Restaurant Operations Foundation
-- Covers: Tasks, Stations/Clipboard, Vendors/Food Cost, Guest CRM, Daily Revenue
-- All tables are additive. No existing tables are modified or dropped.
-- Chef feedback sources: Evan (Mancini's Italian Deli), Brett (Prizzaslinger Pizzeria)

-- ============================================
-- SECTION 1: TASK MANAGEMENT SYSTEM
-- ============================================

-- ENUM: Task priority
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ENUM: Task status
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ENUM: Task template category
DO $$ BEGIN CREATE TYPE task_template_category AS ENUM ('opening', 'closing', 'prep', 'cleaning', 'custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Table: Task Templates (reusable checklists)
CREATE TABLE task_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        task_template_category NOT NULL DEFAULT 'custom',
  items           JSONB NOT NULL DEFAULT '[]',
  -- items format: [{ "title": "Sweep floors", "description": "...", "estimatedMinutes": 15 }]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_templates_chef ON task_templates(chef_id);
COMMENT ON TABLE task_templates IS 'Reusable task checklists: opening duties, closing duties, prep lists, cleaning routines.';
CREATE TRIGGER trg_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_templates_chef_policy ON task_templates
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Tasks (individual task items)
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  station_id      UUID,          -- nullable, references stations table (created below)
  assigned_to     UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES task_templates(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        DATE,
  due_time        TIME,
  priority        task_priority NOT NULL DEFAULT 'medium',
  status          task_status NOT NULL DEFAULT 'pending',
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  recurring_rule  JSONB,
  -- recurring_rule format: { "frequency": "daily|weekly|monthly", "days": [1,3,5], "endDate": null }
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_chef ON tasks(chef_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_due ON tasks(chef_id, due_date, status);
CREATE INDEX idx_tasks_station ON tasks(station_id) WHERE station_id IS NOT NULL;
COMMENT ON TABLE tasks IS 'Individual task items. Assigned to staff, tracked to completion. Supports recurring rules.';
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_chef_policy ON tasks
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Task Completion Log (append-only, never delete)
CREATE TABLE task_completion_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  notes           TEXT
);
CREATE INDEX idx_task_completion_log_task ON task_completion_log(task_id);
CREATE INDEX idx_task_completion_log_chef ON task_completion_log(chef_id, completed_at);
COMMENT ON TABLE task_completion_log IS 'Append-only record of every task completion. Never deleted. Historical accountability.';
ALTER TABLE task_completion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_completion_log_chef_policy ON task_completion_log
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- ============================================
-- SECTION 2: STATION CLIPBOARD SYSTEM
-- ============================================

-- Table: Stations (physical kitchen positions)
CREATE TABLE stations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stations_chef ON stations(chef_id, status);
COMMENT ON TABLE stations IS 'Physical kitchen stations: grill, sauté, sandwich, prep, pizza, pastry, etc.';
CREATE TRIGGER trg_stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY stations_chef_policy ON stations
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Now add the FK on tasks.station_id
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_station
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL;
-- Table: Station Menu Items (what each station produces)
CREATE TABLE station_menu_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id      UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_item_id    UUID,          -- nullable link to existing menu_items table
  name            TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_station_menu_items_station ON station_menu_items(station_id);
COMMENT ON TABLE station_menu_items IS 'Menu items assigned to a station. E.g., grill station owns "Grilled Chicken Sandwich."';
ALTER TABLE station_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY station_menu_items_chef_policy ON station_menu_items
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Station Components (ingredient/component breakdown per menu item)
CREATE TABLE station_components (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_menu_item_id  UUID NOT NULL REFERENCES station_menu_items(id) ON DELETE CASCADE,
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id         UUID,    -- nullable link to existing ingredients table
  name                  TEXT NOT NULL,
  unit                  TEXT NOT NULL DEFAULT 'each',
  par_level             NUMERIC(10,2) NOT NULL DEFAULT 0,
  par_unit              TEXT NOT NULL DEFAULT 'each',
  shelf_life_days       INTEGER,  -- nullable: how many days this prep lasts
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_station_components_menu_item ON station_components(station_menu_item_id);
CREATE INDEX idx_station_components_chef ON station_components(chef_id);
COMMENT ON TABLE station_components IS 'Breakdown of each menu item into components/ingredients with par levels and shelf life.';
CREATE TRIGGER trg_station_components_updated_at
  BEFORE UPDATE ON station_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE station_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY station_components_chef_policy ON station_components
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- ENUM: Waste reason
DO $$ BEGIN CREATE TYPE waste_reason AS ENUM ('expired', 'damaged', 'overproduced', 'dropped', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Table: Clipboard Entries (per-station, per-day tracking)
CREATE TABLE clipboard_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id      UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  component_id    UUID NOT NULL REFERENCES station_components(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  on_hand         NUMERIC(10,2) DEFAULT 0,
  made            NUMERIC(10,2) DEFAULT 0,
  made_at         TIMESTAMPTZ,
  need_to_make    NUMERIC(10,2) DEFAULT 0,
  need_to_order   NUMERIC(10,2) DEFAULT 0,
  waste_qty       NUMERIC(10,2) DEFAULT 0,
  waste_reason_code waste_reason,
  location        TEXT CHECK (location IS NULL OR location IN ('line', 'backup')),
  is_86d          BOOLEAN NOT NULL DEFAULT false,
  eighty_sixed_at TIMESTAMPTZ,
  notes           TEXT,
  updated_by      UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(station_id, component_id, entry_date)
);
CREATE INDEX idx_clipboard_entries_station_date ON clipboard_entries(station_id, entry_date);
CREATE INDEX idx_clipboard_entries_chef ON clipboard_entries(chef_id, entry_date);
CREATE INDEX idx_clipboard_entries_86 ON clipboard_entries(chef_id, is_86d) WHERE is_86d = true;
COMMENT ON TABLE clipboard_entries IS 'Daily station clipboard: par, on-hand, made, need-to-make, need-to-order, waste, 86 status. One row per component per station per day.';
ALTER TABLE clipboard_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY clipboard_entries_chef_policy ON clipboard_entries
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- ENUM: Shift type
DO $$ BEGIN CREATE TYPE shift_type AS ENUM ('open', 'close', 'mid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Table: Shift Logs (check-in / check-out records)
CREATE TABLE shift_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id      UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  shift           shift_type NOT NULL DEFAULT 'open',
  check_in_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at    TIMESTAMPTZ,
  notes           TEXT,
  snapshot        JSONB,
  -- snapshot: frozen copy of clipboard state at check-out time
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shift_logs_station ON shift_logs(station_id, check_in_at);
CREATE INDEX idx_shift_logs_chef ON shift_logs(chef_id, check_in_at);
COMMENT ON TABLE shift_logs IS 'Shift check-in/check-out records with frozen clipboard snapshot at check-out.';
ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_logs_chef_policy ON shift_logs
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- ENUM: Order request status
DO $$ BEGIN CREATE TYPE order_request_status AS ENUM ('pending', 'ordered', 'received'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Table: Order Requests (station-level ordering needs)
CREATE TABLE order_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  component_id    UUID NOT NULL REFERENCES station_components(id) ON DELETE CASCADE,
  station_id      UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  quantity        NUMERIC(10,2) NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'each',
  requested_by    UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          order_request_status NOT NULL DEFAULT 'pending',
  fulfilled_at    TIMESTAMPTZ,
  notes           TEXT
);
CREATE INDEX idx_order_requests_chef_status ON order_requests(chef_id, status);
CREATE INDEX idx_order_requests_station ON order_requests(station_id, status);
COMMENT ON TABLE order_requests IS 'Per-station order needs. Roll up into unified order sheet for the purchaser.';
ALTER TABLE order_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_requests_chef_policy ON order_requests
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Waste Log (append-only tracking of all waste events)
CREATE TABLE waste_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  station_id            UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  component_id          UUID NOT NULL REFERENCES station_components(id) ON DELETE CASCADE,
  staff_member_id       UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  quantity              NUMERIC(10,2) NOT NULL,
  unit                  TEXT NOT NULL DEFAULT 'each',
  reason                waste_reason NOT NULL DEFAULT 'other',
  estimated_value_cents INTEGER DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waste_log_chef ON waste_log(chef_id, created_at);
CREATE INDEX idx_waste_log_station ON waste_log(station_id, created_at);
COMMENT ON TABLE waste_log IS 'Append-only waste/spoilage log. Never deleted. Feeds into food cost accuracy.';
ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY waste_log_chef_policy ON waste_log
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- ENUM: Ops log action types
DO $$ BEGIN CREATE TYPE ops_log_action AS ENUM ('check_in', 'check_out', 'prep_complete', 'stock_update', 'order_request', 'delivery_received', 'waste', 'eighty_six'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Table: Ops Log (append-only master log of all station operations)
CREATE TABLE ops_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  station_id      UUID REFERENCES stations(id) ON DELETE SET NULL,
  staff_member_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  action_type     ops_log_action NOT NULL,
  details         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ops_log_chef ON ops_log(chef_id, created_at);
CREATE INDEX idx_ops_log_station ON ops_log(station_id, created_at) WHERE station_id IS NOT NULL;
CREATE INDEX idx_ops_log_action ON ops_log(chef_id, action_type, created_at);
COMMENT ON TABLE ops_log IS 'Append-only master log: every check-in, check-out, prep, stock update, order, delivery, waste, 86. Never deleted.';
ALTER TABLE ops_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY ops_log_chef_policy ON ops_log
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- ============================================
-- SECTION 3: VENDOR & FOOD COST SYSTEM
-- ============================================

-- Table: Vendors (purveyors/suppliers)
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_name    TEXT,
  phone           TEXT,
  email           TEXT,
  account_number  TEXT,
  delivery_days   TEXT[],         -- e.g., {'monday','wednesday','friday'}
  payment_terms   TEXT,           -- e.g., 'Net 30', 'COD', 'Credit card on file'
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendors_chef ON vendors(chef_id, status);
COMMENT ON TABLE vendors IS 'Purveyors/suppliers: Sysco, US Foods, local distributors, etc.';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vendors_updated_at') THEN
    CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'vendors_chef_policy') THEN
    CREATE POLICY vendors_chef_policy ON vendors USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
  END IF;
END $$;
-- Table: Vendor Items (one-time mapping of vendor catalog to your ingredients)
CREATE TABLE vendor_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id   UUID,           -- nullable link to your ingredient/recipe system
  vendor_sku      TEXT,
  vendor_item_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0
                  CHECK (unit_price_cents >= 0),
  unit_size       NUMERIC(10,2),  -- e.g., 40 (for 40lb case)
  unit_measure    TEXT,            -- e.g., 'lb', 'each', 'case', 'gallon'
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,

  UNIQUE(vendor_id, vendor_sku)
);
CREATE INDEX idx_vendor_items_vendor ON vendor_items(vendor_id);
CREATE INDEX idx_vendor_items_chef ON vendor_items(chef_id);
CREATE INDEX idx_vendor_items_ingredient ON vendor_items(ingredient_id) WHERE ingredient_id IS NOT NULL;
COMMENT ON TABLE vendor_items IS 'Per-vendor pricing for ingredients. One-time mapping: vendor catalog item → your ingredient.';
ALTER TABLE vendor_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_items_chef_policy ON vendor_items
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Invoices (purchase records from vendors)
CREATE TABLE IF NOT EXISTS vendor_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  invoice_number  TEXT,
  invoice_date    DATE NOT NULL,
  total_cents     INTEGER NOT NULL DEFAULT 0
                  CHECK (total_cents >= 0),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_chef ON vendor_invoices(chef_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor ON vendor_invoices(vendor_id, invoice_date);
COMMENT ON TABLE vendor_invoices IS 'Purchase invoices from vendors. Each has line items for food cost tracking.';
ALTER TABLE vendor_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_invoices' AND policyname = 'vendor_invoices_chef_policy') THEN
    CREATE POLICY vendor_invoices_chef_policy ON vendor_invoices USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
  END IF;
END $$;
-- Table: Invoice Line Items
CREATE TABLE vendor_invoice_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES vendor_invoices(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_item_id  UUID REFERENCES vendor_items(id) ON DELETE SET NULL,
  ingredient_id   UUID,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  total_cents     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_vendor_invoice_line_items_invoice ON vendor_invoice_line_items(invoice_id);
CREATE INDEX idx_vendor_invoice_line_items_chef ON vendor_invoice_line_items(chef_id);
COMMENT ON TABLE vendor_invoice_line_items IS 'Line items on vendor invoices. Quantity × unit price = total.';
ALTER TABLE vendor_invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_invoice_line_items_chef_policy ON vendor_invoice_line_items
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Daily Revenue (denominator for food cost %)
CREATE TABLE daily_revenue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  total_revenue_cents INTEGER NOT NULL DEFAULT 0
                      CHECK (total_revenue_cents >= 0),
  source              TEXT NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('manual', 'csv', 'pos')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(chef_id, date)
);
CREATE INDEX idx_daily_revenue_chef ON daily_revenue(chef_id, date);
COMMENT ON TABLE daily_revenue IS 'Daily sales totals. The denominator for food cost %. Enter manually or upload CSV from POS.';
CREATE TRIGGER trg_daily_revenue_updated_at
  BEFORE UPDATE ON daily_revenue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE daily_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_revenue_chef_policy ON daily_revenue
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- ============================================
-- SECTION 4: GUEST CRM
-- ============================================

-- Table: Guests (restaurant guest profiles)
CREATE TABLE guests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  first_visit_date  DATE,
  last_visit_date   DATE,
  total_visits      INTEGER NOT NULL DEFAULT 0,
  total_spend_cents INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guests_chef ON guests(chef_id);
CREATE INDEX idx_guests_name ON guests(chef_id, name);
CREATE INDEX idx_guests_phone ON guests(chef_id, phone) WHERE phone IS NOT NULL;
COMMENT ON TABLE guests IS 'Restaurant guest profiles: name, contact, preferences, visit history, comp tracking.';
CREATE TRIGGER trg_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY guests_chef_policy ON guests
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Guest Tags (VIP, regular, problem, etc.)
CREATE TABLE guest_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id        UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tag             TEXT NOT NULL,       -- 'vip', 'regular', 'new', 'problem', 'comp_pending', or custom
  color           TEXT DEFAULT 'gray', -- for UI badge color
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(guest_id, tag)
);
CREATE INDEX idx_guest_tags_guest ON guest_tags(guest_id);
CREATE INDEX idx_guest_tags_chef ON guest_tags(chef_id, tag);
COMMENT ON TABLE guest_tags IS 'Color-coded tags: VIP, regular, problem, comp_pending, custom text.';
ALTER TABLE guest_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_tags_chef_policy ON guest_tags
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Guest Comps (promises: "free app next visit")
CREATE TABLE guest_comps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id        UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,       -- "Free appetizer", "Complimentary dessert"
  created_by      UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed        BOOLEAN NOT NULL DEFAULT false,
  redeemed_at     TIMESTAMPTZ,
  redeemed_by     UUID REFERENCES staff_members(id) ON DELETE SET NULL
);
CREATE INDEX idx_guest_comps_guest ON guest_comps(guest_id, redeemed);
CREATE INDEX idx_guest_comps_chef ON guest_comps(chef_id, redeemed);
COMMENT ON TABLE guest_comps IS 'Comp promises: "free app next visit." Visible at check-in, one-click redeem.';
ALTER TABLE guest_comps ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_comps_chef_policy ON guest_comps
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- Table: Guest Visits (visit log)
CREATE TABLE guest_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id        UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  visit_date      DATE NOT NULL,
  party_size      INTEGER DEFAULT 1,
  spend_cents     INTEGER DEFAULT 0,
  server_id       UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guest_visits_guest ON guest_visits(guest_id, visit_date);
CREATE INDEX idx_guest_visits_chef ON guest_visits(chef_id, visit_date);
COMMENT ON TABLE guest_visits IS 'Per-visit log: date, party size, spend, server, notes. Full history on guest profile.';
ALTER TABLE guest_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_visits_chef_policy ON guest_visits
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
-- ENUM: Reservation status
DO $$ BEGIN CREATE TYPE guest_reservation_status AS ENUM ('confirmed', 'seated', 'completed', 'no_show', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Table: Guest Reservations
CREATE TABLE guest_reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id          UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  reservation_date  DATE NOT NULL,
  reservation_time  TIME,
  party_size        INTEGER DEFAULT 1,
  table_number      TEXT,
  status            guest_reservation_status NOT NULL DEFAULT 'confirmed',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guest_reservations_chef_date ON guest_reservations(chef_id, reservation_date);
CREATE INDEX idx_guest_reservations_guest ON guest_reservations(guest_id);
COMMENT ON TABLE guest_reservations IS 'Guest reservations linked to profiles. Notes/tags visible at check-in.';
CREATE TRIGGER trg_guest_reservations_updated_at
  BEFORE UPDATE ON guest_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE guest_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_reservations_chef_policy ON guest_reservations
  USING (chef_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));

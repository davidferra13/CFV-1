-- Food Cost Intelligence: Inventory Counts, Waste Logging, Vendor Invoice Reconciliation
-- Closes gaps identified in competitive analysis vs MarketMan

-- ============================================
-- TABLE 1: INVENTORY COUNTS (Par Levels)
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_counts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id     UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name   TEXT NOT NULL,
  current_qty       NUMERIC(10,3) NOT NULL DEFAULT 0,
  par_level         NUMERIC(10,3),
  unit              TEXT NOT NULL,
  last_counted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  vendor_id         UUID REFERENCES vendors(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_counts_chef ON inventory_counts(chef_id);
CREATE INDEX idx_inventory_counts_ingredient ON inventory_counts(chef_id, ingredient_name);

CREATE TRIGGER trg_inventory_counts_updated_at
  BEFORE UPDATE ON inventory_counts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: WASTE LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS waste_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id              UUID REFERENCES events(id) ON DELETE SET NULL,
  ingredient_name       TEXT NOT NULL,
  quantity              NUMERIC(10,3) NOT NULL,
  unit                  TEXT NOT NULL,
  estimated_cost_cents  INTEGER NOT NULL DEFAULT 0,
  reason                TEXT NOT NULL
                        CHECK (reason IN ('overcooked', 'leftover', 'spoilage', 'overportioned', 'trim', 'mistake', 'expired', 'other')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waste_logs_chef ON waste_logs(chef_id, created_at DESC);
CREATE INDEX idx_waste_logs_event ON waste_logs(event_id);

-- ============================================
-- TABLE 3: VENDOR INVOICES
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id         UUID REFERENCES vendors(id) ON DELETE SET NULL,
  invoice_number    TEXT,
  invoice_date      DATE NOT NULL,
  total_cents       INTEGER NOT NULL,
  photo_url         TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'matched', 'disputed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_invoices_chef ON vendor_invoices(chef_id, invoice_date DESC);
CREATE INDEX idx_vendor_invoices_vendor ON vendor_invoices(vendor_id);

CREATE TRIGGER trg_vendor_invoices_updated_at
  BEFORE UPDATE ON vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 4: VENDOR INVOICE ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_invoice_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_invoice_id       UUID NOT NULL REFERENCES vendor_invoices(id) ON DELETE CASCADE,
  item_name               TEXT NOT NULL,
  quantity                NUMERIC(10,3),
  unit_price_cents        INTEGER NOT NULL,
  total_cents             INTEGER NOT NULL,
  matched_ingredient_id   UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  price_changed           BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_invoice_items_invoice ON vendor_invoice_items(vendor_invoice_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE inventory_counts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_invoice_items  ENABLE ROW LEVEL SECURITY;

-- inventory_counts
CREATE POLICY ic_chef_select ON inventory_counts FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ic_chef_insert ON inventory_counts FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ic_chef_update ON inventory_counts FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ic_chef_delete ON inventory_counts FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- waste_logs
CREATE POLICY wl_chef_select ON waste_logs FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY wl_chef_insert ON waste_logs FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY wl_chef_update ON waste_logs FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY wl_chef_delete ON waste_logs FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- vendor_invoices
CREATE POLICY vi_chef_select ON vendor_invoices FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY vi_chef_insert ON vendor_invoices FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY vi_chef_update ON vendor_invoices FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY vi_chef_delete ON vendor_invoices FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- vendor_invoice_items (via parent join)
CREATE POLICY vii_chef_select ON vendor_invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendor_invoices vi WHERE vi.id = vendor_invoice_id AND vi.chef_id = get_current_tenant_id() AND get_current_user_role() = 'chef')
);
CREATE POLICY vii_chef_insert ON vendor_invoice_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM vendor_invoices vi WHERE vi.id = vendor_invoice_id AND vi.chef_id = get_current_tenant_id() AND get_current_user_role() = 'chef')
);
CREATE POLICY vii_chef_update ON vendor_invoice_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM vendor_invoices vi WHERE vi.id = vendor_invoice_id AND vi.chef_id = get_current_tenant_id() AND get_current_user_role() = 'chef')
);
CREATE POLICY vii_chef_delete ON vendor_invoice_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM vendor_invoices vi WHERE vi.id = vendor_invoice_id AND vi.chef_id = get_current_tenant_id() AND get_current_user_role() = 'chef')
);

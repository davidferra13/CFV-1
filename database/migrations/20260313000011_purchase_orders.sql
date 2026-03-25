-- Purchase Orders and Daily Checklists
-- Additive only. No drops, no type changes.

-- ============================================
-- Purchase Orders
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'acknowledged', 'partially_received', 'received', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  notes TEXT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage their own purchase orders" ON purchase_orders;
CREATE POLICY "Chefs manage their own purchase orders"
  ON purchase_orders FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
CREATE INDEX idx_purchase_orders_chef ON purchase_orders(chef_id);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(chef_id, status);
-- Auto-update updated_at
CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- PO number sequence per chef (auto-generated PO-YYYY-NNNNN)
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;
COMMENT ON TABLE purchase_orders IS 'Purchase orders sent to vendors for ingredient/supply procurement';
-- ============================================
-- Purchase Order Items
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_cost_cents INTEGER,
  total_cost_cents INTEGER,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage their own PO items" ON purchase_order_items;
CREATE POLICY "Chefs manage their own PO items"
  ON purchase_order_items FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_chef ON purchase_order_items(chef_id);
COMMENT ON TABLE purchase_order_items IS 'Line items within a purchase order';
-- ============================================
-- Daily Checklist Completions
-- ============================================

CREATE TABLE IF NOT EXISTS daily_checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  checklist_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('opening', 'closing')),
  item_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by TEXT,
  notes TEXT,
  UNIQUE (chef_id, checklist_date, checklist_type, item_key)
);
ALTER TABLE daily_checklist_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage their own checklist completions" ON daily_checklist_completions;
CREATE POLICY "Chefs manage their own checklist completions"
  ON daily_checklist_completions FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
CREATE INDEX idx_checklist_completions_date
  ON daily_checklist_completions(chef_id, checklist_date, checklist_type);
COMMENT ON TABLE daily_checklist_completions IS 'Tracks completion of daily opening/closing checklist items';
-- ============================================
-- Custom Checklist Items
-- ============================================

CREATE TABLE IF NOT EXISTS daily_checklist_custom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('opening', 'closing')),
  category TEXT NOT NULL DEFAULT 'Custom',
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE daily_checklist_custom_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage their own custom checklist items" ON daily_checklist_custom_items;
CREATE POLICY "Chefs manage their own custom checklist items"
  ON daily_checklist_custom_items FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
CREATE INDEX idx_custom_checklist_chef
  ON daily_checklist_custom_items(chef_id, checklist_type);
COMMENT ON TABLE daily_checklist_custom_items IS 'Chef-defined custom items for daily opening/closing checklists';

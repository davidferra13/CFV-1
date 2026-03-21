-- Add columns that might be missing from earlier purchase_orders migration
DO $$ BEGIN
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS event_id UUID;
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_location_id UUID;
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS estimated_total_cents INTEGER DEFAULT 0;
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS actual_total_cents INTEGER;
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS photo_url TEXT;
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add missing columns to purchase_order_items
DO $$ BEGIN
  ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS received_quantity NUMERIC(10,3);
  ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS variance_notes TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_po_chef_status ON purchase_orders(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_po_event ON purchase_orders(event_id) WHERE event_id IS NOT NULL;

-- Trigger (idempotent)
DROP TRIGGER IF EXISTS trg_po_updated_at ON purchase_orders;
CREATE OR REPLACE FUNCTION update_purchase_order_updated_at() RETURNS TRIGGER AS $t$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$t$ LANGUAGE plpgsql;
CREATE TRIGGER trg_po_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_purchase_order_updated_at();

CREATE TABLE IF NOT EXISTS shopping_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  store_name TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  total_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]',
  event_id UUID,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant_date ON shopping_receipts(tenant_id, receipt_date DESC);

CREATE TABLE IF NOT EXISTS inventory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  ingredient_id UUID,
  ingredient_name TEXT NOT NULL,
  quantity_on_hand NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'each',
  last_purchased_at TIMESTAMPTZ,
  expiry_date DATE,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory_entries(tenant_id);

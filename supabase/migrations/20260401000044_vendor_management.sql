-- Supplier/vendor management (additive to existing vendors table from migration 023)
-- Adds missing columns and vendor_price_entries table.

-- Add columns that may not exist on the original vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating INTEGER;

-- Index on chef_id + vendor_type (existing column name)
CREATE INDEX IF NOT EXISTS idx_vendors_chef_type ON vendors(chef_id, vendor_type);

-- RLS policy
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chef_own_vendors" ON vendors;
CREATE POLICY "chef_own_vendors" ON vendors FOR ALL USING (chef_id = auth.uid());

-- Vendor price history (track prices over time)
CREATE TABLE IF NOT EXISTS vendor_price_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  unit TEXT NOT NULL,
  recorded_at DATE NOT NULL DEFAULT current_date,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE vendor_price_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chef_own_vendor_prices" ON vendor_price_entries;
CREATE POLICY "chef_own_vendor_prices" ON vendor_price_entries FOR ALL USING (chef_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_vendor_prices_item ON vendor_price_entries(chef_id, item_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_prices_vendor ON vendor_price_entries(vendor_id, recorded_at DESC);

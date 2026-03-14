-- Vendor catalog import queue for staged review + approval workflow.

CREATE TABLE IF NOT EXISTS vendor_catalog_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  source_type TEXT NOT NULL DEFAULT 'csv'
    CHECK (source_type IN ('csv', 'xlsx', 'pdf', 'manual')),
  source_filename TEXT,
  source_row_number INTEGER NOT NULL DEFAULT 1 CHECK (source_row_number > 0),

  vendor_sku TEXT,
  vendor_item_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_size NUMERIC(10,3),
  unit_measure TEXT,
  notes TEXT,

  confidence TEXT NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),
  parse_flags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'rejected', 'error')),
  applied_vendor_item_id UUID REFERENCES vendor_items(id) ON DELETE SET NULL,
  decision_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_catalog_import_rows_vendor_status
  ON vendor_catalog_import_rows (vendor_id, status, source_row_number);
CREATE INDEX IF NOT EXISTS idx_vendor_catalog_import_rows_chef_status
  ON vendor_catalog_import_rows (chef_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_catalog_import_rows_chef_vendor
  ON vendor_catalog_import_rows (chef_id, vendor_id, created_at DESC);
ALTER TABLE vendor_catalog_import_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendor_catalog_import_rows_chef_all ON vendor_catalog_import_rows;
CREATE POLICY vendor_catalog_import_rows_chef_all ON vendor_catalog_import_rows
  FOR ALL USING (
    chef_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS vendor_catalog_import_rows_service_all ON vendor_catalog_import_rows;
CREATE POLICY vendor_catalog_import_rows_service_all ON vendor_catalog_import_rows
  FOR ALL USING (auth.role() = 'service_role');
COMMENT ON TABLE vendor_catalog_import_rows IS
  'Staging queue for vendor catalog imports before rows are applied to vendor_items.';

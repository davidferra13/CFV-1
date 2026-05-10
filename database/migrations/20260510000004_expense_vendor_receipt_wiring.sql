-- Wire expenses to vendors and receipts via foreign keys
-- Enables: vendor price tracking from expenses, bidirectional receipt linking,
-- auto-categorization from vendor patterns

-- Add vendor_id FK to expenses (nullable; not all expenses come from a known vendor)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;

-- Add receipt_photo_id FK to expenses (nullable; bidirectional link to receipt_photos)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_photo_id UUID REFERENCES receipt_photos(id) ON DELETE SET NULL;

-- Index for vendor-based lookups (scorecard, price tracking, category patterns)
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON expenses(vendor_id) WHERE vendor_id IS NOT NULL;

-- Index for receipt-based lookups (bidirectional navigation)
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_photo_id ON expenses(receipt_photo_id) WHERE receipt_photo_id IS NOT NULL;

-- Vendor category defaults: track which expense category a vendor typically falls into
-- Populated automatically when a vendor has 3+ expenses in the same category
CREATE TABLE IF NOT EXISTS vendor_category_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  default_category TEXT NOT NULL,
  match_count INTEGER NOT NULL DEFAULT 1,
  last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, vendor_id)
);

-- Backfill: try to match existing expenses with vendor_name to vendors table
-- This is a best-effort fuzzy match on exact name equality (case-insensitive)
UPDATE expenses e
SET vendor_id = v.id
FROM vendors v
WHERE e.vendor_id IS NULL
  AND e.vendor_name IS NOT NULL
  AND e.tenant_id = v.tenant_id
  AND LOWER(TRIM(e.vendor_name)) = LOWER(TRIM(v.name));

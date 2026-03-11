-- Receipt Digitization Pipeline
-- Three-table schema for structured receipt storage and OCR extraction.
-- receipt_photos → receipt_extractions → receipt_line_items
-- On approval, business line items are copied to the expenses table.
-- All changes are ADDITIVE. No drops, no modifies, no data loss.

-- ── receipt_photos ─────────────────────────────────────────────────────────
-- One record per uploaded receipt image.
-- upload_status tracks the OCR pipeline state.

CREATE TABLE receipt_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  photo_url     TEXT NOT NULL,
  ocr_raw       TEXT,                                    -- Raw OCR output for debugging / re-runs
  upload_status TEXT NOT NULL DEFAULT 'pending'
                  CHECK (upload_status IN ('pending', 'processing', 'extracted', 'approved')),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_receipt_photos_event_id  ON receipt_photos(event_id);
CREATE INDEX idx_receipt_photos_tenant_id ON receipt_photos(tenant_id);
ALTER TABLE receipt_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs manage own receipt photos"
  ON receipt_photos
  FOR ALL
  USING (tenant_id = get_current_tenant_id());
COMMENT ON TABLE receipt_photos IS 'One record per uploaded receipt image. upload_status tracks the OCR pipeline state.';
-- ── receipt_extractions ────────────────────────────────────────────────────
-- Structured header data extracted (by OCR or AI) from a receipt photo.
-- One extraction per photo (re-run replaces the row via upsert).

CREATE TABLE receipt_extractions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_photo_id       UUID NOT NULL REFERENCES receipt_photos(id) ON DELETE CASCADE,
  tenant_id              UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  store_name             TEXT,
  store_location         TEXT,
  purchase_date          DATE,
  payment_method         TEXT,                           -- e.g. "Amex ending 1234"
  subtotal_cents         INTEGER,
  tax_cents              INTEGER,
  total_cents            INTEGER,
  extraction_confidence  DECIMAL(3,2),                  -- 0.00–1.00 AI confidence score
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT receipt_extractions_subtotal_non_neg CHECK (subtotal_cents IS NULL OR subtotal_cents >= 0),
  CONSTRAINT receipt_extractions_tax_non_neg      CHECK (tax_cents IS NULL OR tax_cents >= 0),
  CONSTRAINT receipt_extractions_total_non_neg    CHECK (total_cents IS NULL OR total_cents >= 0),
  CONSTRAINT receipt_extractions_confidence_range CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1))
);
CREATE INDEX idx_receipt_extractions_photo_id  ON receipt_extractions(receipt_photo_id);
CREATE INDEX idx_receipt_extractions_tenant_id ON receipt_extractions(tenant_id);
ALTER TABLE receipt_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs manage own receipt extractions"
  ON receipt_extractions
  FOR ALL
  USING (tenant_id = get_current_tenant_id());
COMMENT ON TABLE receipt_extractions IS 'Structured header data extracted from a receipt photo. One per photo.';
-- ── receipt_line_items ─────────────────────────────────────────────────────
-- Individual line items from a receipt, with chef-assigned tags.
-- Multiple line items per extraction.
-- expense_tag: 'business' items get copied to expenses table on approval.

CREATE TABLE receipt_line_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_extraction_id UUID NOT NULL REFERENCES receipt_extractions(id) ON DELETE CASCADE,
  event_id             UUID REFERENCES events(id) ON DELETE SET NULL,  -- which event this item belongs to
  tenant_id            UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  description          TEXT NOT NULL,
  price_cents          INTEGER,
  expense_tag          TEXT NOT NULL DEFAULT 'business'
                         CHECK (expense_tag IN ('business', 'personal', 'unknown')),
  ingredient_category  TEXT,                                          -- protein, produce, dairy, pantry, etc.
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT receipt_line_items_price_non_neg CHECK (price_cents IS NULL OR price_cents >= 0)
);
CREATE INDEX idx_receipt_line_items_extraction_id ON receipt_line_items(receipt_extraction_id);
CREATE INDEX idx_receipt_line_items_event_id      ON receipt_line_items(event_id);
CREATE INDEX idx_receipt_line_items_tenant_id     ON receipt_line_items(tenant_id);
ALTER TABLE receipt_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs manage own receipt line items"
  ON receipt_line_items
  FOR ALL
  USING (tenant_id = get_current_tenant_id());
COMMENT ON TABLE receipt_line_items IS 'Individual line items from a receipt. Business items are copied to expenses on approval.';

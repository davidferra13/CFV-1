-- Pantry Engine confidence and provenance metadata.
-- Additive only. Do not apply without a current database backup.

CREATE TABLE IF NOT EXISTS inventory_evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'baseline_count',
      'receipt_line_item',
      'vendor_invoice_item',
      'purchase_order_item',
      'recipe_expected_usage',
      'event_completion',
      'prep_production',
      'waste_log',
      'staff_meal',
      'transfer',
      'manual_adjustment',
      'audit',
      'system_estimate'
    )
  ),
  source_table TEXT,
  source_id UUID,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  receipt_photo_id UUID REFERENCES receipt_photos(id) ON DELETE SET NULL,
  vendor_invoice_id UUID REFERENCES vendor_invoices(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  audit_id UUID REFERENCES inventory_audits(id) ON DELETE SET NULL,
  confidence_status TEXT NOT NULL DEFAULT 'unknown' CHECK (
    confidence_status IN ('confirmed', 'likely', 'estimated', 'stale', 'conflict', 'unknown')
  ),
  confidence_score NUMERIC(4,3) CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
  ),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS evidence_source_id UUID REFERENCES inventory_evidence_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    confidence_status IN ('confirmed', 'likely', 'estimated', 'stale', 'conflict', 'unknown')
  ),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3) CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
  ),
  ADD COLUMN IF NOT EXISTS source_quantity NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS source_unit TEXT,
  ADD COLUMN IF NOT EXISTS canonical_quantity NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS canonical_unit TEXT,
  ADD COLUMN IF NOT EXISTS package_quantity NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS package_unit TEXT,
  ADD COLUMN IF NOT EXISTS conversion_status TEXT NOT NULL DEFAULT 'not_required' CHECK (
    conversion_status IN ('not_required', 'normalized', 'unsafe_needs_review', 'blocked', 'unknown')
  ),
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved' CHECK (
    review_status IN ('approved', 'pending_review', 'rejected')
  ),
  ADD COLUMN IF NOT EXISTS supersedes_transaction_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_evidence_chef_type
  ON inventory_evidence_sources(chef_id, source_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_evidence_review
  ON inventory_evidence_sources(chef_id, confidence_status, reviewed_at);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_evidence
  ON inventory_transactions(evidence_source_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_confidence
  ON inventory_transactions(chef_id, confidence_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_review
  ON inventory_transactions(chef_id, review_status, created_at DESC);

ALTER TABLE inventory_evidence_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_evidence_sources_select_own
  ON inventory_evidence_sources FOR SELECT
  USING (chef_id = get_current_tenant_id());

CREATE POLICY inventory_evidence_sources_insert_own
  ON inventory_evidence_sources FOR INSERT
  WITH CHECK (chef_id = get_current_tenant_id());

CREATE POLICY inventory_evidence_sources_update_own
  ON inventory_evidence_sources FOR UPDATE
  USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

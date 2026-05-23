-- Legal Readiness Center: compliance checklist tracking table
-- ADDITIVE ONLY. No drops, no deletes.
-- Scope: tenant-scoped, admin-gated.
-- Distinct from legal_readiness_items (policy documents) —
-- this tracks ongoing regulatory/operational compliance requirements.

CREATE TABLE IF NOT EXISTS legal_compliance_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  -- Classification
  category                  text NOT NULL,
  -- e.g. 'business_license', 'food_safety', 'insurance', 'tax',
  --      'data_privacy', 'employment', 'contracts', 'permits'
  subcategory               text,
  item_key                  text NOT NULL,
  -- Human-readable description
  title                     text NOT NULL,
  description               text,
  -- Regulatory mapping
  regulatory_body           text,    -- e.g. 'FDA', 'state_health_dept', 'IRS', 'DOL'
  jurisdiction              text,    -- e.g. 'US', 'CA', 'NY'
  applicable_states         text[],  -- NULL = all states
  -- Checklist state
  status                    text NOT NULL DEFAULT 'open',
  -- 'open', 'in_progress', 'completed', 'not_applicable', 'needs_renewal', 'overdue'
  -- Document storage reference (no binary content stored here)
  document_ref              text,    -- path or URL to stored document
  document_expires_at       date,    -- when the credential/permit expires
  -- Renewal tracking
  renewal_frequency_days    integer, -- NULL = one-time
  next_renewal_due          date,
  last_completed_at         timestamptz,
  completed_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Risk classification
  severity                  text NOT NULL DEFAULT 'medium',
  -- 'critical', 'high', 'medium', 'low'
  requires_professional_review boolean NOT NULL DEFAULT false,
  -- Admin notes
  notes                     text,
  -- Timestamps
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_legal_compliance_items_status CHECK (
    status IN (
      'open', 'in_progress', 'completed', 'not_applicable', 'needs_renewal', 'overdue'
    )
  ),
  CONSTRAINT chk_legal_compliance_items_severity CHECK (
    severity IN ('critical', 'high', 'medium', 'low')
  ),
  CONSTRAINT chk_legal_compliance_items_category CHECK (
    category IN (
      'business_license', 'food_safety', 'insurance', 'tax',
      'data_privacy', 'employment', 'contracts', 'permits', 'certifications',
      'accessibility', 'environmental', 'financial_reporting', 'other'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_compliance_items_tenant_key
  ON legal_compliance_items (tenant_id, item_key);

CREATE INDEX IF NOT EXISTS idx_legal_compliance_items_tenant_status
  ON legal_compliance_items (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_legal_compliance_items_renewal
  ON legal_compliance_items (tenant_id, next_renewal_due)
  WHERE next_renewal_due IS NOT NULL AND status NOT IN ('completed', 'not_applicable');

CREATE INDEX IF NOT EXISTS idx_legal_compliance_items_category
  ON legal_compliance_items (tenant_id, category, severity);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_legal_compliance_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'legal_compliance_items_updated_at'
  ) THEN
    CREATE TRIGGER legal_compliance_items_updated_at
      BEFORE UPDATE ON legal_compliance_items
      FOR EACH ROW EXECUTE FUNCTION update_legal_compliance_items_updated_at();
  END IF;
END;
$$;

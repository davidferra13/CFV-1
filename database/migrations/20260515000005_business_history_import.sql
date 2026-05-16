-- Business History Import
-- Expands historical Gmail findings from missed inquiries into staged business-history records.
-- These records remain review-gated; email-derived data is not written to canonical business
-- tables unless a chef explicitly approves a supported import action.

ALTER TABLE gmail_historical_findings
  DROP CONSTRAINT IF EXISTS gmail_historical_findings_classification_check;

ALTER TABLE gmail_historical_findings
  ADD CONSTRAINT gmail_historical_findings_classification_check
  CHECK (
    classification IN (
      'inquiry',
      'existing_thread',
      'client',
      'event',
      'preference',
      'payment_invoice',
      'follow_up'
    )
  );

CREATE INDEX IF NOT EXISTS idx_gmail_historical_findings_tenant_classification_status
  ON gmail_historical_findings (tenant_id, classification, status);

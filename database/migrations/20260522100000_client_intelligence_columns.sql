-- Client Intelligence Ledger: add intelligence columns to clients table
-- ADDITIVE ONLY. No drops, no deletes, no modifications to existing columns.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS risk_score integer,
  ADD COLUMN IF NOT EXISTS predicted_churn_date date,
  ADD COLUMN IF NOT EXISTS satisfaction_trend text;

-- Index for risk-based queries (find at-risk clients quickly)
CREATE INDEX IF NOT EXISTS idx_clients_risk_score
  ON clients (tenant_id, risk_score)
  WHERE risk_score IS NOT NULL AND deleted_at IS NULL;

-- Index for churn prediction queries
CREATE INDEX IF NOT EXISTS idx_clients_predicted_churn_date
  ON clients (tenant_id, predicted_churn_date)
  WHERE predicted_churn_date IS NOT NULL AND deleted_at IS NULL;

-- Constraint: satisfaction_trend must be a known enum value
ALTER TABLE clients
  ADD CONSTRAINT chk_clients_satisfaction_trend
  CHECK (satisfaction_trend IS NULL OR satisfaction_trend IN ('improving', 'stable', 'declining'));

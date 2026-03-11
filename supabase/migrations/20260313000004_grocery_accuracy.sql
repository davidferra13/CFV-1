-- Migration: add post-event actual grocery cost tracking to grocery_price_quotes
-- Additive only -- three nullable columns, no data loss.
-- Chef enters what they actually spent after shopping.
-- System computes accuracy delta to self-calibrate over time.

ALTER TABLE grocery_price_quotes
  ADD COLUMN IF NOT EXISTS actual_grocery_cost_cents INT,
  ADD COLUMN IF NOT EXISTS accuracy_delta_pct DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS actual_cost_logged_at TIMESTAMPTZ;
-- Index for per-chef accuracy analytics
CREATE INDEX IF NOT EXISTS idx_grocery_quotes_tenant_accuracy
  ON grocery_price_quotes (tenant_id, actual_grocery_cost_cents)
  WHERE actual_grocery_cost_cents IS NOT NULL;

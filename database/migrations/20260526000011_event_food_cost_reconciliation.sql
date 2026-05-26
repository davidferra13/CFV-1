-- Event Food Cost Reconciliation
-- Adds actual_food_cost_cents and reconciliation tracking to events.
-- Enables post-purchase "100% accurate" food costing when receipts are linked.
-- Additive only: no existing columns modified.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS actual_food_cost_cents INTEGER,
  ADD COLUMN IF NOT EXISTS food_cost_reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS food_cost_receipt_count INTEGER DEFAULT 0;

COMMENT ON COLUMN events.actual_food_cost_cents IS
  'Sum of all linked shopping receipt totals for this event. Null = no receipts linked. When set, this is the ground-truth food cost (post-purchase).';

COMMENT ON COLUMN events.food_cost_reconciled_at IS
  'Timestamp of last food cost reconciliation from receipts. Null = never reconciled.';

COMMENT ON COLUMN events.food_cost_receipt_count IS
  'Number of shopping receipts linked to this event. Used to determine reconciliation completeness.';

-- Index for quick lookup of events needing reconciliation
CREATE INDEX IF NOT EXISTS idx_events_food_cost_reconciled
  ON events(tenant_id, food_cost_reconciled_at)
  WHERE actual_food_cost_cents IS NOT NULL;

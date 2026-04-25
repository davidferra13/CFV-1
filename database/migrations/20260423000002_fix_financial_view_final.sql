-- FINAL FIX: event_financial_summary view
--
-- Combines three prior fixes into one correct view:
--   1. Scalar correlated subqueries (20260415000015) - no cartesian product
--   2. Refund-aware outstanding balance (20260417000005) - quoted - paid + refunded
--   3. Tips from ledger (20260418000006) - not events.tip_amount_cents
--
-- Migration 20260418000006 regressed #1 and #2 when fixing #3.
-- This migration restores all three.

DROP VIEW IF EXISTS event_financial_summary CASCADE;

CREATE VIEW event_financial_summary AS
SELECT
  event_id,
  tenant_id,
  quoted_price_cents,
  payment_status,
  total_paid_cents,
  total_refunded_cents,
  net_revenue_cents,
  total_expenses_cents,
  tip_amount_cents,
  (net_revenue_cents - total_expenses_cents) AS profit_cents,
  CASE
    WHEN net_revenue_cents > 0
      THEN (net_revenue_cents - total_expenses_cents)::numeric / net_revenue_cents::numeric
    ELSE 0::numeric
  END AS profit_margin,
  CASE
    WHEN net_revenue_cents > 0
      THEN total_expenses_cents::numeric / net_revenue_cents::numeric
    ELSE 0::numeric
  END AS food_cost_percentage,
  (quoted_price_cents - total_paid_cents + total_refunded_cents) AS outstanding_balance_cents
FROM (
  SELECT
    e.id AS event_id,
    e.tenant_id,
    e.quoted_price_cents,
    e.payment_status,
    -- Tips from ledger (not events.tip_amount_cents)
    COALESCE((
      SELECT SUM(le.amount_cents)
      FROM ledger_entries le
      WHERE le.event_id = e.id AND le.entry_type = 'tip'
    ), 0)::bigint AS tip_amount_cents,
    -- Payments excluding tips and refunds
    COALESCE((
      SELECT SUM(le.amount_cents)
      FROM ledger_entries le
      WHERE le.event_id = e.id AND le.is_refund = false AND le.entry_type != 'tip'
    ), 0)::bigint AS total_paid_cents,
    -- Refunds (absolute value)
    COALESCE((
      SELECT SUM(ABS(le.amount_cents))
      FROM ledger_entries le
      WHERE le.event_id = e.id AND le.is_refund = true
    ), 0)::bigint AS total_refunded_cents,
    -- Net revenue (all ledger entries summed: payments + tips - refunds)
    COALESCE((
      SELECT SUM(le.amount_cents)
      FROM ledger_entries le
      WHERE le.event_id = e.id
    ), 0)::bigint AS net_revenue_cents,
    -- Expenses (separate table, separate subquery = no cartesian)
    COALESCE((
      SELECT SUM(ex.amount_cents)
      FROM expenses ex
      WHERE ex.event_id = e.id
    ), 0)::bigint AS total_expenses_cents
  FROM events e
  WHERE e.deleted_at IS NULL
) base;

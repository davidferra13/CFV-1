-- FIX A2: outstanding_balance_cents must account for refunds
--
-- BUG: View computed outstanding = quoted - paid, ignoring refunds entirely.
-- If a $1000 event was fully paid then $200 refunded, outstanding showed $0
-- instead of $200. Chef would never know they're owed money.
--
-- FIX: outstanding = quoted - paid + refunded
-- (refunds increase the outstanding balance because money went back out)

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
    e.tip_amount_cents,
    COALESCE((
      SELECT SUM(le.amount_cents)
      FROM ledger_entries le
      WHERE le.event_id = e.id AND le.is_refund = false AND le.entry_type != 'tip'
    ), 0)::bigint AS total_paid_cents,
    COALESCE((
      SELECT SUM(ABS(le.amount_cents))
      FROM ledger_entries le
      WHERE le.event_id = e.id AND le.is_refund = true
    ), 0)::bigint AS total_refunded_cents,
    COALESCE((
      SELECT SUM(le.amount_cents)
      FROM ledger_entries le
      WHERE le.event_id = e.id
    ), 0)::bigint AS net_revenue_cents,
    COALESCE((
      SELECT SUM(ex.amount_cents)
      FROM expenses ex
      WHERE ex.event_id = e.id
    ), 0)::bigint AS total_expenses_cents
  FROM events e
  WHERE e.deleted_at IS NULL
) base;

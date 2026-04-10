-- Fix event_financial_summary view
-- Two bugs in the old view:
-- 1. outstanding_balance_cents could go negative when tips or double-payments exceeded quoted price
-- 2. Tip ledger entries were counted against outstanding balance (tips are bonus money, not owed service fees)
-- Fix: exclude tips from outstanding calculation + GREATEST(0) floor

CREATE OR REPLACE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.quoted_price_cents,
  e.payment_status,
  COALESCE(
    SUM(le.amount_cents) FILTER (WHERE le.is_refund = false AND le.entry_type != 'tip'),
    0
  ) AS total_paid_cents,
  COALESCE(
    SUM(ABS(le.amount_cents)) FILTER (WHERE le.is_refund = true),
    0
  ) AS total_refunded_cents,
  COALESCE(SUM(le.amount_cents), 0) AS net_revenue_cents,
  COALESCE(SUM(ex.amount_cents), 0) AS total_expenses_cents,
  e.tip_amount_cents,
  (COALESCE(SUM(le.amount_cents), 0) - COALESCE(SUM(ex.amount_cents), 0)) AS profit_cents,
  CASE
    WHEN COALESCE(SUM(le.amount_cents), 0) > 0
      THEN (COALESCE(SUM(le.amount_cents), 0) - COALESCE(SUM(ex.amount_cents), 0))::numeric
        / COALESCE(SUM(le.amount_cents), 1)::numeric
    ELSE 0::numeric
  END AS profit_margin,
  CASE
    WHEN COALESCE(SUM(le.amount_cents), 0) > 0
      THEN COALESCE(SUM(ex.amount_cents), 0)::numeric
        / COALESCE(SUM(le.amount_cents), 1)::numeric
    ELSE 0::numeric
  END AS food_cost_percentage,
  GREATEST(
    e.quoted_price_cents - COALESCE(
      SUM(le.amount_cents) FILTER (WHERE le.is_refund = false AND le.entry_type != 'tip'),
      0
    ),
    0
  ) AS outstanding_balance_cents
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
LEFT JOIN expenses ex ON ex.event_id = e.id
GROUP BY e.id;

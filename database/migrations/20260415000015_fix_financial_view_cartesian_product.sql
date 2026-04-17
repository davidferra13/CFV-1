-- FIX: event_financial_summary cartesian product bug
--
-- PROVEN BUG (empirically verified against live data):
--   Event f3be: 3 ledger x 2 expenses -> paid inflated 2x ($1500 -> $3000)
--   Event b419: 2 ledger x 2 expenses -> paid inflated 2x ($4500 -> $9000)
--
-- Root cause: LEFT JOIN ledger_entries x LEFT JOIN expenses produces N*M rows.
-- PostgreSQL aggressively flattens CTEs, LATERAL, and derived subqueries back
-- into this cartesian form. Only scalar correlated subqueries survive.
--
-- Fix: scalar correlated subqueries in SELECT, wrapped in outer SELECT so
-- computed columns (profit, margins) reference inner aliases without repeat.
-- Performance: indexed by event_id, trivial at ChefFlow scale (<500 events).
--
-- Impact: 40+ consumers across dashboard, analytics, client LTV, profitability,
-- briefing, copilot, close-out wizard, receipts, compliance, goals, workflow.
--
-- NOTE: DROP is required because CREATE OR REPLACE cannot change column sources
-- from join-based to subquery-based on an existing view.

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
  (quoted_price_cents - total_paid_cents) AS outstanding_balance_cents
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

-- Migration: Inventory Analytics Views
-- Derived views for demand forecasting, expiry alerts, and variance analysis.

-- ============================================
-- VIEW: upcoming_ingredient_demand
-- What ingredients are needed for upcoming events (next 30 days)
-- ============================================
CREATE OR REPLACE VIEW upcoming_ingredient_demand AS
WITH upcoming_events AS (
  SELECT e.id AS event_id, e.tenant_id, e.event_date, e.guest_count, e.occasion
  FROM events e
  WHERE e.status IN ('confirmed', 'paid')
    AND e.event_date >= CURRENT_DATE
    AND e.event_date <= CURRENT_DATE + INTERVAL '30 days'
),
event_ingredients AS (
  SELECT
    ue.tenant_id AS chef_id,
    ue.event_id,
    ue.event_date,
    ue.occasion,
    i.id AS ingredient_id,
    i.name AS ingredient_name,
    ri.unit,
    SUM(ri.quantity * COALESCE(c.scale_factor, 1)) AS needed_qty,
    i.last_price_cents
  FROM upcoming_events ue
  JOIN menus m ON m.event_id = ue.event_id
  JOIN dishes d ON d.menu_id = m.id
  JOIN components c ON c.dish_id = d.id AND c.recipe_id IS NOT NULL
  JOIN recipe_ingredients ri ON ri.recipe_id = c.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE NOT i.is_staple
  GROUP BY ue.tenant_id, ue.event_id, ue.event_date, ue.occasion,
           i.id, i.name, ri.unit, i.last_price_cents
)
SELECT
  ei.chef_id,
  ei.ingredient_id,
  ei.ingredient_name,
  ei.unit,
  SUM(ei.needed_qty) AS total_needed_qty,
  ei.last_price_cents,
  COUNT(DISTINCT ei.event_id) AS event_count,
  MIN(ei.event_date) AS first_event_date,
  ARRAY_AGG(DISTINCT ei.occasion) AS events
FROM event_ingredients ei
GROUP BY ei.chef_id, ei.ingredient_id, ei.ingredient_name, ei.unit, ei.last_price_cents;

-- ============================================
-- VIEW: inventory_expiry_alerts
-- Batches expiring within 7 days
-- ============================================
CREATE OR REPLACE VIEW inventory_expiry_alerts AS
SELECT
  ib.chef_id,
  ib.id AS batch_id,
  ib.ingredient_id,
  ib.ingredient_name,
  ib.expiry_date,
  ib.remaining_qty,
  ib.unit,
  ib.unit_cost_cents,
  (ib.remaining_qty * COALESCE(ib.unit_cost_cents, 0))::INTEGER AS at_risk_cost_cents,
  sl.name AS location_name,
  CASE
    WHEN ib.expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN ib.expiry_date <= CURRENT_DATE + 3 THEN 'critical'
    WHEN ib.expiry_date <= CURRENT_DATE + 7 THEN 'warning'
    ELSE 'ok'
  END AS urgency
FROM inventory_batches ib
LEFT JOIN storage_locations sl ON sl.id = ib.location_id
WHERE NOT ib.is_depleted
  AND ib.expiry_date IS NOT NULL
  AND ib.expiry_date <= CURRENT_DATE + INTERVAL '7 days';

-- ============================================
-- VIEW: event_inventory_variance
-- Expected vs actual usage per event
-- ============================================
CREATE OR REPLACE VIEW event_inventory_variance AS
WITH expected_usage AS (
  SELECT
    e.id AS event_id,
    e.tenant_id AS chef_id,
    i.id AS ingredient_id,
    i.name AS ingredient_name,
    ri.unit,
    SUM(ri.quantity * COALESCE(c.scale_factor, 1)) AS expected_qty,
    i.last_price_cents
  FROM events e
  JOIN menus m ON m.event_id = e.id
  JOIN dishes d ON d.menu_id = m.id
  JOIN components c ON c.dish_id = d.id AND c.recipe_id IS NOT NULL
  JOIN recipe_ingredients ri ON ri.recipe_id = c.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE e.status IN ('completed', 'in_progress')
  GROUP BY e.id, e.tenant_id, i.id, i.name, ri.unit, i.last_price_cents
),
actual_usage AS (
  SELECT
    it.event_id,
    it.chef_id,
    it.ingredient_id,
    MAX(it.ingredient_name) AS ingredient_name,
    it.unit,
    ABS(SUM(it.quantity)) AS actual_qty
  FROM inventory_transactions it
  WHERE it.event_id IS NOT NULL
    AND it.transaction_type = 'event_deduction'
  GROUP BY it.event_id, it.chef_id, it.ingredient_id, it.unit
)
SELECT
  eu.event_id,
  eu.chef_id,
  eu.ingredient_id,
  eu.ingredient_name,
  eu.unit,
  eu.expected_qty,
  COALESCE(au.actual_qty, 0) AS actual_qty,
  COALESCE(au.actual_qty, 0) - eu.expected_qty AS variance_qty,
  eu.last_price_cents,
  ((COALESCE(au.actual_qty, 0) - eu.expected_qty) * COALESCE(eu.last_price_cents, 0))::INTEGER AS variance_cost_cents
FROM expected_usage eu
LEFT JOIN actual_usage au
  ON eu.event_id = au.event_id
  AND eu.ingredient_id = au.ingredient_id;

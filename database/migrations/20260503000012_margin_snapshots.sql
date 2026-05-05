-- Margin Snapshots
-- Persists computed margin data for trend tracking.
-- Written by the margin snapshot action after each pricing intelligence computation.
-- No data loss risk: purely additive table.

CREATE TABLE IF NOT EXISTS margin_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Revenue/cost at time of snapshot
  quoted_price_cents INTEGER,
  revenue_cents INTEGER,
  projected_food_cost_cents INTEGER,
  actual_food_cost_cents INTEGER,
  projected_total_cost_cents INTEGER,
  actual_total_cost_cents INTEGER,

  -- Computed metrics
  food_cost_percent NUMERIC(5,2),
  margin_percent NUMERIC(5,2),
  profit_cents INTEGER,
  target_food_cost_percent NUMERIC(5,2),
  target_margin_percent NUMERIC(5,2),

  -- Pricing confidence context
  pricing_confidence TEXT CHECK (pricing_confidence IN ('high', 'medium', 'low')),
  ingredient_count INTEGER,
  missing_price_count INTEGER,
  stale_price_count INTEGER,
  spike_count INTEGER,
  warning_count INTEGER,

  -- Source marker (what triggered the snapshot)
  source TEXT NOT NULL DEFAULT 'page_view'
    CHECK (source IN ('page_view', 'cost_refresh', 'cron', 'manual')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for trend queries
CREATE INDEX IF NOT EXISTS idx_margin_snapshots_tenant_date
  ON margin_snapshots (tenant_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_margin_snapshots_event
  ON margin_snapshots (event_id, snapshot_date DESC)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_margin_snapshots_menu
  ON margin_snapshots (menu_id, snapshot_date DESC)
  WHERE menu_id IS NOT NULL;

-- Deduplicate: at most one snapshot per event per day per source
CREATE UNIQUE INDEX IF NOT EXISTS idx_margin_snapshots_dedup
  ON margin_snapshots (tenant_id, event_id, snapshot_date, source)
  WHERE event_id IS NOT NULL;

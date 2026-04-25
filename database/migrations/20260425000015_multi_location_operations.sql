-- Multi-Location Operations System
-- Extends business_locations with operational fields and adds supporting tables
-- for daily metrics, alerts, demand forecasting, and recipe compliance tracking.
-- All additions are additive (no drops, no deletes, no column modifications).

-- ============================================================================
-- 1. Enhance business_locations with operational fields
-- ============================================================================

ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS zip text;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS lat numeric(10, 7);
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS lng numeric(10, 7);
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS capacity_covers integer;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS manager_name text;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS manager_staff_id uuid REFERENCES public.staff_members(id);
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}';
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS daily_cover_target integer;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS daily_revenue_target_cents bigint;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS food_cost_target_pct numeric(5, 2);
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS labor_cost_target_pct numeric(5, 2);
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS brand_group text;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- ============================================================================
-- 2. Add location_id to core operational tables (nullable, additive)
-- ============================================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id);
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id);
ALTER TABLE public.register_sessions ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id);
ALTER TABLE public.order_queue ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id);
ALTER TABLE public.kds_tickets ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id);
ALTER TABLE public.daily_revenue ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id);

-- Indexes for location scoping
CREATE INDEX IF NOT EXISTS idx_events_location_id ON public.events(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_location_id ON public.expenses(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_location_id ON public.ledger_entries(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_register_sessions_location_id ON public.register_sessions(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_queue_location_id ON public.order_queue(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kds_tickets_location_id ON public.kds_tickets(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_revenue_location_id ON public.daily_revenue(location_id) WHERE location_id IS NOT NULL;

-- ============================================================================
-- 3. Location daily metrics (daily snapshot per location)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.location_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  date date NOT NULL,
  -- Volume
  covers_served integer DEFAULT 0 NOT NULL,
  orders_count integer DEFAULT 0 NOT NULL,
  online_orders_count integer DEFAULT 0 NOT NULL,
  delivery_orders_count integer DEFAULT 0 NOT NULL,
  counter_orders_count integer DEFAULT 0 NOT NULL,
  -- Revenue
  revenue_cents bigint DEFAULT 0 NOT NULL,
  avg_ticket_cents bigint DEFAULT 0 NOT NULL,
  -- Costs
  food_cost_cents bigint DEFAULT 0 NOT NULL,
  labor_cost_cents bigint DEFAULT 0 NOT NULL,
  waste_cents bigint DEFAULT 0 NOT NULL,
  other_cost_cents bigint DEFAULT 0 NOT NULL,
  -- Percentages (derived, stored for quick reads)
  food_cost_pct numeric(5, 2),
  labor_cost_pct numeric(5, 2),
  prime_cost_pct numeric(5, 2),
  -- Labor
  staff_hours numeric(8, 2) DEFAULT 0 NOT NULL,
  staff_count integer DEFAULT 0 NOT NULL,
  -- Peaks
  peak_hour_orders jsonb DEFAULT '{}',
  -- Speed
  avg_ticket_time_minutes numeric(6, 2),
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(location_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ldm_tenant_date ON public.location_daily_metrics(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ldm_location_date ON public.location_daily_metrics(location_id, date DESC);

-- ============================================================================
-- 4. Location operational alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.location_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  metric_value numeric,
  threshold_value numeric,
  metadata jsonb DEFAULT '{}',
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  auto_generated boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT location_alerts_type_check CHECK (
    alert_type = ANY (ARRAY[
      'low_inventory', 'high_food_cost', 'high_labor_cost',
      'low_covers', 'high_waste', 'staff_shortage',
      'equipment_issue', 'compliance_due', 'revenue_drop',
      'portion_drift', 'recipe_deviation', 'speed_degradation', 'custom'
    ]::text[])
  ),
  CONSTRAINT location_alerts_severity_check CHECK (
    severity = ANY (ARRAY['low', 'medium', 'high', 'critical']::text[])
  )
);

CREATE INDEX IF NOT EXISTS idx_location_alerts_active
  ON public.location_alerts(tenant_id, location_id)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_location_alerts_created
  ON public.location_alerts(tenant_id, created_at DESC);

-- ============================================================================
-- 5. Location demand forecasts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.location_demand_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  predicted_covers integer,
  predicted_revenue_cents bigint,
  predicted_orders integer,
  confidence_score numeric(3, 2),
  model_version text DEFAULT 'v1' NOT NULL,
  factors jsonb DEFAULT '{}',
  -- Actuals (filled in after the day passes)
  actual_covers integer,
  actual_revenue_cents bigint,
  variance_pct numeric(5, 2),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(location_id, forecast_date, model_version)
);

CREATE INDEX IF NOT EXISTS idx_ldf_lookup
  ON public.location_demand_forecasts(tenant_id, location_id, forecast_date);

-- ============================================================================
-- 6. Recipe compliance tracking per location
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.location_recipe_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  check_date date NOT NULL,
  portion_compliant boolean DEFAULT true NOT NULL,
  method_compliant boolean DEFAULT true NOT NULL,
  ingredient_compliant boolean DEFAULT true NOT NULL,
  presentation_compliant boolean DEFAULT true NOT NULL,
  overall_score numeric(5, 2),
  deviations jsonb DEFAULT '[]',
  checked_by uuid,
  photo_url text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lrc_lookup
  ON public.location_recipe_compliance(tenant_id, location_id, recipe_id, check_date DESC);

-- ============================================================================
-- 7. Centralized purchase requisitions (cross-location)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.centralized_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  vendor_name text,
  vendor_id uuid,
  total_estimated_cents bigint DEFAULT 0 NOT NULL,
  total_actual_cents bigint,
  notes text,
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT cpo_status_check CHECK (
    status = ANY (ARRAY['draft', 'submitted', 'approved', 'ordered', 'partially_received', 'received', 'cancelled']::text[])
  )
);

CREATE TABLE IF NOT EXISTS public.centralized_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.centralized_purchase_orders(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients(id),
  ingredient_name text NOT NULL,
  unit text NOT NULL,
  -- Per-location quantities
  location_quantities jsonb NOT NULL DEFAULT '{}',
  total_quantity numeric(10, 3) NOT NULL,
  estimated_unit_cost_cents bigint,
  actual_unit_cost_cents bigint,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cpo_tenant ON public.centralized_purchase_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cpoi_order ON public.centralized_purchase_order_items(order_id);

-- ============================================================================
-- 8. Location financial summary VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.location_financial_summary AS
SELECT
  bl.id AS location_id,
  bl.tenant_id,
  bl.name AS location_name,
  bl.location_type,
  bl.is_active,
  -- Revenue from ledger entries scoped to this location
  COALESCE((
    SELECT SUM(le.amount_cents)
    FROM ledger_entries le
    WHERE le.location_id = bl.id AND le.is_refund = false AND le.entry_type != 'tip'
  ), 0)::bigint AS total_revenue_cents,
  COALESCE((
    SELECT SUM(ABS(le.amount_cents))
    FROM ledger_entries le
    WHERE le.location_id = bl.id AND le.is_refund = true
  ), 0)::bigint AS total_refunded_cents,
  COALESCE((
    SELECT SUM(le.amount_cents)
    FROM ledger_entries le
    WHERE le.location_id = bl.id AND le.entry_type = 'tip'
  ), 0)::bigint AS total_tips_cents,
  COALESCE((
    SELECT SUM(le.amount_cents)
    FROM ledger_entries le
    WHERE le.location_id = bl.id
  ), 0)::bigint AS net_revenue_cents,
  -- Expenses scoped to this location
  COALESCE((
    SELECT SUM(ex.amount_cents)
    FROM expenses ex
    WHERE ex.location_id = bl.id
  ), 0)::bigint AS total_expenses_cents,
  -- Derived profit
  (
    COALESCE((SELECT SUM(le.amount_cents) FROM ledger_entries le WHERE le.location_id = bl.id), 0)
    - COALESCE((SELECT SUM(ex.amount_cents) FROM expenses ex WHERE ex.location_id = bl.id), 0)
  )::bigint AS profit_cents,
  -- Sales volume
  COALESCE((
    SELECT COUNT(*)
    FROM sales s
    WHERE s.location_id = bl.id
  ), 0)::integer AS total_sales_count,
  COALESCE((
    SELECT SUM(s.total_cents)
    FROM sales s
    WHERE s.location_id = bl.id AND s.status NOT IN ('voided', 'fully_refunded')
  ), 0)::bigint AS total_sales_cents,
  -- Staff cost from daily metrics (latest 30 days)
  COALESCE((
    SELECT SUM(ldm.labor_cost_cents)
    FROM location_daily_metrics ldm
    WHERE ldm.location_id = bl.id AND ldm.date >= CURRENT_DATE - INTERVAL '30 days'
  ), 0)::bigint AS labor_cost_30d_cents,
  -- Inventory value from transactions
  COALESCE((
    SELECT SUM(it.cost_cents)
    FROM inventory_transactions it
    WHERE it.location_id = bl.id AND it.transaction_type = 'receive'
      AND it.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ), 0)::bigint AS inventory_received_30d_cents
FROM public.business_locations bl
WHERE bl.is_active = true;

-- ============================================================================
-- 9. RLS policies for new tables
-- ============================================================================

ALTER TABLE public.location_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_recipe_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centralized_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centralized_purchase_order_items ENABLE ROW LEVEL SECURITY;

-- location_daily_metrics
CREATE POLICY ldm_select ON public.location_daily_metrics FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY ldm_insert ON public.location_daily_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY ldm_update ON public.location_daily_metrics FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY ldm_delete ON public.location_daily_metrics FOR DELETE USING (tenant_id = get_current_tenant_id());

-- location_alerts
CREATE POLICY la_select ON public.location_alerts FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY la_insert ON public.location_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY la_update ON public.location_alerts FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY la_delete ON public.location_alerts FOR DELETE USING (tenant_id = get_current_tenant_id());

-- location_demand_forecasts
CREATE POLICY ldf_select ON public.location_demand_forecasts FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY ldf_insert ON public.location_demand_forecasts FOR INSERT WITH CHECK (true);
CREATE POLICY ldf_update ON public.location_demand_forecasts FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY ldf_delete ON public.location_demand_forecasts FOR DELETE USING (tenant_id = get_current_tenant_id());

-- location_recipe_compliance
CREATE POLICY lrc_select ON public.location_recipe_compliance FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY lrc_insert ON public.location_recipe_compliance FOR INSERT WITH CHECK (true);
CREATE POLICY lrc_update ON public.location_recipe_compliance FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY lrc_delete ON public.location_recipe_compliance FOR DELETE USING (tenant_id = get_current_tenant_id());

-- centralized_purchase_orders
CREATE POLICY cpo_select ON public.centralized_purchase_orders FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY cpo_insert ON public.centralized_purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY cpo_update ON public.centralized_purchase_orders FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY cpo_delete ON public.centralized_purchase_orders FOR DELETE USING (tenant_id = get_current_tenant_id());

-- centralized_purchase_order_items (access via parent join)
CREATE POLICY cpoi_select ON public.centralized_purchase_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM centralized_purchase_orders cpo WHERE cpo.id = order_id AND cpo.tenant_id = get_current_tenant_id())
);
CREATE POLICY cpoi_insert ON public.centralized_purchase_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY cpoi_update ON public.centralized_purchase_order_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM centralized_purchase_orders cpo WHERE cpo.id = order_id AND cpo.tenant_id = get_current_tenant_id())
);
CREATE POLICY cpoi_delete ON public.centralized_purchase_order_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM centralized_purchase_orders cpo WHERE cpo.id = order_id AND cpo.tenant_id = get_current_tenant_id())
);

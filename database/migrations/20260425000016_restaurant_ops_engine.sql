-- Restaurant Operations Engine
-- Adds service_days (daily service entity), service_menus, menu_item_sales,
-- and service_prep_requirements to support continuous restaurant operations.
-- All tables are additive. No existing tables modified.

-- ── 1. Service Days ───────────────────────────────────────────────────────
-- The daily reset point. Every day of restaurant service gets one row per shift.
-- Ties together prep, stations, tasks, staff, inventory, and sales.

CREATE TABLE IF NOT EXISTS public.service_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  shift_label TEXT NOT NULL DEFAULT 'dinner',
  -- planning -> prep -> active -> closed
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'prep', 'active', 'closed')),
  expected_covers INT,
  actual_covers INT,
  notes TEXT,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  opened_by UUID REFERENCES public.staff_members(id),
  closed_by UUID REFERENCES public.staff_members(id),
  -- Snapshot totals (written on close)
  total_revenue_cents INT,
  total_food_cost_cents INT,
  total_labor_cost_cents INT,
  total_waste_cents INT,
  items_sold INT,
  items_86d INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, service_date, shift_label)
);

CREATE INDEX IF NOT EXISTS idx_service_days_chef_date
  ON public.service_days(chef_id, service_date DESC);

CREATE INDEX IF NOT EXISTS idx_service_days_status
  ON public.service_days(chef_id, status);

-- ── 2. Service Menus ──────────────────────────────────────────────────────
-- Which menus are active for a given service day.
-- A restaurant might run a lunch menu and a dinner menu on the same day.

CREATE TABLE IF NOT EXISTS public.service_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  service_day_id UUID NOT NULL REFERENCES public.service_days(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_day_id, menu_id)
);

CREATE INDEX IF NOT EXISTS idx_service_menus_day
  ON public.service_menus(service_day_id);

-- ── 3. Menu Item Sales ────────────────────────────────────────────────────
-- Per-item sales tracking for a service day. Each row = one menu item's
-- aggregated sales for that day. Feeds menu performance analytics.

CREATE TABLE IF NOT EXISTS public.menu_item_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  service_day_id UUID NOT NULL REFERENCES public.service_days(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity_sold INT NOT NULL DEFAULT 0,
  revenue_cents INT NOT NULL DEFAULT 0,
  food_cost_cents INT,
  waste_qty INT NOT NULL DEFAULT 0,
  waste_cents INT NOT NULL DEFAULT 0,
  avg_ticket_time_minutes NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_day_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_sales_day
  ON public.menu_item_sales(service_day_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_sales_item
  ON public.menu_item_sales(menu_item_id, created_at DESC);

-- ── 4. Service Prep Requirements ──────────────────────────────────────────
-- Auto-generated from menu -> recipe -> ingredients for a service day.
-- Shows what needs to be prepped, who is assigned, and current status.

CREATE TABLE IF NOT EXISTS public.service_prep_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  service_day_id UUID NOT NULL REFERENCES public.service_days(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id),
  ingredient_id UUID REFERENCES public.ingredients(id),
  ingredient_name TEXT NOT NULL,
  required_qty NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  on_hand_qty NUMERIC,
  deficit_qty NUMERIC,
  -- pending -> in_progress -> done -> verified
  prep_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (prep_status IN ('pending', 'in_progress', 'done', 'verified')),
  assigned_to UUID REFERENCES public.staff_members(id),
  station_id UUID REFERENCES public.stations(id),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_time TIME,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.staff_members(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_prep_day
  ON public.service_prep_requirements(service_day_id, prep_status);

CREATE INDEX IF NOT EXISTS idx_service_prep_station
  ON public.service_prep_requirements(station_id)
  WHERE station_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_prep_assigned
  ON public.service_prep_requirements(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- ── 5. Menu Performance View ──────────────────────────────────────────────
-- Aggregated menu item performance across all service days.
-- Sales velocity, revenue contribution, food cost %, strain scoring.

CREATE OR REPLACE VIEW public.menu_item_performance AS
SELECT
  mis.chef_id,
  mis.menu_item_id,
  mi.name AS item_name,
  mi.category,
  mi.recipe_id,
  COUNT(DISTINCT mis.service_day_id) AS days_on_menu,
  SUM(mis.quantity_sold) AS total_sold,
  ROUND(AVG(mis.quantity_sold), 1) AS avg_daily_sold,
  SUM(mis.revenue_cents) AS total_revenue_cents,
  ROUND(AVG(mis.revenue_cents), 0) AS avg_daily_revenue_cents,
  SUM(mis.food_cost_cents) AS total_food_cost_cents,
  CASE
    WHEN SUM(mis.revenue_cents) > 0
    THEN ROUND(SUM(COALESCE(mis.food_cost_cents, 0))::NUMERIC / SUM(mis.revenue_cents) * 100, 1)
    ELSE NULL
  END AS food_cost_pct,
  SUM(mis.waste_qty) AS total_waste_qty,
  SUM(mis.waste_cents) AS total_waste_cents,
  ROUND(AVG(mis.avg_ticket_time_minutes), 1) AS avg_ticket_time_minutes,
  -- Profit per unit (revenue - food cost per item sold)
  CASE
    WHEN SUM(mis.quantity_sold) > 0
    THEN ROUND(
      (SUM(mis.revenue_cents) - SUM(COALESCE(mis.food_cost_cents, 0)))::NUMERIC
      / SUM(mis.quantity_sold), 0
    )
    ELSE NULL
  END AS profit_per_unit_cents,
  MIN(sd.service_date) AS first_served,
  MAX(sd.service_date) AS last_served
FROM public.menu_item_sales mis
JOIN public.menu_items mi ON mi.id = mis.menu_item_id
JOIN public.service_days sd ON sd.id = mis.service_day_id
GROUP BY mis.chef_id, mis.menu_item_id, mi.name, mi.category, mi.recipe_id;

-- ── 6. Daily Service Summary View ─────────────────────────────────────────
-- One-row-per-service-day summary for the ops dashboard.

CREATE OR REPLACE VIEW public.service_day_summary AS
SELECT
  sd.id AS service_day_id,
  sd.chef_id,
  sd.service_date,
  sd.shift_label,
  sd.status,
  sd.expected_covers,
  sd.actual_covers,
  sd.opened_at,
  sd.closed_at,
  COALESCE(sd.total_revenue_cents, SUM(mis.revenue_cents)) AS revenue_cents,
  COALESCE(sd.total_food_cost_cents, SUM(mis.food_cost_cents)) AS food_cost_cents,
  sd.total_labor_cost_cents AS labor_cost_cents,
  COALESCE(sd.items_sold, SUM(mis.quantity_sold)) AS items_sold,
  COUNT(DISTINCT mis.menu_item_id) FILTER (WHERE mis.quantity_sold > 0) AS unique_items_sold,
  SUM(mis.waste_qty) AS total_waste_qty,
  SUM(mis.waste_cents) AS total_waste_cents,
  -- Prep completion
  (SELECT COUNT(*) FROM public.service_prep_requirements spr
   WHERE spr.service_day_id = sd.id) AS total_prep_items,
  (SELECT COUNT(*) FROM public.service_prep_requirements spr
   WHERE spr.service_day_id = sd.id AND spr.prep_status IN ('done', 'verified')) AS completed_prep_items
FROM public.service_days sd
LEFT JOIN public.menu_item_sales mis ON mis.service_day_id = sd.id
GROUP BY sd.id, sd.chef_id, sd.service_date, sd.shift_label, sd.status,
         sd.expected_covers, sd.actual_covers, sd.opened_at, sd.closed_at,
         sd.total_revenue_cents, sd.total_food_cost_cents, sd.total_labor_cost_cents,
         sd.items_sold;

-- ── 7. Updated Triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_service_days_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_days_updated_at
  BEFORE UPDATE ON public.service_days
  FOR EACH ROW EXECUTE FUNCTION public.update_service_days_updated_at();

CREATE TRIGGER trg_menu_item_sales_updated_at
  BEFORE UPDATE ON public.menu_item_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_service_days_updated_at();

CREATE TRIGGER trg_service_prep_updated_at
  BEFORE UPDATE ON public.service_prep_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_service_days_updated_at();

-- Analytics & Portfolio: Benchmarks, Demand Forecasts, Public Portfolio, Profile Highlights
-- Closes gaps identified in competitive analysis vs Instagram, Mailchimp analytics

-- ============================================
-- ALTER: Add portfolio columns to chefs
-- ============================================

ALTER TABLE chefs ADD COLUMN IF NOT EXISTS portfolio_enabled BOOLEAN DEFAULT false;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS portfolio_layout TEXT DEFAULT 'grid' CHECK (portfolio_layout IN ('grid', 'masonry', 'carousel'));

-- ============================================
-- ALTER: Add countdown toggle to events
-- ============================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS countdown_enabled BOOLEAN DEFAULT true;

-- ============================================
-- TABLE 1: BENCHMARK SNAPSHOTS
-- ============================================

CREATE TABLE IF NOT EXISTS benchmark_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  snapshot_date           DATE NOT NULL,
  avg_event_value_cents   INTEGER,
  avg_food_cost_pct       NUMERIC(5,2),
  booking_conversion_rate NUMERIC(5,2),
  client_return_rate      NUMERIC(5,2),
  revenue_per_hour_cents  INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, snapshot_date)
);

CREATE INDEX idx_benchmark_snapshots_chef ON benchmark_snapshots(chef_id, snapshot_date DESC);

-- ============================================
-- TABLE 2: DEMAND FORECASTS
-- ============================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  month                   INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year                    INTEGER NOT NULL,
  predicted_inquiry_count INTEGER NOT NULL DEFAULT 0,
  actual_inquiry_count    INTEGER NOT NULL DEFAULT 0,
  confidence              NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, month, year)
);

CREATE INDEX idx_demand_forecasts_chef ON demand_forecasts(chef_id, year, month);

CREATE TRIGGER trg_demand_forecasts_updated_at
  BEFORE UPDATE ON demand_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 3: PORTFOLIO ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS portfolio_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  photo_url       TEXT NOT NULL,
  caption         TEXT,
  dish_name       TEXT,
  event_type      TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_items_chef ON portfolio_items(chef_id, display_order);

CREATE TRIGGER trg_portfolio_items_updated_at
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 4: PROFILE HIGHLIGHTS
-- ============================================

CREATE TABLE IF NOT EXISTS profile_highlights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL
                  CHECK (category IN ('events', 'behind_scenes', 'testimonials', 'press')),
  items           JSONB NOT NULL DEFAULT '[]',
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_highlights_chef ON profile_highlights(chef_id, display_order);

CREATE TRIGGER trg_profile_highlights_updated_at
  BEFORE UPDATE ON profile_highlights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE benchmark_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_forecasts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_highlights   ENABLE ROW LEVEL SECURITY;

-- benchmark_snapshots
DROP POLICY IF EXISTS bs_chef_select ON benchmark_snapshots;
CREATE POLICY bs_chef_select ON benchmark_snapshots FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS bs_chef_insert ON benchmark_snapshots;
CREATE POLICY bs_chef_insert ON benchmark_snapshots FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS bs_chef_update ON benchmark_snapshots;
CREATE POLICY bs_chef_update ON benchmark_snapshots FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS bs_chef_delete ON benchmark_snapshots;
CREATE POLICY bs_chef_delete ON benchmark_snapshots FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- demand_forecasts
DROP POLICY IF EXISTS df_chef_select ON demand_forecasts;
CREATE POLICY df_chef_select ON demand_forecasts FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS df_chef_insert ON demand_forecasts;
CREATE POLICY df_chef_insert ON demand_forecasts FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS df_chef_update ON demand_forecasts;
CREATE POLICY df_chef_update ON demand_forecasts FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS df_chef_delete ON demand_forecasts;
CREATE POLICY df_chef_delete ON demand_forecasts FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- portfolio_items (public read for published profiles)
DROP POLICY IF EXISTS pi_chef_select ON portfolio_items;
CREATE POLICY pi_chef_select ON portfolio_items FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS pi_public_select ON portfolio_items;
CREATE POLICY pi_public_select ON portfolio_items FOR SELECT USING (true);
DROP POLICY IF EXISTS pi_chef_insert ON portfolio_items;
CREATE POLICY pi_chef_insert ON portfolio_items FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS pi_chef_update ON portfolio_items;
CREATE POLICY pi_chef_update ON portfolio_items FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS pi_chef_delete ON portfolio_items;
CREATE POLICY pi_chef_delete ON portfolio_items FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- profile_highlights (public read for published profiles)
DROP POLICY IF EXISTS ph_chef_select ON profile_highlights;
CREATE POLICY ph_chef_select ON profile_highlights FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS ph_public_select ON profile_highlights;
CREATE POLICY ph_public_select ON profile_highlights FOR SELECT USING (true);
DROP POLICY IF EXISTS ph_chef_insert ON profile_highlights;
CREATE POLICY ph_chef_insert ON profile_highlights FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS ph_chef_update ON profile_highlights;
CREATE POLICY ph_chef_update ON profile_highlights FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS ph_chef_delete ON profile_highlights;
CREATE POLICY ph_chef_delete ON profile_highlights FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

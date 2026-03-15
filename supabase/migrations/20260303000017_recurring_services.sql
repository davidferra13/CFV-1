-- Recurring Services & Served Dish History
-- Models ongoing client relationships (weekly meal prep, regular dinners)
-- and tracks dish-level history to avoid repetition and honor preferences.

-- ============================================
-- TABLE 1: RECURRING SERVICES
-- ============================================

CREATE TABLE recurring_services (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  service_type          TEXT NOT NULL DEFAULT 'weekly_meal_prep'
                        CHECK (service_type IN (
                          'weekly_meal_prep',
                          'weekly_dinners',
                          'daily_meals',
                          'biweekly_prep',
                          'other'
                        )),

  frequency             TEXT NOT NULL DEFAULT 'weekly'
                        CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),

  -- Days of week (0=Sunday … 6=Saturday), stored as JSONB array
  day_of_week           JSONB,          -- e.g. [1, 4] for Monday + Thursday

  typical_guest_count   INTEGER,
  rate_cents            INTEGER NOT NULL CHECK (rate_cents >= 0),
  start_date            DATE NOT NULL,
  end_date              DATE,           -- NULL = ongoing

  notes                 TEXT,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'ended')),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_chef        ON recurring_services(chef_id, status);
CREATE INDEX idx_recurring_client      ON recurring_services(chef_id, client_id);

COMMENT ON TABLE recurring_services IS 'Ongoing service arrangements with clients (weekly meal prep, standing dinners, etc.)';

CREATE TRIGGER trg_recurring_updated_at
  BEFORE UPDATE ON recurring_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: SERVED DISH HISTORY
-- ============================================

CREATE TABLE served_dish_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Optional FK to recipe — or free-text for dishes not in the recipe library
  recipe_id        UUID REFERENCES recipes(id) ON DELETE SET NULL,
  dish_name        TEXT NOT NULL,

  served_date      DATE NOT NULL,
  event_id         UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Chef-recorded client reaction
  client_reaction  TEXT CHECK (client_reaction IN ('loved', 'liked', 'neutral', 'disliked')),
  notes            TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_served_dish_client  ON served_dish_history(chef_id, client_id, served_date DESC);
CREATE INDEX idx_served_dish_recipe  ON served_dish_history(chef_id, recipe_id);
CREATE INDEX idx_served_dish_chef    ON served_dish_history(chef_id, served_date DESC);

COMMENT ON TABLE served_dish_history IS 'Rolling log of dishes served to each client. Used to suggest variety and track favorites/dislikes.';
COMMENT ON COLUMN served_dish_history.client_reaction IS 'Chef-assessed reaction. loved/liked dishes can be served again; disliked dishes avoided.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE recurring_services  ENABLE ROW LEVEL SECURITY;
ALTER TABLE served_dish_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rs_chef_select ON recurring_services;
CREATE POLICY rs_chef_select ON recurring_services FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rs_chef_insert ON recurring_services;
CREATE POLICY rs_chef_insert ON recurring_services FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rs_chef_update ON recurring_services;
CREATE POLICY rs_chef_update ON recurring_services FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS rs_chef_delete ON recurring_services;
CREATE POLICY rs_chef_delete ON recurring_services FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS sdh_chef_select ON served_dish_history;
CREATE POLICY sdh_chef_select ON served_dish_history FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS sdh_chef_insert ON served_dish_history;
CREATE POLICY sdh_chef_insert ON served_dish_history FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS sdh_chef_update ON served_dish_history;
CREATE POLICY sdh_chef_update ON served_dish_history FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS sdh_chef_delete ON served_dish_history;
CREATE POLICY sdh_chef_delete ON served_dish_history FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- Budget Variance + Equipment Rental tables
-- Additive migration: creates two new tables, no existing data affected.

-- ─── Chef Budgets ───────────────────────────────────────────────────────
-- Monthly budget targets per expense category, used for variance reporting.

CREATE TABLE IF NOT EXISTS chef_budgets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  month       text NOT NULL,           -- YYYY-MM format
  category    text NOT NULL,           -- budget category slug
  budget_cents integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chef_id, month, category)
);
ALTER TABLE chef_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chef_budgets_tenant_isolation" ON chef_budgets;
CREATE POLICY "chef_budgets_tenant_isolation"
  ON chef_budgets FOR ALL
  USING (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- ─── Event Equipment Rentals ────────────────────────────────────────────
-- Track rental equipment needs per event with cost and status tracking.

CREATE TABLE IF NOT EXISTS event_equipment_rentals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id           uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name              text NOT NULL,
  vendor            text,
  quantity          integer NOT NULL DEFAULT 1,
  daily_rate_cents  integer,
  total_cost_cents  integer,
  notes             text,
  needed_date       date,
  status            text NOT NULL DEFAULT 'needed'
                      CHECK (status IN ('needed', 'confirmed', 'picked_up', 'returned', 'cancelled')),
  confirmed_at      timestamptz,
  returned_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE event_equipment_rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_equipment_rentals_tenant_isolation" ON event_equipment_rentals;
CREATE POLICY "event_equipment_rentals_tenant_isolation"
  ON event_equipment_rentals FOR ALL
  USING (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- Indexes for common queries
CREATE INDEX idx_chef_budgets_chef_month ON chef_budgets(chef_id, month);
CREATE INDEX idx_event_equipment_rentals_event ON event_equipment_rentals(event_id);
CREATE INDEX idx_event_equipment_rentals_chef_status ON event_equipment_rentals(chef_id, status);

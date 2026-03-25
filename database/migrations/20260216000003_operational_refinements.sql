-- Phase 17: Client Milestones, Menu Evolution, and Operational Refinements
-- Adds: client enrichment fields, menu modifications tracking,
--        ingredient price history, unused ingredient tracking,
--        event time/card tracking, shopping substitutions

BEGIN;

-- ============================================================
-- 1. Enums for new tables
-- ============================================================

CREATE TYPE modification_type AS ENUM (
  'substitution', 'addition', 'removal', 'method_change'
);

CREATE TYPE unused_reason AS ENUM (
  'leftover_reusable', 'wasted', 'returned'
);

CREATE TYPE substitution_reason AS ENUM (
  'unavailable', 'price', 'quality', 'preference', 'forgot', 'other'
);

-- ============================================================
-- 2. Client enrichment columns
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS additional_addresses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS family_notes TEXT;

-- personal_milestones already exists as JSONB on clients (Layer 1)
-- partner_name already exists as TEXT on clients (Layer 1)

-- ============================================================
-- 3. Event time tracking + card columns
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS time_shopping_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS time_prep_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS time_travel_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS time_service_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS time_reset_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS payment_card_used TEXT,
  ADD COLUMN IF NOT EXISTS card_cashback_percent DECIMAL;

-- ============================================================
-- 4. Expense cashback column
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS card_cashback_percent DECIMAL;

-- ============================================================
-- 5. menu_modifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  component_id UUID REFERENCES components(id) ON DELETE SET NULL,
  modification_type modification_type NOT NULL,
  original_description TEXT,
  actual_description TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_modifications_event ON menu_modifications(event_id);
CREATE INDEX idx_menu_modifications_tenant ON menu_modifications(tenant_id);

ALTER TABLE menu_modifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own menu modifications" ON menu_modifications;
CREATE POLICY "Chefs manage own menu modifications"
  ON menu_modifications
  FOR ALL
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 6. ingredient_price_history table
-- ============================================================

CREATE TABLE IF NOT EXISTS ingredient_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  store_name TEXT,
  price_cents INTEGER NOT NULL,
  quantity DECIMAL NOT NULL DEFAULT 1,
  unit TEXT,
  price_per_unit_cents INTEGER,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredient_price_history_ingredient ON ingredient_price_history(ingredient_id);
CREATE INDEX idx_ingredient_price_history_tenant ON ingredient_price_history(tenant_id);

ALTER TABLE ingredient_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own ingredient price history" ON ingredient_price_history;
CREATE POLICY "Chefs manage own ingredient price history"
  ON ingredient_price_history
  FOR ALL
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 7. unused_ingredients table
-- ============================================================

CREATE TABLE IF NOT EXISTS unused_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  reason unused_reason NOT NULL DEFAULT 'leftover_reusable',
  estimated_cost_cents INTEGER,
  transferred_to_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_unused_ingredients_event ON unused_ingredients(event_id);
CREATE INDEX idx_unused_ingredients_tenant ON unused_ingredients(tenant_id);

ALTER TABLE unused_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own unused ingredients" ON unused_ingredients;
CREATE POLICY "Chefs manage own unused ingredients"
  ON unused_ingredients
  FOR ALL
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 8. shopping_substitutions table
-- ============================================================

CREATE TABLE IF NOT EXISTS shopping_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  planned_ingredient TEXT NOT NULL,
  actual_ingredient TEXT NOT NULL,
  reason substitution_reason NOT NULL DEFAULT 'unavailable',
  store_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_substitutions_event ON shopping_substitutions(event_id);
CREATE INDEX idx_shopping_substitutions_tenant ON shopping_substitutions(tenant_id);

ALTER TABLE shopping_substitutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own shopping substitutions" ON shopping_substitutions;
CREATE POLICY "Chefs manage own shopping substitutions"
  ON shopping_substitutions
  FOR ALL
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

COMMIT;

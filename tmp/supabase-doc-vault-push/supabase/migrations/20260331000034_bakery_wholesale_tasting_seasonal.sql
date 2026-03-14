-- Bakery features: Wholesale/B2B accounts, Tasting scheduler, Seasonal item calendar
-- Additive migration: creates new tables, no existing data affected

-- ============================================================
-- 1. Wholesale Accounts
-- ============================================================

CREATE TABLE IF NOT EXISTS wholesale_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  payment_terms text NOT NULL DEFAULT 'cod' CHECK (payment_terms IN ('cod', 'net_7', 'net_15', 'net_30')),
  discount_percent integer NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wholesale_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "wholesale_accounts_tenant_isolation" ON wholesale_accounts
    FOR ALL USING (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ============================================================
-- 2. Wholesale Orders
-- ============================================================

CREATE TABLE IF NOT EXISTS wholesale_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES wholesale_accounts(id) ON DELETE CASCADE,
  order_date date NOT NULL,
  delivery_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'producing', 'ready', 'delivered', 'invoiced', 'paid'
  )),
  invoice_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wholesale_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "wholesale_orders_tenant_isolation" ON wholesale_orders
    FOR ALL USING (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_delivery ON wholesale_orders (tenant_id, delivery_date);
-- ============================================================
-- 3. Bakery Tastings
-- ============================================================

CREATE TABLE IF NOT EXISTS bakery_tastings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  tasting_date date NOT NULL,
  tasting_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  tasting_type text NOT NULL DEFAULT 'general' CHECK (tasting_type IN (
    'cake', 'pastry', 'bread', 'wedding', 'general'
  )),
  items_to_sample text[],
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  )),
  outcome_notes text,
  order_placed boolean NOT NULL DEFAULT false,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bakery_tastings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "bakery_tastings_tenant_isolation" ON bakery_tastings
    FOR ALL USING (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_bakery_tastings_date ON bakery_tastings (tenant_id, tasting_date);
-- ============================================================
-- 4. Bakery Seasonal Items
-- ============================================================

CREATE TABLE IF NOT EXISTS bakery_seasonal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'seasonal_special' CHECK (category IN (
    'cookie', 'pie', 'cake', 'bread', 'pastry', 'seasonal_special'
  )),
  recipe_id uuid,
  price_cents integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bakery_seasonal_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "bakery_seasonal_items_tenant_isolation" ON bakery_seasonal_items
    FOR ALL USING (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_bakery_seasonal_items_dates ON bakery_seasonal_items (tenant_id, start_date, end_date);

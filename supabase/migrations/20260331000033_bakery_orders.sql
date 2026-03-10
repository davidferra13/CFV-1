-- Bakery Orders: custom cake/pastry order tracking
-- Additive migration: creates new table, no existing data affected

CREATE TABLE IF NOT EXISTS bakery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  order_type text NOT NULL CHECK (order_type IN ('cake', 'cupcakes', 'pastry', 'bread', 'cookies', 'custom')),
  size text CHECK (size IN ('6 inch', '8 inch', '10 inch', '12 inch', 'sheet', 'tiered')),
  servings integer,
  layers integer,
  flavors jsonb, -- array of {layer, cake_flavor, filling}
  frosting_type text CHECK (frosting_type IN ('buttercream', 'fondant', 'ganache', 'cream_cheese', 'whipped', 'naked')),
  design_notes text,
  design_image_url text,
  colors text[],
  dietary text[], -- gluten_free, vegan, nut_free, dairy_free, sugar_free, keto
  inscription text,
  pickup_date date NOT NULL,
  pickup_time time,
  delivery_requested boolean DEFAULT false,
  delivery_address text,
  price_cents integer NOT NULL DEFAULT 0,
  deposit_cents integer NOT NULL DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  status text NOT NULL DEFAULT 'inquiry' CHECK (status IN (
    'inquiry', 'quoted', 'deposit_paid', 'in_production', 'decorating', 'ready', 'picked_up', 'delivered', 'cancelled'
  )),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bakery_orders_tenant_pickup ON bakery_orders(tenant_id, pickup_date);
CREATE INDEX IF NOT EXISTS idx_bakery_orders_tenant_status ON bakery_orders(tenant_id, status);

-- RLS
ALTER TABLE bakery_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Chefs can manage their own bakery orders"
    ON bakery_orders
    FOR ALL
    USING (tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE auth_user_id = auth.uid() AND entity_id = bakery_orders.tenant_id
    ))
    WITH CHECK (tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE auth_user_id = auth.uid() AND entity_id = bakery_orders.tenant_id
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_bakery_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER bakery_orders_updated_at
    BEFORE UPDATE ON bakery_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_bakery_orders_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

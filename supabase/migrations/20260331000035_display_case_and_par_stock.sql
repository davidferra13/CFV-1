-- Display Case Management + Par Stock for daily production
-- Additive migration: creates new tables, no existing data affected

-- Display case items: what's in the retail case right now
CREATE TABLE IF NOT EXISTS display_case_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  category text NOT NULL DEFAULT 'pastry' CHECK (category IN (
    'bread', 'pastry', 'cake', 'cookie', 'savory', 'drink', 'other'
  )),
  current_quantity integer NOT NULL DEFAULT 0,
  par_level integer NOT NULL DEFAULT 0,
  price_cents integer NOT NULL,
  baked_at timestamptz,
  shelf_life_hours integer,
  allergens text[],
  is_active boolean NOT NULL DEFAULT true,
  last_restocked timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_display_case_items_tenant ON display_case_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_display_case_items_tenant_active ON display_case_items(tenant_id) WHERE is_active = true;

ALTER TABLE display_case_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Chefs can manage their own display case items"
    ON display_case_items
    FOR ALL
    USING (tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE auth_user_id = auth.uid() AND entity_id = display_case_items.tenant_id
    ))
    WITH CHECK (tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE auth_user_id = auth.uid() AND entity_id = display_case_items.tenant_id
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION update_display_case_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER display_case_items_updated_at
    BEFORE UPDATE ON display_case_items
    FOR EACH ROW
    EXECUTE FUNCTION update_display_case_items_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Par stock items: things always produced daily
CREATE TABLE IF NOT EXISTS bakery_par_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 50,
  recipe_id uuid,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bakery_par_stock_tenant ON bakery_par_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bakery_par_stock_tenant_active ON bakery_par_stock(tenant_id) WHERE is_active = true;

ALTER TABLE bakery_par_stock ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Chefs can manage their own par stock"
    ON bakery_par_stock
    FOR ALL
    USING (tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE auth_user_id = auth.uid() AND entity_id = bakery_par_stock.tenant_id
    ))
    WITH CHECK (tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE auth_user_id = auth.uid() AND entity_id = bakery_par_stock.tenant_id
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION update_bakery_par_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER bakery_par_stock_updated_at
    BEFORE UPDATE ON bakery_par_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_bakery_par_stock_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Daily production log: tracks completion of production items
CREATE TABLE IF NOT EXISTS bakery_production_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  source_type text NOT NULL CHECK (source_type IN ('par_stock', 'custom_order', 'batch')),
  source_id uuid,
  product_name text NOT NULL,
  planned_quantity integer NOT NULL DEFAULT 0,
  actual_quantity integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  completed_at timestamptz,
  assigned_to text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bakery_production_log_tenant_date ON bakery_production_log(tenant_id, production_date);

ALTER TABLE bakery_production_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Chefs can manage their own production log"
    ON bakery_production_log
    FOR ALL
    USING (tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE auth_user_id = auth.uid() AND entity_id = bakery_production_log.tenant_id
    ))
    WITH CHECK (tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE auth_user_id = auth.uid() AND entity_id = bakery_production_log.tenant_id
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION update_bakery_production_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER bakery_production_log_updated_at
    BEFORE UPDATE ON bakery_production_log
    FOR EACH ROW
    EXECUTE FUNCTION update_bakery_production_log_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

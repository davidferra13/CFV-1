-- Commerce promotions and applied-promotion snapshots.

DO $$ BEGIN
  CREATE TYPE commerce_promotion_discount_type AS ENUM (
    'percent_order',
    'fixed_order',
    'percent_item',
    'fixed_item'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS commerce_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  discount_type commerce_promotion_discount_type NOT NULL,
  discount_percent INTEGER CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 1 AND 100)),
  discount_cents INTEGER CHECK (discount_cents IS NULL OR discount_cents > 0),
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_subtotal_cents >= 0),
  max_discount_cents INTEGER CHECK (max_discount_cents IS NULL OR max_discount_cents > 0),
  target_tax_classes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

  auto_apply BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  CONSTRAINT commerce_promotions_window_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CONSTRAINT commerce_promotions_value_shape CHECK (
    (discount_type IN ('percent_order', 'percent_item') AND discount_percent IS NOT NULL AND discount_cents IS NULL)
    OR
    (discount_type IN ('fixed_order', 'fixed_item') AND discount_cents IS NOT NULL AND discount_percent IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_promotions_tenant_code
  ON commerce_promotions (tenant_id, code);

CREATE INDEX IF NOT EXISTS idx_commerce_promotions_tenant_active
  ON commerce_promotions (tenant_id, is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS sale_applied_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES commerce_promotions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  discount_type commerce_promotion_discount_type NOT NULL,
  discount_cents INTEGER NOT NULL CHECK (discount_cents > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_sale_applied_promotions_tenant_sale
  ON sale_applied_promotions (tenant_id, sale_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_applied_promotions_tenant_promotion
  ON sale_applied_promotions (tenant_id, promotion_id);

DROP TRIGGER IF EXISTS update_commerce_promotions_updated_at ON commerce_promotions;
CREATE TRIGGER update_commerce_promotions_updated_at
  BEFORE UPDATE ON commerce_promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE commerce_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_applied_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_commerce_promotions ON commerce_promotions;
CREATE POLICY chef_commerce_promotions ON commerce_promotions
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS chef_sale_applied_promotions ON sale_applied_promotions;
CREATE POLICY chef_sale_applied_promotions ON sale_applied_promotions
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS service_commerce_promotions ON commerce_promotions;
CREATE POLICY service_commerce_promotions ON commerce_promotions
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_sale_applied_promotions ON sale_applied_promotions;
CREATE POLICY service_sale_applied_promotions ON sale_applied_promotions
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE commerce_promotions IS 'Reusable POS promotion rules (percent/fixed, order/item scoped).';
COMMENT ON TABLE sale_applied_promotions IS 'Immutable snapshot of promotions applied to each sale.';


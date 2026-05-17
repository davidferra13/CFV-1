-- Ingredient Sourcing Intelligence
-- ADDITIVE ONLY: two new tables for vendor preferences and purchase logging.

-- Per-ingredient vendor preferences (which vendor does this chef prefer for this ingredient?)
CREATE TABLE IF NOT EXISTS ingredient_vendor_preferences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_name   text NOT NULL,
  vendor_type   text NOT NULL DEFAULT 'other'
    CHECK (vendor_type = ANY (ARRAY[
      'grocery','specialty','butcher','fishmonger','farm',
      'liquor','equipment','bakery','produce','dairy','other'
    ])),
  notes         text,
  is_preferred  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (ingredient_id, tenant_id, vendor_name)
);

CREATE INDEX idx_ivp_tenant ON ingredient_vendor_preferences(tenant_id);
CREATE INDEX idx_ivp_ingredient ON ingredient_vendor_preferences(ingredient_id);

-- RLS: tenant isolation
ALTER TABLE ingredient_vendor_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY ivp_tenant_isolation ON ingredient_vendor_preferences
  FOR ALL USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Purchase log: track actual ingredient purchases for price trending
CREATE TABLE IF NOT EXISTS ingredient_purchase_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id  uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  tenant_id      uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_name    text NOT NULL,
  price_cents    integer NOT NULL,
  quantity       text NOT NULL,
  unit           text NOT NULL,
  quality_rating integer CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
  purchased_at   timestamptz NOT NULL DEFAULT now(),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ipl_tenant ON ingredient_purchase_log(tenant_id);
CREATE INDEX idx_ipl_ingredient ON ingredient_purchase_log(ingredient_id, purchased_at DESC);
CREATE INDEX idx_ipl_vendor ON ingredient_purchase_log(tenant_id, vendor_name);

-- RLS: tenant isolation
ALTER TABLE ingredient_purchase_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY ipl_tenant_isolation ON ingredient_purchase_log
  FOR ALL USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

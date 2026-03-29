-- Shopping cart tables for chef cart builder (OpenClaw Total Catalog Intelligence)
-- Additive only: CREATE TABLE, no modifications to existing tables

CREATE TABLE IF NOT EXISTS shopping_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Shopping List',
  store_filter TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_carts_tenant ON shopping_carts(tenant_id);

CREATE TABLE IF NOT EXISTS shopping_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  canonical_ingredient_id TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  price_cents INTEGER,
  price_source TEXT,
  image_url TEXT,
  checked_off BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON shopping_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_tenant ON shopping_cart_items(tenant_id);

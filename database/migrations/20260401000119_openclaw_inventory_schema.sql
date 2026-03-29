-- OpenClaw Inventory Catalog Schema
-- Full store inventory for New England grocery chains.
-- Separated into its own schema to keep catalog data distinct from ChefFlow app data.

CREATE SCHEMA IF NOT EXISTS openclaw;

-- Retail chain definitions
CREATE TABLE IF NOT EXISTS openclaw.chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  website_url TEXT,
  logo_url TEXT,
  store_locator_url TEXT,
  scraper_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every physical store location
CREATE TABLE IF NOT EXISTS openclaw.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES openclaw.chains(id) ON DELETE CASCADE,
  external_store_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  phone TEXT,
  hours_json JSONB,
  last_cataloged_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chain_id, external_store_id)
);

CREATE INDEX IF NOT EXISTS idx_oc_stores_chain ON openclaw.stores(chain_id);
CREATE INDEX IF NOT EXISTS idx_oc_stores_state ON openclaw.stores(state);
CREATE INDEX IF NOT EXISTS idx_oc_stores_zip ON openclaw.stores(zip);
CREATE INDEX IF NOT EXISTS idx_oc_stores_geo ON openclaw.stores(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Hierarchical product categories
CREATE TABLE IF NOT EXISTS openclaw.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES openclaw.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  department TEXT,
  is_food BOOLEAN NOT NULL DEFAULT true,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oc_categories_parent ON openclaw.product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_oc_categories_dept ON openclaw.product_categories(department);

-- Every product (SKU)
CREATE TABLE IF NOT EXISTS openclaw.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  upc TEXT,
  size TEXT,
  size_value NUMERIC(10, 3),
  size_unit TEXT,
  category_id UUID REFERENCES openclaw.product_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_organic BOOLEAN DEFAULT false,
  is_store_brand BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oc_products_name ON openclaw.products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_oc_products_upc ON openclaw.products(upc) WHERE upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oc_products_category ON openclaw.products(category_id);
CREATE INDEX IF NOT EXISTS idx_oc_products_brand ON openclaw.products(brand) WHERE brand IS NOT NULL;

-- Price per product per store (the big table)
CREATE TABLE IF NOT EXISTS openclaw.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES openclaw.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES openclaw.products(id) ON DELETE CASCADE,
  price_cents INTEGER NOT NULL,
  sale_price_cents INTEGER,
  sale_ends_at TIMESTAMPTZ,
  in_stock BOOLEAN DEFAULT true,
  aisle TEXT,
  source TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_oc_store_products_store ON openclaw.store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_oc_store_products_product ON openclaw.store_products(product_id);
CREATE INDEX IF NOT EXISTS idx_oc_store_products_price ON openclaw.store_products(price_cents);
CREATE INDEX IF NOT EXISTS idx_oc_store_products_seen ON openclaw.store_products(last_seen_at);

-- Scrape run audit trail
CREATE TABLE IF NOT EXISTS openclaw.scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES openclaw.stores(id) ON DELETE SET NULL,
  chain_id UUID REFERENCES openclaw.chains(id) ON DELETE SET NULL,
  scraper_name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'full',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  products_found INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_new INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oc_scrape_runs_store ON openclaw.scrape_runs(store_id);
CREATE INDEX IF NOT EXISTS idx_oc_scrape_runs_chain ON openclaw.scrape_runs(chain_id);
CREATE INDEX IF NOT EXISTS idx_oc_scrape_runs_date ON openclaw.scrape_runs(started_at DESC);

-- PC pull sync log
CREATE TABLE IF NOT EXISTS openclaw.sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  sqlite_size_bytes BIGINT,
  products_synced INTEGER DEFAULT 0,
  stores_synced INTEGER DEFAULT 0,
  prices_synced INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details TEXT,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_oc_sync_runs_date ON openclaw.sync_runs(started_at DESC);

-- Seed the chain definitions
INSERT INTO openclaw.chains (slug, name, scraper_type, store_locator_url) VALUES
  ('market_basket', 'Market Basket', 'instacart', 'https://www.shopmarketbasket.com/store-locator'),
  ('stop_and_shop', 'Stop & Shop', 'instacart', 'https://stopandshop.com/store-locator'),
  ('hannaford', 'Hannaford', 'instacart', 'https://www.hannaford.com/locations'),
  ('shaws', 'Shaw''s', 'instacart', 'https://www.shaws.com/stores'),
  ('walmart', 'Walmart', 'api', 'https://www.walmart.com/store-finder'),
  ('target', 'Target', 'api', 'https://www.target.com/store-locator'),
  ('whole_foods', 'Whole Foods', 'api', 'https://www.wholefoodsmarket.com/stores'),
  ('trader_joes', 'Trader Joe''s', 'graphql', 'https://www.traderjoes.com/home/store-locator'),
  ('aldi', 'Aldi', 'website', 'https://stores.aldi.us'),
  ('bjs', 'BJ''s Wholesale', 'website', 'https://www.bjs.com/clubLocator'),
  ('costco', 'Costco', 'website', 'https://www.costco.com/warehouse-locations')
ON CONFLICT (slug) DO NOTHING;

-- Bridge view: connect openclaw products to ChefFlow ingredients for price resolution
CREATE OR REPLACE VIEW openclaw.ingredient_price_bridge AS
SELECT
  i.id AS ingredient_id,
  i.tenant_id,
  i.name AS ingredient_name,
  p.id AS product_id,
  p.name AS product_name,
  p.brand,
  sp.price_cents,
  sp.sale_price_cents,
  sp.in_stock,
  sp.last_seen_at,
  sp.source,
  s.name AS store_name,
  s.city,
  s.state,
  s.zip,
  c.name AS chain_name,
  c.slug AS chain_slug
FROM public.ingredients i
CROSS JOIN LATERAL (
  SELECT p2.id, p2.name, p2.brand
  FROM openclaw.products p2
  WHERE to_tsvector('english', p2.name) @@ plainto_tsquery('english', i.name)
  LIMIT 5
) p
JOIN openclaw.store_products sp ON sp.product_id = p.id
JOIN openclaw.stores s ON s.id = sp.store_id
JOIN openclaw.chains c ON c.id = s.chain_id;

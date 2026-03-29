# Spec: OpenClaw Inventory Evolution (Price Sampler to Full Catalog)

> **Status:** built (Phases 0, 1, 5 - ChefFlow + pull service)
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files, multi-machine, 6 phases)
> **Created:** 2026-03-29
> **Built by:** Claude Code (2026-03-29)
> **Note:** Phases 2-3 (Pi store locator + catalog scrapers) require Pi deployment. Phase 4 (category classifier) is embedded in pull service. Display layer shows proper empty states until data arrives. Migration timestamp adjusted to 20260401000119 (118 was used by prospect source constraint).

---

## What This Does (Plain English)

Evolves the OpenClaw price intelligence system from a hyper-local price sampler (one zip code, ingredient-name lookups) into a full store inventory catalog covering all of New England (starting MA, NH, ME). Instead of asking the Pi "what does chicken breast cost?", the system captures every product from every store and builds a browsable catalog. The end result: enter a zip code in ChefFlow, see nearby stores, browse their full inventory with real prices and last-updated timestamps. The "Amazon Whole Foods" experience for every grocery chain in New England.

---

## Why It Matters

The current system only knows prices for ingredients a chef already has. It cannot answer "what does Stop & Shop in Salem carry?" or "which store near me has the cheapest olive oil?" A full catalog unlocks price comparison shopping, inventory browsing, and geographic price intelligence across hundreds of stores. This is the foundation for ChefFlow becoming indispensable for food cost management.

---

## Architecture Overview

Two machines, clear responsibilities:

| Machine                       | Role                                                                | Key constraint           |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------ |
| **Raspberry Pi** (10.0.0.177) | 24/7 scraper, lightweight buffer, SQLite                            | 8GB RAM, ~78GB free disk |
| **Developer PC**              | PostgreSQL (Docker, port 54322), permanent storage, serves ChefFlow | Plenty of resources      |

Data flow: Pi scrapes stores continuously -> Pi stores in SQLite -> PC pulls SQLite hourly -> PC parses into PostgreSQL `openclaw` schema -> ChefFlow reads from PostgreSQL.

The PC pull service is a standalone Node script. It does not depend on the ChefFlow dev server running.

---

## Phase 0: PC Pull Service

### What It Does

A standalone Node.js script on the PC that pulls the full SQLite database from the Pi on a schedule and loads it into PostgreSQL. Replaces the current model where the Pi initiates sync and ChefFlow calls back.

### Files to Create

| File                                     | Purpose                                                               |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `scripts/openclaw-pull/pull.mjs`         | Main pull script: fetch SQLite from Pi, parse, insert into PostgreSQL |
| `scripts/openclaw-pull/config.mjs`       | Configuration (Pi host, ports, PostgreSQL connection, schedule)       |
| `scripts/openclaw-pull/README.md`        | Setup and usage instructions                                          |
| `scripts/openclaw-pull/install-task.ps1` | PowerShell script to create Windows Scheduled Task (hourly)           |

### How It Works

1. **Fetch:** HTTP GET `http://10.0.0.177:8081/api/sync/database` to download the full SQLite file (~24MB, will grow)
2. **Parse:** Open SQLite with `better-sqlite3` (already available or installable), read all tables
3. **Transform:** Map Pi's SQLite schema to the new `openclaw` PostgreSQL schema (Phase 1)
4. **Load:** Bulk upsert into PostgreSQL using `postgres` (the npm package already in devDependencies)
5. **Log:** Write sync results to `openclaw.sync_runs` table (timestamps, row counts, errors)

### Schedule

- **Windows Scheduled Task** (not Node cron, so it works even if no Node process is running)
- Runs every hour: `schtasks /create /tn "OpenClaw Pull" /tr "node C:\Users\david\Documents\CFv1\scripts\openclaw-pull\pull.mjs" /sc hourly`
- The `install-task.ps1` script handles creation/update of this task

### Configuration (`config.mjs`)

```js
export default {
  pi: {
    host: '10.0.0.177',
    port: 8081,
    dbEndpoint: '/api/sync/database',
    timeoutMs: 120000, // 2 min for large DB downloads
  },
  pg: {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres',
  },
  tempDir: 'C:/Users/david/Documents/CFv1/.openclaw-temp',
  logFile: 'C:/Users/david/Documents/CFv1/logs/openclaw-pull.log',
}
```

### Pull Script Pseudocode (`pull.mjs`)

```js
import { writeFileSync, mkdirSync } from 'fs'
import Database from 'better-sqlite3'
import postgres from 'postgres'
import config from './config.mjs'

async function main() {
  const startedAt = new Date()
  mkdirSync(config.tempDir, { recursive: true })

  // 1. Download SQLite from Pi
  const res = await fetch(`http://${config.pi.host}:${config.pi.port}${config.pi.dbEndpoint}`, {
    signal: AbortSignal.timeout(config.pi.timeoutMs),
  })
  if (!res.ok) throw new Error(`Pi returned ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const dbPath = `${config.tempDir}/openclaw-latest.db`
  writeFileSync(dbPath, buffer)

  // 2. Open SQLite, read tables
  const sqlite = new Database(dbPath, { readonly: true })
  // Read products, prices, stores, scrape metadata
  // ...

  // 3. Connect to PostgreSQL, bulk upsert
  const sql = postgres(config.pg.connectionString)
  // Upsert into openclaw.chains, openclaw.stores, openclaw.products, openclaw.store_products
  // ...

  // 4. Log sync run
  await sql`INSERT INTO openclaw.sync_runs ...`
  await sql.end()
  sqlite.close()
}

main().catch((err) => {
  console.error('[openclaw-pull] Fatal:', err.message)
  process.exit(1)
})
```

### Dependencies

- `better-sqlite3` - add to devDependencies (reads the downloaded SQLite file)
- `postgres` - already in devDependencies

### Key Constraints

- Pi is read-only from PC's perspective. PC initiates every transfer.
- If Pi is unreachable, log the failure and exit cleanly. Next hourly run will retry.
- Downloaded SQLite file goes to `.openclaw-temp/` (gitignored). Overwritten each run.
- No dependency on ChefFlow dev server, Next.js, or any running process.

---

## Phase 1: New Database Schema

### New Schema: `openclaw`

All new tables live in a dedicated `openclaw` schema within the existing PostgreSQL database (port 54322, container `chefflow_postgres`). This keeps the catalog data cleanly separated from ChefFlow's application tables.

### Migration File

Filename: `database/migrations/20260401000118_openclaw_inventory_schema.sql`

(Timestamp 20260401000118 is strictly higher than the current highest: 20260401000117.)

```sql
-- OpenClaw Inventory Catalog Schema
-- Full store inventory for New England grocery chains.
-- Separated into its own schema to keep catalog data distinct from ChefFlow app data.

CREATE SCHEMA IF NOT EXISTS openclaw;

-- Retail chain definitions
CREATE TABLE openclaw.chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,           -- 'market_basket', 'stop_and_shop', etc.
  name TEXT NOT NULL,                   -- 'Market Basket'
  website_url TEXT,
  logo_url TEXT,
  store_locator_url TEXT,              -- URL for scraping store locations
  scraper_type TEXT,                    -- 'instacart', 'api', 'website', 'graphql'
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every physical store location
CREATE TABLE openclaw.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES openclaw.chains(id) ON DELETE CASCADE,
  external_store_id TEXT,              -- retailer's own store number/ID
  name TEXT NOT NULL,                   -- 'Market Basket #44' or 'Stop & Shop - Salem'
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,                  -- 'MA', 'NH', 'ME'
  zip TEXT NOT NULL,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  phone TEXT,
  hours_json JSONB,                    -- store hours if available
  last_cataloged_at TIMESTAMPTZ,       -- when we last scraped this store's inventory
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chain_id, external_store_id)
);

CREATE INDEX idx_stores_chain ON openclaw.stores(chain_id);
CREATE INDEX idx_stores_state ON openclaw.stores(state);
CREATE INDEX idx_stores_zip ON openclaw.stores(zip);
CREATE INDEX idx_stores_geo ON openclaw.stores(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Hierarchical product categories
CREATE TABLE openclaw.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES openclaw.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,                   -- 'Dairy', 'Cheese', 'Shredded Cheese'
  department TEXT,                      -- top-level grouping: 'Produce', 'Dairy', 'Meat', 'Bakery'
  is_food BOOLEAN NOT NULL DEFAULT true,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON openclaw.product_categories(parent_id);
CREATE INDEX idx_categories_dept ON openclaw.product_categories(department);
CREATE INDEX idx_categories_food ON openclaw.product_categories(is_food);

-- Every product (SKU)
CREATE TABLE openclaw.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  upc TEXT,                            -- UPC barcode if available
  size TEXT,                           -- '16 oz', '1 lb', '6 ct'
  size_value NUMERIC(10, 3),           -- normalized numeric: 16
  size_unit TEXT,                      -- normalized unit: 'oz'
  category_id UUID REFERENCES openclaw.product_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_organic BOOLEAN DEFAULT false,
  is_store_brand BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_name ON openclaw.products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_upc ON openclaw.products(upc) WHERE upc IS NOT NULL;
CREATE INDEX idx_products_category ON openclaw.products(category_id);
CREATE INDEX idx_products_brand ON openclaw.products(brand) WHERE brand IS NOT NULL;

-- Price per product per store (the big table)
CREATE TABLE openclaw.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES openclaw.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES openclaw.products(id) ON DELETE CASCADE,
  price_cents INTEGER NOT NULL,
  sale_price_cents INTEGER,            -- if on sale
  sale_ends_at TIMESTAMPTZ,
  in_stock BOOLEAN DEFAULT true,
  aisle TEXT,                          -- aisle/location within store if available
  source TEXT NOT NULL,                -- 'instacart', 'walmart_api', 'target_redsky', 'website', 'graphql'
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id)
);

CREATE INDEX idx_store_products_store ON openclaw.store_products(store_id);
CREATE INDEX idx_store_products_product ON openclaw.store_products(product_id);
CREATE INDEX idx_store_products_price ON openclaw.store_products(price_cents);
CREATE INDEX idx_store_products_seen ON openclaw.store_products(last_seen_at);

-- Scrape run audit trail
CREATE TABLE openclaw.scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES openclaw.stores(id) ON DELETE SET NULL,
  chain_id UUID REFERENCES openclaw.chains(id) ON DELETE SET NULL,
  scraper_name TEXT NOT NULL,          -- 'instacart-walker', 'walmart-api', etc.
  scope TEXT NOT NULL DEFAULT 'full',  -- 'full', 'category', 'delta'
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

CREATE INDEX idx_scrape_runs_store ON openclaw.scrape_runs(store_id);
CREATE INDEX idx_scrape_runs_chain ON openclaw.scrape_runs(chain_id);
CREATE INDEX idx_scrape_runs_date ON openclaw.scrape_runs(started_at DESC);

-- PC pull sync log
CREATE TABLE openclaw.sync_runs (
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

CREATE INDEX idx_sync_runs_date ON openclaw.sync_runs(started_at DESC);

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
```

### Migration Notes

- Timestamp `20260401000118` is one higher than current max `20260401000117`.
- All operations are additive (CREATE SCHEMA, CREATE TABLE, INSERT).
- No existing tables are modified.
- The bridge view uses a text search join, which is intentionally loose. Exact matching can be refined later with a manual mapping table if needed.

---

## Phase 2: Store Registry

### What It Does

Populates `openclaw.stores` with every physical store location for MA, NH, and ME across all chains. This is a one-time scrape per chain, refreshed monthly.

### Implementation

This work happens on the Pi (new scrapers in `~/openclaw-prices/scrapers/`). The Pi already has Playwright and puppeteer-core for browser automation.

**Per-chain approach:**

| Chain         | Method                              | Expected stores (MA+NH+ME) |
| ------------- | ----------------------------------- | -------------------------- |
| Market Basket | Website store locator (static HTML) | ~80                        |
| Stop & Shop   | Store locator API (JSON endpoint)   | ~120                       |
| Hannaford     | Store locator page (HTML parse)     | ~70                        |
| Shaw's        | Albertsons store locator API        | ~50                        |
| Walmart       | Public store finder API             | ~40                        |
| Target        | Public store API                    | ~30                        |
| Whole Foods   | Amazon store locator                | ~25                        |
| Trader Joe's  | TJ store locator JSON               | ~15                        |
| Aldi          | ALDI store locator                  | ~20                        |
| BJ's          | Club locator                        | ~15                        |
| Costco        | Warehouse locator                   | ~10                        |

**Target: ~475+ store locations across 3 states.**

### Pi-Side Files (on Pi, not in CFv1 repo)

| File                                                    | Purpose                                                 |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `~/openclaw-prices/scrapers/store-locator-runner.mjs`   | Orchestrator: runs all chain locators, writes to SQLite |
| `~/openclaw-prices/scrapers/locators/market-basket.mjs` | Market Basket store locator scraper                     |
| `~/openclaw-prices/scrapers/locators/stop-and-shop.mjs` | Stop & Shop store locator scraper                       |
| `~/openclaw-prices/scrapers/locators/hannaford.mjs`     | Hannaford store locator scraper                         |
| `~/openclaw-prices/scrapers/locators/shaws.mjs`         | Shaw's store locator scraper                            |
| `~/openclaw-prices/scrapers/locators/walmart.mjs`       | Walmart store finder API                                |
| `~/openclaw-prices/scrapers/locators/target.mjs`        | Target store API                                        |
| `~/openclaw-prices/scrapers/locators/whole-foods.mjs`   | Whole Foods/Amazon locator                              |
| `~/openclaw-prices/scrapers/locators/trader-joes.mjs`   | Trader Joe's locator                                    |
| `~/openclaw-prices/scrapers/locators/aldi.mjs`          | Aldi store locator                                      |

### Pi SQLite Schema Addition

```sql
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_slug TEXT NOT NULL,
  external_store_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  lat REAL,
  lng REAL,
  phone TEXT,
  last_scraped_at TEXT,
  UNIQUE(chain_slug, external_store_id)
);
```

### Data Validation

Each store record must have at minimum: chain_slug, name, city, state, zip. Records missing city or state are dropped. Lat/lng are preferred but not required (can be geocoded later).

---

## Phase 3: Full Catalog Scrapers

### What It Does

Replaces the current "send ingredient names, get prices back" model with full catalog walkers. Each scraper walks an entire store's inventory (every department, every category, every product) and captures everything.

### Priority Order

1. **Instacart** (covers Market Basket, Stop & Shop, Hannaford, Shaw's) - highest priority because it covers the 4 most important NE retailers via one platform
2. **Walmart API** - public API, straightforward
3. **Target Redsky** - semi-public API, needs IP rotation for volume
4. **Whole Foods / Amazon Fresh** - full catalog via Amazon's API
5. **Trader Joe's GraphQL** - undocumented but functional
6. **Aldi** - website scrape

### Pi-Side Scraper Architecture

Each scraper follows the same interface:

```js
// scraper interface
export default {
  name: 'instacart-walker',
  chain_slugs: ['market_basket', 'stop_and_shop', 'hannaford', 'shaws'],

  async scrapeStore(storeId, chainSlug) {
    // Walk all departments/categories for this store
    // Return array of { name, brand, upc, size, price_cents, category, in_stock, aisle, image_url }
  },
}
```

### Pi SQLite Schema Additions

```sql
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT,
  upc TEXT,
  size TEXT,
  size_value REAL,
  size_unit TEXT,
  category TEXT,
  image_url TEXT,
  is_organic INTEGER DEFAULT 0,
  is_store_brand INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(name, brand, size)
);

CREATE TABLE IF NOT EXISTS store_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  price_cents INTEGER NOT NULL,
  sale_price_cents INTEGER,
  in_stock INTEGER DEFAULT 1,
  aisle TEXT,
  source TEXT NOT NULL,
  last_seen_at TEXT DEFAULT (datetime('now')),
  UNIQUE(store_id, product_id)
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER,
  chain_slug TEXT,
  scraper_name TEXT NOT NULL,
  scope TEXT DEFAULT 'full',
  started_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT,
  products_found INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_new INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details TEXT
);
```

### Instacart Walker (Priority 1)

The current Pi scrapers already use Instacart for price lookups. The evolution:

**OLD:** Search Instacart for a specific ingredient name, get price back.
**NEW:** Walk Instacart's department/category tree for a given store, capture every product.

Steps:

1. Navigate to store's Instacart page (each retailer has a subdomain/path on Instacart)
2. Enumerate all departments (Produce, Dairy, Meat, Bakery, etc.)
3. For each department, enumerate all categories
4. For each category, paginate through all products
5. Capture: name, brand, price, size, image, in_stock, aisle/category path
6. Write to SQLite

Rate limiting: 2-3 second delay between pages. One store takes ~30-60 minutes for a full walk. Instacart pagination is the bottleneck.

### Walmart API (Priority 2)

Walmart has a public product search API. Key endpoints:

- `GET /api/v1/search?query=*&storeId={id}&category={cat}` - paginated product search
- Store IDs come from Phase 2

No browser needed. Pure HTTP requests with standard headers.

### Target Redsky (Priority 3)

Target's Redsky API: `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2`

- Requires a `visitor_id` cookie and `key` parameter
- IP rotation needed for volume (the Pi already has proxy support)
- Returns JSON with product details, prices, availability by store

### Key Change: Collect Everything, Filter on Display

The old system filtered at scrape time (only looking up known ingredients). The new system collects the entire store catalog. Non-food items (cleaning supplies, paper goods, etc.) are captured too but tagged with `is_food = false` for display filtering. This way:

- A chef browsing a store sees food items by default
- The full catalog exists for future use cases
- No data is thrown away at collection time

---

## Phase 4: Category/Filter System

### What It Does

Tags every product with a hierarchical category (department > category > subcategory) and an `is_food` boolean. Most retailers return category data already. A simple keyword classifier handles the rest.

### Category Hierarchy

```
Department (e.g., "Produce")
  Category (e.g., "Fresh Vegetables")
    Subcategory (e.g., "Leafy Greens")
```

### Category Sources

| Source        | How categories arrive                         |
| ------------- | --------------------------------------------- |
| Instacart     | Returns department + category in response     |
| Walmart API   | Returns category path in `categoryPath` field |
| Target Redsky | Returns `taxonomy` array                      |
| Whole Foods   | Returns department + category                 |
| Trader Joe's  | Returns category                              |
| Aldi          | Requires extraction from page structure       |

### Keyword Classifier (for untagged products)

A deterministic classifier (no AI) that uses keyword matching to assign department and `is_food`:

```js
const DEPARTMENT_KEYWORDS = {
  produce: ['apple', 'banana', 'lettuce', 'tomato', 'potato', 'onion', ...],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', ...],
  meat: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'steak', ...],
  bakery: ['bread', 'bagel', 'muffin', 'cake', 'cookie', ...],
  // ...
}

const NON_FOOD_KEYWORDS = [
  'detergent', 'shampoo', 'toilet', 'paper towel', 'trash bag',
  'battery', 'light bulb', 'pet food', 'dog', 'cat litter', ...
]
```

This runs during the pull service (Phase 0) for any product that arrives without a category. Formula over AI.

### `is_food` Logic

1. If the retailer's category data indicates food: `is_food = true`
2. If the retailer's category data indicates non-food (e.g., "Household", "Health & Beauty"): `is_food = false`
3. If no category data: run keyword classifier
4. If keyword classifier has no match: default to `is_food = true` (err on the side of inclusion, let the display layer filter)

---

## Phase 5: ChefFlow Display Layer

### What It Does

A new page in ChefFlow where users enter a zip code and browse nearby store inventories with full product listings, prices, and freshness indicators.

### Files to Create

| File                                         | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `app/(chef)/prices/page.tsx`                 | Price catalog page (server component, fetches nearby stores)      |
| `app/(chef)/prices/prices-client.tsx`        | Client component with zip input, store selector, product browser  |
| `app/(chef)/prices/store/[storeId]/page.tsx` | Individual store inventory page                                   |
| `lib/openclaw/catalog-actions.ts`            | Server actions for querying the openclaw schema                   |
| `components/prices/store-card.tsx`           | Store card component (name, chain, distance, product count)       |
| `components/prices/product-row.tsx`          | Product row (name, brand, size, price, sale indicator, freshness) |
| `components/prices/category-sidebar.tsx`     | Department/category filter sidebar                                |
| `components/prices/zip-search.tsx`           | Zip code input with nearby store discovery                        |

### Files to Modify

| File                            | What to Change                                                              |
| ------------------------------- | --------------------------------------------------------------------------- |
| `components/nav/nav-config.tsx` | Add "Price Catalog" nav entry under tools/utilities section                 |
| `lib/pricing/resolve-price.ts`  | Add new tier: openclaw catalog lookup (between api_quote and direct_scrape) |

### Server Actions (`lib/openclaw/catalog-actions.ts`)

| Action                                 | Auth            | Input                                                                                                             | Output                                                                   | Side Effects |
| -------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------ |
| `getNearbyStores(zip, radiusMiles?)`   | `requireChef()` | `{ zip: string, radius?: number }`                                                                                | `{ stores: StoreWithDistance[] }`                                        | None         |
| `getStoreInventory(storeId, filters?)` | `requireChef()` | `{ storeId: string, department?: string, category?: string, search?: string, foodOnly?: boolean, page?: number }` | `{ products: StoreProduct[], total: number, departments: string[] }`     | None         |
| `searchProducts(query, zip?, limit?)`  | `requireChef()` | `{ query: string, zip?: string, limit?: number }`                                                                 | `{ results: ProductWithPrices[] }`                                       | None         |
| `getCatalogStats()`                    | `requireChef()` | none                                                                                                              | `{ chains: number, stores: number, products: number, lastSync: string }` | None         |

### Nearby Store Discovery

Uses the Haversine formula (deterministic math, not AI) to find stores within a radius of the given zip code. Requires zip-to-lat/lng lookup, which can use a static table or the stores' own coordinates.

```sql
SELECT s.*, c.name as chain_name, c.slug as chain_slug,
  (3959 * acos(
    cos(radians($lat)) * cos(radians(s.lat)) *
    cos(radians(s.lng) - radians($lng)) +
    sin(radians($lat)) * sin(radians(s.lat))
  )) AS distance_miles
FROM openclaw.stores s
JOIN openclaw.chains c ON c.id = s.chain_id
WHERE s.is_active = true
  AND s.lat IS NOT NULL
  AND s.lng IS NOT NULL
HAVING distance_miles < $radius
ORDER BY distance_miles
LIMIT 50;
```

### Page States

- **Loading:** Skeleton cards for stores, skeleton rows for products
- **Empty (no zip entered):** "Enter your zip code to find nearby stores and browse their inventory"
- **Empty (no stores found):** "No stores found within {radius} miles of {zip}. Try a larger radius."
- **Error (database query fails):** "Could not load store data. Try again later." (never fake zeros)
- **Populated:** Store cards with chain logo, name, distance, product count, last cataloged date

### Product Display

Each product row shows:

- Product name and brand
- Size (e.g., "16 oz")
- Current price (formatted as $X.XX)
- Sale price if applicable (strikethrough on regular price, sale price highlighted)
- Freshness indicator based on `last_seen_at`:
  - Green dot: seen within 24 hours
  - Yellow dot: seen within 7 days
  - Gray dot: seen more than 7 days ago
- "Food" / "Non-food" badge (hidden when food-only filter is active)

### Filters

- **Department** dropdown (Produce, Dairy, Meat, etc.)
- **Category** dropdown (filtered by selected department)
- **Food only** toggle (default: on)
- **Search** text input (full-text search on product name)
- **Sort** by: name, price low-to-high, price high-to-low, last updated

---

## Bridge to Existing Price Resolution

The existing price resolution chain (`lib/pricing/resolve-price.ts`) currently reads from `ingredient_price_history` where OpenClaw data is written during sync. With the new catalog schema, we add an additional lookup path:

**New approach:** When resolving a price for an ingredient, also check `openclaw.store_products` via the bridge view. If a product name matches the ingredient and a store is within the chef's area, that price can feed into the resolution chain at the appropriate tier.

This is NOT a replacement for the existing sync. The existing `ingredient_price_history` flow continues working. The catalog adds a parallel, richer data source. The bridge view (`openclaw.ingredient_price_bridge`) makes this queryable without restructuring the resolution chain.

### What Changes in `resolve-price.ts`

Add a new tier between "API QUOTE" (tier 2) and "DIRECT SCRAPE" (tier 3):

**Tier 2.5: CATALOG** - Best price from `openclaw.store_products` for stores within 25 miles of the chef's zip, confidence 0.8, freshness based on `last_seen_at`.

This is additive. All existing tiers remain unchanged.

---

## Edge Cases and Error Handling

| Scenario                                        | Correct Behavior                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Pi is unreachable during pull                   | Log error, exit cleanly. Next hourly run retries.                                                     |
| Pi returns corrupted/empty SQLite               | Validate file size > 0 and SQLite header before parsing. Skip if invalid.                             |
| Product has no category from retailer           | Run keyword classifier. If no match, default `is_food = true`.                                        |
| Store has no lat/lng                            | Store is created but excluded from geo queries. Flag for manual geocoding.                            |
| Two products with same name but different sizes | Treated as separate products (unique on name + brand + size).                                         |
| Price is $0.00 from scraper                     | Skip (do not insert). Zero prices indicate scraper error, not free products.                          |
| Sale price higher than regular price            | Use regular price as sale_price_cents, log as scraper anomaly.                                        |
| Duplicate product across chains                 | Each chain has its own product rows. No cross-chain dedup (intentional).                              |
| Chef has no zip configured                      | Show zip input prompt. Do not default to 01835.                                                       |
| Catalog query returns no products for a store   | Show "No products cataloged yet for this store. Data is being collected."                             |
| `openclaw` schema doesn't exist yet             | Pull service checks for schema existence before inserting. Logs clear error if migration not applied. |

---

## Implementation Order

1. **Phase 1** first (database migration) - creates the schema all other phases depend on
2. **Phase 0** next (pull service) - the bridge between Pi and PostgreSQL
3. **Phase 2** (store registry scrapers on Pi) - populates the stores table
4. **Phase 3** (catalog scrapers on Pi) - populates products and store_products
5. **Phase 4** (category system) - runs as part of Phase 0's pull transform step
6. **Phase 5** (ChefFlow display) - the user-facing layer, built last

Phases 2 and 3 are Pi-side work. They can be developed in parallel with Phase 0 since the pull service just reads whatever SQLite tables exist. Phase 4 is embedded in Phase 0 (the keyword classifier runs during the pull transform). Phase 5 depends on data being present in PostgreSQL.

---

## Verification Steps

### Phase 0 + 1 Verification

1. Apply migration: `psql -f database/migrations/20260401000118_openclaw_inventory_schema.sql`
2. Verify schema: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'openclaw'` returns 7 tables
3. Verify chains seeded: `SELECT count(*) FROM openclaw.chains` returns 11
4. Run pull script manually: `node scripts/openclaw-pull/pull.mjs`
5. Check sync_runs: `SELECT * FROM openclaw.sync_runs ORDER BY started_at DESC LIMIT 1`

### Phase 2 Verification

1. After running store locators: `SELECT chain_slug, count(*) FROM openclaw.stores GROUP BY chain_slug`
2. Verify MA/NH/ME coverage: `SELECT state, count(*) FROM openclaw.stores GROUP BY state`
3. Spot-check known stores (e.g., Market Basket #44 in Haverhill should appear)

### Phase 3 Verification

1. After first catalog scrape: `SELECT count(*) FROM openclaw.products`
2. Check store_products: `SELECT count(*) FROM openclaw.store_products`
3. Verify a known product has correct price (manual spot-check against retailer website)

### Phase 5 Verification

1. Sign in with agent account
2. Navigate to `/prices`
3. Enter zip 01835 (Haverhill)
4. Verify: nearby stores appear with correct chains and distances
5. Click a store, verify product list loads
6. Test department filter, search, food-only toggle
7. Verify freshness indicators match `last_seen_at` timestamps
8. Screenshot the final result

---

## Out of Scope

- **Cross-chain product dedup** - each chain has its own product catalog. No universal product database (yet).
- **Historical price tracking in the catalog** - `store_products` stores current price only. Historical trends come from `ingredient_price_history` for matched ingredients.
- **Coupon/loyalty pricing** - captures sticker price only. Loyalty card prices are a future enhancement.
- **Real-time inventory** - catalog is refreshed on scrape schedule, not live. Freshness indicators communicate this.
- **Mobile-specific UI** - responsive design handles mobile, but no dedicated mobile layout for Phase 5.
- **Modifying existing sync** - the current `lib/openclaw/sync.ts` flow continues working alongside the new catalog. No breaking changes.
- **States beyond MA/NH/ME** - geographic expansion is a future config change, not a code change.

---

## Notes for Builder Agent

### Critical Files to Read First

- `lib/openclaw/sync.ts` - current sync logic, understand the enriched price flow
- `lib/openclaw/sync-receiver.ts` - cartridge registry pattern
- `lib/pricing/resolve-price.ts` - 8-tier price resolution chain
- `docker-compose.yml` - PostgreSQL container config (port 54322, password in file)
- `scripts/import-crawler-data.mjs` - example of a standalone import script using postgres.js

### Patterns to Follow

- Use `postgres` npm package directly in the pull script (like `scripts/import-crawler-data.mjs`), NOT Drizzle ORM
- The pull script is standalone Node.js (`.mjs`), not a Next.js server action
- Server actions in Phase 5 use Drizzle ORM and raw SQL (like `resolve-price.ts`)
- All monetary amounts in cents (integer)
- Never hardcode geography. Zip codes, state lists, and radius values come from config or user input.

### Pi-Side Notes

- Pi runs Node 18+ with ESM support
- Pi's SQLite is at `~/openclaw-prices/data/openclaw.db`
- Pi's sync API is on port 8081
- New scraper files go in `~/openclaw-prices/scrapers/`
- Pi already has `playwright`, `puppeteer-core`, `better-sqlite3` installed

### Gotchas

- The PostgreSQL `openclaw` schema is separate from the `public` schema where all ChefFlow tables live. The bridge view crosses schemas.
- `better-sqlite3` is a native module. On Windows, it needs Python and VS Build Tools. If install fails, use `sql.js` (pure JS SQLite reader) as fallback.
- Instacart rate limits aggressively. The Pi scrapers must use delays (2-3 seconds between requests minimum) and rotate user agents.
- The existing `ingredient_price_history` table and its sync flow are NOT being replaced. They continue working. The new catalog is an additional, parallel data source.

---

## Planner Gate Validation

### 1. What exists today that this touches?

- `lib/openclaw/sync.ts` (lines 1-494): Current sync logic. Reads ingredient names from ChefFlow, POSTs to Pi, writes to `ingredient_price_history`. Geography hardcoded to OPENCLAW_API env var pointing at Pi.
- `lib/openclaw/sync-receiver.ts` (lines 1-107): Cartridge registry dispatcher. Routes sync requests to the correct handler.
- `lib/openclaw/cartridge-registry.ts` (lines 1-69): Registry data structure. Maps codenames to sync handlers.
- `lib/pricing/resolve-price.ts` (lines 1-615): 8-tier price resolution chain. Reads from `ingredient_price_history` and `grocery_price_quote_items`.
- `database/migrations/20260401000061_ingredient_price_history.sql`: Created the `ingredient_price_history` table with source tracking.
- `database/migrations/20260401000109_ingredient_price_enrichment.sql`: Added `last_price_source`, `last_price_store`, `last_price_confidence`, trend columns to `ingredients`. Added dedup index.
- `database/migrations/20260401000110_iph_dedup_add_store.sql`: Added `store_name` to dedup index.
- `docker-compose.yml` (lines 1-26): PostgreSQL 15-alpine on port 54322, password `CHEF.jdgyuegf9924092.FLOW`.

### 2. What exactly changes?

- **Add:** New `openclaw` schema with 7 tables and 1 bridge view (migration file)
- **Add:** Standalone pull service in `scripts/openclaw-pull/` (3-4 new files)
- **Add:** Display layer pages and components (8 new files)
- **Add:** Server actions for catalog queries (1 new file)
- **Modify:** `lib/pricing/resolve-price.ts` - add tier 2.5 (catalog lookup). Additive only.
- **Modify:** `components/nav/nav-config.tsx` - add nav entry for price catalog page.
- **No changes** to existing sync flow, cartridge registry, or ingredient_price_history.

### 3. Assumptions

- **Verified:** PostgreSQL runs on port 54322 in Docker (read `docker-compose.yml`).
- **Verified:** Pi exposes `GET /api/sync/database` on port 8081 (mentioned in prompt context, confirmed by `OPENCLAW_API` default in `sync.ts` line 24).
- **Verified:** `postgres` npm package is available (used in `scripts/import-crawler-data.mjs` line 18).
- **Verified:** Existing schema has `ingredients` table with `name`, `tenant_id`, price columns (read from `sync.ts` lines 284-290 and migration files).
- **Unverified:** Pi's SQLite schema for the current scrapers. The pull service will need to adapt to whatever tables exist. The spec assumes standard table names; the builder must inspect the actual Pi database.
- **Unverified:** Exact Instacart page structure for catalog walking. The Pi already scrapes Instacart for prices, so the mechanism works, but full catalog walking may require different endpoints.

### 4. Where will this most likely break?

1. **Instacart rate limiting** - walking entire store catalogs is orders of magnitude more requests than ingredient lookups. The Pi scrapers must be very conservative with delays and may need session rotation.
2. **SQLite file size growth** - as the catalog grows from ~24MB to potentially hundreds of MB, the hourly full-file download may need to switch to delta sync. The pull service should monitor file size and warn if it exceeds 500MB.
3. **`better-sqlite3` native module on Windows** - compilation can fail. The spec notes `sql.js` as a fallback.

### 5. What is underspecified?

- Pi's current SQLite schema (builder must SSH to Pi and inspect `~/openclaw-prices/data/openclaw.db`)
- Exact Instacart endpoints for department/category enumeration (builder must investigate the existing Pi scraper code)
- Zip-to-lat/lng lookup method for nearby store discovery (could use a static lookup table, PostGIS, or the stores' own coordinates filtered by zip prefix)

### 6. Dependencies

- Docker PostgreSQL container must be running
- Pi must be accessible at 10.0.0.177:8081
- `better-sqlite3` or `sql.js` must be installable on Windows

### 7. Existing logic this could conflict with

- The bridge view joins `public.ingredients` to `openclaw.products` via text search. If ingredient names are very short or generic (e.g., "salt"), the join may return too many matches. The `LIMIT 5` in the view mitigates this.
- Adding tier 2.5 to `resolve-price.ts` must not change the behavior of existing tiers. The new tier is strictly additive (inserted between existing tiers).

### 8. End-to-end data flow

**Scrape:** Pi scraper walks store catalog -> writes to Pi SQLite (products, store_products, scrape_runs)
**Pull:** PC pull script fetches Pi SQLite via HTTP -> parses with better-sqlite3 -> bulk upserts to PostgreSQL openclaw schema
**Display:** Chef enters zip on `/prices` -> server action queries `openclaw.stores` with Haversine -> returns nearby stores -> chef clicks store -> server action queries `openclaw.store_products` joined to `openclaw.products` -> returns paginated product list
**Resolution:** Price resolution chain queries `openclaw.store_products` via bridge view when resolving ingredient prices

### 9. Correct implementation order

1. Migration (Phase 1) - schema must exist first
2. Pull service (Phase 0) - data pipeline
3. Store locator scrapers on Pi (Phase 2) - populate stores
4. Catalog scrapers on Pi (Phase 3) - populate products
5. Category classifier in pull service (Phase 4) - classify during pull
6. Display layer (Phase 5) - UI on top of data
7. resolve-price.ts modification (part of Phase 5) - integrate with existing system

### 10. Success criteria

- [ ] `openclaw` schema exists with all 7 tables and bridge view
- [ ] 11 chains seeded in `openclaw.chains`
- [ ] Pull service runs independently of ChefFlow, logs to `openclaw.sync_runs`
- [ ] At least 100 stores populated for MA
- [ ] At least 1000 products cataloged from at least 2 chains
- [ ] `/prices` page loads, zip search works, store inventory is browsable
- [ ] Department/category filters work
- [ ] Food-only toggle works
- [ ] Freshness indicators display correctly
- [ ] Existing price resolution chain still works (no regression)
- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes

### 11. Non-negotiable constraints

- All data stays local (Pi to PC, never to cloud)
- No AI for classification or matching (formula over AI)
- No hardcoded geography (configurable states, zip radius from user input)
- Collect everything, filter on display
- Existing sync flow (`ingredient_price_history`) must not break
- Pull service must work without ChefFlow dev server running

### 12. What should NOT be touched

- `lib/openclaw/sync.ts` - leave existing sync flow intact
- `lib/openclaw/sync-receiver.ts` - no changes needed
- `lib/openclaw/cartridge-registry.ts` - no changes needed
- `app/api/cron/price-sync/route.ts` - legacy endpoint, leave alone
- `app/api/cron/openclaw-sync/route.ts` - unified cron endpoint, leave alone
- Any `ingredient_price_history` migration or schema

### 13. Is this the simplest complete version?

Yes. Each phase is the minimum viable version of its concern. Phase 0 is a single script. Phase 1 is one migration. Phase 5 is a read-only display with standard CRUD patterns. No over-engineering.

### 14. If implemented exactly as written, what would still be wrong?

- The bridge view's text search join is fuzzy. "Chicken breast" in ingredients might match "Chicken Breast Tenders" and "Boneless Skinless Chicken Breast" and "Chicken Breast Cutlets" in the catalog. This is acceptable for Phase 5 but will need a manual mapping table or smarter matching logic in a future iteration.
- The hourly full-SQLite pull will become inefficient as the database grows past ~200MB. A delta sync mechanism (last_modified timestamps, incremental pulls) should be planned for when the catalog reaches that size.
- Zip-to-lat/lng lookup is not specified in detail. The builder will need to decide between a static lookup table, a geocoding API, or using store zip codes as a proxy (less accurate but simpler).

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

Production-ready for Phases 0, 1, 4, and 5 (PC-side work). Phases 2 and 3 (Pi-side scrapers) have known uncertainties around exact scraper implementations (Instacart catalog walking endpoints, rate limit thresholds) that the builder will need to investigate by SSHing into the Pi and reading existing scraper code. These uncertainties are documented in section 5 above and do not block the PC-side work.

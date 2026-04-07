# OpenClaw Price Expansion Tasks

**Status:** Ready for deployment
**Priority:** Launch requirement
**Cost:** $0 (all free data sources, no proxy needed)
**Target:** Push Pi from 10% to 85% utilization

These tasks run on the Pi. They use free, public APIs and websites. No residential proxy required. Each task should become a cron job in the OpenClaw scheduler.

---

## Task 1: OSM Store Directory Ingestion

**What:** Query OpenStreetMap Overpass API for all food retail locations in the US and store them in prices.db.

**Why:** ChefFlow now has 150K stores but the Pi's catalog_stores only has 427. The Pi needs the same directory to target scraping geographically.

**How:**

- Overpass API: `https://overpass-api.de/api/interpreter`
- Query all `shop=supermarket`, `shop=convenience`, `shop=grocery`, `shop=greengrocer`, `shop=butcher`, `shop=bakery`, `shop=deli`, `shop=farm`, `shop=wholesale`, `shop=variety_store`, `amenity=marketplace` within US state bounding boxes
- Parse JSON response for name, lat, lon, addr:city, addr:state, addr:postcode, brand
- Insert into catalog_stores with source = 'osm'
- Rate limit: 15 seconds between queries, use mirror fallback (overpass.private.coffee)
- Process one state at a time to avoid timeouts on large states (split CA, TX, FL, NY into sub-regions)

**Schedule:** Run once, then monthly refresh
**Expected yield:** 150,000+ store locations across 50 states

---

## Task 2: Flipp Circular Scraping (Nationwide)

**What:** Scrape weekly sale circulars from Flipp for every chain they cover, not just NE chains.

**Why:** Flipp has circulars for hundreds of chains nationwide. Currently only scraping NE circulars. This is the fastest path to nationwide pricing because circulars are public, free, and cover thousands of products per chain per week.

**How:**

- Flipp API endpoint: `https://backflipp.wishabi.com/flipp/items/search`
- Parameters: `postal_code={zip}` for geographic targeting
- Use ZIP codes from multiple regions (not just NE)
- Target ZIPs: pick 1 ZIP per state capital (50 queries covers all states)
- Each query returns current sale items with prices, product names, store names
- Parse and store in current_prices / price_snapshots

**Schedule:** Weekly (circulars refresh weekly)
**Expected yield:** 50,000+ sale prices per week across 50 states

---

## Task 3: Walmart Product Catalog

**What:** Scrape Walmart's product catalog. No geo-lock - Walmart pricing is largely national.

**Why:** Walmart has 4,700+ US stores and consistent national pricing. One scrape covers the whole country.

**How:**

- Walmart search API / website scraping
- Search by food category (produce, meat, dairy, pantry, frozen, beverages)
- Extract: product name, price, size/weight, category, image URL
- Store as a new source in catalog_store_products
- Chain: create "walmart" source with store_type = 'retail'

**Schedule:** Weekly
**Expected yield:** 20,000-50,000 product prices

---

## Task 4: Target Redsky API

**What:** Query Target's Redsky product API for food items.

**Why:** Target has 1,900+ US stores. Their API is well-documented and free to query.

**How:**

- API: `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2`
- Parameters: `keyword={food_category}&count=24&offset=0&channel=WEB&pricing_store_id={store_id}`
- Search food categories: produce, meat, dairy, bakery, frozen, pantry, beverages, snacks
- Extract: product title, price (regular + sale), size, TCIN (Target item ID)
- Paginate through results (24 items per page)

**Schedule:** Weekly
**Expected yield:** 10,000-20,000 product prices

---

## Task 5: USDA AMS Terminal Market Prices

**What:** Ingest daily wholesale produce prices from USDA Agricultural Marketing Service.

**Why:** Free, authoritative wholesale prices from every major US terminal market. Updates daily. This is the government baseline that powers ChefFlow's Tier 7 pricing.

**How:**

- API: `https://marketnews.usda.gov/mnp/api/` (USDA Market News Portal)
- Endpoints: `/reports` to list available reports, then fetch individual market reports
- Key reports: fruits, vegetables, dairy, eggs, poultry
- Terminal markets: Boston, NYC, Chicago, LA, Atlanta, Dallas, Seattle, Miami, etc.
- Parse daily price reports (low/high/avg per commodity per market)
- Store in a new `usda_terminal_prices` table or append to current_prices with source = 'usda_ams'

**Schedule:** Daily
**Expected yield:** 500-1,000 wholesale prices per day across 20+ terminal markets

---

## Task 6: USDA FoodData Central

**What:** Download USDA's comprehensive food database (300K+ items with nutrition, portions, weights).

**Why:** This gives us yield factors, portion sizes, and nutrition data for every food item. Powers the yield-adjusted pricing in ChefFlow.

**How:**

- Bulk download: `https://fdc.nal.usda.gov/download-datasets`
- Files: Foundation Foods, SR Legacy, FNDDS (all available as CSV/JSON)
- Extract: food name, food category, portion weights, nutrient data
- Map to canonical_ingredients via name matching
- Store nutrition in canonical_ingredients.off_nutrition_json (or new columns)

**Schedule:** Monthly (USDA updates quarterly)
**Expected yield:** 300,000+ food items with nutrition and yield data

---

## Task 7: Cross-Match Expansion

**What:** Run the product-to-ingredient cross-matching more aggressively using the 69K canonical ingredients.

**Why:** Currently cross-matching runs 4x/day but only maps to 143 distinct canonical ingredients via normalization_map. With 69K canonical ingredients and 10M products, there are thousands of unmapped matches.

**How:**

- For each canonical_ingredient not in normalization_map:
  - FTS search against catalog_products.name
  - If match confidence > 0.7, add to normalization_map
- Use trigram similarity as fallback for short ingredient names
- Run in batches of 1,000 ingredients per cycle

**Schedule:** 4x daily (existing schedule, expand scope)
**Expected yield:** 5,000-20,000 new normalization_map entries

---

## Deployment Order

1. **Task 1** (OSM stores) - run first, gives geographic targeting for everything else
2. **Task 5** (USDA AMS) - free, daily, immediate nationwide wholesale prices
3. **Task 2** (Flipp) - biggest volume, nationwide sale prices weekly
4. **Task 7** (Cross-match) - makes existing data more useful
5. **Task 6** (USDA FoodData) - one-time download, enriches everything
6. **Task 3** (Walmart) - national pricing baseline
7. **Task 4** (Target) - supplementary national pricing

---

## Success Metrics

| Metric               | Current | After All Tasks |
| -------------------- | ------- | --------------- |
| Pi utilization       | 10%     | 60-85%          |
| Cron jobs            | 51      | 100+            |
| States with pricing  | 3       | 50              |
| Products             | 49K     | 200K+           |
| Prices               | 162K    | 500K+           |
| Stores mapped (Pi)   | 427     | 150K+           |
| Normalization rules  | 18,269  | 25,000+         |
| Government baselines | 416     | 2,000+          |

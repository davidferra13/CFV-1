# Spec: OpenClaw Scraper Enrichment (Images, Stock, Location Granularity, New Sources)

> **Status:** in-progress
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (12+ files on Pi)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29
> **Progress:** Phase 1 (image_url schema) DONE, Phase 4 (search terms 80->499) DONE, Phase 5a (OFF enricher) DONE, scrapers patched for image capture. Crontab v4 deployed. Phases 2 (stock), 3 (location), 5b-5h (new sources) remaining.
> **Research:** `docs/research/openclaw-every-backdoor-recon.md`

---

## What This Does (Plain English)

Upgrades the OpenClaw price-intel scrapers on the Raspberry Pi to capture three critical missing data points: product image URLs, real-time stock/availability status, and store-location-level granularity. After this is built, every item in the catalog can show a product photo, display whether it's currently in stock, and be filtered by specific store location (e.g., "Market Basket Haverhill" vs "Market Basket Lowell") instead of just chain name.

---

## Why It Matters

The catalog is unusable as a real shopping tool without images (chefs need to see what they're buying), stock status (showing everything as "available" is a lie), and location awareness (chefs shop at specific stores, not chains). These three gaps are the difference between a developer's database and a chef's shopping experience.

---

## Scope: Pi-Side Only

This spec covers ONLY changes to the OpenClaw price-intel codebase on the Raspberry Pi (`~/openclaw-prices/`). No ChefFlow app changes. The ChefFlow catalog UI spec (separate) consumes the enriched data this produces.

---

## Phase 1: Image URL Capture

### Schema Change

Add `image_url` column to `current_prices` table:

```sql
ALTER TABLE current_prices ADD COLUMN image_url TEXT DEFAULT NULL;
```

Add to `db.mjs` in the `ensureSchema()` function alongside the existing `in_stock` migration pattern.

### Scraper Changes

**`scraper-instacart-bulk.mjs`** (highest value, most products):

- During product extraction (the GraphQL response parsing and the Puppeteer fallback), capture the product image URL
- GraphQL responses include `image_url` or `product.image.url` in the response payload
- Puppeteer fallback: extract `img[src]` from the product card element
- Pass `imageUrl` to the `upsertPrice()` call

**`scraper-instacart.mjs`** (original scraper):

- Same approach: extract image URL from product card during Puppeteer browsing
- Pass to `upsertPrice()`

**`scraper-hannaford.mjs`**:

- Extract product image from the rendered page during JS scrape
- Pass to `upsertPrice()`

**`scraper-target.mjs`**:

- Target's Redsky API returns image URLs in the product response. Extract and pass through.

**`scraper-flipp.mjs`**:

- Flipp API responses include flyer images. These are flyer clippings, not product photos. Still useful. Extract `image_url` from item response.

### `db.mjs` Changes

Update `upsertPrice()` function to accept and store `imageUrl` parameter:

```javascript
async upsertPrice({ sourceId, ingredientId, variantId, price, unit, ..., imageUrl }) {
  // Add image_url to INSERT and UPDATE statements
}
```

### Image Storage Strategy

Store URLs only (not downloaded images). The images live on Instacart/retailer CDNs. This keeps the Pi's 104MB database small. If CDN URLs expire, the UI shows a fallback. If this becomes a problem, a future phase can add a cron job to download and cache images locally.

---

## Phase 2: Stock/Availability Capture

### Schema

The `in_stock` column already exists on `current_prices` (0=out, 1=in). No schema change needed. Currently defaults to 1 everywhere.

### Scraper Changes

**`scraper-instacart-bulk.mjs`**:

- Instacart marks out-of-stock items in both GraphQL responses and rendered pages
- GraphQL: check for `available`, `in_stock`, or `out_of_stock` field in product response
- Puppeteer: check for "Out of stock" badge or disabled "Add to cart" button
- Pass `inStock: 0` or `inStock: 1` to `upsertPrice()`

**`scraper-instacart.mjs`**:

- Same approach via Puppeteer extraction

**`scraper-hannaford.mjs`**:

- Check for "Out of Stock" or "Unavailable" indicators on product pages

**Other scrapers** (Flipp, Target, Government):

- Flipp: flyer items are inherently "available this week." Set `inStock: 1` for active flyers, `inStock: 0` for expired.
- Target: Redsky API may include `available_to_promise` field. Extract if present.
- Government: N/A (regional averages, no stock concept). Leave as default.

### Staleness Rule

Add to `watchdog.mjs`: if a price record's `last_confirmed_at` is older than 7 days and the source is a direct scraper (not government), set `in_stock = 0`. Rationale: if we haven't confirmed an item exists in over a week, we should not claim it's available. The next successful scrape resets it to 1.

---

## Phase 3: Store-Location Granularity

### Concept

Currently one `source_registry` entry per chain. Change to one entry per physical store location. A single Instacart scraper run for "Market Basket" with zip 01835 creates prices under source "market-basket-haverhill". A run with zip 01852 creates prices under "market-basket-lowell".

### Schema Change

Add `location_id` column to `current_prices`:

```sql
ALTER TABLE current_prices ADD COLUMN location_id TEXT DEFAULT NULL;
```

The `source_registry` already has address/city/state/zip/lat/lon columns. They just need to be populated.

### Location Registry

Create `config/locations.json` defining the store locations to scrape:

```json
{
  "regions": [
    {
      "name": "Merrimack Valley",
      "zip_codes": ["01835", "01830", "01832"],
      "priority": 1
    },
    {
      "name": "Greater Boston",
      "zip_codes": ["02101", "02134", "02139"],
      "priority": 2
    },
    {
      "name": "Southern NH",
      "zip_codes": ["03103", "03060"],
      "priority": 2
    },
    {
      "name": "Southern Maine",
      "zip_codes": ["04101"],
      "priority": 3
    }
  ],
  "stores": {
    "market-basket": {
      "chain": "Market Basket",
      "instacart_slug": "market-basket",
      "locations": [
        { "name": "Market Basket Haverhill", "zip": "01835", "store_id": null },
        { "name": "Market Basket Lowell", "zip": "01852", "store_id": null },
        { "name": "Market Basket Methuen", "zip": "01844", "store_id": null }
      ]
    }
  }
}
```

Start with the developer's area (Haverhill/Merrimack Valley) and expand outward by priority.

### Scraper Changes

**`scraper-instacart-bulk.mjs`**:

- Instead of one hardcoded geolocation, loop through `locations.json` entries
- For each store+location combo, set the appropriate zip/geo and scrape
- Register a separate `source_registry` entry per location (e.g., "market-basket-haverhill")
- Tag prices with `location_id`

**`scraper-flipp.mjs`**:

- Instead of one postal code, cycle through zip codes from `locations.json`
- Register sources per location

**Cron impact:**

- More locations = more scraper runs = more time. Current scraper schedule has plenty of gaps.
- Start with 3-5 locations for the top stores, monitor Pi load, expand.

### Sync API Changes

Update `sync-api.mjs` endpoints to support location filtering:

- `/api/ingredients?location=haverhill` returns prices for that location
- `/api/ingredients?store=market-basket&location=haverhill` combined filter
- Existing endpoints continue to work (no location filter = all locations aggregated, cheapest shown)

---

## Phase 4: Expanded Search Terms

### Current State

The Instacart bulk scraper searches 80 food terms. This misses huge categories.

### Expansion

Create `config/search-terms.json` with 250+ terms organized by category:

- **Produce (50+):** apple, banana, avocado, tomato, lettuce, spinach, kale, arugula, cilantro, basil, thyme, rosemary, potato, sweet potato, onion, garlic, shallot, ginger, lemon, lime, orange, grapefruit, berry, strawberry, blueberry, raspberry, mushroom, pepper, jalapeno, serrano, habanero, corn, broccoli, cauliflower, asparagus, green bean, zucchini, squash, eggplant, celery, carrot, radish, turnip, beet, cabbage, brussels sprout, artichoke, fennel, leek, scallion...
- **Protein (40+):** chicken breast, chicken thigh, whole chicken, ground beef, ribeye, sirloin, filet mignon, pork chop, pork tenderloin, bacon, sausage, ground turkey, lamb, duck, salmon, tuna, shrimp, scallop, lobster, crab, cod, halibut, swordfish, mahi mahi, tilapia, clam, mussel, oyster, tofu, tempeh...
- **Dairy (20+):** milk, cream, butter, egg, cheese, cheddar, mozzarella, parmesan, goat cheese, cream cheese, sour cream, yogurt, heavy cream, half and half, whipping cream, brie, gruyere, ricotta, mascarpone, cottage cheese...
- **Pantry (40+):** flour, sugar, salt, olive oil, vegetable oil, coconut oil, sesame oil, vinegar, soy sauce, fish sauce, worcestershire, hot sauce, honey, maple syrup, vanilla extract, baking soda, baking powder, yeast, cornstarch, breadcrumbs, panko, pasta, rice, quinoa, couscous, lentil, black bean, chickpea, kidney bean, canned tomato, tomato paste, coconut milk, stock, broth...
- **Spices (30+):** black pepper, cumin, paprika, chili powder, cayenne, cinnamon, nutmeg, clove, cardamom, turmeric, coriander, oregano, thyme, bay leaf, red pepper flake, garlic powder, onion powder, smoked paprika, curry powder, garam masala, za'atar, sumac, saffron, vanilla bean, mustard seed, fennel seed, celery seed, white pepper, allspice, star anise...
- **Beverages/Other (20+):** coffee, tea, sparkling water, wine, beer, spirits for cooking...

### Cron Update

Split the expanded terms across the existing cron schedule. Odd/even day split already exists for Instacart stores. Add a term rotation: A-M terms on odd days, N-Z on even days, to avoid overwhelming any single store.

---

## Verification Steps

1. SSH into Pi, verify `image_url` column exists on `current_prices`
2. Run Instacart bulk scraper manually for one store, verify image URLs are populated
3. Verify `in_stock` field is actually 0 for out-of-stock items (find a known out-of-stock item on Instacart, check DB)
4. Verify sync-api returns image_url and in_stock in API responses
5. Verify location-based source entries appear in `source_registry`
6. Run `watchdog.mjs`, verify stale items get `in_stock = 0`
7. Check Pi load after expanded scraper run stays under 0.5

---

## Phase 5: New Data Sources (From Recon Report)

Full details in `docs/research/openclaw-every-backdoor-recon.md`. Build in this order:

### 5a. Open Food Facts Enrichment (FREE, images for 60%+ of catalog)

New script: `enricher-openfoodfacts.mjs`

- API: `https://world.openfoodfacts.org/api/v2/product/{barcode}` (no auth needed)
- Iterate through `canonical_ingredients`, fuzzy-match by product name
- Pull: front image URL, ingredient list, nutrition data, barcode
- Store in new columns on `canonical_ingredients`: `off_image_url`, `off_barcode`, `off_nutrition_json`
- Run weekly (Sunday). Rate limit: 100 req/min (be polite).
- This is the fastest way to get images on the catalog without touching any scraper.

### 5b. Instacart Expansion (add Shaw's, increase limits)

Update `scraper-instacart-bulk.mjs`:

- Add Shaw's (`shaws`) to the store list
- Increase `max` from 500 to 2000 per store
- Increase search terms from 80 to 250+ (load from `config/search-terms.json`)
- Estimated gain: +3K-5K new items

### 5c. Walmart API (official, free, no headless browser)

New script: `scraper-walmart-api.mjs`

- Sign up at developer.walmartlabs.com for free API key
- Endpoints: Product Search, Product Lookup by UPC, Store Finder
- Returns: name, price, images, availability, UPC, description, store-specific data
- Target stores: Methuen, Plaistow NH, Salem NH
- Run daily. Clean REST API, no Puppeteer needed.
- Estimated gain: +2K-3K items

### 5d. Target Expansion (multi-store)

Update `scraper-target.mjs`:

- Currently hard-coded to store #1290 (Methuen)
- Add store IDs for: Salem NH, Tewksbury, North Andover, Nashua NH
- Use Target's store locator API to discover IDs by zip
- Same Redsky API, just loop through stores
- Estimated gain: +500-1K items (mostly location-specific availability data)

### 5e. Trader Joe's Scraper (NEW)

New script: `scraper-traderjoes.mjs`

- Reference: github.com/jackgisel/traderjoeapi, Apify scraper
- TJ's website serves product catalog. Needs Puppeteer (403s basic requests).
- Capture: product name, price, SKU, image URL, category, tags
- Run weekly (TJ's inventory is stable)
- Estimated gain: +1K-2K exclusive TJ's items

### 5f. Stop & Shop Direct Scrape (NEW)

New script: `scraper-stopandshop.mjs`

- stopandshop.com has full e-commerce with internal JSON APIs
- Reference: github.com/blaskovicz/go-stopandshop for endpoint patterns
- Use Puppeteer to capture session token, then make direct API calls
- Product search, category browsing, store-specific pricing
- Returns: name, price, images, availability, UPC
- Run daily
- Estimated gain: +3K-5K items

### 5g. Open Grocery Database Import (UPC cross-referencing)

One-time script: `import-open-grocery-db.mjs`

- Download from grocery.com/open-grocery-database-project/ (7MB XLS)
- 100K+ UPC-to-product mappings
- Create `upc_registry` table: `upc TEXT PRIMARY KEY, brand TEXT, product_name TEXT`
- Cross-reference with existing products to deduplicate across stores

### 5h. USDA FoodData Central Enrichment

New script: `enricher-usda-fdc.mjs`

- API: `https://api.nal.usda.gov/fdc/v1/` (free, API key required)
- 400K+ branded food products with UPCs, nutrition, ingredients
- Run monthly. Enrichment only.

---

## Updated Cron Schedule (After All Phases)

```
# DAILY
0 1 * * *   scraper-government.mjs
0 2 * * *   scraper-walmart-api.mjs
0 3 * * *   scraper-flipp.mjs
0 4 * * *   scraper-wholefoodsapfresh.mjs
0 5 * * *   scraper-target.mjs
0 6 * * *   scraper-stopandshop.mjs

# INSTACART (ALTERNATING DAYS)
30 7 1-31/2 * *  scraper-instacart-bulk.mjs --stores=market-basket,aldi,stop-and-shop,shaws --max=2000
30 7 2-30/2 * *  scraper-instacart-bulk.mjs --stores=costco,bjs,whole-foods,hannaford --max=2000

# TWICE WEEKLY
0 8 * * 1,4   scraper-hannaford.mjs
0 8 * * 2,5   scraper-traderjoes.mjs

# WEEKLY
30 9 * * 3   scraper-wholesale.mjs
0 10 * * 0   enricher-openfoodfacts.mjs

# PROCESSING
0 9 * * *    cross-match.mjs
0 10 * * *   aggregator.mjs
*/15 * * * * watchdog.mjs
*/30 * * * * receipt-processor.mjs batch

# SYNC + MAINTENANCE
0 23 * * *   sync-to-chefflow.mjs
0 0 * * 0    log rotation
```

**Estimated final catalog:** 25K-35K items (up from 11K). ~70-80% of New England purchasable inventory.

---

## Out of Scope

- ChefFlow UI changes (separate spec: catalog-ux-overhaul)
- Wholesale distributor APIs (requires membership, separate discussion)
- Specialty/ethnic store scrapers (requires physical visits, long-term)
- Image downloading/caching (URLs only for now)
- Receipt scanning improvements (existing system works, separate scope)
- Anomaly backlog cleanup (separate task)
- Costco Akamai bypass (attempt separately, high risk of failure)
- Market Basket aisle walk (physical task, not automatable)

---

## Notes for Builder Agent

- All work is on the Pi via SSH (`ssh pi`). The vault snapshot on F: drive is reference only.
- Test scrapers manually before updating cron: `cd ~/openclaw-prices && node services/scraper-instacart-bulk.mjs --stores=market-basket --max=10`
- The Pi has 78GB free storage and 6.3GB available RAM. No resource constraints.
- Current Pi load is 0.07. We have massive headroom.
- `db.mjs` is the single source of truth for schema and upsert logic.
- After all changes, run a snapshot: `bash F:/OpenClaw-Vault/swap.sh snapshot`
- Do NOT modify cron jobs without running the new scrapers manually first to confirm they work.
- Read `docs/research/openclaw-every-backdoor-recon.md` for full context on every data source.
- Build Phase 5 sources in order (5a through 5h). Each one is independent and can be tested alone.
- For Walmart API: sign up at developer.walmartlabs.com first, get API key, store in Pi env vars.
- For Trader Joe's: reference the open-source repos. TJ's blocks non-browser requests. Use Puppeteer with stealth.
- For Stop & Shop: use browser DevTools on stopandshop.com to capture current API endpoints before building.

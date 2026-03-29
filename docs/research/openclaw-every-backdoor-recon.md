# Research: Every Possible Data Source for New England Ingredient Catalog

> **Date:** 2026-03-29
> **Question:** What is every possible way to get full product/inventory data for every New England grocery store into OpenClaw?
> **Status:** complete

## Summary

There are 12 actionable data sources we can tap immediately (free, no paid APIs), 4 that require accounts or partnerships, and 3 nuclear options for the hardest stores. The combination of all of these would get us from ~25-35% coverage to 80-90%+ of purchasable inventory in New England.

---

## TIER 1: FREE, IMMEDIATE, NO ACCOUNT NEEDED

### 1. Open Food Facts (Product Enrichment Database)

**What:** 3+ million food products globally, 7+ million images, all free and open. US has significant coverage.
**API:** `https://world.openfoodfacts.org/api/v2/product/{barcode}`
**What it gives us:** Product images (front, ingredients, nutrition, packaging), ingredient lists, nutrition facts, barcodes, brands, categories. All under Creative Commons license.
**What it doesn't give us:** Prices, store availability, local stock.
**How to use it:** Cross-reference our existing `canonical_ingredients` with Open Food Facts by product name or UPC. Pull images and nutrition data to enrich every item in our catalog. This solves the image problem for a huge chunk of products for FREE.
**Pi implementation:** New cron job: `enricher-openfoodfacts.mjs`. Iterate through our ingredients, fuzzy-match to OFF by name, store image URLs and nutrition data. Run weekly.
**Effort:** Small. 1 new scraper script. ~2 days.

### 2. Open Grocery Database Project (UPC Master List)

**What:** 100K+ grocery products with UPC codes, brand names, product names. Free download.
**Download:** `https://www.grocery.com/open-grocery-database-project/` (XLS files, 7MB)
**What it gives us:** UPC-to-product-name mapping. Every UPC is a potential cross-reference key.
**How to use it:** Import the UPC database into our SQLite. When scrapers find products with UPCs (Instacart, Target), we can now cross-reference and deduplicate across stores. Same chicken breast at Market Basket and Stop & Shop gets linked.
**Pi implementation:** One-time import script + new `upc_registry` table.
**Effort:** Tiny. 1 script. Half a day.

### 3. Trader Joe's Product Catalog (Direct Scrape)

**What:** Trader Joe's has a publicly accessible product catalog at traderjoes.com. There's a known API/GraphQL endpoint that serves their full product listing with images, prices, descriptions. Multiple open-source scrapers exist.
**Known tools:**

- [Apify Trader Joe's Scraper](https://apify.com/merry_arctic/trader-joes-scraper) (extracts name, price, SKU, URL, tags, images)
- [jackgisel/traderjoeapi](https://github.com/jackgisel/traderjoeapi) (open source Node.js scraper)
- [binthroot/trader-joes-api](https://github.com/binthroot/trader-joes-api) (Express.js backend)
  **What it gives us:** Full Trader Joe's product catalog with prices, images, product URLs, categories, tags.
  **Gotcha:** traderjoes.com returns 403 to basic fetchers. Needs Puppeteer or similar.
  **Pi implementation:** New scraper: `scraper-traderjoes.mjs` using Puppeteer. Run weekly. TJ's inventory doesn't change frequently.
  **Effort:** Medium. 1 new scraper. Reference the open-source repos for endpoint discovery. ~2-3 days.

### 4. Walmart Open API (Product Lookup + Store Inventory)

**What:** Walmart has a developer API at developer.walmartlabs.com with product search, product lookup, and store-level inventory.
**API:** `https://developer.walmartlabs.com/docs`
**What it gives us:** Product names, prices, images, availability, UPCs, descriptions. Store-specific pricing.
**Free tier:** Yes, with API key (free signup). Rate limits apply but generous for our use case.
**New England stores:** Walmart has multiple locations in the Haverhill/Merrimack Valley area (Methuen, Plaistow NH, Salem NH, etc.)
**Pi implementation:** New scraper: `scraper-walmart-api.mjs`. Official API, no headless browser needed. Clean JSON responses.
**Effort:** Small. Official API = clean integration. ~1-2 days.

### 5. Target Redsky API (Expand Beyond Single Store)

**What:** We already scrape Target Methuen (#1290). The Redsky API supports ANY store ID.
**How to expand:** Get Target store IDs for all New England locations. Query the same API with different store IDs.
**Store discovery:** Target's store locator API returns store IDs by zip code.
**Pi implementation:** Update `scraper-target.mjs` to cycle through multiple store IDs from a config file. Minimal code change.
**Effort:** Tiny. Config change + loop. Half a day.

### 6. Instacart Expansion (More Stores, More Terms, More Locations)

**What:** Our Instacart scraper is capped at 80 search terms and 500 items per store. There's massive headroom.
**How to expand:**

- Increase search terms from 80 to 250+
- Increase max items per store from 500 to 2000
- Add ALL Instacart-available stores: Aldi, BJ's, Costco (limited), CVS, Hannaford, Market Basket, Publix, Shaw's, Stop & Shop, Whole Foods, and more
- Cycle through multiple zip codes for location-level data
  **What Instacart covers that we're missing:** Shaw's (Albertsons subsidiary, full e-commerce via Instacart), more Whole Foods items, more Costco items
  **Pi implementation:** Update `scraper-instacart-bulk.mjs` config. Add Shaw's and other missing stores to the store list.
  **Effort:** Small. Config changes. ~1 day.

### 7. Stop & Shop Direct Scrape

**What:** Stop & Shop (Ahold Delhaize) has full e-commerce at stopandshop.com with online ordering. Their site makes XHR calls to internal JSON APIs for product search, categories, pricing, and availability. An [open-source Go client](https://github.com/blaskovicz/go-stopandshop) exists.
**Internal endpoints:** Product search, product detail, store inventory, category listing (all returning JSON). Visible in browser DevTools network tab.
**What it gives us:** Full product catalog with prices, images, availability by store location.
**Gotcha:** May require session tokens. Endpoints can change.
**Pi implementation:** New scraper: `scraper-stopandshop.mjs` using Puppeteer to capture session + API calls.
**Effort:** Medium. Need to reverse-engineer current endpoints. ~3-4 days.

### 8. Hannaford Direct Scrape (Expand Existing)

**What:** We already scrape Hannaford but with limited coverage. Hannaford.com has full online ordering with product search.
**How to expand:** Increase search term coverage, add category browsing, capture images and stock status.
**Pi implementation:** Update `scraper-hannaford.mjs` to be more thorough.
**Effort:** Small. Enhancement to existing scraper. ~1 day.

### 9. Shaw's / Star Market (Albertsons Family)

**What:** Shaw's is an Albertsons subsidiary with full e-commerce at shaws.com. Online ordering with product search, store-specific inventory, images, prices.
**How to scrape:** Same approach as Stop & Shop. Puppeteer + network interception for internal JSON APIs. Also available via Instacart (easier path).
**Pi implementation:** New scraper: `scraper-shaws.mjs` OR just add Shaw's to the Instacart bulk scraper (less effort, good coverage).
**Effort:** Tiny via Instacart. Medium if direct scrape. Start with Instacart path.

### 10. Costco.com (Bypass Akamai)

**What:** Costco.com has a full product catalog but uses Akamai bot protection. Direct scraping fails.
**Workarounds:**

- Instacart has limited Costco catalog (already using)
- Costco's mobile app API may be less protected than web
- Puppeteer with stealth plugins (puppeteer-extra-plugin-stealth) can sometimes bypass Akamai
- Some third-party services offer Costco data (Apify, Unwrangle) but cost money
  **Pi implementation:** Try `puppeteer-extra` with stealth plugin first. If blocked, stick with Instacart + Flipp for Costco.
  **Effort:** Medium-high. Akamai is tough. ~2-3 days to attempt. May not succeed.

### 11. Flipp API Expansion

**What:** We already use Flipp for flyer/sale data from 17 stores. But Flipp has more stores in its system.
**How to expand:** Search for additional merchant IDs. Flipp covers most major chains' weekly circulars.
**What this gives us:** Sale prices, weekly deals, promotional items. Not full catalog but valuable for deal tracking.
**Pi implementation:** Update `scraper-flipp.mjs` to discover and add more merchant IDs.
**Effort:** Small. ~1 day.

### 12. USDA FoodData Central (Nutrition + Product Enrichment)

**What:** Free API with 400K+ food products. Nutrition data, branded food products with UPCs, ingredient lists.
**API:** `https://fdc.nal.usda.gov/api-guide`
**What it gives us:** Nutrition facts, ingredients, serving sizes for cross-referencing. Branded product database with UPCs.
**Pi implementation:** New enrichment cron: `enricher-usda-fdc.mjs`.
**Effort:** Small. ~1 day.

---

## TIER 2: REQUIRES ACCOUNT OR PARTNERSHIP

### 13. Kroger API (Official, Free Developer Account)

**What:** Kroger has the best public grocery API in the industry. Product search, store inventory, pricing, images, all via REST API with OAuth2.
**API:** `https://developer.kroger.com`
**Problem for us:** Kroger has ZERO New England stores. Their banners (Fred Meyer, Ralphs, King Soopers, Harris Teeter, etc.) are all Midwest/South/West.
**Verdict:** Useless for New England coverage. But worth noting as a model of what a good grocery API looks like. If any New England chain ever builds one, we'd integrate it the same way.

### 14. Wegmans API (Official Developer Portal)

**What:** Wegmans has a developer API at dev.wegmans.io. Products, store info, aisle locations, prices. Described as "for educational use."
**Problem:** Site returned ECONNREFUSED when I tried to fetch it. May be down or restricted.
**What it would give us:** Full Wegmans product catalog with prices, aisle locations, images. Wegmans has stores in Massachusetts (Burlington, Chestnut Hill, Westwood, Northborough).
**Pi implementation:** If the API is accessible, new scraper: `scraper-wegmans-api.mjs`. Clean REST API.
**Effort:** Small if API works. Need to test.

### 15. Restaurant Depot (Wholesale, Members-Only)

**What:** Restaurant Depot has a members-only online portal built on Magento 2. Product search, purchase history, recommendations.
**Problem:** Requires active membership to access. The portal uses session auth.
**What it would give us:** WHOLESALE PRICING. This is the biggest gap for professional chefs. Sysco, US Foods, Restaurant Depot are where chefs buy in bulk.
**How to access:** If you have a Restaurant Depot membership, we can scrape your member portal (using your session) to build the wholesale catalog.
**Pi implementation:** `scraper-restaurantdepot.mjs` using authenticated session.
**Effort:** Medium. Need membership credentials. ~2-3 days.

### 16. Datasembly (Commercial Price Intelligence)

**What:** 2 billion prices daily, 150K+ stores, 200+ banners, 30K zip codes. The most comprehensive grocery price database that exists.
**Free tier:** "Snapshot" gives a preview (limited categories, no geofiltering).
**Full product:** Enterprise pricing (likely $$$). The Boston Globe partners with them for MA price tracking.
**Verdict:** Monitor the free Snapshot for benchmarking. Not viable as a primary data source unless budget allows.

---

## TIER 3: NUCLEAR OPTIONS (For Stores With No Digital Presence)

### 17. Market Basket - The Hard One

Market Basket (DeMoulas) has 90 stores across New England. No e-commerce, no public API, no modern website. Their shopmarketbasket.com is a static marketing site.

**Every possible angle:**

a) **Instacart (current):** Market Basket IS on Instacart. We already scrape it. But Instacart only shows ~30% of their inventory. Increase search terms and max items to get more.

b) **Flipp flyers (current):** Gets weekly sale items only. ~5-10% of inventory.

c) **Receipt scanning (current):** The receipt-processor service runs every 30 min on the Pi. Every Market Basket receipt you scan adds real products with exact prices to the database. This is the single most accurate data source but requires you to physically shop there.

d) **Market Basket weekly flyer PDF scrape:** Their website posts weekly flyers as images/PDFs. We could OCR these. Low value (same data as Flipp) but ensures we don't miss anything Flipp misses.

e) **In-store price check app:** Some price-checking apps (like Flipp Shopper, Checkout 51, Ibotta) have Market Basket product data. These apps get data from somewhere. Investigate their data sources.

f) **Community crowdsourcing:** When other ChefFlow users shop at Market Basket and upload receipts, their data enriches everyone's catalog. This is the long-game play.

g) **Physical aisle walk:** Brutal but effective. Walk every aisle once, photograph shelf tags. OCR all of them. Gets you the full catalog with current prices. Then receipt scanning keeps it updated.

**Realistic path:** Max out Instacart coverage (250+ search terms). Keep receipt scanning. Crowdsource from future users. Accept that Market Basket will have 40-60% coverage initially, growing over time. The aisle walk is a one-time nuclear option that gets you to 95%+.

### 18. Aldi - Limited Digital

**Problem:** Aldi has a website but limited online inventory visibility. Not on Instacart in all areas.
**Angles:**

- Instacart (where available)
- Flipp (weekly ads)
- aldi.us product pages (can be scraped with Puppeteer)
- Aldi has a "Weekly Finds" and "Everyday Grocery" section on their site

### 19. Local Specialty Stores (H-Mart, Brazilian Markets, Italian Shops)

**Problem:** No digital presence at all for most.
**Only options:**

- Receipt scanning after shopping
- Physical catalog creation (photograph shelves)
- Google Maps API to discover stores, then manual catalog building
- Some specialty chains (H-Mart) DO have websites with product listings

---

## IMPLEMENTATION PRIORITY (What to Build on the Pi, In Order)

| Priority | Source                                                 | Effort   | Coverage Gain                   | New Items (est.)          |
| -------- | ------------------------------------------------------ | -------- | ------------------------------- | ------------------------- |
| 1        | Open Food Facts enrichment (images for existing items) | 2 days   | Images for ~60% of catalog      | 0 new, but enriches 6K+   |
| 2        | Instacart expansion (more terms, more stores, Shaw's)  | 1 day    | +15-20% coverage                | +3K-5K items              |
| 3        | Walmart API                                            | 1-2 days | +5-10% (Walmart-specific items) | +2K-3K items              |
| 4        | Target expansion (more stores)                         | 0.5 days | +2-3%                           | +500-1K items             |
| 5        | Trader Joe's scraper                                   | 2-3 days | +5-8% (TJ's exclusive products) | +1K-2K items              |
| 6        | Stop & Shop direct scrape                              | 3-4 days | +10-15%                         | +3K-5K items              |
| 7        | Open Grocery DB + USDA FoodData import                 | 1 day    | UPC cross-referencing           | 0 new, but links existing |
| 8        | Hannaford expansion                                    | 1 day    | +3-5%                           | +1K-2K items              |
| 9        | Costco stealth attempt                                 | 2-3 days | +3-5% (if it works)             | +1K-2K items              |
| 10       | Wegmans API (if accessible)                            | 1 day    | +3-5%                           | +1K-2K items              |
| 11       | Market Basket maximization                             | ongoing  | +5-10% over time                | +1K-3K items              |

**Total estimated gain:** From ~11K items to ~25K-35K items. From ~25% coverage to ~70-80%.

The remaining 20-30% is specialty stores, wholesale (needs membership), and the long tail of products that only appear on receipts.

---

## NEW PI CRON SCHEDULE (After All Scrapers Built)

```
# ===== DAILY SCRAPERS =====
0 1 * * *   scraper-government.mjs        # Government APIs (BLS/FRED/USDA)
0 2 * * *   scraper-walmart-api.mjs       # Walmart (official API, fast)
0 3 * * *   scraper-flipp.mjs             # Flipp flyers (17+ stores)
0 4 * * *   scraper-traderjoes.mjs        # Trader Joe's catalog
0 5 * * *   scraper-wholefoodsapfresh.mjs # Whole Foods
0 6 * * *   scraper-target.mjs            # Target (multi-store)
0 7 * * *   scraper-stopandshop.mjs       # Stop & Shop direct

# ===== INSTACART (SPLIT ACROSS DAYS) =====
30 7 1-31/2 * *  scraper-instacart-bulk.mjs --stores=market-basket,aldi,stop-and-shop,shaws --max=2000
30 7 2-30/2 * *  scraper-instacart-bulk.mjs --stores=costco,bjs,whole-foods,hannaford --max=2000

# ===== TWICE WEEKLY =====
0 8 * * 1,4   scraper-hannaford.mjs       # Hannaford direct (Mon, Thu)
0 8 * * 2,5   scraper-shaws.mjs           # Shaw's direct (Tue, Fri)

# ===== WEEKLY =====
30 9 * * 3   scraper-wholesale.mjs        # Wholesale flyers (Wed)
0 10 * * 0   enricher-openfoodfacts.mjs   # Image/nutrition enrichment (Sun)

# ===== PROCESSING (DAILY) =====
0 9 * * *   cross-match.mjs              # AM cross-match
0 10 * * *  aggregator.mjs               # Trends, anomalies, summaries
*/15 * * * * watchdog.mjs                 # Health check every 15 min
*/30 * * * * receipt-processor.mjs batch  # Receipt processing every 30 min

# ===== SYNC =====
0 23 * * *  sync-to-chefflow.mjs         # Nightly sync to ChefFlow

# ===== MAINTENANCE =====
0 0 * * 0   find $OPENCLAW_DIR/logs -name "*.log" -size +10M -exec truncate -s 0 {} \;
```

**Pi load estimate:** Still well under 0.5 average. Most scrapers run sequentially, finish in minutes, and the Pi sleeps between jobs. 78GB free storage handles everything easily.

# OpenClaw Nationwide Pricing Strategy

> **Status:** Approved 2026-04-04
> **Owner:** OpenClaw (Pi)
> **Priority:** Launch requirement. Not optional.
> **Depends on:** Residential proxy purchase ($25/month)

---

## Mission Statement

ChefFlow launches with a complete nationwide food source directory and pricing database. OpenClaw builds it. Every store in America goes in the directory, even if we cannot scrape prices from it. Users never contribute core data. No estimation, no prediction, no crowdsourcing.

---

## Current State (2026-04-04)

| Metric            | Now     | Target                       |
| ----------------- | ------- | ---------------------------- |
| Products          | 49,000  | 2,000,000+                   |
| Ingredients       | 54,000  | 200,000+                     |
| Prices            | 162,000 | Millions                     |
| States covered    | 3 (NE)  | 50                           |
| Zip codes         | 281     | 41,000+                      |
| Stores mapped     | 422     | Every food source in America |
| Chains scraped    | 20      | 100+                         |
| Wholesale sources | ~1      | 5+                           |
| Pi utilization    | 10%     | 85%                          |
| Cron jobs         | 51      | 200+                         |

---

## Architecture

```
OpenClaw (Pi, 24/7)
  -> Scrapes, crawls, downloads, ingests
  -> Stores in SQLite (prices.db, stores.db)
  -> Normalizes (canonical ingredients, store dedup, chain linking)
  -> Syncs to ChefFlow PostgreSQL nightly

ChefFlow (PC)
  -> Reads from PostgreSQL
  -> Displays to chefs
  -> Never scrapes anything
  -> Never asks users for data
```

---

## Category 1: Master Food Source Directory

**Goal:** Map every place in America where you can buy food.

### Task 1.1: Grocery stores and supermarkets

**Source:** OpenStreetMap Overpass API (free, no key, bulk download)

Query tags:

- `shop=supermarket`
- `shop=grocery`
- `shop=convenience`
- `shop=greengrocer`
- `shop=butcher`
- `shop=seafood`
- `shop=bakery`
- `shop=deli`
- `shop=cheese`
- `shop=health_food`
- `shop=organic`

Returns: name, chain (if tagged), address, lat/lng, opening hours. Process all 50 states systematically.

### Task 1.2: Wholesale food distributors and cash-and-carry

**Source:** OpenStreetMap + Google Places API

Tags: `shop=wholesale`, `shop=cash_and_carry`

Specific targets: Restaurant Depot, Jetro, Sysco distribution centers, US Foods depots, Gordon Food Service, Performance Food Group, Shamrock Foods, ethnic wholesale (H Mart wholesale, 99 Ranch wholesale, Patel Brothers).

### Task 1.3: Farmers markets

**Source:** USDA National Farmers Market Directory API (free, official)

Returns: market name, address, lat/lng, schedule (days/hours/season), products sold, payment methods (SNAP/EBT). Coverage: 8,700+ registered markets.

### Task 1.4: Farms with direct sales

**Source:** USDA Local Food Directories API (free, official)

Farm stands, CSA programs, on-farm stores, U-pick operations. Also: LocalHarvest.org (scrape), state agricultural department directories.

### Task 1.5: Gas station hybrids

**Source:** OpenStreetMap (`amenity=fuel` cross-referenced with `shop=convenience`)

Wawa, Sheetz, QuikTrip, Buc-ee's, Casey's General Stores (2,500+ locations with full grocery), Pilot/Flying J, Love's, RaceTrac, Kwik Trip.

### Task 1.6: Corner stores, bodegas, convenience stores

**Source:** OpenStreetMap (`shop=convenience`)

7-Eleven (13,000+), Circle K, Speedway, am/pm, Wawa, Cumberland Farms. Independent bodegas.

### Task 1.7: Dollar stores

**Source:** OpenStreetMap + chain store locator APIs

Dollar General (19,000+, many now sell fresh produce), Dollar Tree / Family Dollar (16,000+ combined). Primary grocery source in thousands of rural towns.

### Task 1.8: Ethnic and specialty food stores

**Source:** OpenStreetMap + Google Places + Yelp Fusion API

H Mart, 99 Ranch Market, Patel Brothers, Sedano's, Fiesta Mart, El Super, Vallarta, Cardenas Markets. Asian, Latin, Indian, Middle Eastern, African, Caribbean, Eastern European stores. Specialty: Whole Foods, Trader Joe's, Sprouts, Natural Grocers, Earth Fare, Fresh Thyme.

### Task 1.9: Co-ops and buying clubs

**Source:** National Co+op Grocers directory (public), OpenStreetMap

Food co-ops, buying clubs, community-supported grocery.

### Task 1.10: Warehouse clubs

**Source:** Store locator APIs (all public)

Costco (600+), Sam's Club (600+), BJ's Wholesale (240+), Restaurant Depot (150+).

### Task 1.11: Cross-reference with USDA SNAP retailer list

**Source:** USDA SNAP retailer database (free download)

250,000+ authorized food retailers. Includes stores not in any other database (small independents, rural stores). Use to fill gaps in the directory.

---

## Category 2: Classify and Tag Every Location

### Task 2.1: Record known facts

For every store found, record (no guessing):

- Name
- Chain affiliation (if any)
- Full address (street, city, state, zip)
- Lat/lng coordinates
- Store type (supermarket / wholesale / convenience / specialty / farmers market / farm / gas station hybrid / dollar store / co-op / corner store)
- Has online presence (yes/no, URL if found)
- Has online ordering with visible prices (yes/no)
- Has weekly circular (yes/no)
- Has API (yes/no)
- Discovery source (OSM / Google / USDA / Yelp / chain locator / SNAP list)

### Task 2.2: Determine scrapability

Physically visit the store's website (if it has one):

- **Scrapable:** Online store with visible prices
- **Catalog only:** Product catalog without prices
- **Circular only:** Weekly flyer with sale prices
- **API available:** Has a developer API
- **Directory only:** No online pricing. Still in the database. Still shows up when a chef searches for nearby stores.

No store gets excluded. Every store goes in the directory.

### Task 2.3: Detect update frequency

For scrapable stores:

- Hit the same product page at different times over several days
- Record when prices actually change
- Note: "Updates daily at ~6am" or "Circular refreshes Wednesdays" or "Prices change irregularly"
- This feeds the ping schedule (Category 5)

---

## Category 3: Scrape Prices from Every Available Source

### Already Running (51 cron jobs)

| System                | Source                  | Data                                       |
| --------------------- | ----------------------- | ------------------------------------------ |
| Instacart (20 chains) | Instacart GraphQL       | 162K prices, 54K ingredients               |
| Walmart               | Website/API             | Nationwide product catalog                 |
| Target                | Redsky API              | Nationwide product catalog                 |
| Whole Foods           | Amazon ALM              | WF products nationwide                     |
| Flipp                 | Flipp API               | Weekly sale circulars, hundreds of chains  |
| Government            | BLS, FRED, USDA APIs    | National/regional averages, CPI, inflation |
| Open Food Facts       | OFF API                 | Images, nutrition, barcodes (16% match)    |
| Wholesale catalog     | Unknown source          | Weekly wholesale pricing                   |
| Cross-matching        | Internal (4x/day)       | Product-to-ingredient mapping              |
| Aggregator            | Internal (daily)        | Trends, aging, anomaly detection           |
| Receipt processor     | OCR pipeline            | Scanned receipt extraction                 |
| Watchdog              | Internal (every 15 min) | Health monitoring                          |
| ChefFlow sync         | Internal (nightly)      | Push matched prices to ChefFlow            |

### New Scrapers to Build

#### Instacart expansion (needs residential proxy)

Capture sessions for top 50 metros. Every chain Instacart serves becomes scrapable nationwide:

- Kroger family (15 sub-chains): Kroger, Ralph's, Fred Meyer, Harris Teeter, King Soopers, Fry's, Smith's, QFC, Pick 'n Save, Mariano's, Pay Less, Baker's, Gerbes, Owen's, Jay C
- Albertsons family (20+ sub-chains): Safeway, Vons, Jewel-Osco, Acme, Randalls, Tom Thumb, Pavilions, Star Market, Haggen, Carrs
- Publix (Southeast dominant)
- H-E-B (Texas dominant + Central Market)
- Meijer (Midwest)
- WinCo (West Coast + expanding)
- Hy-Vee (Midwest)
- Food Lion (East Coast)
- ALDI (expand from NE to nationwide)
- Costco (expand from NE to nationwide)

#### Direct chain scraping (no Instacart needed)

Chains with their own online ordering/pricing:

- H-E-B (heb.com)
- Publix (publix.com)
- Meijer (meijer.com)
- Hy-Vee (hy-vee.com)
- WinCo (wincofoods.com)
- Sprouts (sprouts.com)
- Fresh Thyme (freshthyme.com)
- Trader Joe's (fixed national pricing, one scrape covers everything)

#### Wholesale sources

- Restaurant Depot (restockit.com, online ordering with pricing)
- Sysco (sysco.com, public product catalog)
- US Foods (usfoods.com, product browsing)
- Gordon Food Service (gfs.com, retail store pricing)
- WebstaurantStore (webstaurantstore.com, full online catalog)
- Katom Restaurant Supply (katom.com)

#### Ethnic and specialty chains

- H Mart (hmart.com)
- 99 Ranch Market (99ranch.com)
- Patel Brothers (patelbros.com)
- Sedano's, Fiesta Mart, El Super, Vallarta (check each for online presence)

---

## Category 4: Free Government and Public Data

| Source                        | What                                              | Update Frequency  | Coverage                     |
| ----------------------------- | ------------------------------------------------- | ----------------- | ---------------------------- |
| USDA Average Prices           | ~60 staple item prices                            | Monthly           | National + regional          |
| USDA AMS Terminal Markets     | Wholesale produce, grains, meat prices            | Daily             | Every major wholesale market |
| USDA FoodData Central         | Nutrition for 300K+ foods, 400K+ branded products | Ongoing           | National                     |
| BLS CPI Food                  | Regional food price indices                       | Monthly           | All US regions               |
| State ag market reports       | Wholesale produce/livestock prices                | Weekly/daily      | Per state                    |
| USDA SNAP retailers           | 250K+ food store locations                        | Updated regularly | Nationwide                   |
| USDA Farmers Market Directory | 8,700+ markets with schedules                     | Updated regularly | Nationwide                   |
| USDA Local Food Directories   | Farms, CSAs, farm stands                          | Updated regularly | Nationwide                   |

---

## Category 5: Ping Schedule and Reliability Layer

### Task 5.1: Record update frequency per source

As OpenClaw scrapes, log:

- Last successful scrape timestamp
- Last time prices actually changed
- Detected update pattern (daily/weekly/monthly/irregular)

### Task 5.2: Master ping rotation

Based on detected patterns:

- Daily updaters -> scrape daily
- Weekly updaters -> scrape day after their update day
- Monthly updaters -> scrape once monthly
- Unknown pattern -> weekly default, adjust based on observed changes

### Task 5.3: Reliability scores per source

Track:

- **Uptime:** % of scrape attempts that succeed
- **Freshness:** Average age of data
- **Coverage:** Number of products/prices provided
- **Stability:** How often site structure changes (breaking scrapers)

### Task 5.4: Priority allocation

Pi cycles are finite. Allocate by value:

- **High:** Wholesale, major chains with live pricing -> frequent pings
- **Medium:** Regional chains, specialty stores -> standard rotation
- **Low:** Circular-only sources, infrequent updaters -> weekly/monthly
- **None:** Directory-only stores -> no ping, just directory entry

### Task 5.5: Self-healing monitoring

Expand existing watchdog:

- Detect when a scraper starts failing
- Alert which sources went dark and when
- Track "days since last successful scrape" per source
- Flag sources needing scraper maintenance

---

## Category 6: Normalization and Cross-Reference

### Task 6.1: Canonical ingredient mapping (existing, expand)

17,944 normalization rules. Cross-matching runs 4x/day. Expand as new products arrive from new sources.

### Task 6.2: Store deduplication

Same store in OSM + Google + SNAP list = one entry. Merge by address proximity + name similarity. One canonical store ID per physical location.

### Task 6.3: Chain linking

"Market Basket #47" -> chain: Market Basket. Enables chain-level analytics.

### Task 6.4: Zip-to-store mapping

For every US zip code: which stores are within 5/10/25 miles. This is what ChefFlow uses for "stores near you."

### Task 6.5: Cross-source anomaly detection (existing, expand)

50,585 anomalies detected. Expand: flag when one store's price diverges wildly from nearby stores for same item.

---

## Category 7: Archive Digester (Separate Track, see dedicated memory file)

---

## Category 8: Yield Factors and Cooking Conversions (NEW)

**Why this matters:** Food costing is wrong without yield data. A chef buying 5 lbs of chicken at $3.99/lb doesn't get $19.95 of food. They get ~3.5 lbs of usable meat. Real cost: $5.70/lb usable. This is the difference between profitable and unprofitable.

### Task 8.1: Ingest USDA Food Buying Guide yield data

**Source:** USDA Food Buying Guide API (free, has API)

- As-purchased to edible-portion yield percentages for hundreds of items
- Covers fresh, frozen, canned, dried forms
- Includes serving size conversions
- API endpoint available at foodbuyingguide.fns.usda.gov

### Task 8.2: Ingest USDA Agriculture Handbook 102

- The definitive yield factor reference
- Trimming waste percentages for every common ingredient
- Available as digitized data

### Task 8.3: Build unit conversion table

- Volume to weight conversions for 1,000+ foods
- "1 cup of flour" = 125g, "1 cup of sugar" = 200g, etc.
- Source: USDA data + Aqua-Calc reference
- Every recipe ingredient becomes convertible to purchasable weight

---

## Category 9: Seasonal Availability Engine (NEW)

**Why this matters:** A chef planning a June menu should know strawberries are cheap and in season, while asparagus season just ended. This is real data, not prediction.

### Task 9.1: Ingest USDA seasonal produce data

**Sources:**

- USDA SNAP-Ed Seasonal Produce Guide (~40 items, month-by-month)
- Produce Market Guide availability calendars (comprehensive, scrapable)

Build a table: ingredient x month x region = in_season / transitional / out_of_season

### Task 9.2: Derive seasonality from AMS shipping data

**Source:** USDA AMS Market News API (already planned for price data)

The shipping point reports show what's actually moving from which growing region. High volume = in season. Low volume = out of season. This is real-time seasonality, not a static calendar.

Cross-reference with pricing: items that are in-season AND at local terminal markets are the best value.

---

## Category 10: Food Safety Monitoring (NEW)

**Why this matters:** A chef serving recalled romaine lettuce tonight is a liability event. Real-time recall matching against active ingredients is safety-critical.

### Task 10.1: Monitor FDA food recalls

**Source:** openFDA API (free, API key optional)

- Poll recall endpoint on schedule (hourly or daily)
- Cross-reference recalled products against canonical ingredient database
- Flag matches for push to ChefFlow
- Track: product, reason, severity (Class I/II/III), distribution states

### Task 10.2: Monitor USDA FSIS recalls

**Source:** USDA FSIS recall database

- Covers meat, poultry, processed egg products (not covered by FDA)
- Same cross-reference logic as FDA
- RSS feed available for real-time monitoring

---

## Category 11: Commodity Price Tracking (NEW)

**Why this matters:** When butter futures rise 15% on CME, retail butter follows within 2-4 weeks. This is established economics, not prediction. Chefs can lock in prices or adjust menus.

### Task 11.1: Track key food commodity prices

**Sources:**

- CME Group (delayed quotes, free on website)
- FRED API (Producer Price Index for food manufacturing, free API key)

Track futures/spot prices for:

- Dairy: butter, cheese, milk
- Proteins: cattle, hogs, chicken (PPI)
- Grains: wheat, corn, soybeans (affects feed = affects protein prices)
- Sugar, coffee, cocoa
- Cooking oils

### Task 11.2: Correlate commodity moves with retail prices

Using our own historical price data (once 90+ days deep):

- "When CME butter futures rise X%, retail butter rises Y% within Z weeks"
- This correlation is measurable and deterministic from our own data
- Output: "Based on commodity markets, expect [ingredient] prices to [rise/fall] ~[X]% in [timeframe]"

---

## Category 12: Anomaly Consumption (NEW)

**Why this matters:** 50,585 price anomalies already detected and sitting unused. This is finished data waiting for a consumer.

### Task 12.1: Classify and push anomalies to ChefFlow

Categorize existing and incoming anomalies:

- **Deal:** Price dropped >15% at a specific store (chef wants to know)
- **Market event:** Price moved >15% across multiple stores (systemic, affects menu planning)
- **Data error:** Price is obviously wrong ($0.01 for a steak, $999 for milk) (filter out)
- **Seasonal shift:** Price change aligns with seasonal pattern (expected, informational)

Push classified anomalies to ChefFlow for display: "Deals near you" and "Price alerts"

---

## Category 7: Archive Digester (Separate Track)

Developer's 10 years of historical business data. Not part of pricing strategy. Runs concurrently on the Pi.

- Waiting on developer to collect raw files into dump folder
- Pipeline: classify -> extract entities -> cross-reference -> structured output -> ChefFlow sync
- Full details in `memory/project_openclaw_archive_digester.md`

---

## Phase Execution Order

| Phase | What                                                                          | Blocker                                     | Estimated New Data                                               |
| ----- | ----------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| 1     | Store mapping (OSM + Google + USDA + SNAP list)                               | None. Start immediately.                    | Millions of store locations                                      |
| 2     | Free government data ingest (AMS, yield factors, seasonal, recalls, FRED)     | None. Free APIs/downloads.                  | Wholesale prices, yield tables, seasonal calendars, recall feeds |
| 3     | Instacart nationwide expansion                                                | Residential proxy ($25/month)               | 500K+ products across 50+ chains                                 |
| 4     | Wholesale scrapers (Restaurant Depot, Sysco, US Foods, GFS, WebstaurantStore) | None after Phase 1 identifies targets       | 100K+ wholesale products                                         |
| 5     | Regional chain gap fill + direct chain scrapers                               | Phase 1 identifies which chains exist where | Varies by chain                                                  |
| 6     | Anomaly consumption + commodity tracking                                      | Phases 1-5 producing data                   | Deals, alerts, price forecasting                                 |
| 7     | Kroger production API access                                                  | Application + approval                      | 15 chains, thousands of stores                                   |

---

## Research Targets (investigate before building)

| Source                           | What to Check                                       | Why It Matters                                                               |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Kroger Developer Portal          | Apply for production API access                     | 15 chains, real-time pricing by location. Only major grocer with a real API. |
| WebstaurantStore                 | Test catalog scrapability                           | Massive wholesale/foodservice catalog with pricing                           |
| Restaurant Depot (restockit.com) | Test scraping viability                             | Where chefs actually buy, online ordering with prices                        |
| Produce Market Guide             | Check scrapability of availability calendars        | Seasonal data for every major produce commodity                              |
| USDA Food Buying Guide API       | Test API endpoints for yield data                   | Yield factors with API access                                                |
| CME Group delayed quotes         | Check if scrapable for food commodities             | Futures-based price forecasting                                              |
| State ag market reports          | Survey all 50 states                                | Some states publish daily wholesale produce prices                           |
| LocalHarvest.org                 | Check for API or scrapability                       | Farm/CSA directory, supplements USDA data                                    |
| Spoonacular free tier            | Test what 150 req/day gets us                       | May have useful product data to supplement                                   |
| Aqua-Calc                        | Check scrapability for volume-to-weight conversions | 1,000+ food density/conversion entries                                       |

---

## Category 13: Derived Pricing Engine (NEW)

**Why this matters:** Collection covers ~80% of prices. The remaining ~20% are at stores we can't scrape, products we haven't matched, or locations we haven't reached yet. Derived prices fill those gaps using math applied to facts we already have. No AI, no guessing, no hallucination. Every derived price is labeled as derived, tagged with its method, and scored by confidence.

**Cardinal rule:** A derived price is NEVER displayed as a collected price. ChefFlow must always show the source: "Collected" or "Derived (method, confidence%)". A chef must be able to tell the difference at a glance.

---

### A. Geographic Methods (spatial relationships between stores)

#### Method G1: Chain Proximity Transfer

**What:** Same chain, nearest location where we DO have the price.

**Logic:** Chain stores use zone-based pricing. A Stop & Shop in Haverhill charges the same (within pennies) as the Stop & Shop 12 miles away in Methuen. The variance within a pricing zone is driven by local tax differences or rare store-level markdowns.

**Inputs required:**

- Target store's chain affiliation (from Category 2)
- Nearest same-chain store with the collected price
- Distance between them

**Accuracy:** 95-99% within 25 miles. Degrades to 90-95% across 50+ miles (may cross pricing zones).

**When to use:** Always the first method attempted for chain stores. Highest confidence of any derivation.

**When it fails:** Store is independent (no chain), or no nearby same-chain location has the price.

---

#### Method G2: Store-Type Benchmark

**What:** Stores of the same type in the same metro area price similarly.

**Logic:** All discount grocers (Aldi, Lidl, Save-A-Lot) in a metro area cluster around a similar price point for commodity items. All premium stores (Whole Foods, Fresh Market) cluster higher. The store type IS a price signal.

**Inputs required:**

- Target store's type classification (from Task 2.1)
- Collected prices for same product at other stores of same type in same metro

**Accuracy:** 80-88%. Good for commodity staples (milk, eggs, bread). Less reliable for specialty/differentiated items.

**When to use:** When G1 fails (independent store or no nearby chain match).

**When it fails:** Store type is unusual or store has no peers in the metro.

---

#### Method G3: Regional CPI Scaling

**What:** National average price adjusted by the metro area's food price index.

**Logic:** BLS publishes Consumer Price Index by metro area and food category monthly. If eggs cost $3.00 nationally and the Boston metro food index is 1.12, eggs in the Boston area should be approximately $3.36.

**Inputs required:**

- National average price for the product category (from USDA Average Prices, Category 4)
- Metro-area CPI food index (from BLS, Category 4)

**Accuracy:** 75-85%. Gets you in the right range but can't account for individual store positioning within a metro.

**When to use:** When G1 and G2 both fail. Broad fallback.

**When it fails:** Product doesn't map cleanly to a CPI category, or metro-level index isn't granular enough (rural areas).

---

### B. Store-Level Methods (known facts about a specific store)

#### Method S1: Store Price Index

**What:** Calculate a store's general price level relative to other stores in the same area from products where prices ARE known for all stores. Apply that ratio to the missing product.

**Logic:** If we have 200 products where Store #5 and Store #1 both have prices, and Store #5 is consistently 8% more expensive, then for a product where only Store #1 has a price ($3.00), Store #5 is likely ~$3.24.

**Inputs required:**

- At least 50 overlapping products between the target store and a reference store (more = better)
- Collected prices for both stores on those overlapping products
- Collected price at the reference store for the missing product

**Accuracy:** 85-92%. Improves with more overlapping products. Unreliable below 50 shared products.

**Minimum data threshold:** 50 shared products to generate an index. Below that, skip this method.

**When to use:** When we have significant collected data from the target store but are missing specific products.

**When it fails:** Too few shared products, or the store prices inconsistently across categories (e.g., cheap produce but expensive dairy).

---

#### Method S2: Store-Type Markup from Wholesale

**What:** Known wholesale price plus the typical retail markup for that store's type.

**Logic:** If AMS terminal market price for romaine lettuce is $1.20/lb wholesale, and grocery stores typically mark up produce 33-50%, the retail price is approximately $1.60-$1.80. Convenience stores mark up 40-60%. Premium stores mark up 50-100%.

**Inputs required:**

- Current wholesale price for the product (from Category 4, AMS terminal market data)
- Target store's type classification
- Known markup ranges by store type (built from our own collected data over time)

**Markup ranges (starting estimates, refined from real data):**

| Store Type        | Typical Markup Range |
| ----------------- | -------------------- |
| Warehouse club    | 8-15%                |
| Discount grocer   | 15-25%               |
| Standard grocer   | 25-40%               |
| Premium grocer    | 40-70%               |
| Convenience store | 40-80%               |
| Corner store      | 50-100%              |
| Specialty store   | 50-100%+             |

**Accuracy:** 80-90% for fresh produce and commodity proteins where wholesale prices are transparent. Less reliable for packaged goods with complex distribution.

**When to use:** When wholesale price is known and store type is classified.

**When it fails:** No wholesale price available, or product is heavily branded (markups vary wildly by brand).

---

#### Method S3: Store Promotional Cycle

**What:** Predict whether a product is currently on sale or at regular price based on observed promotional patterns.

**Logic:** Many stores rotate sales on a predictable cycle (every 4-6 weeks for a given category). If we've observed Coca-Cola 12-packs going on sale every 5th week at Store X, and it's been 4 weeks since the last sale, the regular price is more likely than the sale price this week.

**Inputs required:**

- Historical price data for the product at that store (at least 8-12 weeks)
- Detected cycle length (if any)

**Accuracy:** 75-85%. Works well for stores with predictable promo calendars (Kroger, Publix). Unreliable for stores with irregular pricing.

**When to use:** When we've lost a current scrape but have historical data showing a pattern.

**When it fails:** No historical data, or store has no detectable cycle.

---

### C. Temporal Methods (time-based patterns)

#### Method T1: Last Known Price + Category Inflation

**What:** Most recent collected price adjusted by the category-specific inflation rate for the elapsed time.

**Logic:** If we had the price 30 days ago ($3.49) and BLS says dairy prices rose 0.3% this month, the adjusted price is ~$3.50. This is not prediction. BLS publishes actual measured inflation monthly by food category.

**Inputs required:**

- Last collected price for this product at this store
- Days since last collection
- BLS CPI category-specific inflation rate for the elapsed period

**Accuracy:** 90-95% within 30 days. 85-90% within 60 days. Degrades significantly beyond 90 days.

**Staleness limit:** Do not apply beyond 90 days. After 90 days, the price is marked stale and removed from active display.

**When to use:** Scraper went down temporarily, store changed their site, or we missed a cycle.

**When it fails:** Price was already volatile, or a major market event occurred (supply disruption, recall, seasonal shift).

---

#### Method T2: Seasonal Pattern Replay

**What:** Apply known seasonal price curves to estimate current price.

**Logic:** Fresh produce follows well-documented seasonal patterns. Strawberries are cheapest in May-June, most expensive in December-January. If we have the price from June and need January's price, the seasonal multiplier is knowable from USDA historical data and our own price history.

**Inputs required:**

- At least one collected price for this product at this store in the past 12 months
- Seasonal price curve for this product (from our own historical data or USDA seasonal indices)
- Current month

**Accuracy:** 80-90% for produce with strong seasonal patterns. Unreliable for packaged goods with flat seasonality.

**When to use:** Seasonal products where we have off-season data but not current-season data (or vice versa).

**When it fails:** Product has no seasonal pattern, or an unusual supply event overrides the normal curve (freeze in Florida, drought in California).

---

### D. Product Math Methods (related product derivation)

#### Method P1: Unit Size Conversion

**What:** Have the price for one size, derive the price for another size of the same product.

**Logic:** If a 16oz jar of peanut butter is $3.49, the 32oz jar follows a known bulk discount curve. Bulk discount ratios are consistent within product categories and can be measured from our own data.

**Inputs required:**

- Collected price for one size of the product
- Target size
- Category-specific size-to-price ratio (calculated from collected data where we have both sizes)

**Accuracy:** 85-92%. Bulk discount curves are surprisingly consistent within categories.

**When to use:** We have one size but the chef needs a different size.

**When it fails:** Product has unusual sizing or the size variant doesn't exist at that store.

---

#### Method P2: Brand Substitution Ratio

**What:** Have the name-brand price, derive the store-brand price (or vice versa).

**Logic:** Store brands typically run 20-30% cheaper than national brands for equivalent products. This ratio is measurable from our own data for each store.

**Inputs required:**

- Collected price for the other brand variant at the same store
- Brand-to-generic ratio for that product category at that store (calculated from collected data)

**Accuracy:** 80-88%. The ratio is consistent for commodity equivalents (store brand vs. national brand milk). Less reliable for specialty categories where "equivalent" is subjective.

**When to use:** Chef wants store brand but we only have national brand price (or vice versa).

**When it fails:** No true equivalent exists, or the store doesn't carry both variants.

---

#### Method P3: Weight/Volume Normalization

**What:** Convert between units using known food density data.

**Logic:** If we have the price per pound and the chef needs price per cup, food density tables (USDA, Aqua-Calc) provide exact conversion factors. 1 cup of all-purpose flour = 125g. This is physics, not estimation.

**Inputs required:**

- Collected price in one unit
- USDA/Aqua-Calc density/conversion factor for the ingredient
- Target unit

**Accuracy:** 98-100%. This is unit conversion, not estimation. The only variance is natural product density variation (e.g., loosely packed vs. packed flour).

**When to use:** Always, as a normalization layer. Every price should be expressible in the chef's preferred unit.

**When it fails:** Ingredient has no density data (rare for common foods).

---

### E. Supply Chain Methods (build price from cost inputs)

#### Method C1: Commodity Futures + Margin Stack

**What:** Build the retail price from the raw commodity cost upward.

**Logic:** A pound of retail ground beef can be decomposed: live cattle price (CME) + slaughter/processing margin + distribution/cold chain + retail margin. These margins are published by USDA Economic Research Service and are relatively stable percentages.

**Inputs required:**

- Current commodity price (CME delayed quotes, FRED PPI)
- Processing margin for that commodity (USDA ERS data)
- Distribution margin (industry standard, 8-12%)
- Retail margin by store type (from Method S2 markup table)

**Accuracy:** 70-85%. Too many margin assumptions stacked. Best used as a sanity check on other methods, not as a primary derivation.

**When to use:** As a floor/ceiling validator. If another method gives $2.00/lb for ground beef but the commodity stack says the floor is $3.50, something is wrong.

**When it fails:** Product is heavily processed (many margin layers), or distribution is unusual.

---

#### Method C2: MSRP / MAP Ceiling

**What:** Manufacturer's suggested retail price or minimum advertised price as an upper bound.

**Logic:** Many packaged goods have a known MSRP. The actual retail price is at or below MSRP. This doesn't give you the price, but it gives you a ceiling.

**Inputs required:**

- Product MSRP (from manufacturer data, Open Food Facts, or product databases)

**Accuracy:** Sets a bound, not a point estimate. Useful as a constraint on other methods.

**When to use:** As a validator alongside other methods.

**When it fails:** MSRP is outdated, or the product is a store brand with no MSRP.

---

### F. Composite Methods (combining signals)

#### Method F1: Weighted Multi-Method Ensemble

**What:** When multiple derivation methods apply, combine them weighted by confidence.

**Logic:** If G1 (chain proximity) gives $3.49 at 97% confidence, and S1 (store index) gives $3.55 at 87% confidence, the ensemble price is a weighted average: ($3.49 _ 0.97 + $3.55 _ 0.87) / (0.97 + 0.87) = $3.52.

**When to use:** Whenever 2+ methods can produce an estimate. The ensemble is always more accurate than any single method.

**Minimum requirement:** At least 2 independent methods must agree within 15% of each other. If methods diverge more than 15%, flag as low-confidence and present the range instead of a point estimate.

---

#### Method F2: Circular Confirmation

**What:** Flipp circular data confirms the advertised sale price.

**Logic:** This is technically collected data (from Category 3), but it only covers sale items on specific weeks. When a circular price is available, it overrides any derivation for that product at that store during that sale period.

**Inputs required:**

- Flipp circular match for the product at the target store
- Sale date range

**Accuracy:** 99%+ (it's the advertised price). But only available for items currently on promotion.

**When to use:** Always check circulars first before deriving. A circular price is effectively a collected price.

---

### Derivation Confidence Tiers

Every derived price gets a confidence tier based on method and data quality:

| Tier | Confidence | Method(s)                                                       | Display                                   |
| ---- | ---------- | --------------------------------------------------------------- | ----------------------------------------- |
| A    | 95-99%     | G1 (chain proximity, <25mi) or F2 (circular confirmed)          | Show as "Estimated" with green indicator  |
| B    | 85-94%     | S1 (store index, 100+ products), T1 (<30 days), P1, P3          | Show as "Estimated" with yellow indicator |
| C    | 75-84%     | G2 (store-type), G3 (CPI), S2 (wholesale+markup), T2 (seasonal) | Show as "Estimated" with orange indicator |
| D    | 70-74%     | C1 (commodity stack), multi-method with >10% divergence         | Show as "Range: $X - $Y"                  |
| F    | <70%       | Insufficient data for any method                                | Show "No data" (not a guess)              |

**Hard floor:** If no method produces 70%+ confidence, the price is NOT displayed. "No data" is always better than a bad estimate.

---

### Derivation Priority Order

When a collected price is missing, run methods in this order (stop when confidence threshold is met):

```
1. F2: Circular confirmation (it's basically collected)
2. G1: Chain proximity transfer
3. S1: Store price index
4. T1: Last known + inflation (if <90 days old)
5. G2: Store-type benchmark
6. S2: Wholesale + markup
7. T2: Seasonal pattern replay
8. P1: Unit size conversion (if different size is available)
9. P2: Brand substitution (if other brand is available)
10. G3: Regional CPI scaling
11. F1: Ensemble of any applicable methods above
12. C1: Commodity stack (validation/sanity check only)
13. C2: MSRP ceiling (validation only)
14. → If nothing reaches 70%: "No data"
```

P3 (weight/volume normalization) runs as a post-processing layer on ALL prices (collected and derived), not as a derivation method itself.

---

### What the Chef Sees

For every price in ChefFlow, one of these labels appears:

| Label                 | Meaning                            | Source                               |
| --------------------- | ---------------------------------- | ------------------------------------ |
| **Live**              | Collected within the last 24 hours | Direct scrape, API, or circular      |
| **Recent**            | Collected within 7 days            | Last successful scrape               |
| **Estimated (A/B/C)** | Derived, with confidence tier      | Derivation engine, method documented |
| **Range**             | Low-confidence derivation          | Two bounds shown, no point estimate  |
| **No data**           | Nothing available                  | Empty, honest                        |

A chef can always tap/click to see: where the number came from, when it was collected or derived, which method was used, and the confidence percentage. Full transparency.

---

## Rules

1. Every store goes in the directory. No exceptions. Even if we can't scrape prices.
2. OpenClaw builds this. Users never contribute core data.
3. Collected prices and derived prices are always labeled differently. A chef can always tell which is which. Derived prices are never presented as facts.
4. Commodity-based forecasting is acceptable (it's math from market data, not AI guessing).
5. Pi runs at 85% utilization. It exists to work.
6. "OpenClaw" never appears on user-facing surfaces in ChefFlow.
7. Data flows one direction: OpenClaw -> ChefFlow.
8. No derivation method uses AI. Every method is a formula: inputs in, number out, same answer every time.
9. If no derivation method reaches 70% confidence, the answer is "No data". Never display a bad estimate.
10. Every derived price stores its method, inputs, confidence score, and timestamp. Full audit trail.

---

## Key Decisions Made (2026-04-04)

1. Nationwide pricing is a launch requirement, not a "nice to have"
2. Price-intel is active development, not maintenance mode
3. The first task is mapping every food source in America (Task 0)
4. Every store type included: grocery, wholesale, convenience, specialty, ethnic, farmers market, farm, gas station hybrid, dollar store, co-op, corner store
5. Scrapable stores get prices. Non-scrapable stores still go in the directory.
6. Ping schedule is self-organizing based on observed update frequencies
7. Pi utilization target raised from conservative 60% to 85%
8. Yield factors, seasonal availability, food safety monitoring, and commodity tracking are new categories added to the scope
9. 50K existing price anomalies must be classified and pushed to ChefFlow as deals/alerts
10. Kroger production API access should be pursued (only major grocer with a real developer API)

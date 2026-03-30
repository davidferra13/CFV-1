# Research: Complete US Ingredient Catalog

> **Date:** 2026-03-30
> **Question:** What does a complete A-Z list of every food ingredient available in America look like, and how should it be structured for a chef's pricing database?
> **Status:** complete

## Summary

There is no single authoritative "complete list" of every food ingredient in the United States, but the landscape is well-mapped across several tiers. The US grocery market contains roughly 400,000-700,000 unique branded food products (UPC-level SKUs), tracked across databases like USDA FoodData Central (~400K+ branded entries), Open Food Facts (~830K US products), and Instacart's catalog (~430M store-level listings across 30K+ stores). However, a chef does not need branded product data. A chef needs **canonical ingredients** (generic, brand-agnostic items like "chicken breast" or "arborio rice"), which number approximately **7,800-10,000** based on the USDA SR Legacy database (7,793 foods across 25 food groups) plus specialty and ethnic ingredients. The recommended approach: start with USDA SR Legacy as the backbone (~7,800 generic foods, free CSV download), supplement with FoodOn ontology (~9,600 food product categories) for taxonomy, and layer pricing data on top via OpenClaw scraping. This gives ChefFlow a complete, structured, licensable foundation without building from scratch.

---

## Detailed Findings

### 1. The Scale of Food in America

Understanding the numbers at each level:

| Level                              | What It Means                          | Approximate Count  | Example                                        |
| ---------------------------------- | -------------------------------------- | ------------------ | ---------------------------------------------- |
| **Canonical Ingredients**          | Generic, brand-agnostic food items     | ~7,800-10,000      | "boneless skinless chicken breast"             |
| **Branded Products (unique UPCs)** | Specific manufacturer + size + variant | ~400,000-700,000   | "Tyson Boneless Skinless Chicken Breasts 48oz" |
| **Store-Level Listings**           | Same UPC at different stores/prices    | ~430,000,000       | "Tyson Chicken Breast at Stop & Shop #1234"    |
| **Grocery Store Inventory**        | Average items per supermarket          | ~31,800 (2024 avg) | One store's complete shelf                     |
| **New Products/Year**              | Annual product launches                | ~21,000-30,000     | New items hitting shelves yearly               |

**Key insight:** A chef searching for "chicken breast" does not care about 47 branded variants. They care about one canonical ingredient with a current price. The entire pricing database challenge is mapping 400K+ branded products down to ~10K canonical ingredients.

### 2. Authoritative Data Sources (Detailed)

#### USDA FoodData Central (The Foundation)

FoodData Central is the US government's primary food composition database. It contains five distinct data types:

| Data Type                 | Items           | Purpose                                             | Chef Relevance                                          |
| ------------------------- | --------------- | --------------------------------------------------- | ------------------------------------------------------- |
| **Foundation Foods**      | ~200+ (growing) | Deep nutrient profiles on core foods                | HIGH - these are the most important generic ingredients |
| **SR Legacy**             | 7,793           | Complete generic food database (final 2018 release) | HIGHEST - this IS the canonical ingredient list         |
| **Branded Foods (GBFPD)** | ~400,000+       | Branded products with nutrition labels              | LOW - too granular for ingredient-level pricing         |
| **FNDDS (Survey Foods)**  | ~8,000+         | Foods as consumed in dietary surveys                | MEDIUM - useful for prepared food categories            |
| **Experimental Foods**    | Small           | Research foods                                      | LOW                                                     |

**Download details:**

- URL: https://fdc.nal.usda.gov/download-datasets/
- Formats: CSV and JSON (bulk download, updated semi-annually for branded; SR Legacy is frozen at 2018)
- Full download (all types): 458MB zipped / 3.1GB unzipped CSV
- SR Legacy alone: 6.7MB zipped / 54MB unzipped CSV
- Branded Foods alone: 427MB zipped / 2.9GB unzipped CSV
- License: Public domain (US government work, no restrictions)
- API: Free with data.gov API key, 1,000 requests/hour
- **No pricing data** - nutrition only

**SR Legacy's 25 Food Groups** (the backbone taxonomy):

| Code | Food Group                          |
| ---- | ----------------------------------- |
| 0100 | Dairy and Egg Products              |
| 0200 | Spices and Herbs                    |
| 0300 | Baby Foods                          |
| 0400 | Fats and Oils                       |
| 0500 | Poultry Products                    |
| 0600 | Soups, Sauces, and Gravies          |
| 0700 | Sausages and Luncheon Meats         |
| 0800 | Breakfast Cereals                   |
| 0900 | Fruits and Fruit Juices             |
| 1000 | Pork Products                       |
| 1100 | Vegetables and Vegetable Products   |
| 1200 | Nut and Seed Products               |
| 1300 | Beef Products                       |
| 1400 | Beverages                           |
| 1500 | Finfish and Shellfish Products      |
| 1600 | Legumes and Legume Products         |
| 1700 | Lamb, Veal, and Game Products       |
| 1800 | Baked Products                      |
| 1900 | Sweets                              |
| 2000 | Cereal Grains and Pasta             |
| 2100 | Fast Foods                          |
| 2200 | Meals, Entrees, and Side Dishes     |
| 2500 | Snacks                              |
| 3500 | American Indian/Alaska Native Foods |
| 3600 | Restaurant Foods                    |

**For ChefFlow:** Groups 2100 (Fast Foods), 2200 (Meals/Entrees), and 3600 (Restaurant Foods) are less relevant to ingredient pricing. The remaining ~20 groups map well to how chefs think about ingredients.

#### Open Food Facts

| Field                       | Detail                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- |
| **Total Products (Global)** | 4,000,000+                                                                              |
| **US Products**             | ~830,000                                                                                |
| **Cost**                    | Free (Open Database License, ODbL)                                                      |
| **Format**                  | CSV, JSONL daily dump, REST API                                                         |
| **Fields**                  | Product name, brand, UPC/barcode, ingredients list, nutrition facts, categories, images |
| **Pricing Data**            | No                                                                                      |
| **Update Frequency**        | Continuous (crowdsourced), nightly dumps                                                |
| **Download**                | https://world.openfoodfacts.org/data                                                    |
| **PostgreSQL Import**       | Yes, CSV/JSONL parse directly                                                           |
| **Chef Relevance**          | MEDIUM - useful for UPC-to-ingredient mapping, ingredient lists from labels             |

**Key value:** Open Food Facts has parsed ingredient lists from product labels. This means you can map "Tyson Chicken Breast" -> ingredients: "chicken breast" and build the UPC-to-canonical-ingredient mapping programmatically.

#### FoodOn Ontology

| Field              | Detail                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| **Total Terms**    | 9,600+ food product categories                                          |
| **Cost**           | Free (Creative Commons)                                                 |
| **Format**         | OWL/OBO ontology files (can be parsed to CSV/JSON)                      |
| **Fields**         | Hierarchical food taxonomy with parent/child relationships, food facets |
| **Download**       | https://github.com/FoodOntology/foodon                                  |
| **Chef Relevance** | HIGH - provides the hierarchical taxonomy for organizing ingredients    |

**Key value:** FoodOn provides a "farm to fork" ontology that categorizes food by source animal/plant, preparation method, preservation method, and more. This is the best free taxonomy for structuring a chef-centric ingredient database.

#### FooDB (Food Component Database)

| Field                 | Detail                                            |
| --------------------- | ------------------------------------------------- |
| **Foods Covered**     | 1,000+ raw/unprocessed foods                      |
| **Compounds Tracked** | 28,000+ chemicals across those foods              |
| **Cost**              | Free                                              |
| **Format**            | CSV download                                      |
| **Download**          | https://foodb.ca/downloads                        |
| **Chef Relevance**    | LOW for pricing, HIGH for nutrition/allergen data |

#### BLS Average Price Data

| Field                 | Detail                                                              |
| --------------------- | ------------------------------------------------------------------- |
| **Items Tracked**     | ~70 specific food items at national level                           |
| **Cost**              | Free                                                                |
| **Format**            | JSON API, CSV/XLSX download                                         |
| **Fields**            | Monthly average retail price, city/region, time series back to 1980 |
| **Update Frequency**  | Monthly (with CPI release)                                          |
| **API**               | https://www.bls.gov/bls/api_features.htm (500 queries/day free)     |
| **PostgreSQL Import** | Yes                                                                 |
| **Chef Relevance**    | MEDIUM - useful as national benchmark/fallback pricing tier         |
| **HAS PRICING DATA**  | YES                                                                 |

**Items tracked include:** eggs, milk, bread, ground beef, chicken breast, bacon, flour, sugar, butter, coffee, bananas, apples, oranges, tomatoes, potatoes, lettuce, and about 55 more staples.

#### USDA ERS Food-at-Home Monthly Area Prices (F-MAP)

| Field                  | Detail                                  |
| ---------------------- | --------------------------------------- |
| **Categories Tracked** | 90 food groups (not individual items)   |
| **Geographic Areas**   | 15 regions                              |
| **Cost**               | Free                                    |
| **Format**             | XLSX download                           |
| **Time Range**         | 2012-2018                               |
| **HAS PRICING DATA**   | YES (aggregated category-level)         |
| **Chef Relevance**     | LOW - too aggregated for recipe costing |

#### USDA ERS Fruit and Vegetable Prices

| Field                | Detail                                                          |
| -------------------- | --------------------------------------------------------------- |
| **Items Tracked**    | 155 fresh and processed fruits and vegetables                   |
| **Cost**             | Free                                                            |
| **Format**           | XLSX download                                                   |
| **Fields**           | Average retail price per pound, price per edible cup equivalent |
| **Source Data**      | Circana (formerly IRI) retail scanner data                      |
| **HAS PRICING DATA** | YES                                                             |
| **Chef Relevance**   | HIGH for produce pricing benchmarks                             |

#### Spoonacular API

| Field                | Detail                                        |
| -------------------- | --------------------------------------------- |
| **Ingredients**      | ~2,600 ingredients with estimated pricing     |
| **Grocery Products** | 86,000+                                       |
| **Cost**             | Free tier: 50 calls/day. Paid: from $10/month |
| **Format**           | REST API (JSON)                               |
| **HAS PRICING DATA** | YES (estimates, not real-time retail)         |
| **Chef Relevance**   | MEDIUM - estimated prices are ballpark only   |

#### Kroger API

| Field                | Detail                                             |
| -------------------- | -------------------------------------------------- |
| **Products**         | Full Kroger catalog (est. 30,000-80,000 per store) |
| **Cost**             | Free developer access                              |
| **Format**           | REST API (JSON)                                    |
| **Fields**           | Product name, UPC, price, images, categories       |
| **HAS PRICING DATA** | YES (real-time, single retailer)                   |
| **Chef Relevance**   | HIGH - real prices from a major US grocer          |

#### Enterprise/Commercial Sources (For Reference)

| Source                     | Coverage                                   | Cost                     | Notes                                  |
| -------------------------- | ------------------------------------------ | ------------------------ | -------------------------------------- |
| **Circana (formerly IRI)** | 30M+ products, $4T+ consumer spend tracked | $$$$$ (six figures/year) | Used by USDA ERS internally            |
| **NielsenIQ**              | Comparable to Circana                      | $$$$$                    | Point-of-sale scanner data             |
| **Datasembly**             | Real-time pricing across 150K+ stores      | $$$$                     | Scrapes/aggregates retail prices       |
| **1WorldSync/GDSN**        | Product data network feeding USDA GBFPD    | Enterprise               | The data pipeline behind branded foods |

These are out of reach for ChefFlow but important to know they exist. The USDA gets its retail scanner data from Circana, so the free USDA datasets are derived from these commercial sources.

---

## The Canonical Ingredient List

### What It Looks Like

A canonical ingredient for a chef's pricing database is a **generic, brand-agnostic food item at the purchasing unit level.** Here's what that means:

**IS a canonical ingredient:**

- Chicken breast, boneless skinless (per lb)
- All-purpose flour (per lb)
- Extra virgin olive oil (per fl oz)
- Fresh basil (per bunch/oz)
- Arborio rice (per lb)
- Heavy cream (per qt)

**Is NOT a canonical ingredient (too specific):**

- Tyson Boneless Skinless Chicken Breasts 48oz (that's a branded product)
- Gold Medal All-Purpose Flour 5lb (that's a branded product)
- Colavita Extra Virgin Olive Oil 34oz (that's a branded product)

**Is NOT a canonical ingredient (too broad):**

- Meat (too vague - need specific cuts)
- Flour (need type: all-purpose, bread, cake, whole wheat, etc.)
- Oil (need type: olive, canola, sesame, etc.)

### How Many Items

Based on analysis of available databases:

| Scope                               | Count          | What's Included                                                   |
| ----------------------------------- | -------------- | ----------------------------------------------------------------- |
| **Core professional ingredients**   | ~3,000-5,000   | What 90% of chefs use 90% of the time                             |
| **Complete generic food database**  | ~7,800         | USDA SR Legacy (every generic food in US commerce)                |
| **With ethnic/specialty additions** | ~8,000-10,000  | SR Legacy + missing specialty items                               |
| **With preparation variants**       | ~12,000-15,000 | If you split "chicken breast raw" vs "chicken breast cooked" etc. |

**Recommended starting scope: ~8,000-10,000 canonical ingredients.** This covers everything a private chef, caterer, or restaurant chef would purchase. It is achievable, manageable, and complete enough to be credible.

### Recommended Taxonomy (Chef-Centric)

The USDA's 25 food groups are science-oriented, not chef-oriented. Here's a proposed chef-centric taxonomy that maps to how chefs actually shop and think:

**Level 1: Department (12 categories)**

| Department              | Maps to USDA Groups            | Est. Items |
| ----------------------- | ------------------------------ | ---------- |
| **Proteins**            | 0500, 1000, 1300, 1500, 1700   | ~2,000     |
| **Produce**             | 0900, 1100                     | ~1,500     |
| **Dairy & Eggs**        | 0100                           | ~400       |
| **Grains & Pasta**      | 2000, 1800 (partial)           | ~300       |
| **Pantry & Dry Goods**  | 1600, 1200, 1900 (partial)     | ~500       |
| **Oils & Fats**         | 0400                           | ~100       |
| **Spices & Seasonings** | 0200                           | ~300       |
| **Beverages**           | 1400                           | ~200       |
| **Condiments & Sauces** | 0600 (partial)                 | ~300       |
| **Baking**              | 1800 (partial), 1900 (partial) | ~200       |
| **Frozen**              | (cross-cutting)                | ~300       |
| **Specialty & Ethnic**  | (supplements to all above)     | ~500-1,000 |

**Level 2: Category** (e.g., Proteins > Poultry > Chicken)
**Level 3: Item** (e.g., Proteins > Poultry > Chicken > Chicken breast, boneless skinless)
**Level 4: Variant** (e.g., ...> Chicken breast, boneless skinless > organic)

### Recommended Database Schema

```
canonical_ingredients
  id                UUID PK
  name              TEXT NOT NULL        -- "Chicken breast, boneless skinless"
  slug              TEXT UNIQUE          -- "chicken-breast-boneless-skinless"
  department        TEXT NOT NULL        -- "Proteins"
  category          TEXT NOT NULL        -- "Poultry"
  subcategory       TEXT                 -- "Chicken"
  usda_fdc_id       INTEGER             -- FK to USDA FoodData Central
  usda_food_group   TEXT                 -- "0500" (Poultry Products)
  default_unit      TEXT NOT NULL        -- "lb", "oz", "each", "bunch"
  default_unit_type TEXT NOT NULL        -- "weight", "volume", "count"
  shelf_life_days   INTEGER             -- estimated shelf life
  storage_type      TEXT                 -- "refrigerated", "frozen", "dry", "room_temp"
  is_organic        BOOLEAN DEFAULT false
  aliases           TEXT[]              -- {"chicken breast", "boneless chicken", "BSCB"}
  tags              TEXT[]              -- {"poultry", "lean protein", "gluten-free"}
  seasonal          BOOLEAN DEFAULT false
  peak_months       INTEGER[]           -- {6,7,8} for summer items
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

ingredient_prices
  id                UUID PK
  ingredient_id     UUID FK -> canonical_ingredients
  source            TEXT NOT NULL        -- "openclaw_instacart", "openclaw_walmart", "bls", "usda_ers", "manual"
  price_cents       INTEGER NOT NULL     -- price in cents
  unit              TEXT NOT NULL        -- "lb", "oz", "each"
  quantity          NUMERIC              -- 1.0 (per 1 lb)
  store_name        TEXT                 -- "Stop & Shop" or NULL for national avg
  region            TEXT                 -- "Northeast" or specific zip
  observed_at       TIMESTAMPTZ NOT NULL -- when the price was captured
  confidence        TEXT                 -- "exact", "estimated", "benchmark"
  created_at        TIMESTAMPTZ

-- Index for "current best price" queries
CREATE INDEX idx_ingredient_prices_latest
  ON ingredient_prices(ingredient_id, observed_at DESC);
```

---

## Available Data Sources Summary

| Source                    | Items               | Has Prices           | Format       | Cost        | License       | Import Ready  |
| ------------------------- | ------------------- | -------------------- | ------------ | ----------- | ------------- | ------------- |
| **USDA SR Legacy**        | 7,793 generic foods | No                   | CSV/JSON     | Free        | Public domain | Yes           |
| **USDA Foundation Foods** | ~200+               | No                   | CSV/JSON     | Free        | Public domain | Yes           |
| **USDA Branded Foods**    | ~400,000+           | No                   | CSV/JSON     | Free        | Public domain | Yes           |
| **Open Food Facts (US)**  | ~830,000            | No                   | CSV/JSONL    | Free        | ODbL          | Yes           |
| **FoodOn Ontology**       | 9,600+ categories   | No                   | OWL/OBO      | Free        | CC            | Needs parsing |
| **FooDB**                 | 1,000 foods         | No                   | CSV          | Free        | Free          | Yes           |
| **BLS Average Prices**    | ~70 items           | **YES**              | JSON API/CSV | Free        | Public domain | Yes           |
| **USDA ERS F-MAP**        | 90 categories       | **YES** (aggregated) | XLSX         | Free        | Public domain | Yes (via CSV) |
| **USDA ERS Fruit/Veg**    | 155 items           | **YES**              | XLSX         | Free        | Public domain | Yes (via CSV) |
| **Spoonacular**           | ~2,600 ingredients  | **YES** (estimates)  | JSON API     | Freemium    | Commercial    | Via API       |
| **Kroger API**            | ~30K-80K per store  | **YES** (real-time)  | JSON API     | Free        | Commercial    | Via API       |
| **OpenClaw (our own)**    | Expanding           | **YES** (scraped)    | PostgreSQL   | Free (ours) | N/A           | Already there |

---

## Gaps and Unknowns

1. **Exact count of Foundation Foods as of December 2025.** The USDA does not publish a simple "X total items" statistic on their website. The inaugural release had 73 items; the December 2025 release added 25 more. The current total is likely 200-300 but would require downloading the dataset to count precisely.

2. **Exact count of branded foods in USDA GBFPD.** The 2021 figure was 368,000+. With monthly updates since then, the current count is likely 450,000-500,000+, but the exact number requires downloading the December 2025 release.

3. **Total unique UPC codes registered for food in the US.** GS1 US does not publish this number publicly. Estimates range from 500,000 to over 1,000,000 based on cross-referencing Open Food Facts, USDA Branded, and industry statistics.

4. **Completeness of SR Legacy for ethnic/specialty ingredients.** SR Legacy is US-centric and may underrepresent ingredients from Asian, African, Middle Eastern, Latin American, and Pacific Islander cuisines. A supplemental list of 500-2,000 specialty ingredients would likely be needed.

5. **Price data freshness.** The only free sources with actual prices (BLS, USDA ERS) cover a combined ~225 items at aggregated/national level. Real item-level pricing requires either Kroger API (single retailer) or scraping (OpenClaw). There is no free, comprehensive, current food pricing database.

6. **Mapping branded products to canonical ingredients.** This is the hardest unsolved problem. Open Food Facts has parsed ingredient lists that can help, but automated mapping of "Perdue Harvestland Organic Chicken Breast 24oz" to canonical ingredient "Chicken breast, boneless skinless, organic" requires NLP/fuzzy matching. No off-the-shelf free solution exists.

---

## Recommendations

### Quick Wins (can do now, no cost)

1. **Download USDA SR Legacy CSV** and import into PostgreSQL as the `canonical_ingredients` seed table. 7,793 items, public domain, well-structured, includes food group codes and nutrition data. This is the backbone.

2. **Download BLS Average Price data** for the ~70 tracked items and import as benchmark prices. These become the "national average fallback" tier in the pricing resolution chain.

3. **Download USDA ERS Fruit and Vegetable Prices** for 155 produce items with retail prices. This fills one of the biggest pricing gaps (produce is hard to price).

### Needs a Spec

4. **Build the canonical ingredient import pipeline.** Take SR Legacy CSV, clean it (remove restaurant foods, fast foods, baby foods that chefs don't buy), re-categorize into chef-centric departments, generate slugs and aliases, and populate the `canonical_ingredients` table. Estimated: 6,000-7,000 items after cleanup.

5. **Build the UPC-to-ingredient mapping layer.** When OpenClaw scrapes a branded product, it needs to match to a canonical ingredient. This requires fuzzy text matching and manual curation for edge cases. Start with exact-match on USDA FDC IDs where available, then expand to NLP matching.

6. **Supplement SR Legacy with specialty ingredients.** Create a curated supplemental list of ethnic/specialty ingredients not in SR Legacy. Sources: FoodOn ontology, Open Food Facts category browsing, chef community input.

### Needs Discussion

7. **How precise does pricing need to be?** If "chicken breast costs roughly $4.50/lb nationally" is good enough for recipe costing estimates, BLS + USDA ERS covers the top 225 items for free. If ChefFlow needs store-specific, real-time pricing for 8,000+ ingredients, that requires full OpenClaw scraping infrastructure. The answer determines how much infrastructure to build.

8. **Should ChefFlow maintain its own ingredient taxonomy or adopt USDA/FoodOn?** Custom taxonomy is more chef-friendly but requires ongoing curation. USDA taxonomy is free, standard, and auto-updated. Recommendation: use USDA food group codes as the canonical reference but add a chef-friendly display taxonomy layer on top.

---

## Appendix: The Three-Layer Architecture

For ChefFlow's ingredient pricing database, the data architecture should be:

```
Layer 1: Canonical Ingredients (~8,000-10,000)
  Source: USDA SR Legacy + supplements
  Purpose: The "dictionary" of every food ingredient

Layer 2: Price Observations (millions, growing)
  Source: OpenClaw scraping, Kroger API, BLS, USDA ERS, manual entry
  Purpose: Historical price data points for each ingredient

Layer 3: Current Price Resolution
  Source: Computed from Layer 2
  Purpose: "What does chicken breast cost right now?"
  Resolution chain: Store-specific scrape -> Regional average -> National benchmark -> Manual override
```

This architecture separates the "what exists" question (Layer 1, solved by this research) from the "what does it cost" question (Layer 2-3, solved by OpenClaw and price aggregation).

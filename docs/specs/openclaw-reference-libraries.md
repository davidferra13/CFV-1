# Spec: OpenCLAW Reference Libraries

> **Status:** verified (seed data below targets: 73/400+ shelf life, 89/200+ waste factors; infrastructure complete)
> **Priority:** P1 (next up)
> **Depends on:** `openclaw-data-completeness-engine.md` Phase A (USDA import populates system_ingredients)
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-30
> **Built by:** Claude Code session 2026-03-30

---

## What This Does (Plain English)

Builds four reference databases that OpenCLAW maintains 24/7, turning raw ingredient data into actionable intelligence for chefs:

1. **Shelf Life Database** - How long every ingredient lasts (fridge, freezer, pantry) so chefs planning multi-day events know what to buy fresh vs. prep ahead
2. **Seasonal Availability Calendar** - What's in season right now, by month, by region, computed from actual scrape history
3. **Waste Factor Database** - Prep yield percentages (a head of lettuce is 25% core = 75% usable) so food cost calculations reflect what the chef actually uses
4. **Store Accuracy Scoring** - Which stores' online prices match their real shelf prices, computed over time from receipt vs. scrape comparisons

---

## Why It Matters

These are the reference tools that turn a price database into a chef's complete intelligence platform. Pricing alone tells you "chicken breast is $4.29/lb." These libraries tell you "buy it today because it's in season, it'll last 3 days in the fridge, you'll lose 5% to trimming, and Whole Foods' online price matches their shelf price 97% of the time." No chef has ever had access to this level of data, and it's all computable from sources that already exist.

---

## Library 1: Shelf Life Database

### Data Source

**USDA FoodKeeper API** - Free, public JSON database maintained by the USDA. Contains storage times for 500+ food categories across refrigerator, freezer, and pantry storage.

- **Endpoint:** `https://foodkeeper-api.herokuapp.com/` (or download static JSON)
- **Alternative:** FoodKeeper dataset available as static JSON download from USDA
- **Coverage:** ~500 food categories, each with fridge/freezer/pantry durations in days
- **Update frequency:** Rarely changes. One-time import + quarterly refresh.

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS ingredient_shelf_life (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id uuid REFERENCES system_ingredients(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  category text,
  pantry_days_min integer,
  pantry_days_max integer,
  fridge_days_min integer,
  fridge_days_max integer,
  freezer_days_min integer,
  freezer_days_max integer,
  storage_tips text,                -- 'Store in airtight container', 'Keep away from ethylene producers'
  after_opening_days integer,       -- how long after opening
  source text DEFAULT 'usda_foodkeeper',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (system_ingredient_id)
);

CREATE INDEX idx_shelf_life_name ON ingredient_shelf_life USING gin (to_tsvector('english', ingredient_name));
CREATE INDEX idx_shelf_life_category ON ingredient_shelf_life (category);
```

### Import Script

| File                            | Purpose                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `scripts/import-foodkeeper.mjs` | Downloads FoodKeeper JSON, matches to system_ingredients, inserts shelf life data |

### Logic

1. Fetch FoodKeeper JSON (one-time download, cache locally)
2. For each food category in FoodKeeper:
   - Match to `system_ingredients` by name/alias (fuzzy match)
   - Extract pantry/fridge/freezer min/max durations
   - Extract storage tips
   - Insert into `ingredient_shelf_life`
3. For unmatched items, insert by name only (no system_ingredient link)
4. Idempotent: ON CONFLICT UPDATE

### ChefFlow Server Action

```typescript
async function getShelfLife(ingredientId: string): Promise<ShelfLifeInfo | null>
// Returns: { fridgeDays, freezerDays, pantryDays, storageTips, afterOpeningDays }
// Lookup chain: ingredient -> system_ingredient_id -> ingredient_shelf_life
// Fallback: search by ingredient name
```

---

## Library 2: Seasonal Availability Calendar

### Data Source

**Computed from existing scrape history.** No new scraping needed. The Pi has months of catalog data showing which products appear and disappear from store shelves. Additionally, USDA publishes seasonal availability charts that can be cross-referenced.

**Supplemental:** USDA Seasonal Produce Guide (static PDF, one-time OCR) + SNAP seasonal charts.

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS ingredient_seasonality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id uuid REFERENCES system_ingredients(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  region text DEFAULT 'northeast',   -- regional seasonality differs
  peak_months integer[] NOT NULL,    -- {6,7,8} = June-August
  available_months integer[] NOT NULL, -- {5,6,7,8,9} = May-September
  price_low_months integer[],        -- months when price is typically lowest
  price_high_months integer[],       -- months when price is typically highest
  is_year_round boolean DEFAULT false,
  notes text,                        -- 'Local in summer, imported in winter'
  source text DEFAULT 'computed',    -- 'computed', 'usda_guide', 'manual'
  confidence numeric(3,2),           -- how much data backed this determination
  updated_at timestamptz DEFAULT now(),
  UNIQUE (system_ingredient_id, region)
);

CREATE INDEX idx_seasonality_ingredient ON ingredient_seasonality (system_ingredient_id);
CREATE INDEX idx_seasonality_peak ON ingredient_seasonality USING gin (peak_months);
CREATE INDEX idx_seasonality_region ON ingredient_seasonality (region);
```

### Computation Script

| File                                | Purpose                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `lib/openclaw/seasonal-analyzer.ts` | Analyzes price_history + catalog presence by month to compute seasonality |

### Logic

1. For each produce/seafood ingredient with 6+ months of price history:
   - Group prices by month
   - Find months with lowest average price = peak season (cheapest = most abundant)
   - Find months with highest average price = off season
   - Find months where product appeared in catalog = available
   - Find months where product was absent = unavailable
2. Compute `peak_months`, `available_months`, `price_low_months`, `price_high_months`
3. Mark `is_year_round = true` if available in all 12 months with < 20% price variation
4. Confidence = number of months with data / 12

**Runs as part of the polish job.** Re-analyzes monthly after each full sync cycle.

### ChefFlow Server Action

```typescript
async function getSeasonalInfo(ingredientId: string, region?: string): Promise<SeasonalInfo | null>
// Returns: { peakMonths, availableMonths, isInSeason (boolean, based on current month), priceTrend }

async function getWhatsInSeason(month?: number, region?: string): Promise<SeasonalIngredient[]>
// Returns: all ingredients currently in peak season, sorted by price savings vs off-season
```

---

## Library 3: Waste Factor Database

### Data Source

**USDA Yield and Refuse Factors** - USDA publishes yield percentages for raw ingredients (how much is edible after trimming). Available in the SR Legacy dataset's food descriptions and the USDA Food Yields guide.

**Supplemental:** The Culinary Institute of America's published yield tables (standard industry reference).

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS ingredient_waste_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id uuid REFERENCES system_ingredients(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  as_purchased_to_edible_pct numeric(5,2) NOT NULL,  -- 85.0 = 85% edible, 15% waste
  waste_type text,                    -- 'peel', 'core', 'bones', 'fat trim', 'leaves'
  prep_method text,                   -- 'raw trimmed', 'peeled', 'boned', 'cleaned'
  cooked_yield_pct numeric(5,2),      -- yield after cooking (e.g., 75% for chicken = 25% moisture loss)
  notes text,
  source text DEFAULT 'usda_yields',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (system_ingredient_id, prep_method)
);

CREATE INDEX idx_waste_factors_ingredient ON ingredient_waste_factors (system_ingredient_id);
```

### Data Import

| File                               | Purpose                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `scripts/import-waste-factors.mjs` | Seeds waste factors from USDA yield tables + industry standards |

### Seeded Data (Core Items)

The script seeds ~200 common ingredients with industry-standard yield percentages:

**Produce:**

- Lettuce (iceberg): 74% edible (26% core/outer leaves)
- Onion: 90% edible (10% skin/root)
- Carrot: 82% edible (18% peel/ends)
- Potato: 81% edible (19% peel/eyes)
- Broccoli: 61% edible (39% stems/leaves)
- Celery: 75% edible (25% leaves/base)
- Bell pepper: 82% edible (18% seeds/stem)
- Avocado: 65% edible (35% skin/pit)
- Pineapple: 52% edible (48% skin/core)
- Watermelon: 52% edible (48% rind)

**Proteins:**

- Chicken breast (bone-in): 72% edible, 75% cooked yield
- Chicken breast (boneless): 100% edible, 75% cooked yield
- Whole chicken: 53% edible (47% bones/giblets)
- Beef tenderloin: 80% edible (20% silverskin/fat)
- Salmon fillet: 95% edible, 85% cooked yield
- Whole fish: 45% edible (55% head/bones/skin)
- Shrimp (shell-on): 55% edible (45% shell/vein)

**This data is static.** An apple always has ~9% waste (core/seeds). Import once, refresh quarterly.

### ChefFlow Server Action

```typescript
async function getWasteFactor(
  ingredientId: string,
  prepMethod?: string
): Promise<WasteFactor | null>
// Returns: { ediblePct, cookedYieldPct, wasteType, notes }

async function getAdjustedCost(ingredientId: string, priceCents: number): Promise<number>
// Returns: price adjusted for waste (e.g., $4.00/lb chicken bone-in at 72% yield = $5.56/lb usable)
```

**Integration with food costing:** When a recipe calls for 2 lbs of chicken breast (bone-in), the cost engine multiplies by `1 / (ediblePct / 100)` to get the actual purchase quantity needed. This is the "true cost" that chefs currently calculate in their heads.

---

## Library 4: Store Accuracy Scoring

### Data Source

**Computed from receipt vs. scrape comparison.** Over time, as chefs submit receipts and the system compares receipt prices to scraped prices for the same store, each store accumulates an accuracy score.

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS store_accuracy_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  chain_slug text,
  region text,
  accuracy_pct numeric(5,2),          -- 0-100: how often scraped price matched receipt price (within 5%)
  avg_deviation_pct numeric(5,2),     -- average % difference between scraped and receipt price
  comparison_count integer DEFAULT 0, -- how many receipt-vs-scrape comparisons
  last_compared_at timestamptz,
  trend text,                         -- 'improving', 'declining', 'stable'
  updated_at timestamptz DEFAULT now(),
  UNIQUE (store_name, region)
);

CREATE INDEX idx_store_accuracy_chain ON store_accuracy_scores (chain_slug);
CREATE INDEX idx_store_accuracy_region ON store_accuracy_scores (region);
```

### Computation Logic

| File                                    | Purpose                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `lib/openclaw/store-accuracy-scorer.ts` | Compares receipt prices to scraped prices, updates accuracy scores |

### Algorithm

```typescript
// For each store with both receipt data and scraped data:
// 1. Find all ingredients where we have BOTH a receipt price and a scraped price within 7 days
// 2. For each pair: compute abs(receipt - scraped) / receipt * 100
// 3. A match = deviation < 5%
// 4. accuracy_pct = matches / total_comparisons * 100
// 5. avg_deviation_pct = average of all deviations
// 6. trend = compare last 30-day accuracy to previous 30-day accuracy

function scoreStoreAccuracy(storeName: string): StoreAccuracy {
  const pairs = findReceiptScrapePairs(storeName, { withinDays: 7 })
  if (pairs.length < 10) return null // not enough data

  const deviations = pairs.map(
    (p) => (Math.abs(p.receiptCents - p.scrapedCents) / p.receiptCents) * 100
  )
  const matches = deviations.filter((d) => d < 5).length

  return {
    accuracyPct: (matches / pairs.length) * 100,
    avgDeviationPct: avg(deviations),
    comparisonCount: pairs.length,
  }
}
```

**Runs weekly as part of the polish job.** Only stores with 10+ comparisons get a score. New stores show "Not enough data" instead of a fake accuracy number.

### ChefFlow Server Action

```typescript
async function getStoreAccuracy(storeName: string): Promise<StoreAccuracy | null>
// Returns: { accuracyPct, avgDeviationPct, comparisonCount, trend }

async function getStoreAccuracyRanking(region?: string): Promise<StoreAccuracy[]>
// Returns: all stores ranked by accuracy, best first
```

---

## Migration

All four libraries share one migration file:

- **Filename:** `20260401000140_reference_libraries.sql`
- **Checked:** highest existing migration is `20260401000139` (data completeness engine)
- **All additive:** 4 new tables, 0 altered tables, 0 drops

---

## Server Actions Summary

| Action                                      | Auth            | Input                               | Output                               |
| ------------------------------------------- | --------------- | ----------------------------------- | ------------------------------------ |
| `getShelfLife(ingredientId)`                | `requireChef()` | ingredient ID                       | fridge/freezer/pantry days, tips     |
| `getSeasonalInfo(ingredientId, region?)`    | `requireChef()` | ingredient ID, optional region      | peak months, in-season boolean       |
| `getWhatsInSeason(month?, region?)`         | `requireChef()` | optional month + region             | list of in-season ingredients        |
| `getWasteFactor(ingredientId, prep?)`       | `requireChef()` | ingredient ID, optional prep method | edible %, cooked yield %, waste type |
| `getAdjustedCost(ingredientId, priceCents)` | `requireChef()` | ingredient ID + raw price           | waste-adjusted price                 |
| `getStoreAccuracy(storeName)`               | `requireChef()` | store name                          | accuracy %, deviation %, trend       |
| `getStoreAccuracyRanking(region?)`          | `requireChef()` | optional region                     | ranked store list                    |

---

## Edge Cases and Error Handling

| Scenario                                 | Correct Behavior                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| No shelf life data for an ingredient     | Return null, display "No storage data available" in UI. Never guess.          |
| Seasonal analysis has < 6 months of data | Mark confidence as low, show "Preliminary" badge                              |
| Store has < 10 receipt comparisons       | Don't compute accuracy score. Show "Not enough data"                          |
| Waste factor varies by prep method       | Store multiple rows. If chef doesn't specify prep, return the most common one |
| FoodKeeper API is down                   | Use cached local copy. The data barely changes.                               |
| Ingredient is year-round (salt, flour)   | Mark `is_year_round = true`. Don't show seasonal data for staples.            |

---

## Verification Steps

- Run FoodKeeper import. Verify `SELECT count(*) FROM ingredient_shelf_life` returns 400+
- Query shelf life for "chicken breast". Verify fridge = 1-2 days, freezer = 9-12 months
- Run seasonal analyzer after 6+ months of price data. Verify produce shows seasonal patterns
- Query "what's in season" for current month. Verify results match known seasonal produce
- Run waste factor import. Verify 200+ items seeded with industry-standard yields
- Query waste factor for "whole chicken". Verify 53% edible, 75% cooked yield
- Compute adjusted cost: $4/lb bone-in chicken at 72% yield should return ~$5.56/lb
- Submit 15+ receipts for Whole Foods. Run accuracy scorer. Verify a score appears.

---

## Out of Scope

- UI components for displaying this data (separate spec; these are backend libraries)
- Menu builder integration (consumes these libraries but is a separate feature)
- International seasonal data (US/New England focus first)
- Allergen cross-reference (already handled by existing allergen system)
- User-submitted waste factors (only system data for now)

---

## Notes for Builder Agent

1. **Shelf life and waste factors are mostly one-time imports.** The scripts run once, then refresh quarterly. Don't over-engineer the update mechanism.

2. **Seasonal analysis requires 6+ months of price history to be meaningful.** If the Pi has been running for less than that, the analyzer should compute what it can and mark low confidence. Don't block on insufficient data.

3. **Store accuracy scoring is passive.** It only works when chefs submit receipts. Don't prompt chefs to submit receipts for accuracy purposes. Just compute scores from whatever receipt data exists naturally.

4. **All four libraries follow the same pattern:** import reference data -> store in dedicated table -> expose via server action -> consumed by UI (separate spec). Keep them independent so any one can ship without the others.

5. **Waste-adjusted pricing is the killer feature.** When a chef sees "$4.29/lb chicken breast" and the system shows "True cost after trimming: $5.96/lb," that's the moment they realize this platform understands their world. Make sure the `getAdjustedCost` action is dead simple and correct.

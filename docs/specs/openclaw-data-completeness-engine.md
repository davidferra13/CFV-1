# Spec: OpenCLAW Data Completeness Engine

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none (all prerequisites already exist)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-30
> **Updated:** 2026-03-30 (v2 - added scaling data, enrichment analytics, 5 new intelligence jobs)
> **Built by:** Claude Code session (2026-03-30)
>
> **Companion specs (created alongside this one):**

- `openclaw-mission-control.md` - Real-time Pi dashboard
- `openclaw-email-agent.md` - Wholesale price list harvesting via email
- `openclaw-reference-libraries.md` - Shelf life, seasonal availability, waste factors, store accuracy

---

## What This Does (Plain English)

OpenCLAW currently scrapes grocery prices and dumps raw data. This spec turns that raw data into a complete, labeled, nutrition-enriched, scaling-aware, geographically expandable ingredient database. After this is built: every ingredient has an image, a category, normalized units, nutritional facts, portion/scaling data, substitute recommendations, package size comparisons, sale cycle predictions, trend forecasts, and a confidence score that decays over time. A coverage health report shows exactly what percentage of ingredients are covered and where the gaps are. The entire system stops being hardcoded to Haverhill, MA, so it can expand to any city, town, state, or county in America. And a flyer archive preserves historical pricing for long-term trend analysis.

---

## Why It Matters

ChefFlow's mission is to give every chef accurate food pricing at their fingertips so they can price out a menu in two seconds with the most accurate data possible, see everything in real time, and browse a complete catalog of every available ingredient with pricing. Right now the data exists but it's raw, unlabeled, geographically locked to one zip code, has no nutritional information, no scaling data, and no predictive intelligence. This spec closes every gap between "we have data" and "we have a perfect reference library that every chef in America can rely on."

---

## Workstreams (11 phases, ordered by dependency)

### Phase 0: Timezone Fix (Prerequisite for All Other Phases)

**What:** OpenCLAW has zero timezone awareness. All timestamps are naive (no timezone). There's an active duration calculation bug. This must be fixed before any intelligence job ships, because sale cycle detection (Phase H), trend forecasting (Phase J), and adaptive refresh (Phase F) all depend on knowing when things actually happened.

**The problem:**

- Pi systemd services don't set `TZ`. The Pi's system clock might be UTC while the developer is in Eastern time.
- All SQLite timestamps use `datetime('now')` which returns UTC in SQLite by default, but scripts treat them as local time.
- `catalog-db.mjs` line 218 appends 'Z' (UTC) to a timestamp that was stored as local time, creating a systematic error in duration calculations.
- Windows Task Scheduler scripts use Windows local time. If the Pi is in UTC and Windows is in Eastern, timestamps are off by 4-5 hours.

**The fix:**

1. Add `Environment=TZ=America/New_York` to every Pi systemd service file
2. Add `process.env.TZ = 'America/New_York'` at the top of every `.mjs` script on the Pi
3. Fix the 'Z' appending bug in `catalog-db.mjs:218`
4. Switch SQLite to `datetime('now', 'localtime')` or store all timestamps as explicit UTC with 'Z' suffix consistently
5. Document the timezone policy: "All OpenCLAW timestamps are US/Eastern (America/New_York)"

**Files to modify (Pi-side):**

- Every `.mjs` file in `~/openclaw-prices/` (add TZ at top)
- Every systemd `.service` file (add Environment=TZ)
- `catalog-db.mjs:218` (fix duration bug)

**This is a 1-hour fix.** Do it first. Everything else depends on correct timestamps.

---

### Phase A: Populate the Canonical Ingredient Database (USDA Import)

**What:** Run the existing import script to fill `system_ingredients` with 7,793 USDA foods plus supplemental specialty items. This gives OpenCLAW a canonical "every food product A-Z" reference to match against.

**Why this is Phase A:** Every other phase depends on having a populated canonical database. The polish job needs it for matching. Nutrition lookups need it for local data. Coverage health needs it to know what "100%" looks like.

**Steps:**

1. Run `node scripts/import-usda-sr-legacy.mjs` (already written, 646 lines, never executed)
2. Verify: `SELECT count(*) FROM system_ingredients` should return 6,000+
3. Verify: spot-check 10 random rows for correct category mapping, slug, aliases
4. Merge supplemental ingredients from `scripts/data/supplemental-ingredients.json`

**Files involved:**

- `scripts/import-usda-sr-legacy.mjs` (execute, no changes needed)
- `scripts/data/usda-sr-legacy/` (read-only CSV source)
- `scripts/data/supplemental-ingredients.json` (read-only supplement)
- `scripts/data/usda-category-mapping.json` (read-only mapping config)

**Database:** No new migrations. `system_ingredients` table and USDA columns already exist (migration `20260401000137`).

---

### Phase B: Data Polish Job

**What:** A new recurring job that reviews every ingredient/product OpenCLAW has collected and fills in missing labels: images, categories, unit normalization, nutritional facts, and source URLs. This is the "make the data pretty" job.

**Why:** Scrapers grab raw data fast. They don't stop to find images or normalize units. The polish job runs after scraping and fills every gap it can.

---

#### Files to Create

| File                                    | Purpose                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `lib/openclaw/polish-job.ts`            | Server action: orchestrates the full polish cycle                  |
| `lib/openclaw/nutrition-enricher.ts`    | Matches ingredients to USDA system_ingredients, persists nutrition |
| `app/api/cron/openclaw-polish/route.ts` | Cron endpoint to trigger polish job (daily, after sync)            |

#### Files to Modify

| File                               | What to Change                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `lib/openclaw/sync.ts`             | After sync completes, trigger polish job (non-blocking)                               |
| `lib/ingredients/image-actions.ts` | Fix race condition: move cache invalidation after batch completes; add URL validation |

#### What the Polish Job Does (in order)

1. **Image fill:** Query all ingredients where `image_url IS NULL`. For each, check:
   - Pi catalog (`/api/ingredients?search={name}`) for scraped product images
   - OpenFoodFacts API for product images
   - Mark `image_url = 'none'` if both fail (prevents re-checking)

2. **Category fill:** Query all ingredients where `category = 'other'` or `category = 'uncategorized'`. Match against `system_ingredients` by name/alias. If match found, copy category.

3. **Unit normalization:** Query all `ingredient_price_history` rows where `price_per_unit_cents IS NULL` but `price_cents` and `unit` are set. Compute normalized price per standard unit (oz for weight, fl_oz for volume, each for count).

4. **Nutrition linking:** For each chef ingredient without nutrition data, find the best match in `system_ingredients` (by name, slug, or alias). Store the `usda_fdc_id` link on the ingredient row so nutrition lookups hit local DB instead of API.

5. **Source URL construction:** For ingredients with source = `openclaw_instacart`, construct the Instacart product URL from the store slug + product name. Store in a new `source_url` column on `ingredient_price_history`.

**Rate limiting:** Process in batches of 50. 500ms delay between batches. Non-blocking (failures logged, never thrown).

---

### Phase C: Confidence Decay + Volatility Tracking

**What:** Prices lose trustworthiness over time. A receipt from 6 months ago should not show the same confidence as one from yesterday. Additionally, track how much each ingredient's price fluctuates so we know which ones need frequent re-scraping.

---

#### Files to Modify

| File                           | What to Change                                           |
| ------------------------------ | -------------------------------------------------------- |
| `lib/pricing/resolve-price.ts` | Add `decayedConfidence` calculation to resolution output |

#### Confidence Decay Formula

```typescript
// Step decay: confidence drops in tiers based on age
function decayConfidence(baseConfidence: number, ageDays: number): number {
  if (ageDays <= 3) return baseConfidence // Current: full confidence
  if (ageDays <= 14) return baseConfidence * 0.9 // Recent: 10% penalty
  if (ageDays <= 30) return baseConfidence * 0.75 // Aging: 25% penalty
  if (ageDays <= 60) return baseConfidence * 0.5 // Stale: 50% penalty
  if (ageDays <= 90) return baseConfidence * 0.3 // Old: 70% penalty
  return baseConfidence * 0.15 // Ancient: 85% penalty
}
```

This is a step function (not continuous) so it's predictable and debuggable. A 3-day-old receipt (base 1.0) stays at 1.0. A 45-day-old Instacart price (base 0.6) drops to 0.3. A 6-month-old government baseline (base 0.4) drops to 0.06.

**Where it applies:** `resolve-price.ts` computes `decayedConfidence` and returns it alongside the existing `confidence` field. Consumers can use either. The existing `confidence` field stays unchanged (backward compatible). New field: `effectiveConfidence`.

#### Volatility Tracking

New columns on `ingredients`:

```sql
price_volatility_score  numeric(5,2)  -- std deviation of price_cents over last 90 days, normalized 0-100
price_volatility_band   text          -- 'high' (>40), 'medium' (15-40), 'low' (<15)
volatility_updated_at   timestamptz
```

Computed by the polish job (Phase B) as a side task after each sync cycle:

```sql
SELECT ingredient_id,
  STDDEV(price_cents) / NULLIF(AVG(price_cents), 0) * 100 AS coefficient_of_variation
FROM ingredient_price_history
WHERE purchase_date > CURRENT_DATE - 90
GROUP BY ingredient_id
```

High CV (>40%) = produce, seafood, seasonal items. Low CV (<15%) = salt, sugar, flour, oil.

---

### Phase D: Coverage Health Report

**What:** A server action and dashboard widget that answers: "What percentage of ingredients have current prices? Which categories are bare? Which scrapers are running? What's the confidence distribution?"

---

#### Files to Create

| File                                            | Purpose                                             |
| ----------------------------------------------- | --------------------------------------------------- |
| `lib/openclaw/coverage-health.ts`               | Server action: computes full coverage health report |
| `components/pricing/coverage-health-widget.tsx` | Dashboard widget showing coverage stats             |

#### Files to Modify

| File                            | What to Change                          |
| ------------------------------- | --------------------------------------- |
| `app/(chef)/dashboard/page.tsx` | Add coverage health widget (admin only) |

#### Coverage Health Report Shape

```typescript
interface CoverageHealthReport {
  overall: {
    totalIngredients: number
    withCurrentPrice: number // price < 7 days old
    withAnyPrice: number // any price at all
    withImage: number
    withNutrition: number // linked to system_ingredients
    coveragePct: number // withCurrentPrice / totalIngredients
  }
  byCategory: Array<{
    category: string
    total: number
    covered: number // has price < 7 days
    pct: number
  }>
  scraperStatus: Array<{
    source: string // openclaw_instacart, openclaw_flyer, etc.
    lastSyncAt: string | null
    priceCount: number
    avgAgeDays: number
  }>
  confidenceDistribution: {
    high: number // effectiveConfidence > 0.7
    medium: number // 0.4 - 0.7
    low: number // 0.2 - 0.4
    stale: number // < 0.2
  }
  gaps: string[] // Top 20 ingredients with no price data at all
}
```

**Auth:** `requireChef()` + admin check for full report. Non-admin chefs see only their own ingredient coverage (tenant-scoped).

---

### Phase E: Geographic Parameterization

**What:** Remove all hardcoded Haverhill/Portland references and replace them with a configurable region system. Chefs can set their region. Scrapers accept region as parameter.

---

#### Files to Create

| File                            | Purpose                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `lib/openclaw/region-config.ts` | Region definitions, coordinate lookups, zip-to-region mapping |

#### Files to Modify

| File                                               | What to Change                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `app/(chef)/prices/prices-client.tsx`              | Replace hardcoded ZIP_COORDS with dynamic lookup from region-config                                          |
| `components/pricing/store-aisle-browser.tsx`       | Replace hardcoded `haverhill-ma` default with chef's region preference; populate region dropdown dynamically |
| `.openclaw-deploy/instacart-department-walker.mjs` | Accept `--zip` and `--lat/--lng` as required params, remove `01830` default                                  |
| `.openclaw-deploy/instacart-catalog-walker.mjs`    | Accept `--zip` as required param, remove `01835` default                                                     |
| `.openclaw-deploy/store-locator-runner.mjs`        | Accept `--regions` param for search points, remove hardcoded Haverhill/Portland                              |
| `.openclaw-deploy/catalog-orchestrator.mjs`        | Pass region config to child processes                                                                        |
| `scripts/openclaw-catalog-scraper.mjs`             | Accept `--zip` param, remove hardcoded geolocation                                                           |
| `scripts/openclaw-deep-scraper.mjs`                | Accept `--zip` param, remove hardcoded geolocation                                                           |
| `scripts/openclaw-scrape-remaining.mjs`            | Accept `--zip` param, remove hardcoded geolocation                                                           |

#### Region Config Shape

```typescript
interface Region {
  id: string // 'haverhill-ma', 'boston-ma', 'portland-me'
  label: string // 'Haverhill / Merrimack Valley, MA'
  lat: number
  lng: number
  zip: string // primary zip code
  state: string
  radiusMiles: number // store search radius
}

// Seeded with current regions, expandable:
const REGIONS: Region[] = [
  {
    id: 'haverhill-ma',
    label: 'Haverhill / Merrimack Valley, MA',
    lat: 42.7762,
    lng: -71.0773,
    zip: '01835',
    state: 'MA',
    radiusMiles: 25,
  },
  {
    id: 'portland-me',
    label: 'Portland, ME',
    lat: 43.6591,
    lng: -70.2568,
    zip: '04101',
    state: 'ME',
    radiusMiles: 25,
  },
  // Add new regions here. No code changes needed.
]
```

**Chef preference:** Stored in `chefs` table (new column: `preferred_region text DEFAULT 'haverhill-ma'`). Frontend reads this and passes to all store/price queries.

**Scraper parameterization:** All scraper scripts accept `--region <id>` or `--zip <code>` as CLI args. No defaults. If no region is passed, the script exits with an error message telling you to specify one. This forces explicit geography on every run.

**Geographic price interpolation (future, not this spec):** When a chef's region has no data for an ingredient, fall back to: adjacent regions -> state average -> national average. This requires multiple regions to be populated first, so it's out of scope for this spec but the region-config infrastructure enables it.

---

### Phase F: Adaptive Refresh Cadence

**What:** Instead of scraping everything on the same dumb schedule, use volatility data (from Phase C) to determine how often each ingredient needs re-scraping.

---

#### Files to Create

| File                               | Purpose                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| `lib/openclaw/refresh-schedule.ts` | Computes per-ingredient refresh cadence based on volatility band |

#### Logic

```typescript
function getRefreshCadence(volatilityBand: string): { intervalHours: number; label: string } {
  switch (volatilityBand) {
    case 'high':
      return { intervalHours: 24, label: 'daily' } // produce, seafood, seasonal
    case 'medium':
      return { intervalHours: 168, label: 'weekly' } // meat, dairy, bakery
    case 'low':
      return { intervalHours: 720, label: 'monthly' } // salt, sugar, flour, oil
    default:
      return { intervalHours: 168, label: 'weekly' } // unknown = weekly
  }
}
```

**How it works:** After Phase C computes volatility bands, the polish job generates a `refresh-priorities.json` file that the Pi cron can read. High-volatility ingredients get scraped daily. Low-volatility get scraped monthly. The Pi's cron schedule adapts.

**Pi-side implementation:** The Pi reads `refresh-priorities.json` and prioritizes high-volatility ingredients in its scrape queue. This is a Pi-side change, not a ChefFlow migration. The JSON file is pushed to the Pi via the existing sync API (`POST /api/config/refresh-priorities`).

---

### Phase G: Scaling + Portion Data (USDA Import Extension)

**What:** Import USDA `food_portion.csv` (14,449 portion records) and `retention_factor.csv` (270 cooking yield factors) so every ingredient knows how it scales across servings.

**Why:** When a chef scales a recipe from 4 servings to 40, the system needs to know: 1 cup of flour = 125g, raw chicken loses 25% weight when cooked, pasta doubles in weight when boiled, and spices don't scale linearly. This data already exists in the USDA download. OpenCLAW just needs to import it.

**This is an OpenCLAW job, not a website calculation,** because the portion/yield data is reference data that doesn't change. Compute once, store forever. The website reads it at query time.

---

#### Files to Create

| File                                | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `scripts/import-usda-portions.mjs`  | Imports food_portion.csv into system_ingredients portion columns |
| `scripts/import-usda-retention.mjs` | Imports retention_factor.csv into a new lookup table             |

#### Database Changes (Phase G)

```sql
-- Portion data on system_ingredients (extends existing columns)
-- cup_weight_grams and tbsp_weight_grams already exist on system_ingredients
-- Add additional portion measures:
CREATE TABLE IF NOT EXISTS ingredient_portions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_ingredient_id uuid NOT NULL REFERENCES system_ingredients(id) ON DELETE CASCADE,
  measure_description text NOT NULL,    -- '1 cup, chopped', '1 medium', '1 slice'
  gram_weight numeric(10,2) NOT NULL,   -- weight in grams for this measure
  sequence_number integer,              -- USDA ordering
  created_at timestamptz DEFAULT now(),
  UNIQUE (system_ingredient_id, measure_description)
);

CREATE INDEX idx_portions_ingredient ON ingredient_portions (system_ingredient_id);

-- Cooking retention factors
CREATE TABLE IF NOT EXISTS cooking_retention_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_group text NOT NULL,
  cooking_method text NOT NULL,         -- 'baked', 'boiled', 'fried', 'grilled', 'steamed'
  nutrient_name text NOT NULL,          -- 'Protein', 'Fat', 'Vitamin C', etc.
  retention_pct numeric(5,2) NOT NULL,  -- 0-100, how much is retained after cooking
  created_at timestamptz DEFAULT now(),
  UNIQUE (food_group, cooking_method, nutrient_name)
);

CREATE INDEX idx_retention_group ON cooking_retention_factors (food_group);
CREATE INDEX idx_retention_method ON cooking_retention_factors (cooking_method);

-- Scaling metadata on system_ingredients
ALTER TABLE system_ingredients ADD COLUMN IF NOT EXISTS scales_linearly boolean DEFAULT true;
ALTER TABLE system_ingredients ADD COLUMN IF NOT EXISTS scaling_notes text;
  -- e.g., 'Salt: use 1.5x when doubling, not 2x'
  -- e.g., 'Baking powder: scales linearly up to 4x, reduce by 20% beyond that'
ALTER TABLE system_ingredients ADD COLUMN IF NOT EXISTS cooking_yield_pct numeric(5,2);
  -- e.g., raw chicken breast: 75 (loses 25% weight)
  -- e.g., dry pasta: 200 (doubles in weight)
  -- e.g., dry rice: 300 (triples in weight)
ALTER TABLE system_ingredients ADD COLUMN IF NOT EXISTS serving_size_grams numeric(8,2);
  -- Standard single serving in grams (FDA reference amounts)
```

#### Import Logic

1. Read `food_portion.csv` (14,449 rows). For each row:
   - Match `fdc_id` to `system_ingredients.usda_fdc_id`
   - Insert into `ingredient_portions` with measure_description + gram_weight
   - If measure contains "cup", update `system_ingredients.cup_weight_grams`
   - If measure contains "tbsp", update `system_ingredients.tbsp_weight_grams`

2. Read `retention_factor.csv` (270 rows). Insert into `cooking_retention_factors`.

3. Compute `cooking_yield_pct` for common items from retention data:
   - Protein group + "baked" = average moisture retention as yield %
   - Pasta + "boiled" = 200% (known expansion)
   - Rice + "boiled" = 300% (known expansion)
   - Vegetables + "steamed" = 90% (slight moisture loss)

4. Flag non-linear scaling ingredients:
   - Salt, baking powder, baking soda, yeast: `scales_linearly = false`, add `scaling_notes`
   - All spices/seasonings: `scales_linearly = false` with note "Use 1.5x when doubling recipe"

**Idempotent:** All inserts use ON CONFLICT DO NOTHING or ON CONFLICT UPDATE.

---

### Phase H: Sale Cycle Detection

**What:** Analyze existing price history to detect repeating sale patterns per ingredient per store. Predict when items will next go on sale.

**Why:** Chefs plan events weeks in advance. Knowing "salmon goes on sale at Whole Foods every 3rd week" lets them time their purchasing. This is pure math on data the Pi already has. No new scraping needed.

---

#### Files to Create

| File                                  | Purpose                                                           |
| ------------------------------------- | ----------------------------------------------------------------- |
| `lib/openclaw/sale-cycle-detector.ts` | Analyzes price_history for repeating patterns, stores predictions |

#### Database Changes (Phase H)

```sql
CREATE TABLE IF NOT EXISTS ingredient_sale_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  avg_cycle_days integer,               -- average days between sales (e.g., 21 = every 3 weeks)
  last_sale_date date,
  predicted_next_sale date,
  confidence numeric(3,2),              -- how predictable is this cycle (0-1)
  avg_sale_discount_pct numeric(5,2),   -- average discount during sales (e.g., 25.00 = 25% off)
  data_points integer,                  -- how many sale events were detected
  updated_at timestamptz DEFAULT now(),
  UNIQUE (ingredient_id, tenant_id, store_name)
);

CREATE INDEX idx_sale_cycles_next ON ingredient_sale_cycles (predicted_next_sale)
  WHERE predicted_next_sale IS NOT NULL;
CREATE INDEX idx_sale_cycles_tenant ON ingredient_sale_cycles (tenant_id);
```

#### Detection Algorithm

```typescript
// For each ingredient+store combo with 3+ price records:
// 1. Find all price drops > 15% from the previous record (= sale events)
// 2. Calculate intervals between sale events
// 3. If stddev of intervals < 30% of mean, it's a predictable cycle
// 4. Predict next sale = last_sale_date + avg_cycle_days
// 5. Confidence = 1 - (stddev / mean), clamped to 0.3-0.95

function detectSaleCycle(priceHistory: PriceRecord[]): SaleCycle | null {
  const drops = findPriceDrops(priceHistory, 0.15) // 15% threshold
  if (drops.length < 3) return null // not enough data

  const intervals = drops
    .map((d, i) => (i > 0 ? daysBetween(drops[i - 1].date, d.date) : null))
    .filter(Boolean)
  const mean = avg(intervals)
  const sd = stddev(intervals)

  if (sd / mean > 0.3) return null // too irregular

  return {
    avgCycleDays: Math.round(mean),
    lastSaleDate: drops[drops.length - 1].date,
    predictedNextSale: addDays(drops[drops.length - 1].date, Math.round(mean)),
    confidence: Math.max(0.3, Math.min(0.95, 1 - sd / mean)),
    avgSaleDiscountPct: avg(drops.map((d) => d.discountPct)),
    dataPoints: drops.length,
  }
}
```

**Runs as part of the polish job (Phase B).** After price sync, re-analyze all ingredients with new data.

---

### Phase I: Substitute Mapping + Package Size Optimization

**What:** For every ingredient, find the 3 closest substitutes by category and price. For every product with multiple package sizes, compute which size is the best deal per unit.

**Why:** When ribeye is $18/lb, the chef instantly sees "NY strip at $14/lb, flank at $9/lb." When buying flour, the chef sees "5lb bag at $0.12/oz beats the 2lb bag at $0.18/oz."

---

#### Files to Create

| File                                | Purpose                                      |
| ----------------------------------- | -------------------------------------------- |
| `lib/openclaw/substitute-mapper.ts` | Computes top 3 substitutes per ingredient    |
| `lib/openclaw/package-optimizer.ts` | Computes best-value package size per product |

#### Database Changes (Phase I)

```sql
CREATE TABLE IF NOT EXISTS ingredient_substitutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  substitute_ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 5),
  reason text,                          -- 'same category, 22% cheaper', 'similar cut, different grade'
  price_difference_pct numeric(5,2),    -- negative = cheaper, positive = more expensive
  updated_at timestamptz DEFAULT now(),
  UNIQUE (ingredient_id, tenant_id, substitute_ingredient_id)
);

CREATE INDEX idx_substitutes_lookup ON ingredient_substitutes (ingredient_id, tenant_id, rank);

-- Package size optimization stored on openclaw.store_products
-- (already has price_cents + product links to openclaw.products which has size_value + size_unit)
-- Add computed column:
ALTER TABLE openclaw.store_products ADD COLUMN IF NOT EXISTS price_per_standard_unit_cents integer;
ALTER TABLE openclaw.store_products ADD COLUMN IF NOT EXISTS is_best_value boolean DEFAULT false;

CREATE INDEX idx_store_products_best_value ON openclaw.store_products (product_id)
  WHERE is_best_value = true;
```

#### Substitute Mapping Logic

```typescript
// For each ingredient:
// 1. Find all other ingredients in the same category
// 2. Filter to those with a current price
// 3. Sort by price ascending
// 4. Take top 3 that are cheaper (or closest in price if none cheaper)
// 5. Compute price_difference_pct
// 6. Generate reason string from category + price delta
```

#### Package Optimization Logic

```typescript
// For each product in openclaw.products:
// 1. Find all store_products for this product (different stores, different sizes)
// 2. Group by base product name (strip size from name)
// 3. For each group, compute price_per_standard_unit_cents
// 4. Mark the cheapest per-unit option as is_best_value = true
```

**Both run as part of the polish job (Phase B).** Substitutes refresh daily. Package optimization refreshes after each store catalog sync.

---

### Phase J: Ingredient Trend Forecasting

**What:** Simple linear regression on price history to predict next month's price for every ingredient. Not AI, just math.

**Why:** Chef sees "Eggs trending up 12% this month. Consider locking in a vendor price now." Actionable intelligence from existing data.

---

#### Files to Create

| File                               | Purpose                                             |
| ---------------------------------- | --------------------------------------------------- |
| `lib/openclaw/trend-forecaster.ts` | Linear regression on price_history, stores forecast |

#### Database Changes (Phase J)

```sql
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_forecast_30d_cents integer;
  -- predicted price 30 days from now
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_forecast_direction text;
  -- 'rising', 'falling', 'stable'
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_forecast_pct numeric(5,2);
  -- projected % change over next 30 days
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS forecast_updated_at timestamptz;
```

#### Forecast Logic

```typescript
// Simple linear regression: y = mx + b where x = days, y = price_cents
// Using last 90 days of price data (minimum 5 data points)
function forecastPrice(history: { date: Date; priceCents: number }[]): Forecast | null {
  if (history.length < 5) return null

  const n = history.length
  const xValues = history.map((h) => daysSinceEpoch(h.date))
  const yValues = history.map((h) => h.priceCents)

  // Least squares regression
  const sumX = sum(xValues)
  const sumY = sum(yValues)
  const sumXY = sum(xValues.map((x, i) => x * yValues[i]))
  const sumX2 = sum(xValues.map((x) => x * x))

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const currentPrice = yValues[yValues.length - 1]
  const forecastPrice = Math.round(slope * (xValues[xValues.length - 1] + 30) + intercept)
  const changePct = ((forecastPrice - currentPrice) / currentPrice) * 100

  return {
    forecastCents: Math.max(0, forecastPrice),
    direction: changePct > 2 ? 'rising' : changePct < -2 ? 'falling' : 'stable',
    changePct: Math.round(changePct * 100) / 100,
  }
}
```

**Runs as part of the polish job (Phase B).** Refreshes daily after price sync.

---

### Phase K: Flyer Archive + Historical Trend Library

**What:** Archive every scraped flyer as a timestamped snapshot. After a year, this becomes the most accurate historical price database for New England groceries (and eventually nationally).

**Why:** Historical data powers sale cycle detection (Phase H), trend forecasting (Phase J), and seasonal analysis. Currently flyers are scraped and overwritten. Archiving them costs negligible storage (text data, not images) and unlocks long-term intelligence.

---

#### Files to Create

| File                             | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `lib/openclaw/flyer-archiver.ts` | Archives current flyer prices before overwrite |

#### Database Changes (Phase K)

```sql
CREATE TABLE IF NOT EXISTS openclaw.flyer_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_slug text NOT NULL,
  store_name text,
  flyer_date date NOT NULL,             -- the week/date this flyer was published
  product_name text NOT NULL,
  regular_price_cents integer,
  sale_price_cents integer,
  discount_pct numeric(5,2),
  category text,
  captured_at timestamptz DEFAULT now(),
  UNIQUE (chain_slug, flyer_date, product_name)
);

CREATE INDEX idx_flyer_archive_chain_date ON openclaw.flyer_archive (chain_slug, flyer_date DESC);
CREATE INDEX idx_flyer_archive_product ON openclaw.flyer_archive (product_name, flyer_date DESC);
```

#### Logic

Before each Flipp/flyer scrape overwrites `current_prices`, snapshot the existing flyer prices into `flyer_archive`. This happens automatically in the sync pipeline. One INSERT ... SELECT, runs in under a second.

**Storage estimate:** ~1,000 products/week _ 52 weeks _ ~200 bytes/row = ~10MB/year. Negligible.

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Phase C: Volatility tracking on ingredients
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_volatility_score numeric(5,2);
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_volatility_band text;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS volatility_updated_at timestamptz;

-- Phase B: Source URL tracking on price history
ALTER TABLE ingredient_price_history ADD COLUMN IF NOT EXISTS source_url text;

-- Phase B: USDA linking on chef ingredients
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS system_ingredient_id uuid REFERENCES system_ingredients(id) ON DELETE SET NULL;

-- Phase E: Chef region preference
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS preferred_region text DEFAULT 'haverhill-ma';

-- Phase G: Scaling metadata on system_ingredients
ALTER TABLE system_ingredients ADD COLUMN IF NOT EXISTS scales_linearly boolean DEFAULT true;
ALTER TABLE system_ingredients ADD COLUMN IF NOT EXISTS scaling_notes text;
ALTER TABLE system_ingredients ADD COLUMN IF NOT EXISTS cooking_yield_pct numeric(5,2);
ALTER TABLE system_ingredients ADD COLUMN IF NOT EXISTS serving_size_grams numeric(8,2);

-- Phase I: Package optimization on openclaw.store_products
ALTER TABLE openclaw.store_products ADD COLUMN IF NOT EXISTS price_per_standard_unit_cents integer;
ALTER TABLE openclaw.store_products ADD COLUMN IF NOT EXISTS is_best_value boolean DEFAULT false;

-- Phase J: Trend forecasting on ingredients
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_forecast_30d_cents integer;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_forecast_direction text;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_forecast_pct numeric(5,2);
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS forecast_updated_at timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_volatility ON ingredients (price_volatility_band) WHERE price_volatility_band IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingredients_system_link ON ingredients (system_ingredient_id) WHERE system_ingredient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingredients_forecast ON ingredients (price_forecast_direction) WHERE price_forecast_direction IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_products_best_value ON openclaw.store_products (product_id) WHERE is_best_value = true;
```

### New Tables (Full SQL in Phase Sections Above)

- `ingredient_portions` (Phase G) - USDA portion measures per system ingredient
- `cooking_retention_factors` (Phase G) - Cooking yield/retention by food group + method
- `ingredient_sale_cycles` (Phase H) - Predicted sale cycles per ingredient per store
- `ingredient_substitutes` (Phase I) - Top substitute recommendations per ingredient
- `openclaw.flyer_archive` (Phase K) - Historical flyer price snapshots

### Migration Notes

- Migration filename: `20260401000139_data_completeness_engine.sql`
- Checked: highest existing migration is `20260401000138_loyalty_trigger_config.sql`
- All changes are additive (ALTER TABLE ADD COLUMN, CREATE TABLE). No drops, no renames.
- 4 new tables, 12 new columns on existing tables, 6 new indexes.

---

## Data Model

**Key relationships added by this spec:**

```
ingredients.system_ingredient_id  -->  system_ingredients.id
  (links chef's personal ingredient to the canonical USDA entry)
  (enables: local nutrition lookup, category inheritance, image inheritance)

ingredients.price_volatility_band  -->  refresh-priorities.json
  (drives: adaptive scrape scheduling on Pi)

ingredients.preferred_region  -->  region-config.ts REGIONS[]
  (drives: which stores show in price browser, which zip scrapers use)
```

---

## Server Actions

| Action                                  | Auth            | Input                                        | Output                                                                                                                                         | Side Effects                                              |
| --------------------------------------- | --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `runPolishJob()`                        | Admin only      | `{ dryRun?: boolean }`                       | `{ success, imagesAdded, categorized, unitsNormalized, nutritionLinked, substitutesComputed, forecastsGenerated, saleCyclesDetected, errors }` | Updates ingredients + related tables, invalidates caches  |
| `getCoverageHealth()`                   | `requireChef()` | none                                         | `CoverageHealthReport`                                                                                                                         | Read-only                                                 |
| `getRefreshSchedule()`                  | Admin only      | none                                         | `{ ingredients: { id, name, band, nextRefreshAt }[] }`                                                                                         | Read-only                                                 |
| `setChefRegion(regionId)`               | `requireChef()` | `{ regionId: string }`                       | `{ success, error? }`                                                                                                                          | Updates chefs.preferred_region, revalidates store browser |
| `getSubstitutes(ingredientId)`          | `requireChef()` | `{ ingredientId: string }`                   | `{ substitutes: { name, priceCents, diffPct, reason }[] }`                                                                                     | Read-only                                                 |
| `getSalePredictions(ingredientId?)`     | `requireChef()` | `{ ingredientId?: string }`                  | `{ predictions: { ingredient, store, nextSaleDate, confidence, avgDiscount }[] }`                                                              | Read-only                                                 |
| `getPackageSizeComparison(productName)` | `requireChef()` | `{ productName: string }`                    | `{ sizes: { store, size, priceCents, perUnitCents, isBestValue }[] }`                                                                          | Read-only                                                 |
| `getIngredientScaling(ingredientId)`    | `requireChef()` | `{ ingredientId: string, servings: number }` | `{ portions: { measure, grams }[], yieldPct, scalingNotes, scalesLinearly }`                                                                   | Read-only                                                 |

---

## UI / Component Spec

### Coverage Health Widget (Dashboard, admin only)

**Layout:** Card with 4 stat boxes across the top (total ingredients, coverage %, images %, nutrition %), a category bar chart below, and a "Top Gaps" list at the bottom.

**States:**

- **Loading:** Skeleton card with pulsing stat boxes
- **Empty:** "No ingredient data yet. Run OpenCLAW sync first."
- **Error:** "Could not load coverage data" (never show fake zeros)
- **Populated:** Real stats with color-coded coverage percentages (green >80%, yellow 50-80%, red <50%)

### Region Selector (Store Aisle Browser)

**Layout:** Replace hardcoded dropdown with dynamic region list from `region-config.ts`. Show chef's preferred region as default. Add "Set as default" button.

---

## Edge Cases and Error Handling

| Scenario                                      | Correct Behavior                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| USDA import fails midway                      | Script is idempotent (ON CONFLICT). Re-run safely.                                                      |
| Polish job finds no matches for an ingredient | Skip it, log as unmatched. Never assign wrong data.                                                     |
| Confidence decays to near-zero                | Still show the price with a "stale" badge. Never hide data.                                             |
| Chef sets region with no scraped data         | Show empty state: "No price data for this region yet." Not zeros.                                       |
| Pi is offline during polish job               | Polish job skips Pi-dependent steps (images from catalog), continues with OpenFoodFacts + USDA matching |
| Two chefs in different regions                | Each sees their own region's stores/prices. OpenCLAW data is global; filtering is per-chef.             |
| Volatility calculation has < 3 data points    | Default to 'medium' band. Don't compute CV from 1-2 prices.                                             |

---

## Verification Steps

**Phase A (USDA Import):**

- Run USDA import. Verify `SELECT count(*) FROM system_ingredients` returns 6,000+
- Spot-check: `SELECT name, category, usda_fdc_id FROM system_ingredients WHERE name ILIKE '%chicken breast%'` returns correct data

**Phase B (Polish Job):**

- Run polish job in dry-run mode. Verify it reports correct counts without writing
- Run polish job for real. Verify images, categories, and nutrition links fill in on previously-empty ingredients
- Navigate to `/culinary/ingredients`. Verify: images now show where they were missing

**Phase C (Confidence Decay + Volatility):**

- Check a 90-day-old price in resolve-price output. Verify `effectiveConfidence` < `confidence`
- Check a 1-day-old price. Verify `effectiveConfidence` equals `confidence`
- Check volatility bands after polish job. Verify produce/seafood = 'high', salt/flour = 'low'

**Phase D (Coverage Health):**

- Navigate to dashboard as admin. Verify coverage health widget loads with real data, no fake zeros

**Phase E (Geographic):**

- Change region in store browser. Verify store list updates to new region
- Run `--region boston-ma` on department walker (after adding Boston). Verify it scrapes Boston, not Haverhill
- Grep entire codebase for `01835`, `01830`, `42.7762`. Verify zero hardcoded instances remain in production code

**Phase F (Adaptive Refresh):**

- Verify `refresh-priorities.json` is generated after polish job with correct volatility bands

**Phase G (Scaling):**

- Verify `SELECT count(*) FROM ingredient_portions` returns 10,000+ after USDA portion import
- Query `getIngredientScaling` for "chicken breast" with 4 servings. Verify it returns gram weight, yield %, and portion measures
- Query for "salt". Verify `scales_linearly = false` and `scaling_notes` contains guidance

**Phase H (Sale Cycles):**

- Run sale cycle detection. Verify ingredients with 3+ historical price drops get predictions
- Query `getSalePredictions`. Verify it returns plausible next-sale dates with confidence scores

**Phase I (Substitutes + Package Optimization):**

- Query `getSubstitutes` for an expensive ingredient. Verify 3 cheaper alternatives returned with price difference %
- Query `getPackageSizeComparison` for a common product. Verify sizes sorted by per-unit cost with best-value flagged

**Phase J (Trend Forecasting):**

- Verify ingredients with 5+ price data points have `price_forecast_direction` populated
- Check a rising-trend ingredient. Verify forecast shows positive % change

**Phase K (Flyer Archive):**

- Verify `SELECT count(*) FROM openclaw.flyer_archive` grows after each flyer sync
- Query archive for a specific product. Verify historical sale prices are preserved with dates

---

## Out of Scope

- Market Basket online catalog (no digital catalog exists; receipt scanning is a separate spec)
- Cloud scraper workers for national scale (Pi handles current scope; cloud expansion is a separate infrastructure decision)
- Geographic price interpolation logic (this spec builds the region infrastructure; interpolation is a follow-up)
- Micronutrient display beyond the 7 macros (calories, protein, fat, carbs, fiber, sugar, sodium)
- Menu builder nutrition integration (consumes the data this spec creates, but is a separate spec)
- Recipe nutrition caching layer (existing on-demand API calls work; caching is optimization)
- OpenCLAW Mission Control dashboard (separate spec: `openclaw-mission-control.md`)
- OpenCLAW email agent for wholesale harvesting (separate spec: `openclaw-email-agent.md`)
- Shelf life, seasonal availability, waste factors, store accuracy scoring (separate spec: `openclaw-reference-libraries.md`)
- Competitor menu price scanning (needs ethics/scraping policy discussion first)

---

## Notes for Builder Agent

1. **Phase A is a script execution, not code writing.** Just run the import and verify. If it fails, debug the script, don't rewrite it.

2. **The polish job must be idempotent.** Running it twice should not duplicate images, double-link nutrition, or re-normalize already-normalized units.

3. **Confidence decay is additive.** The existing `confidence` field stays untouched. New field `effectiveConfidence` is computed at read time in `resolve-price.ts`. No migration needed for this; it's a runtime calculation.

4. **Geographic parameterization is the riskiest phase.** 23 files have hardcodes. Use grep to find every instance of `01835`, `01830`, `04101`, `42.7762`, `-71.0773`, `haverhill`, and `portland` before declaring done. Missing even one means a scraper silently falls back to the old location.

5. **The polish job should NOT call any cloud AI.** It uses deterministic matching (name/slug/alias against system_ingredients), OpenFoodFacts API (free, no PII), and Pi catalog lookups. Formula > AI.

6. **Volatility bands persist on the ingredient row**, not computed on every request. The polish job refreshes them. This means they can be up to 24 hours stale, which is fine for scheduling decisions.

7. **Region config starts with 2 regions** (Haverhill, Portland). Adding a new region is a one-line addition to the REGIONS array. No code changes, no migrations, no deploys. The developer can add regions by editing one file.

8. **Read `CLAUDE.md` rules on non-blocking side effects.** The polish job is non-blocking to the sync. If it fails, sync still succeeds. Wrap everything in try/catch, log failures as warnings.

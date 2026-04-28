# Pi Data Synthesis Pipeline - "The Content Machine"

> Pi runs 24/7. Every idle cycle is waste. This spec turns raw scraped data into actionable chef intelligence.

## Current State

**Pi has:** 1.1M prices, 142K canonical ingredients, 182K price changes, 127K anomalies, 6.9K farmers markets, 92 FDA recalls, 50K store locations, 124 seasonal availability records, 10K normalization memories, 165 USDA nutrition entries, 309 ingredient images.

**Pi pushes to ChefFlow:** Basic price sync (nightly 11pm). That's it.

**ChefFlow can receive:** ingredient_price_history, system_ingredient_prices, ingredients.last_price_* fields. Plus openclaw schema tables (stores, products, store_products, canonical_ingredients).

**Gap:** 90% of Pi's intelligence never reaches ChefFlow. Anomalies, seasonality, recalls, store comparisons, price velocity, geographic insights - all computed, none surfaced.

---

## Pipeline Architecture

Every synthesizer is a standalone script on the Pi. Cron-scheduled. Writes to Pi's SQLite. ChefFlow pulls via existing sync infrastructure or new API endpoints.

```
RAW SCRAPERS (existing)
    |
    v
SYNTHESIZERS (NEW - this spec)
    |
    v
Pi SQLite tables (synthesis_*)
    |
    v
ChefFlow pull sync (existing infra, extended)
    |
    v
ChefFlow UI surfaces
```

**Principle:** All synthesis is deterministic (formula > AI). No LLM calls. Pure math, SQL aggregations, and rule-based classification.

---

## Synthesizer Inventory

### Tier 1: High Value, Low Effort (Week 1)

#### S1. Price Anomaly Classifier
**Input:** price_anomalies (127K rows, 22K/week)
**Output:** `synthesis_anomaly_alerts` table
**Logic:**
- Classify each anomaly: `deal` (sale/clearance), `market_event` (supply shock), `data_error` (scraper glitch), `seasonal` (expected pattern)
- Rules: sale flag on source = deal; >3 stores same ingredient same direction = market event; single store >80% change = data error; matches seasonal_availability pattern = seasonal
- Score severity 1-5 based on magnitude and ingredient importance (food categories > non-food)
- Filter non-food categories (40% contamination: Kitchen Supplies, Personal Care, etc.)
**Schedule:** Every 2 hours
**ChefFlow use:** "Salmon spiked 40% this week" alerts on event planning pages

#### S2. Seasonal Intelligence Engine
**Input:** current_prices (1.1M) + seasonal_availability (124) + price_trends (134K)
**Output:** `synthesis_seasonal_scores` table
**Logic:**
- For each food-category ingredient with 30+ days of price history:
  - Compute monthly average price (12 months, backfill from available data)
  - Score each month: availability (0-1) x inverse_price_percentile (0-1) = value_score
  - Flag current month as: `peak_season` (>0.8), `good_value` (>0.6), `off_season` (<0.3), `avoid` (<0.15)
- Cross-reference with farmers_markets seasonal data for produce
**Schedule:** Daily at 2am (after scrapers finish)
**ChefFlow use:** "In season now" badges, "Best value window" on ingredient pages, menu planning suggestions

#### S3. Store Comparison Matrix
**Input:** current_prices + store_locations + catalog_stores
**Output:** `synthesis_store_rankings` table
**Logic:**
- For each ingredient with prices at 3+ stores:
  - Rank stores by price (cheapest to most expensive)
  - Compute savings vs average: "Market Basket is 23% cheaper than average for dairy"
  - Group by category: which store wins each department?
  - Factor in geographic proximity when store_locations available
**Schedule:** Daily at 3am
**ChefFlow use:** "Where to buy" recommendations per ingredient, shopping list optimization ("split your list: produce at X, protein at Y, save $47")

#### S4. Price Velocity Tracker
**Input:** price_changes (182K, 36K/week)
**Output:** `synthesis_price_velocity` table
**Logic:**
- For each ingredient, compute:
  - 7-day change count and direction
  - 30-day volatility (std dev of daily prices)
  - Trend acceleration (is the trend speeding up or slowing?)
  - Stability score: 0 (wildly volatile) to 100 (rock stable)
- Classify: `stable` (score >80), `trending` (clear direction), `volatile` (score <40), `spiking` (sudden move)
**Schedule:** Every 4 hours
**ChefFlow use:** "Lock in prices now" warnings for volatile ingredients, event cost confidence intervals

### Tier 2: Medium Value, Medium Effort (Week 2)

#### S5. Recall Safety Scanner
**Input:** fda_recalls (92) + canonical_ingredients (142K) + current event menus (via ChefFlow API)
**Output:** `synthesis_recall_alerts` table
**Logic:**
- Match FDA recall ingredient names against canonical_ingredients (fuzzy match, brand match)
- Flag severity: Class I (health hazard) = critical, Class II = warning, Class III = info
- Cross-reference with active ChefFlow events (pull event ingredient lists via API)
- Generate per-event alerts: "Your April 30 dinner uses [recalled ingredient] from [brand]"
**Schedule:** Every 6 hours (FDA updates daily)
**ChefFlow use:** Red banner on event pages, notification to chef

#### S6. Yield Factor Populator
**Input:** usda_nutrition (165) + USDA yield factor files (already have import scripts)
**Output:** Updates to `canonical_ingredients` yield columns
**Logic:**
- Run existing import-usda-retention.mjs and import-waste-factors.mjs scripts
- For ingredients without USDA data, derive from category averages:
  - Produce: avg 85% yield, 15% trim
  - Protein: avg 75% yield, 10% trim, 15% cook shrinkage
  - Dairy: avg 98% yield
  - Grains/dry goods: avg 95% yield
- Flag derived vs measured confidence
**Schedule:** Weekly (data doesn't change often)
**ChefFlow use:** Accurate "you need X raw to get Y cooked" on recipe scaling, shopping list quantities

#### S7. Category Cost Benchmarks
**Input:** current_prices + product_categories
**Output:** `synthesis_category_benchmarks` table
**Logic:**
- For each food category (Produce, Protein, Dairy, Pantry, etc.):
  - Compute: median price/lb, 25th/75th percentile, trend direction
  - Compare current vs 30-day-ago: "Produce is 8% more expensive this month"
  - Regional breakdown if store_locations covers the area
- Generate "cost of a typical dinner" index: weighted basket of common categories
**Schedule:** Daily at 4am
**ChefFlow use:** Dashboard "market conditions" widget, event cost estimation confidence

#### S8. Non-Food Filter
**Input:** canonical_ingredients (142K, ~40% non-food)
**Output:** `is_food` flag on canonical_ingredients
**Logic:**
- Category-based: Kitchen Supplies, Personal Care, Household, Health Care, Baby, Pet = not food
- Name-based regex: "paper towel", "detergent", "shampoo", etc.
- Preserve ambiguous items (e.g., "coconut oil" could be cooking or beauty)
- This is a one-time sweep + incremental on new items
**Schedule:** Daily (incremental, only new items)
**ChefFlow use:** Every food-specific query gets cleaner results. Multiplier effect on all other synthesizers.

### Tier 3: High Value, High Effort (Week 3-4)

#### S9. Shopping List Optimizer
**Input:** synthesis_store_rankings + store_locations + chef home location
**Output:** `synthesis_shopping_routes` (per-request, via API)
**Logic:**
- Given a shopping list (ingredient + quantity):
  - Find cheapest source for each item within radius
  - Cluster by store to minimize stops
  - Compute total cost per strategy: single-store vs multi-store vs online
  - Factor in: drive time (Haversine), minimum order for delivery, sale items
- This is an API endpoint, not a cron job
**Schedule:** On-demand (API call from ChefFlow)
**ChefFlow use:** "Optimize my shopping list" button on event prep pages

#### S10. Ingredient Substitution Suggester
**Input:** canonical_ingredients + current_prices + seasonal_scores + category relationships
**Output:** `synthesis_substitutions` table
**Logic:**
- For each ingredient, find same-category alternatives:
  - Same protein type (chicken thigh vs chicken breast)
  - Same vegetable family (kale vs collard greens)
  - Same function (butter vs ghee vs oil for fat)
- Score substitutions by: price delta, seasonal alignment, common usage
- This is deterministic category matching, NOT AI recipe suggestion
**Schedule:** Weekly
**ChefFlow use:** "Consider [X] instead, 30% cheaper and in season" on recipe ingredient lists

#### S11. Farmers Market Intelligence
**Input:** farmers_markets (6.9K) + store_locations + seasonal_availability
**Output:** `synthesis_local_markets` table
**Logic:**
- For each farmers market:
  - Parse operating season and hours
  - Match listed products to canonical_ingredients
  - Compute distance from chef locations (ChefFlow API)
  - Flag markets open this week with relevant seasonal produce
**Schedule:** Weekly (market schedules don't change often)
**ChefFlow use:** "3 farmers markets near you this Saturday with peak-season tomatoes"

---

## New Pi SQLite Tables

```sql
-- S1
CREATE TABLE synthesis_anomaly_alerts (
    id INTEGER PRIMARY KEY,
    ingredient_id INTEGER REFERENCES canonical_ingredients(id),
    ingredient_name TEXT NOT NULL,
    category TEXT NOT NULL, -- deal, market_event, data_error, seasonal
    severity INTEGER NOT NULL, -- 1-5
    direction TEXT NOT NULL, -- spike, drop
    magnitude_pct REAL NOT NULL,
    affected_stores TEXT, -- JSON array
    message TEXT NOT NULL, -- human-readable: "Salmon +40% at Market Basket"
    is_food INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT, -- alerts auto-expire
    synced_to_chefflow INTEGER DEFAULT 0
);

-- S2
CREATE TABLE synthesis_seasonal_scores (
    id INTEGER PRIMARY KEY,
    ingredient_id INTEGER REFERENCES canonical_ingredients(id),
    ingredient_name TEXT NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    availability_score REAL, -- 0.0-1.0
    price_percentile REAL, -- 0.0-1.0 (lower = cheaper)
    value_score REAL, -- availability * inverse_price_percentile
    status TEXT, -- peak_season, good_value, off_season, avoid
    region TEXT DEFAULT 'northeast', -- for future regional breakdown
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_seasonal_ingredient_month ON synthesis_seasonal_scores(ingredient_id, month, region);

-- S3
CREATE TABLE synthesis_store_rankings (
    id INTEGER PRIMARY KEY,
    ingredient_id INTEGER REFERENCES canonical_ingredients(id),
    ingredient_name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    chain_slug TEXT,
    avg_price_cents INTEGER NOT NULL,
    vs_market_pct REAL, -- -23% = 23% cheaper than average
    rank INTEGER NOT NULL, -- 1 = cheapest
    sample_size INTEGER NOT NULL,
    category TEXT, -- food category
    updated_at TEXT DEFAULT (datetime('now'))
);

-- S4
CREATE TABLE synthesis_price_velocity (
    id INTEGER PRIMARY KEY,
    ingredient_id INTEGER REFERENCES canonical_ingredients(id),
    ingredient_name TEXT NOT NULL,
    change_count_7d INTEGER DEFAULT 0,
    change_count_30d INTEGER DEFAULT 0,
    volatility_30d REAL, -- std dev
    trend_direction TEXT, -- up, down, flat
    trend_acceleration REAL, -- positive = speeding up
    stability_score INTEGER, -- 0-100
    status TEXT, -- stable, trending, volatile, spiking
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_velocity_ingredient ON synthesis_price_velocity(ingredient_id);

-- S5
CREATE TABLE synthesis_recall_alerts (
    id INTEGER PRIMARY KEY,
    recall_id INTEGER REFERENCES fda_recalls(id),
    ingredient_id INTEGER,
    ingredient_name TEXT NOT NULL,
    brand TEXT,
    severity TEXT NOT NULL, -- critical, warning, info
    recall_class TEXT, -- I, II, III
    reason TEXT NOT NULL,
    affected_products TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    synced_to_chefflow INTEGER DEFAULT 0
);

-- S7
CREATE TABLE synthesis_category_benchmarks (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    median_price_cents INTEGER,
    p25_price_cents INTEGER,
    p75_price_cents INTEGER,
    trend_direction TEXT,
    trend_pct REAL,
    vs_30d_pct REAL, -- change from 30 days ago
    sample_size INTEGER,
    dinner_index_cents INTEGER, -- weighted basket cost
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_benchmark_category ON synthesis_category_benchmarks(category);

-- S10
CREATE TABLE synthesis_substitutions (
    id INTEGER PRIMARY KEY,
    ingredient_id INTEGER REFERENCES canonical_ingredients(id),
    ingredient_name TEXT NOT NULL,
    substitute_id INTEGER REFERENCES canonical_ingredients(id),
    substitute_name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_delta_pct REAL, -- positive = substitute is more expensive
    seasonal_match INTEGER, -- 1 = both in season
    confidence REAL, -- 0-1
    reason TEXT, -- "same protein, 30% cheaper"
    updated_at TEXT DEFAULT (datetime('now'))
);

-- S11
CREATE TABLE synthesis_local_markets (
    id INTEGER PRIMARY KEY,
    market_id INTEGER REFERENCES farmers_markets(id),
    market_name TEXT NOT NULL,
    lat REAL,
    lng REAL,
    open_season TEXT, -- "May-October"
    open_days TEXT, -- "Saturday 8am-1pm"
    products TEXT, -- JSON array of matched canonical_ingredient_ids
    product_count INTEGER,
    is_open_this_week INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## New ChefFlow Tables (openclaw schema)

These receive synthesized data during the nightly pull sync.

```sql
-- Anomaly alerts for chef-facing surfaces
CREATE TABLE openclaw.anomaly_alerts (
    id SERIAL PRIMARY KEY,
    pi_alert_id INTEGER,
    ingredient_name TEXT NOT NULL,
    category TEXT NOT NULL,
    severity INTEGER NOT NULL,
    direction TEXT NOT NULL,
    magnitude_pct NUMERIC NOT NULL,
    affected_stores JSONB,
    message TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seasonal intelligence
CREATE TABLE openclaw.seasonal_scores (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    month INTEGER NOT NULL,
    availability_score NUMERIC,
    price_percentile NUMERIC,
    value_score NUMERIC,
    status TEXT,
    region TEXT DEFAULT 'northeast',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ingredient_name, month, region)
);

-- Store rankings per ingredient
CREATE TABLE openclaw.store_rankings (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    chain_slug TEXT,
    avg_price_cents INTEGER NOT NULL,
    vs_market_pct NUMERIC,
    rank INTEGER NOT NULL,
    sample_size INTEGER,
    category TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price velocity / volatility
CREATE TABLE openclaw.price_velocity (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL UNIQUE,
    stability_score INTEGER,
    status TEXT,
    trend_direction TEXT,
    volatility_30d NUMERIC,
    change_count_7d INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Food recall alerts
CREATE TABLE openclaw.recall_alerts (
    id SERIAL PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    brand TEXT,
    severity TEXT NOT NULL,
    recall_class TEXT,
    reason TEXT NOT NULL,
    affected_products JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category benchmarks
CREATE TABLE openclaw.category_benchmarks (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    median_price_cents INTEGER,
    p25_price_cents INTEGER,
    p75_price_cents INTEGER,
    trend_direction TEXT,
    trend_pct NUMERIC,
    vs_30d_pct NUMERIC,
    dinner_index_cents INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Cron Schedule (Pi)

All times EST. Staggered to avoid I/O contention.

```
# === TIER 1: SYNTHESIZERS ===
# S8: Non-food filter (must run first, others depend on it)
0 1 * * *    cd ~/openclaw && node synthesizers/s8-nonfood-filter.mjs >> logs/s8.log 2>&1

# S1: Anomaly classifier (every 2 hours)
0 */2 * * *  cd ~/openclaw && node synthesizers/s1-anomaly-classifier.mjs >> logs/s1.log 2>&1

# S2: Seasonal intelligence (daily after scrapers)
30 2 * * *   cd ~/openclaw && node synthesizers/s2-seasonal-engine.mjs >> logs/s2.log 2>&1

# S3: Store comparison matrix (daily)
0 3 * * *    cd ~/openclaw && node synthesizers/s3-store-comparison.mjs >> logs/s3.log 2>&1

# S4: Price velocity (every 4 hours)
0 */4 * * *  cd ~/openclaw && node synthesizers/s4-price-velocity.mjs >> logs/s4.log 2>&1

# === TIER 2: SYNTHESIZERS ===
# S5: Recall scanner (every 6 hours)
30 */6 * * *  cd ~/openclaw && node synthesizers/s5-recall-scanner.mjs >> logs/s5.log 2>&1

# S6: Yield factor populator (weekly Sunday)
0 4 * * 0    cd ~/openclaw && node synthesizers/s6-yield-populator.mjs >> logs/s6.log 2>&1

# S7: Category benchmarks (daily)
30 4 * * *   cd ~/openclaw && node synthesizers/s7-category-benchmarks.mjs >> logs/s7.log 2>&1

# === TIER 3: SYNTHESIZERS ===
# S10: Substitution suggester (weekly Wednesday)
0 5 * * 3    cd ~/openclaw && node synthesizers/s10-substitutions.mjs >> logs/s10.log 2>&1

# S11: Farmers market intelligence (weekly Monday)
0 5 * * 1    cd ~/openclaw && node synthesizers/s11-farmers-markets.mjs >> logs/s11.log 2>&1

# === EXTENDED SYNC (after all synthesizers) ===
# Pull synthesized data to ChefFlow (nightly, after existing 11pm sync)
30 23 * * *  cd ~/openclaw && node synthesizers/sync-synthesis-to-chefflow.mjs >> logs/sync-synthesis.log 2>&1
```

---

## WAL Checkpoint (CRITICAL - Do First)

Pi's prices.db has an **11GB WAL file with 1.9M uncheckpointed pages.** Crash = data loss. Before adding any synthesizers:

```bash
# Run manually first, then add to weekly cron
sqlite3 /home/davidferra/openclaw-prices/data/prices.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

Add weekly cron:
```
# WAL checkpoint (weekly Sunday 12:30am, before synthesizers)
30 0 * * 0  sqlite3 /home/davidferra/openclaw-prices/data/prices.db "PRAGMA wal_checkpoint(TRUNCATE);" >> ~/openclaw/logs/wal-checkpoint.log 2>&1
```

---

## Build Order

1. **WAL checkpoint** (today, 5 min, prevents data loss)
2. **S8: Non-food filter** (day 1, all other synthesizers depend on clean food data)
3. **S1: Anomaly classifier** (day 1-2, highest chef value, data already exists)
4. **S4: Price velocity** (day 2, complements anomaly alerts)
5. **S2: Seasonal engine** (day 3, high value for menu planning)
6. **S3: Store comparison** (day 3-4, shopping optimization)
7. **S7: Category benchmarks** (day 4, dashboard widget fuel)
8. **S5: Recall scanner** (day 5, safety feature, lower frequency)
9. **S6: Yield populator** (day 5, one-time + incremental)
10. **ChefFlow migration + sync extension** (day 6-7, new tables + pull logic)
11. **S10: Substitutions** (week 2)
12. **S11: Farmers markets** (week 2)
13. **S9: Shopping optimizer API** (week 3-4, needs all above)

---

## Expected Impact

| Metric | Before | After |
|---|---|---|
| Pi CPU utilization | ~50% | ~65-70% |
| Data flowing to ChefFlow | 1 stream (prices) | 8+ streams |
| Chef-facing intelligence | Price per ingredient | Price + trend + volatility + season + deals + recalls + store comparison + substitutions |
| Synthesis tables on Pi | 0 | 8 |
| New ChefFlow tables | 0 | 6 |
| Cron jobs added | 0 | 12 |

**Pi goes from "scraper" to "intelligence engine."** ChefFlow goes from "here's the price" to "here's what you should buy, where, when, and why."

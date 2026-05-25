# Spec: PIE Coverage Gap Closure (Exit-Point Elimination)

> **Status:** draft
> **Priority:** P0 (blocking)
> **Depends on:** `auto-costing-engine.md` (verified), `universal-price-intelligence.md` (verified), `menu-cost-estimator.md` (verified), `recipe-costing-integrity.md` (built), `chef-pricing-override-infrastructure.md` (built)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-05-25
> **Exit-points addressed:** 1, 2, 3, 4, 5, 6, 7 from `docs/research/chef-exit-points-analysis.md`

---

## What This Does (Plain English)

Chefs leave ChefFlow multiple times per day to check prices on Amazon, Whole Foods, Instacart, and store websites because PIE data is incomplete, stale, or missing for their region and items. This is the #1 most frequent exit from the app, happening daily, multiple times per menu.

This spec closes seven specific exit points by:

1. Defining what "coverage gap" means and measuring it against the Census (PIE Law 8)
2. Defining freshness thresholds per ingredient category so chefs trust the numbers they see
3. Adding manual price pinning for specialty items PIE will never autonomously cover
4. Building a multi-store price comparison view so chefs stop opening five store apps simultaneously
5. Adding a seasonal availability calendar layer so chefs stop Googling "can I get ramps in May"
6. Creating a vendor/wholesale price import flow for Restaurant Depot, US Foods, and Sysco prices
7. Building a menu cost modeler with margin targets, "what if" swaps, and food cost % guardrails

The goal is not to replace every store app. It is to make ChefFlow accurate and complete enough that the chef's default behavior is to check ChefFlow first, and only leave for edge cases.

---

## Why It Matters

The exit-points analysis found that menu costing on external store apps is the #1 exit, happening daily, multiple times per menu. Chefs open Amazon, Whole Foods, Instacart, and store websites because:

- PIE data is incomplete for their region (Exit 1)
- They need today's price, not a synthetic estimate (Exit 2)
- They want to compare prices across stores, which requires opening multiple apps (Exit 3)
- PIE will never autonomously cover specialty items like imported saffron or high-end vanilla (Exit 4)
- They need to know if an ingredient is even available this season (Exit 5)
- Wholesale/restaurant depot pricing is login-gated and not in PIE (Exit 6)
- They model margin scenarios in spreadsheets because ChefFlow has no "what if" tool (Exit 7)

Each of these exits costs the chef 2-15 minutes. A chef costing a 7-course dinner may leave ChefFlow 10-20 times. This spec targets reducing those exits by 80%+ for ingredients PIE already covers, and providing manual tools for the long tail PIE will never cover autonomously.

---

## Current State (What Already Exists)

### Built and working:

1. **10-tier price resolution chain** (`lib/pricing/resolve-price.ts`): receipt > api_quote > direct_scrape > flyer > instacart > regional_average > government > historical > category_baseline > none
2. **Cross-store averaging** (`lib/pricing/cross-store-average.ts`): regional average tier using `regional_price_averages` materialized view
3. **Category baselines** (`lib/pricing/category-baseline.ts`): fallback when all store-specific tiers fail
4. **563 system ingredients** seeded with density, yield, allergen data
5. **Ingredient matching** via pg_trgm with confirm/dismiss workflow
6. **Cost refresh engine** with cascade propagation, advisory locking, batch processing
7. **Menu cost estimator** at `/menus/estimate` for paste-and-price
8. **Costing confidence badges** on recipes and menus (green/yellow/red)
9. **Chef pricing overrides** for per-person and custom-total pricing decisions
10. **Q-factor application** for incidental ingredient costs
11. **Price surfacing UI** with confidence badges, source attribution, freshness indicators
12. **Unit conversion engine** with ~100 densities, count-to-weight equivalents

### What is missing (this spec fills):

| #   | Gap                                                                 | Exit Points | Impact                                                        |
| --- | ------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| 1   | No coverage gap measurement against the Census                      | 1           | Chef has no way to know what PIE is missing for their recipes |
| 2   | Freshness thresholds not enforced in the UI or surfaced to the chef | 1, 2        | Stale prices masquerade as current                            |
| 3   | No manual price pinning for specialty items                         | 4           | Chef must leave to check items PIE will never cover           |
| 4   | No multi-store price comparison view                                | 3           | Chef opens 5 store apps simultaneously                        |
| 5   | No seasonal availability data                                       | 5           | Chef Googles "can I get ramps in May in Massachusetts"        |
| 6   | No wholesale/vendor price import                                    | 6           | Restaurant Depot, US Foods, Sysco prices are invisible        |
| 7   | No menu cost modeler with margin targets and "what if" swaps        | 7           | Chef uses Google Sheets for margin modeling                   |
| 8   | No real-time price lookup for high-frequency items                  | 2           | Chef checks store apps for today's price                      |

---

## Freshness Model (What "Stale" Means)

PIE Law 4 defines freshness tiers. This spec operationalizes them into concrete thresholds that drive UI behavior.

### Freshness Thresholds by Category

| Category                                             | Fresh     | Aging      | Stale      | Expired  |
| ---------------------------------------------------- | --------- | ---------- | ---------- | -------- |
| **Volatile** (produce, dairy, meat, seafood, eggs)   | 0-3 days  | 4-7 days   | 8-14 days  | 15+ days |
| **Moderate** (bakery, deli, frozen, prepared)        | 0-7 days  | 8-14 days  | 15-30 days | 31+ days |
| **Stable** (dry goods, spices, canned, oils, grains) | 0-14 days | 15-30 days | 31-60 days | 61+ days |
| **Specialty** (imported, artisanal, seasonal)        | 0-7 days  | 8-14 days  | 15-30 days | 31+ days |

### UI Behavior by Freshness State

| State       | Badge                      | Behavior                                                                                                            |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Fresh**   | Green dot, no label        | Price shown normally                                                                                                |
| **Aging**   | No badge, subtle timestamp | Price shown with "Updated X days ago" on hover                                                                      |
| **Stale**   | Yellow warning badge       | Price shown with "(stale, X days old)" label; chef prompted to verify                                               |
| **Expired** | Red badge with exclamation | Price shown struck-through with "Expired price, verify before using"; triggers re-estimation from synthetic sources |

### Freshness Assignment

Category is determined from `ingredients.category` or `system_ingredients.category`. If null, default to "Moderate" thresholds. The `computeFreshness()` function in `lib/pricing/resolve-price.ts` already exists; this spec replaces its binary fresh/stale output with the four-state model above.

---

## Feature 1: Coverage Gap Dashboard

### What it does

Shows the chef exactly what percentage of their active ingredients have reliable prices, broken down by confidence tier, freshness state, and source. Measures coverage against the chef's actual recipe book, not the full Census.

### Where it lives

New section on `/culinary/costing` page, above the existing recipe cost table.

### Data model

No new tables. Computed from existing data:

```
Coverage = ingredients with non-null cost_per_unit_cents AND freshness != 'expired'
           / total active ingredients (in at least one non-archived recipe)
```

Breakdown dimensions:

- By source tier (receipt, scrape, regional average, synthetic, etc.)
- By freshness state (fresh, aging, stale, expired)
- By category (produce, protein, pantry, etc.)
- By confidence band (high 0.7-1.0, medium 0.4-0.69, low 0.0-0.39)

### UI

**Coverage summary card** (top of costing page):

- Large number: "87% coverage" with color coding (green >= 90%, yellow 70-89%, red < 70%)
- Subtitle: "142 of 163 active ingredients priced"
- Expandable breakdown: bar chart showing source distribution (45 receipt, 62 scrape, 20 regional avg, 15 synthetic)
- "21 ingredients need attention" link scrolling to the gap list

**Gap list** (below summary):

- Table of ingredients without reliable prices, sorted by usage frequency (how many recipes use this ingredient)
- Columns: ingredient name, category, recipes using it, last known price (if any), age, suggested action
- Suggested actions: "Pin a price", "Log a receipt", "Match to catalog"
- Bulk action: "Pin prices for selected" (opens manual price pinning modal)

### Server actions

| Action                      | Auth            | Input | Output                                                                                | Side Effects     |
| --------------------------- | --------------- | ----- | ------------------------------------------------------------------------------------- | ---------------- |
| `getCoverageGapDashboard()` | `requireChef()` | None  | `{ total, covered, coveragePct, bySource, byFreshness, byCategory, gaps: GapItem[] }` | None (read-only) |

---

## Feature 2: Manual Price Pinning (Exit 4: Specialty Items)

### What it does

Lets a chef manually set a price for any ingredient with a source label, expiration date, and optional vendor name. This is for items PIE will never autonomously cover: imported saffron, high-end vanilla, specialty truffle oil, ethnic market spices, artisanal cheeses, etc.

### How it differs from receipt logging

Receipt logging (`logIngredientPrice()`) records an actual purchase. Price pinning records a known price from any source (store website, vendor catalog, phone call, memory) without requiring a receipt. Pinned prices sit at Tier 0.5: above receipts in priority when explicitly pinned, but below receipts when a newer receipt arrives.

### Data model

New columns on `ingredients`:

```sql
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_cents INTEGER
    CHECK (pinned_price_cents IS NULL OR pinned_price_cents > 0),
  ADD COLUMN IF NOT EXISTS pinned_price_unit TEXT,
  ADD COLUMN IF NOT EXISTS pinned_price_source TEXT,        -- e.g., "Whole Foods website", "Restaurant Depot", "Kalustyan's phone quote"
  ADD COLUMN IF NOT EXISTS pinned_price_vendor TEXT,         -- vendor name for display
  ADD COLUMN IF NOT EXISTS pinned_price_expires_at TIMESTAMPTZ,  -- when this pin should be re-verified
  ADD COLUMN IF NOT EXISTS pinned_price_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_price_set_by UUID REFERENCES auth.users(id);
```

### Resolution chain integration

Insert pinned price as Tier 0.5 in the resolution chain:

```
Tier  Source             Freshness    Confidence  Description
----  ------             ---------    ----------  -----------
0.5   PINNED_PRICE (NEW) configurable 0.95        Chef manually set this price
1     RECEIPT            90 days      1.0         Chef's own purchase receipts
2     API_QUOTE          30 days      0.75        Kroger/Spoonacular/MealMe APIs
...   (rest unchanged)
```

Pinned prices have confidence 0.95 (below receipt's 1.0). When a newer receipt arrives, the receipt wins. The chef can always re-pin to override.

Pinned prices expire based on `pinned_price_expires_at`. Default expiration: 30 days. When expired, the pin drops out of the resolution chain and the next tier takes over. The chef sees a notification: "Your pinned price for saffron expired 3 days ago. Verify or re-pin."

### UI

**Pin price modal** (accessible from ingredient detail, gap list, and price comparison view):

- Ingredient name (read-only)
- Price input (dollars and cents)
- Unit selector (per lb, per oz, each, per bunch, etc.)
- Source field (free text, e.g., "Whole Foods website 5/25/2026")
- Vendor field (free text, optional)
- Expiration selector: 7 days, 14 days, 30 days, 60 days, 90 days, custom date
- "Pin Price" button

**Pinned price indicator in recipe/menu views:**

- Pushpin icon next to price
- Tooltip: "Pinned by you on 5/25, source: Whole Foods website. Expires 6/24."
- Click pushpin to edit or remove the pin

### Server actions

| Action                               | Auth            | Input                                                                | Output                    | Side Effects                                                                                                        |
| ------------------------------------ | --------------- | -------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pinIngredientPrice(input)`          | `requireChef()` | `{ ingredientId, priceCents, unit, source, vendor?, expiresInDays }` | `{ success: boolean }`    | Updates ingredient pinned_price columns, triggers `propagatePriceChange([ingredientId])`, revalidates costing pages |
| `unpinIngredientPrice(ingredientId)` | `requireChef()` | `{ ingredientId: string }`                                           | `{ success: boolean }`    | Nulls pinned_price columns, triggers cost refresh to fall back to next tier                                         |
| `getExpiringPins()`                  | `requireChef()` | None                                                                 | `{ pins: PinnedPrice[] }` | None (read-only); returns pins expiring within 7 days                                                               |

---

## Feature 3: Multi-Store Price Comparison (Exit 3)

### What it does

Shows all known prices for a single ingredient across every store PIE has data for, in one view. The chef sees "chicken breast: Market Basket $3.49/lb, Hannaford $3.99/lb, Whole Foods $5.49/lb, Aldi $2.89/lb" without opening four apps.

### Where it lives

- New panel on ingredient detail page (expandable "Price Comparison" section)
- Accessible from recipe ingredient rows (click price to see comparison)
- Standalone page at `/culinary/costing/compare` for ad-hoc multi-ingredient comparison

### Data model

No new tables. Reads from `ingredient_price_history` with store grouping:

```sql
SELECT
  store_name,
  price_per_unit_cents,
  unit,
  source,
  purchase_date,
  ROW_NUMBER() OVER (PARTITION BY store_name ORDER BY purchase_date DESC) as rn
FROM ingredient_price_history
WHERE ingredient_id = $1
  AND price_per_unit_cents > 0
  AND purchase_date > CURRENT_DATE - INTERVAL '60 days'
ORDER BY price_per_unit_cents ASC
```

### UI

**Ingredient price comparison panel:**

- Table: Store | Price | Unit | Age | Source
- Sorted by price ascending (cheapest first)
- Highlight cheapest in green, most expensive in subtle red
- Show regional average as a reference line
- "Pin this price" button next to each row (uses Feature 2)
- If only 1 store has data: show it with message "Only 1 store found. Log a receipt or pin a price from another store."

**Multi-ingredient comparison page (`/culinary/costing/compare`):**

- Left sidebar: ingredient selector (search/add from chef's ingredients)
- Main area: comparison grid, one column per store, one row per ingredient
- Cell shows price + unit + freshness badge
- Column header shows store name + total ingredient count available
- Empty cells show "N/A" in muted gray (never $0.00)
- Summary row at bottom: total cost per store for selected ingredients
- "Use cheapest for each" button that pins all cheapest prices in one action

### Server actions

| Action                                        | Auth            | Input                         | Output                                                        | Side Effects                                  |
| --------------------------------------------- | --------------- | ----------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| `getIngredientPriceComparison(ingredientId)`  | `requireChef()` | `{ ingredientId: string }`    | `{ stores: StorePrice[], regionalAvg: number, unit: string }` | None (read-only)                              |
| `getMultiIngredientComparison(ingredientIds)` | `requireChef()` | `{ ingredientIds: string[] }` | `{ ingredients: IngredientComparison[], stores: string[] }`   | None (read-only)                              |
| `pinCheapestPrices(ingredientIds)`            | `requireChef()` | `{ ingredientIds: string[] }` | `{ pinned: number, skipped: number }`                         | Pins cheapest known price for each ingredient |

---

## Feature 4: Seasonal Availability Calendar (Exit 5)

### What it does

Shows which ingredients are in season, coming into season, or out of season for the chef's region. Answers "can I get ramps in May in Massachusetts" without leaving ChefFlow.

### Data source

Static data seeded into `system_ingredients`. Seasonal availability is deterministic for most produce (ramps are available April-May in the Northeast every year). This is not AI; it is a reference table.

### Data model

New columns on `system_ingredients`:

```sql
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS season_start_month SMALLINT CHECK (season_start_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS season_end_month SMALLINT CHECK (season_end_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS season_peak_months SMALLINT[] DEFAULT '{}',  -- months of peak availability
  ADD COLUMN IF NOT EXISTS season_region TEXT DEFAULT 'northeast',      -- geographic region for this season data
  ADD COLUMN IF NOT EXISTS is_year_round BOOLEAN DEFAULT true,          -- true for pantry staples, proteins, etc.
  ADD COLUMN IF NOT EXISTS season_notes TEXT;                           -- e.g., "Late spring only, foraged"
```

### Seed data

Seed seasonal data for the top 100 seasonal produce items in the Northeast US. Examples:

```sql
UPDATE system_ingredients SET
  season_start_month = 4, season_end_month = 5,
  season_peak_months = '{4,5}', season_region = 'northeast',
  is_year_round = false, season_notes = 'Wild foraged, 2-3 week window in April-May'
WHERE lower(name) = 'ramps';

UPDATE system_ingredients SET
  season_start_month = 7, season_end_month = 10,
  season_peak_months = '{8,9}', season_region = 'northeast',
  is_year_round = false, season_notes = 'Peak flavor August-September'
WHERE lower(name) IN ('tomato', 'heirloom tomato', 'cherry tomato', 'roma tomato');

UPDATE system_ingredients SET
  is_year_round = true, season_notes = 'Year-round via import, best local June-October'
WHERE lower(name) IN ('strawberry', 'blueberry');
-- Mark local peak months separately
UPDATE system_ingredients SET
  season_start_month = 6, season_end_month = 10,
  season_peak_months = '{7,8}'
WHERE lower(name) IN ('strawberry', 'blueberry');
```

Non-seasonal items (chicken, flour, olive oil, etc.) keep `is_year_round = true` and null season months.

### UI

**Seasonal badge on ingredient rows** (recipe detail, menu editor, costing page):

- Green leaf icon: "In season" (current month is within season_start to season_end)
- Yellow leaf icon: "Coming soon" (current month is 1 month before season_start)
- Gray leaf icon: "Out of season" (current month is outside range)
- No icon for year-round items
- Tooltip: season notes + "In season April-May in Northeast"

**Seasonal availability page** (`/culinary/costing/seasonal`):

- Calendar view: 12-month strip showing which of the chef's active ingredients are in/out of season each month
- Filter by category (produce, herbs, seafood)
- Current month highlighted
- Click a month to see: "In season this month: asparagus, rhubarb, peas, fiddleheads..." and "Out of season: tomatoes, corn, peaches..."
- Useful for menu planning: "What can I build a menu around in March?"

### Server actions

| Action                                   | Auth            | Input                                      | Output                                                                            | Side Effects     |
| ---------------------------------------- | --------------- | ------------------------------------------ | --------------------------------------------------------------------------------- | ---------------- |
| `getSeasonalAvailability(month?)`        | `requireChef()` | `{ month?: number }` (defaults to current) | `{ inSeason: Ingredient[], comingSoon: Ingredient[], outOfSeason: Ingredient[] }` | None (read-only) |
| `getIngredientSeasonality(ingredientId)` | `requireChef()` | `{ ingredientId: string }`                 | `{ seasonStart, seasonEnd, peakMonths, isYearRound, notes } or null`              | None (read-only) |

---

## Feature 5: Vendor/Wholesale Price Import (Exit 6)

### What it does

Lets a chef manually enter or paste wholesale prices from Restaurant Depot, US Foods, Sysco, or any vendor. These prices sit in the resolution chain as a distinct source tier, clearly labeled as wholesale.

### Why not automated integration

Wholesale portals (Restaurant Depot, US Foods, Sysco) require member logins, have no public APIs, and prices are account-specific. Automated scraping would break constantly and violate terms of service. Manual entry is the sustainable approach: the chef opens their vendor portal, copies a few key prices, and pastes them into ChefFlow.

### Data model

New table for vendor prices:

```sql
CREATE TABLE IF NOT EXISTS vendor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,                -- "Restaurant Depot", "US Foods", "Sysco", custom
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  unit TEXT NOT NULL,                       -- "lb", "oz", "case", "each"
  pack_size TEXT,                           -- "50 lb case", "6 x 10 cans", "25 lb bag"
  price_per_unit_cents INTEGER,             -- computed: price_cents normalized to standard unit
  notes TEXT,                               -- "Account #12345, item #67890"
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,                   -- vendor price sheets usually valid 30-90 days
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_prices_tenant ON vendor_prices(tenant_id);
CREATE INDEX idx_vendor_prices_ingredient ON vendor_prices(ingredient_id);
CREATE INDEX idx_vendor_prices_active ON vendor_prices(tenant_id, ingredient_id)
  WHERE expires_at IS NULL OR expires_at > now();

-- RLS
ALTER TABLE vendor_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_prices_tenant_isolation ON vendor_prices
  USING (tenant_id = (SELECT id FROM chefs WHERE user_id = auth.uid()));
```

### Resolution chain integration

Insert vendor prices as Tier 1.5 (between receipt and API quote):

```
Tier  Source             Confidence  Description
----  ------             ----------  -----------
0.5   PINNED_PRICE       0.95        Chef manually set this price
1     RECEIPT            1.0         Chef's own purchase receipts
1.5   VENDOR_PRICE (NEW) 0.9         Wholesale/vendor catalog price
2     API_QUOTE          0.75        Kroger/Spoonacular/MealMe APIs
...   (rest unchanged)
```

Vendor prices have confidence 0.9: lower than a receipt (which proves an actual transaction) but higher than API quotes (which may have markup). Vendor prices expire based on `expires_at` (default 60 days).

### UI

**Vendor price entry page** (`/culinary/costing/vendors`):

- Top: vendor selector (dropdown of common vendors + "Add custom vendor")
- Bulk entry mode: paste a list of items and prices (one per line, tab-separated: "Chicken Breast\t3.49\tlb")
- Single entry mode: ingredient search + price + unit + pack size
- Table of existing vendor prices: ingredient, vendor, price, unit, age, expires
- "Expired" badge on prices past expiration
- "Refresh from vendor" reminder notification when prices are aging

**Bulk paste format:**

```
Boneless Chicken Breast    3.49    lb
Ground Beef 80/20          4.29    lb
Heavy Cream                2.99    qt
AP Flour 50lb              18.99   50lb bag
```

The parser splits on tabs, matches ingredient names using the same pg_trgm matching as the auto-costing engine, and asks the chef to confirm matches before saving.

### Server actions

| Action                           | Auth            | Input                                                                               | Output                                                    | Side Effects                                                                    |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `addVendorPrice(input)`          | `requireChef()` | `{ ingredientId, vendorName, priceCents, unit, packSize?, notes?, expiresInDays? }` | `{ success: boolean, vendorPriceId: string }`             | Inserts vendor_prices row, triggers `propagatePriceChange`, revalidates costing |
| `bulkAddVendorPrices(input)`     | `requireChef()` | `{ vendorName, items: { ingredientName, priceCents, unit, packSize? }[] }`          | `{ added: number, matched: number, unmatched: string[] }` | Matches ingredients, inserts rows, triggers cost refresh                        |
| `getVendorPrices(ingredientId?)` | `requireChef()` | `{ ingredientId?: string }`                                                         | `{ prices: VendorPrice[] }`                               | None (read-only)                                                                |
| `deleteVendorPrice(id)`          | `requireChef()` | `{ vendorPriceId: string }`                                                         | `{ success: boolean }`                                    | Removes row, triggers cost refresh                                              |

---

## Feature 6: Menu Cost Modeler with Margin Targets (Exit 7)

### What it does

Replaces the spreadsheet. The chef sets a target food cost percentage (e.g., 30%), sees the current food cost %, and can model "what if I swap ribeye for NY strip" or "what if I drop the truffle course" scenarios. All in-app, no Google Sheets needed.

### Where it lives

Enhanced version of the existing Menu Cost Estimator at `/menus/estimate`, plus a new "Modeler" tab on existing menu detail pages.

### How it works

The modeler reads the current menu cost from the auto-costing engine and adds three capabilities:

1. **Margin target bar**: chef sets target food cost % (e.g., 30%), sees current % with green/yellow/red indicator
2. **Swap simulator**: select an ingredient or dish, see alternatives with their cost impact
3. **Scenario snapshots**: save a scenario ("Budget version", "Premium version") to compare side by side

### Data model

New table for saved scenarios:

```sql
CREATE TABLE IF NOT EXISTS menu_cost_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,  -- null for standalone estimates
  name TEXT NOT NULL,                                    -- "Budget Version", "Premium Version"
  target_food_cost_pct NUMERIC(5,2),                     -- e.g., 30.00
  event_price_cents INTEGER,                             -- what the chef charges
  guest_count INTEGER,
  swaps JSONB DEFAULT '[]',                              -- [{originalIngredientId, swapIngredientId, reason}]
  removals JSONB DEFAULT '[]',                           -- [{dishId or ingredientId, reason}]
  computed_cost_cents INTEGER,                            -- cached total after swaps/removals
  computed_food_cost_pct NUMERIC(5,2),                   -- cached food cost % after swaps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenarios_tenant ON menu_cost_scenarios(tenant_id);
CREATE INDEX idx_scenarios_menu ON menu_cost_scenarios(menu_id);

ALTER TABLE menu_cost_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY scenarios_tenant_isolation ON menu_cost_scenarios
  USING (tenant_id = (SELECT id FROM chefs WHERE user_id = auth.uid()));
```

### UI

**Margin target bar** (top of modeler):

- Slider or input for target food cost % (default from `OPERATOR_TARGETS` based on chef archetype)
- Current food cost % displayed next to target with gap indicator
- Color: green if current <= target, yellow if current is 1-5% above target, red if 5%+ above
- "Your target: 30%. Current: 34.2%. Over by $42.80 for 10 guests."

**Swap simulator** (main area):

- List of all ingredients in the menu, sorted by cost (most expensive first)
- Each row shows: ingredient name, current cost, % of total menu cost
- "Swap" button opens a panel showing alternatives:
  - Same-category ingredients the chef has used before, sorted by price
  - "NY Strip ($14.99/lb) -> Hanger Steak ($9.99/lb): saves $50.00 for 10 guests"
  - Apply swap to see updated totals instantly (client-side recalculation)
- "Remove" button to model removing a dish/ingredient entirely

**Scenario comparison** (sidebar):

- Save current state as a named scenario
- Compare two scenarios side by side: total cost, per guest, food cost %, ingredient diff
- "Apply to menu" button that makes the swaps permanent (modifies actual recipe/menu linkages)

### Server actions

| Action                             | Auth            | Input                                                                        | Output                                                                    | Side Effects                                           |
| ---------------------------------- | --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| `modelMenuCost(input)`             | `requireChef()` | `{ menuId, guestCount, eventPriceCents, swaps, removals }`                   | `{ originalCost, modifiedCost, foodCostPct, perGuest, savings, details }` | None (read-only, in-memory computation)                |
| `getSwapSuggestions(ingredientId)` | `requireChef()` | `{ ingredientId: string, menuId?: string }`                                  | `{ suggestions: SwapSuggestion[] }`                                       | None (read-only)                                       |
| `saveScenario(input)`              | `requireChef()` | `{ menuId?, name, targetPct, eventPriceCents, guestCount, swaps, removals }` | `{ scenarioId: string }`                                                  | Inserts menu_cost_scenarios row                        |
| `compareScenarios(ids)`            | `requireChef()` | `{ scenarioIds: [string, string] }`                                          | `{ comparison: ScenarioComparison }`                                      | None (read-only)                                       |
| `applyScenario(scenarioId)`        | `requireChef()` | `{ scenarioId: string }`                                                     | `{ success: boolean, changesApplied: number }`                            | Modifies recipe/menu linkages per the scenario's swaps |

---

## Feature 7: Freshness-Aware Price Alerts

### What it does

Proactively alerts the chef when prices they rely on are going stale, so they can verify before the price becomes unreliable. This reduces Exit 2 (checking current prices) by making staleness visible before the chef needs the price.

### Where it lives

- Notification badge on the costing page nav item
- Alert section at top of costing page
- Optional daily digest (via Remy notification, not email)

### Logic

Run as part of the nightly cost refresh job:

1. For each active ingredient, compute freshness state using the category-aware thresholds (Feature 0 above)
2. If any ingredient transitions from "fresh" or "aging" to "stale", add to alert list
3. If any pinned price expires within 7 days, add to alert list
4. If any vendor price expires within 7 days, add to alert list
5. Store alerts in the existing notification system (no new tables)

### UI

**Costing page alert bar:**

- "3 prices need attention: 2 stale, 1 pin expiring" with expandable list
- Each alert: ingredient name, current state, suggested action ("Verify price", "Re-pin", "Log a receipt")
- Dismiss individual alerts or "Dismiss all verified"

---

## Database Changes

### Migration: New columns and tables

```sql
-- Migration: [next-timestamp]_pie_coverage_gap_closure.sql

-- Feature 2: Manual price pinning columns on ingredients
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS pinned_price_cents INTEGER
    CHECK (pinned_price_cents IS NULL OR pinned_price_cents > 0),
  ADD COLUMN IF NOT EXISTS pinned_price_unit TEXT,
  ADD COLUMN IF NOT EXISTS pinned_price_source TEXT,
  ADD COLUMN IF NOT EXISTS pinned_price_vendor TEXT,
  ADD COLUMN IF NOT EXISTS pinned_price_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_price_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_price_set_by UUID REFERENCES auth.users(id);

-- Feature 4: Seasonal availability columns on system_ingredients
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS season_start_month SMALLINT
    CHECK (season_start_month IS NULL OR season_start_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS season_end_month SMALLINT
    CHECK (season_end_month IS NULL OR season_end_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS season_peak_months SMALLINT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS season_region TEXT DEFAULT 'northeast',
  ADD COLUMN IF NOT EXISTS is_year_round BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS season_notes TEXT;

-- Feature 5: Vendor prices table
CREATE TABLE IF NOT EXISTS vendor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  unit TEXT NOT NULL,
  pack_size TEXT,
  price_per_unit_cents INTEGER,
  notes TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_prices_tenant ON vendor_prices(tenant_id);
CREATE INDEX idx_vendor_prices_ingredient ON vendor_prices(ingredient_id);
CREATE INDEX idx_vendor_prices_active ON vendor_prices(tenant_id, ingredient_id)
  WHERE expires_at IS NULL OR expires_at > now();

ALTER TABLE vendor_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_prices_tenant_isolation ON vendor_prices
  USING (tenant_id = (SELECT id FROM chefs WHERE user_id = auth.uid()));

-- Feature 6: Menu cost scenarios table
CREATE TABLE IF NOT EXISTS menu_cost_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_food_cost_pct NUMERIC(5,2),
  event_price_cents INTEGER,
  guest_count INTEGER,
  swaps JSONB DEFAULT '[]',
  removals JSONB DEFAULT '[]',
  computed_cost_cents INTEGER,
  computed_food_cost_pct NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenarios_tenant ON menu_cost_scenarios(tenant_id);
CREATE INDEX idx_scenarios_menu ON menu_cost_scenarios(menu_id);

ALTER TABLE menu_cost_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY scenarios_tenant_isolation ON menu_cost_scenarios
  USING (tenant_id = (SELECT id FROM chefs WHERE user_id = auth.uid()));
```

### Seed migration: Seasonal availability data

Separate migration seeding seasonal data for top 100 seasonal produce items in Northeast US. See Feature 4 for examples.

### Migration notes

- All changes are additive. No DROP, DELETE, or TRUNCATE.
- Migration filename must be strictly higher than the current highest in `database/migrations/`.
- `vendor_prices` has RLS matching the existing tenant isolation pattern.
- `menu_cost_scenarios` has RLS matching the existing tenant isolation pattern.
- Pinned price columns on `ingredients` are nullable; existing rows unaffected.
- Seasonal columns on `system_ingredients` are nullable; existing rows default to `is_year_round = true`.

---

## Files to Create

| File                                                             | Purpose                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `lib/pricing/coverage-gap-actions.ts`                            | `'use server'`. Coverage gap dashboard data, gap list computation               |
| `lib/pricing/price-pinning-actions.ts`                           | `'use server'`. Pin, unpin, get expiring pins                                   |
| `lib/pricing/price-comparison-actions.ts`                        | `'use server'`. Single and multi-ingredient store comparison                    |
| `lib/pricing/vendor-price-actions.ts`                            | `'use server'`. CRUD for vendor prices, bulk paste parsing                      |
| `lib/pricing/menu-modeler-actions.ts`                            | `'use server'`. Swap simulation, scenario CRUD, apply scenario                  |
| `lib/pricing/seasonal-actions.ts`                                | `'use server'`. Seasonal availability queries                                   |
| `lib/pricing/freshness.ts`                                       | Pure function. Category-aware freshness computation (fresh/aging/stale/expired) |
| `components/pricing/coverage-gap-dashboard.tsx`                  | Coverage summary card + gap list                                                |
| `components/pricing/price-pin-modal.tsx`                         | Modal for pinning a price to an ingredient                                      |
| `components/pricing/price-comparison-panel.tsx`                  | Multi-store price comparison for one ingredient                                 |
| `components/pricing/seasonal-badge.tsx`                          | In-season/out-of-season badge for ingredient rows                               |
| `components/pricing/margin-target-bar.tsx`                       | Food cost % target vs actual bar                                                |
| `components/pricing/swap-simulator.tsx`                          | Ingredient/dish swap panel with cost impact                                     |
| `components/pricing/vendor-price-entry.tsx`                      | Vendor price bulk entry form                                                    |
| `app/(chef)/culinary/costing/compare/page.tsx`                   | Multi-ingredient price comparison page                                          |
| `app/(chef)/culinary/costing/vendors/page.tsx`                   | Vendor price management page                                                    |
| `app/(chef)/culinary/costing/seasonal/page.tsx`                  | Seasonal availability calendar page                                             |
| `database/migrations/[timestamp]_pie_coverage_gap_closure.sql`   | Schema migration                                                                |
| `database/migrations/[timestamp]_seed_seasonal_availability.sql` | Seasonal data seed                                                              |

## Files to Modify

| File                                   | What to Change                                                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/pricing/resolve-price.ts`         | Add PINNED_PRICE (Tier 0.5) and VENDOR_PRICE (Tier 1.5) to resolution chain. Update `PriceSource` and `PriceTier` types. Update `computeFreshness()` to return four-state model. |
| `lib/pricing/cost-refresh-actions.ts`  | Include pinned and vendor prices in the refresh cycle. Alert generation for stale/expiring prices.                                                                               |
| `app/(chef)/culinary/costing/page.tsx` | Add coverage gap dashboard section, stale price alerts, link to new sub-pages                                                                                                    |
| `components/nav/nav-config.tsx`        | Add "Compare", "Vendors", "Seasonal" sub-items under Costing section                                                                                                             |
| `app/(chef)/menus/estimate/page.tsx`   | Add margin target bar and swap simulator to the estimator                                                                                                                        |

---

## Exit Points Closed

| Exit # | Scenario                                     | Feature(s) That Close It                                                                                                                                           | Reduction                                                                                                                |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1      | Cost out a menu using real retail prices     | Coverage Gap Dashboard (shows what is missing), Price Pinning (fills gaps manually), Vendor Import (wholesale prices), Freshness Alerts (keep data current)        | **80% reduction.** Chef checks ChefFlow first; only leaves for items with no data at all.                                |
| 2      | Check current price of a specific ingredient | Freshness Model (stale prices flagged, not hidden), Price Pinning (quick update from any source), Freshness Alerts (proactive notification before price is needed) | **60% reduction.** Chef trusts ChefFlow prices are current. Still leaves for volatile items they want to spot-check.     |
| 3      | Compare prices across multiple stores        | Multi-Store Price Comparison (all known prices in one view), "Use cheapest for each" bulk action                                                                   | **90% reduction.** No reason to open 5 store apps when all prices are visible in one view.                               |
| 4      | Check specialty ingredient availability      | Price Pinning (chef enters the price once, it persists), Pin expiration reminders (re-verify periodically)                                                         | **70% reduction.** Chef pins specialty prices from vendor websites. Still leaves to discover new specialty sources.      |
| 5      | Verify seasonal availability                 | Seasonal Availability Calendar (in-season badges, month-by-month view), Seasonal notes on ingredients                                                              | **85% reduction.** Deterministic data answers most questions. Chef still leaves for hyper-local farmer market schedules. |
| 6      | Look up bulk/wholesale pricing               | Vendor Price Import (paste from vendor portal), Vendor prices in resolution chain, expiration tracking                                                             | **75% reduction.** Chef pastes vendor prices into ChefFlow. Still must visit vendor portal to get the prices initially.  |
| 7      | Calculate food cost % against a target       | Menu Cost Modeler (margin targets, swap simulator, scenario comparison)                                                                                            | **95% reduction.** No reason to use Google Sheets when the modeler does the same thing with live data.                   |

### Aggregate impact

Before: chef leaves ChefFlow 10-20 times per menu costing session.
After: chef leaves 1-3 times (for genuinely novel items, hyper-local availability, or first-time vendor portal visits).

---

## Implementation Phases

### Phase 0: Freshness Model + Coverage Gap Dashboard

Foundation work. No new tables (uses existing data).

- Implement `lib/pricing/freshness.ts` with four-state model
- Update `computeFreshness()` in resolve-price.ts
- Build `getCoverageGapDashboard()` action
- Add coverage summary card and gap list to costing page
- Add freshness badges to existing price displays

### Phase 1: Price Pinning + Resolution Chain Updates

Migration required (new columns on ingredients).

- Run migration for pinned_price columns
- Build pin/unpin actions
- Add PINNED_PRICE tier to resolution chain
- Build pin price modal
- Add pushpin indicator to recipe/menu views
- Build expiring pins alert

### Phase 2: Vendor Price Import

Migration required (new vendor_prices table).

- Run migration for vendor_prices table
- Build vendor price CRUD actions
- Build bulk paste parser with ingredient matching
- Add VENDOR_PRICE tier to resolution chain
- Build vendor price management page

### Phase 3: Multi-Store Price Comparison

No migration. Reads from existing data.

- Build comparison actions
- Build ingredient comparison panel
- Build multi-ingredient comparison page
- Wire "Pin this price" from comparison view

### Phase 4: Seasonal Availability

Migration required (new columns on system_ingredients + seed data).

- Run migration for seasonal columns
- Run seed migration for top 100 seasonal produce
- Build seasonal query actions
- Build seasonal badge component
- Build seasonal calendar page

### Phase 5: Menu Cost Modeler

Migration required (new menu_cost_scenarios table).

- Run migration for scenarios table
- Build modeler actions (swap simulation, scenario CRUD)
- Build margin target bar
- Build swap simulator
- Build scenario comparison view
- Wire into menu estimator and menu detail pages

---

## Edge Cases and Error Handling

| Scenario                                                      | Correct Behavior                                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ingredient has both pinned price and receipt                  | Receipt wins if newer than pin. Pin wins if receipt is older.                                                                                                            |
| Pinned price expired                                          | Falls out of resolution chain silently. Next tier takes over. Alert shown on costing page.                                                                               |
| Vendor price has "case" unit but ingredient uses "lb"         | Parser asks chef to enter per-unit equivalent, or chef enters pack size and unit price is computed (e.g., "50 lb case at $18.99" -> $0.38/lb).                           |
| Bulk vendor paste has unmatched ingredient names              | Show unmatched items with "No match found" and suggested action: "Create ingredient first." Do not silently drop them.                                                   |
| Seasonal data not seeded for an ingredient                    | No seasonal badge shown. Ingredient treated as year-round.                                                                                                               |
| Chef in a different region than "northeast"                   | V1 is northeast-only for seasonal data. Show disclaimer: "Seasonal data is for Northeast US. Availability may differ in your region." Future: region-specific seed data. |
| Swap simulator suggests an ingredient the chef has never used | Show it with "(not in your recipes)" label. Chef can still apply the swap.                                                                                               |
| Scenario has stale computed costs (prices changed since save) | Recompute on load. Show "(costs updated since this scenario was saved)" if changed.                                                                                      |
| Multi-ingredient comparison with 100+ ingredients             | Paginate: show 20 per page. Store selection persists across pages.                                                                                                       |
| No price data for any store                                   | Comparison panel shows "No store prices found. Log a receipt or pin a price."                                                                                            |
| Chef tries to pin $0 price                                    | Reject. CHECK constraint enforces pinned_price_cents > 0.                                                                                                                |
| Two vendor prices for same ingredient from same vendor        | Allow both (different dates, different pack sizes). Show most recent first.                                                                                              |

---

## Verification Steps

### Phase 0

1. Navigate to `/culinary/costing`. Verify coverage gap dashboard shows accurate counts.
2. Verify freshness badges on ingredient prices reflect the four-state model.
3. Verify expired prices show struck-through with red badge.

### Phase 1

4. Pin a price for a specialty ingredient. Verify it appears in the resolution chain.
5. Verify the pinned price propagates to recipe and menu costs.
6. Set a pin to expire in 1 day. Verify the alert appears in the "expiring pins" section.
7. Unpin a price. Verify the next resolution tier takes over.

### Phase 2

8. Navigate to `/culinary/costing/vendors`. Add a vendor price manually.
9. Paste 5 items in bulk format. Verify ingredient matching and confirmation.
10. Verify vendor prices appear in the resolution chain at Tier 1.5.

### Phase 3

11. Click a price in a recipe. Verify the comparison panel shows all known stores.
12. Navigate to `/culinary/costing/compare`. Add 5 ingredients. Verify the grid populates.
13. Click "Use cheapest for each." Verify all 5 pins are created.

### Phase 4

14. Navigate to `/culinary/costing/seasonal`. Verify the calendar shows seasonal produce.
15. Check that "ramps" shows as in-season in April, out-of-season in August.
16. Verify seasonal badges appear on ingredient rows in recipe detail.

### Phase 5

17. Open a menu in the modeler. Set target food cost % to 30%.
18. Use the swap simulator to replace an expensive protein. Verify cost and % update.
19. Save two scenarios. Compare them side by side.
20. Apply a scenario. Verify the menu's recipe linkages update.

---

## Out of Scope

- **Automated wholesale portal scraping**: terms of service violations, login-gated, account-specific pricing. Manual entry is the sustainable approach.
- **Real-time API integration with Amazon/Instacart/Whole Foods**: these are not public APIs. PIE already scrapes what it can through OpenClaw.
- **AI-powered ingredient substitution recommendations**: the swap simulator shows same-category alternatives with costs. It does not suggest creative culinary substitutions. That would require culinary AI, which is out of scope.
- **Multi-region seasonal data**: V1 is Northeast US only. Expanding requires regional seed data per USDA growing zone.
- **Automated vendor catalog import** (uploading a PDF vendor price sheet and parsing it): OCR/PDF parsing is fragile. The bulk paste format handles the 80% case.
- **Price history charting/trending**: the data exists in `ingredient_price_history` but visualization is a separate feature.
- **Shopping list generation from comparison view**: the shopping optimizer already exists separately.
- **Integration with vendor ordering systems**: ChefFlow is not an ordering platform (permanent exit per the analysis).

---

## Relationship to PIE Laws

| PIE Law                          | How This Spec Serves It                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Law 1 (Total Autonomy)           | Price pinning and vendor import are chef-initiated, not required by PIE. PIE continues to operate autonomously; these are supplements, not replacements.     |
| Law 2 (Universal Coverage)       | Coverage gap dashboard measures compliance. Pinning and vendor import close gaps PIE cannot reach autonomously.                                              |
| Law 3 (Honesty Over Silence)     | Freshness model ensures every price carries honest age labeling. Expired prices are flagged, not hidden.                                                     |
| Law 4 (Freshness Guarantee)      | Category-aware freshness thresholds operationalize Law 4 into concrete UI behavior.                                                                          |
| Law 5 (Self-Healing)             | When a pinned price expires or a vendor price ages out, the resolution chain automatically falls back to the next tier. No manual intervention needed.       |
| Law 6 (Geographic Intelligence)  | Seasonal availability is region-specific. Price comparison is store-specific. Both respect the chef's locale.                                                |
| Law 8 (The Census)               | Coverage gap dashboard measures actual coverage against the chef's recipe book. Future: measure against the full Census.                                     |
| Law 9 (Synthetic Pricing)        | Synthetic prices remain the floor. Pinned and vendor prices replace synthetic estimates with higher-confidence data.                                         |
| Law 10 (No Unprotected Price)    | Pinned and vendor prices add two new tiers to the fallback chain, making the chain deeper and more resilient.                                                |
| Law 11 (Actionable Intelligence) | Price comparison (cheapest store), seasonal availability (what to use now), and margin modeler (what to swap) are all actionable intelligence, not raw data. |

---

## Notes for Builder Agent

1. **Read these files before starting:**
   - `lib/pricing/resolve-price.ts` (understand the resolution chain, `PriceSource`, `PriceTier` types)
   - `lib/pricing/cost-refresh-actions.ts` (understand cascade propagation)
   - `lib/pricing/ingredient-matching-actions.ts` (reuse pg_trgm matching for vendor bulk paste)
   - `app/(chef)/culinary/costing/page.tsx` (understand existing costing UI)
   - `lib/costing/knowledge.ts` (understand operator targets for default margin targets)

2. **Resolution chain modification is the highest-risk change.** The `resolvePrice()` and `resolvePricesBatch()` functions are called everywhere. Adding new tiers must not break existing behavior. Test with existing ingredients that have receipt, scrape, and synthetic prices.

3. **Pinned price columns go on `ingredients` (chef's ingredient), not `system_ingredients`.** Each chef pins their own prices. `system_ingredients` is shared reference data.

4. **Vendor price `price_per_unit_cents` should be computed at insert time.** If the chef enters "50 lb case at $18.99", compute `price_per_unit_cents = 1899 / 50 = 38` (cents per lb). This normalized value is what the resolution chain uses.

5. **Seasonal data is static.** Do not build a cron job or scraper for seasonal data. Seed it once with a migration. Update annually or when a chef reports an error. Ramps do not change their season.

6. **The swap simulator computes costs client-side** for instant feedback. The `modelMenuCost()` server action is for saving/comparing scenarios, not for every swap interaction. Send the full ingredient cost map to the client on page load; swaps are simple arithmetic.

7. **Freshness thresholds are in a pure function file** (`lib/pricing/freshness.ts`) so both server actions and client components can import it. Do not put it in a `'use server'` file.

8. **No em dashes** in any UI text, code comments, or this spec's implementation.

9. **Tenant scoping on every query.** `vendor_prices` and `menu_cost_scenarios` have RLS, but server actions must still include `.eq('tenant_id', tenantId)` as defense in depth.

10. **Migration timestamps:** Check the highest existing migration in `database/migrations/` and use a strictly higher timestamp. The seasonal seed migration must be a separate file with a higher timestamp than the schema migration.

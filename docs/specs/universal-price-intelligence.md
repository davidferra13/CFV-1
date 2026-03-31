# Spec: Universal Price Intelligence (Cross-Store Averaging + Safety Net)

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** `auto-costing-engine.md` (verified)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-30
> **Built by:** Claude Code session 2026-03-30

---

## What This Does (Plain English)

After this is built, every single food ingredient in Massachusetts, New Hampshire, and Maine has a price. Period. Not a guess, not a blank, not "log a receipt to set the price." A real number derived from real store data, with honest confidence labeling.

The system works in three layers:

1. **Exact store price** (highest confidence): "Flour is $3.49 at Market Basket right now."
2. **Regional average** (medium confidence): "We don't have flour at Market Basket, but it averages $3.62 across Hannaford, Stop & Shop, and Aldi in your area."
3. **Category baseline** (lowest confidence): "We've never seen this exact spice, but spices in our database average $1.20/oz."

A chef pricing out a menu sees costs for every ingredient. Some are exact, some are averaged, some are estimated. Each one is labeled honestly. But there are zero blank holes. The chef can make a decision.

This also fixes the Pi sync name matching (currently exact-match only), adds count-to-weight equivalents for "bunch", "can", "head" units, and expands the baseline price data from 95 to 500+ items.

---

## Why It Matters

Every chef the developer has ever worked with (hundreds, across every environment from Michelin-star restaurants to food pantries to celebrity mansions) faces the same problem: costing a menu takes hours of manual spreadsheet comparison across vendor sheets, and the numbers are always incomplete or stale. No system has ever solved this automatically.

ChefFlow has 43,000+ real store prices on the Pi and an 8-tier resolution chain. But when an ingredient falls through all 8 tiers, the answer is "no data." That's unacceptable. A chef estimating a 7-course dinner for a client inquiry can't have 30% of ingredients showing blanks. They need a number, even if it's an average, even if it's an estimate, as long as it's labeled honestly.

The Indian dinner inquiry was one example. This needs to work for French, Italian, Mexican, Japanese, Southern, farm-to-table, food truck, restaurant, catering, food pantry, and every other cuisine and setting.

---

## Current State (What Exists Today)

### Already built and working:

1. **8-tier price resolution chain** (`lib/pricing/resolve-price.ts`): receipt > api_quote > direct_scrape > flyer > instacart > government > historical > none
2. **Pi catalog**: 43,000+ prices across Market Basket, Hannaford, and growing (Aldi, Stop & Shop, Shaws, Costco, BJ's, Whole Foods queued)
3. **TypeScript conversion engine** (`lib/units/conversion-engine.ts`): 87 ingredient densities, volume-to-weight conversion, wired into cost computation pipeline via `computeIngredientCost()`
4. **563 system ingredients** seeded with density, yield, allergen data
5. **Smart-lookup on Pi** with 300+ manual aliases and fuzzy matching (Levenshtein + token overlap)
6. **Bridge script** converting catalog_products to current_prices with canonical matching (71% match rate)
7. **Nightly sync** from Pi to ChefFlow via `/api/prices/enriched`

### What's missing (this spec fixes):

1. **No cross-store averaging**: System picks single newest price from one store. If Market Basket doesn't stock saffron but Whole Foods, Hannaford, and Aldi do, the system uses whichever has the most recent timestamp, not an average.
2. **Government safety net is thin**: Only ~95 USDA items hardcoded in `lib/grocery/usda-prices.ts`
3. **No category-based fallback**: When all 8 tiers fail, no mechanism to say "unknown spice, but spices average $X/oz"
4. **Pi sync is exact-match only**: ChefFlow sends ingredient names to Pi verbatim. No normalization, no fuzzy fallback client-side.
5. **Count-to-weight equivalents missing**: "1 bunch cilantro" can't be costed against a per-oz price because the system doesn't know 1 bunch = ~2 oz.

---

## Files to Create

| File                                                                          | Purpose                                                                                       |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `lib/pricing/cross-store-average.ts`                                          | Computes regional average price for an ingredient across all stores                           |
| `lib/pricing/category-baseline.ts`                                            | Computes category-average fallback prices (average spice price, average protein price, etc.)  |
| `lib/pricing/name-normalizer.ts`                                              | Normalizes ingredient names before Pi sync and recipe matching                                |
| `database/migrations/20260401000136_count_equivalents_and_price_averages.sql` | Adds count_to_weight columns to system_ingredients, regional_price_averages materialized view |

---

## Files to Modify

| File                             | What to Change                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/pricing/resolve-price.ts`   | Insert two new tiers: REGIONAL_AVERAGE (between INSTACART and GOVERNMENT) and CATEGORY_BASELINE (between HISTORICAL and NONE). Update batch resolution. |
| `lib/openclaw/sync.ts`           | Pre-normalize ingredient names before sending to Pi. Add fuzzy fallback when exact match fails.                                                         |
| `lib/units/conversion-engine.ts` | Add count-to-weight equivalents lookup (bunch, can, head, clove, sprig, etc.)                                                                           |
| `lib/grocery/usda-prices.ts`     | Expand from ~95 to 500+ items using USDA Northeast Urban Average data                                                                                   |

---

## Database Changes

### New Columns on `system_ingredients`

```sql
-- Count-to-weight equivalents for non-standard units
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS count_unit TEXT,           -- e.g., 'bunch', 'head', 'can', 'clove'
  ADD COLUMN IF NOT EXISTS count_weight_grams NUMERIC(8,2),  -- weight of one count unit in grams
  ADD COLUMN IF NOT EXISTS count_notes TEXT;           -- e.g., 'standard 14.5oz can', 'medium head'
```

### New Materialized View: `regional_price_averages`

```sql
-- Cross-store average price per canonical ingredient
-- Refreshed after each sync or bridge run
CREATE MATERIALIZED VIEW IF NOT EXISTS regional_price_averages AS
SELECT
  iph.ingredient_id,
  i.name AS ingredient_name,
  i.category,
  COUNT(DISTINCT iph.store_name) AS store_count,
  ROUND(AVG(iph.price_per_unit_cents)) AS avg_price_per_unit_cents,
  MIN(iph.price_per_unit_cents) AS min_price_per_unit_cents,
  MAX(iph.price_per_unit_cents) AS max_price_per_unit_cents,
  MODE() WITHIN GROUP (ORDER BY iph.unit) AS most_common_unit,
  MAX(iph.purchase_date) AS most_recent_date
FROM ingredient_price_history iph
JOIN ingredients i ON i.id = iph.ingredient_id
WHERE iph.source LIKE 'openclaw_%'
  AND iph.purchase_date > CURRENT_DATE - INTERVAL '60 days'
  AND iph.price_per_unit_cents > 0
  AND iph.price_per_unit_cents < 50000  -- exclude obvious errors
GROUP BY iph.ingredient_id, i.name, i.category
HAVING COUNT(DISTINCT iph.store_name) >= 2;  -- need at least 2 stores for a meaningful average

CREATE UNIQUE INDEX IF NOT EXISTS idx_rpa_ingredient ON regional_price_averages(ingredient_id);

-- Category-level baseline averages
CREATE MATERIALIZED VIEW IF NOT EXISTS category_price_baselines AS
SELECT
  i.category,
  COUNT(DISTINCT iph.ingredient_id) AS ingredient_count,
  ROUND(AVG(iph.price_per_unit_cents)) AS avg_cents_per_unit,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY iph.price_per_unit_cents) AS median_cents_per_unit,
  MODE() WITHIN GROUP (ORDER BY iph.unit) AS most_common_unit
FROM ingredient_price_history iph
JOIN ingredients i ON i.id = iph.ingredient_id
WHERE iph.source LIKE 'openclaw_%'
  AND iph.purchase_date > CURRENT_DATE - INTERVAL '90 days'
  AND iph.price_per_unit_cents > 0
  AND iph.price_per_unit_cents < 50000
GROUP BY i.category
HAVING COUNT(DISTINCT iph.ingredient_id) >= 5;  -- need enough data points

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpb_category ON category_price_baselines(category);
```

### Seed Count-to-Weight Equivalents

```sql
-- Common count-unit equivalents (weight in grams)
UPDATE system_ingredients SET count_unit = 'bunch', count_weight_grams = 56, count_notes = 'standard grocery bunch'
  WHERE name IN ('cilantro', 'parsley', 'dill', 'mint', 'basil', 'chives', 'watercress', 'arugula');

UPDATE system_ingredients SET count_unit = 'bunch', count_weight_grams = 170, count_notes = 'standard grocery bunch'
  WHERE name IN ('kale', 'collard greens', 'swiss chard', 'spinach', 'mustard greens');

UPDATE system_ingredients SET count_unit = 'head', count_weight_grams = 56, count_notes = 'medium head'
  WHERE name = 'garlic';

UPDATE system_ingredients SET count_unit = 'head', count_weight_grams = 750, count_notes = 'medium head'
  WHERE name IN ('cabbage', 'napa cabbage', 'red cabbage');

UPDATE system_ingredients SET count_unit = 'head', count_weight_grams = 600, count_notes = 'medium head'
  WHERE name IN ('cauliflower', 'broccoli');

UPDATE system_ingredients SET count_unit = 'head', count_weight_grams = 500, count_notes = 'medium head iceberg'
  WHERE name IN ('iceberg lettuce', 'romaine lettuce', 'butter lettuce');

UPDATE system_ingredients SET count_unit = 'clove', count_weight_grams = 5, count_notes = 'medium clove'
  WHERE name = 'garlic';

UPDATE system_ingredients SET count_unit = 'sprig', count_weight_grams = 2, count_notes = 'standard sprig'
  WHERE name IN ('thyme', 'rosemary', 'tarragon', 'oregano');

UPDATE system_ingredients SET count_unit = 'can', count_weight_grams = 411, count_notes = 'standard 14.5oz can'
  WHERE name IN ('diced tomatoes', 'crushed tomatoes', 'tomato sauce', 'coconut milk', 'black beans', 'kidney beans', 'chickpeas', 'cannellini beans', 'pinto beans', 'corn');

UPDATE system_ingredients SET count_unit = 'can', count_weight_grams = 170, count_notes = 'standard 6oz can'
  WHERE name = 'tomato paste';

UPDATE system_ingredients SET count_unit = 'stick', count_weight_grams = 113, count_notes = 'standard US stick (4oz)'
  WHERE name = 'butter';

-- More count equivalents for common items
UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 50, count_notes = 'large egg'
  WHERE name = 'eggs';

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 182, count_notes = 'medium apple'
  WHERE name IN ('apple', 'fuji apple', 'gala apple', 'granny smith apple', 'honeycrisp apple');

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 150, count_notes = 'medium onion'
  WHERE name IN ('onion', 'yellow onion', 'white onion', 'red onion');

UPDATE system_ingredients SET count_unit = 'each', count_weight_grams = 150, count_notes = 'medium lemon'
  WHERE name IN ('lemon', 'lime', 'orange');
```

### Migration Notes

- Migration filename: `20260401000136_count_equivalents_and_price_averages.sql` (next after 20260401000135)
- All changes are additive (new columns, new views, UPDATE on existing rows)
- Materialized views need `REFRESH MATERIALIZED VIEW` after each sync run
- No DROP, DELETE, or TRUNCATE

---

## Data Model

### Updated 10-Tier Price Resolution Chain

```
Tier  Source                   Freshness   Confidence  Description
----  ------                   ---------   ----------  -----------
1     RECEIPT                  90 days     1.0         Chef's own purchase receipts
2     API_QUOTE                30 days     0.75        Kroger/Spoonacular/MealMe APIs
3     DIRECT_SCRAPE            14 days     0.85        OpenClaw direct store scrapes
4     FLYER                    14 days     0.7         Weekly circular prices
5     INSTACART                30 days     0.6         Instacart catalog (markup-adjusted)
6     REGIONAL_AVERAGE  (NEW)  60 days     0.5         Cross-store average from all sources
7     GOVERNMENT               no limit    0.4         USDA/BLS Northeast regional
8     HISTORICAL               no limit    0.3         Chef's own purchase history average
9     CATEGORY_BASELINE (NEW)  90 days     0.2         Category-level average (avg spice/oz)
10    NONE                     -           0.0         No data available
```

### Tier 6: REGIONAL_AVERAGE (New)

```typescript
// Query the regional_price_averages materialized view
// Returns the cross-store average for this specific ingredient
// Confidence: 0.5 (lower than any single-store price, higher than government)
// Freshness: based on most_recent_date in the view
// Store: "Regional Average ({N} stores)"
```

**When this fires:** Market Basket doesn't have saffron, but Whole Foods ($12), Hannaford ($10), and Aldi ($9) do. Tier 6 returns $10.33 (average) with confidence 0.5 and label "Regional Average (3 stores)".

### Tier 9: CATEGORY_BASELINE (New)

```typescript
// Query the category_price_baselines materialized view
// Returns the median price per unit for the ingredient's category
// Confidence: 0.2 (estimate, not real price)
// Store: "Category Estimate"
// Only fires after all other tiers fail
```

**When this fires:** The chef adds "saffron threads, Iranian" to a recipe. No store has it, no receipts, no government data. But the system knows spices average $3.40/oz (median across 50+ known spices). Returns $3.40/oz with confidence 0.2 and label "Spice category estimate."

Note: saffron is wildly more expensive than average spice. The category baseline is a last resort, never a substitute for real data. The low confidence (0.2) ensures the chef sees this is an estimate.

---

## Server Actions

| Action                             | Auth             | Input                      | Output                                                       | Side Effects                 |
| ---------------------------------- | ---------------- | -------------------------- | ------------------------------------------------------------ | ---------------------------- |
| `getRegionalAverage(ingredientId)` | `requireChef()`  | `{ ingredientId: string }` | `{ avgCents, storeCount, minCents, maxCents, unit } \| null` | None (read-only)             |
| `getCategoryBaseline(category)`    | `requireChef()`  | `{ category: string }`     | `{ avgCents, medianCents, unit, ingredientCount } \| null`   | None (read-only)             |
| `refreshRegionalAverages()`        | `requireAdmin()` | None                       | `{ success: boolean, refreshedAt: string }`                  | Refreshes materialized views |
| `normalizeIngredientName(name)`    | Internal         | `string`                   | `string`                                                     | None (pure function)         |

### `normalizeIngredientName` (Pure Function, No Auth)

```typescript
export function normalizeIngredientName(name: string): string {
  let n = name.toLowerCase().trim()

  // Strip common prefixes that don't affect identity
  n = n.replace(
    /^(fresh|organic|homemade|dried|frozen|canned|raw|cooked|roasted|grilled|steamed|boiled|fried|baked|smoked|pickled|marinated|minced|diced|chopped|sliced|shredded|grated|crushed|ground|whole|large|medium|small|extra)\s+/g,
    ''
  )

  // Strip parenthetical qualifiers
  n = n.replace(/\s*\([^)]*\)\s*/g, ' ')

  // Normalize whitespace
  n = n.replace(/\s+/g, ' ').trim()

  // Strip trailing size/brand qualifiers
  n = n.replace(/,\s*(brand|store|generic|organic).*$/i, '')

  return n
}
```

Used in two places:

1. Before Pi sync: normalize names to improve match rate
2. In recipe-to-dish matching: normalize before fuzzy search

---

## UI / Component Spec

No new UI pages. This spec is infrastructure-only. The existing price resolution chain, recipe costing, and Menu Cost Estimator (separate spec) all benefit automatically.

### What Changes in Existing UI:

1. **Price confidence badges** already show source attribution. New tiers show:
   - "Regional Average (3 stores)" with medium-confidence badge
   - "Spice category estimate" with low-confidence badge

2. **Recipe cost breakdown** already shows per-ingredient source. New tiers appear naturally.

3. **Menu cost summary** already shows `has_all_prices`. With these new fallback tiers, more ingredients will have prices, so completeness improves.

---

## Edge Cases and Error Handling

| Scenario                                     | Correct Behavior                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Regional average has only 1 store            | Don't use it (HAVING >= 2 in the view). Fall through to government.                                                      |
| Category baseline has < 5 ingredients        | Don't use it (HAVING >= 5 in the view). Fall through to none.                                                            |
| Materialized views are stale (not refreshed) | Views have `most_recent_date`. If > 90 days old, skip this tier.                                                         |
| Price outlier skews average                  | Use median for category baseline (PERCENTILE_CONT 0.5). Mean for regional (specific ingredient, less prone to outliers). |
| Ingredient has no category                   | Can't use category baseline. Fall through to none.                                                                       |
| "1 bunch cilantro" with per-oz price         | Look up system_ingredients for count_weight_grams (bunch=56g=2oz). Convert to weight, then cost.                         |
| Count unit not in system_ingredients         | Return null from count conversion. Cost shows as "unit mismatch" warning.                                                |
| Concurrent materialized view refresh         | PostgreSQL handles this natively (CONCURRENTLY option). No locking issue.                                                |

---

## Integration Points

### Pi Sync (`lib/openclaw/sync.ts`)

After sync completes:

1. Call `REFRESH MATERIALIZED VIEW CONCURRENTLY regional_price_averages`
2. Call `REFRESH MATERIALIZED VIEW CONCURRENTLY category_price_baselines`
3. These views are now fresh for the next price resolution

### Price Resolution (`lib/pricing/resolve-price.ts`)

Insert new tiers into the resolution chain:

```typescript
// After Tier 5 (INSTACART), before Tier 7 (GOVERNMENT):
// Tier 6: REGIONAL_AVERAGE
const regionalAvg = await db.execute(sql`
  SELECT avg_price_per_unit_cents, store_count, most_common_unit, most_recent_date
  FROM regional_price_averages
  WHERE ingredient_id = ${ingredientId}
`)
if (regionalAvg && regionalAvg.most_recent_date > sixtyDaysAgo) {
  return {
    cents: regionalAvg.avg_price_per_unit_cents,
    unit: regionalAvg.most_common_unit,
    source: 'regional_average',
    sourceTier: 'regional_average',
    store: `Regional Average (${regionalAvg.store_count} stores)`,
    confidence: 0.5,
    freshness: computeFreshness(regionalAvg.most_recent_date),
    confirmedAt: regionalAvg.most_recent_date,
    reason: null,
  }
}

// After Tier 8 (HISTORICAL), before Tier 10 (NONE):
// Tier 9: CATEGORY_BASELINE
const categoryBaseline = await db.execute(sql`
  SELECT median_cents_per_unit, most_common_unit, ingredient_count
  FROM category_price_baselines
  WHERE category = ${ingredient.category}
`)
if (categoryBaseline) {
  return {
    cents: categoryBaseline.median_cents_per_unit,
    unit: categoryBaseline.most_common_unit,
    source: 'category_baseline',
    sourceTier: 'category_baseline',
    store: `${ingredient.category} category estimate`,
    confidence: 0.2,
    freshness: 'stale',
    confirmedAt: null,
    reason: `Based on median of ${categoryBaseline.ingredient_count} ${ingredient.category} ingredients`,
  }
}
```

### Conversion Engine (`lib/units/conversion-engine.ts`)

Add count-to-weight lookup:

```typescript
export function convertCountToWeight(
  ingredientName: string,
  countUnit: string,
  quantity: number
): { grams: number; notes: string } | null {
  // Look up system_ingredients for count_weight_grams
  // where name matches (fuzzy) and count_unit matches countUnit
  // Return quantity * count_weight_grams
}
```

This plugs into `computeIngredientCost()` as a pre-conversion step: if recipe unit is a count type and price is per weight, try count-to-weight conversion first.

---

## Verification Steps

1. Run migration to add columns and create materialized views
2. Refresh materialized views: `REFRESH MATERIALIZED VIEW regional_price_averages`
3. Verify regional_price_averages has rows: `SELECT COUNT(*) FROM regional_price_averages`
4. Verify category_price_baselines has rows: `SELECT COUNT(*) FROM category_price_baselines`
5. Test price resolution for an ingredient with no exact store price but multiple stores have it:
   - Should return "Regional Average (N stores)" at confidence 0.5
6. Test price resolution for a completely unknown ingredient:
   - Should return "X category estimate" at confidence 0.2, not "No data"
7. Test count-to-weight conversion: "1 bunch cilantro" with per-oz pricing should return a cost
8. Test name normalization: "Fresh Organic Cilantro (chopped)" should normalize to "cilantro"
9. Run full price refresh and verify more ingredients now have prices
10. `npx tsc --noEmit --skipLibCheck` exits 0
11. `npx next build --no-lint` exits 0

---

## Out of Scope

- Store-specific price comparison UI (separate feature)
- Vendor sheet import/parsing (separate feature)
- Automatic reorder/purchasing recommendations (separate feature)
- Price alerts or notifications when prices change significantly (separate feature)
- Receipt scanning/OCR for Tier 1 data entry (exists separately)
- Pi catalog expansion (Aldi, Costco, etc.) is operational work, not this spec

---

## Notes for Builder Agent

1. **Materialized views vs regular views:** Must be materialized for performance (these aggregate thousands of price history rows). Refresh after each sync. Use `CONCURRENTLY` to avoid locking during refresh.

2. **The 10-tier chain must remain backward-compatible.** Existing tiers 1-8 don't change. New tiers 6 and 9 are inserted between existing ones. The `PriceSource` type and `PriceTier` type in resolve-price.ts need updating.

3. **Name normalizer is a pure function.** No database, no auth. Export it from its own file so both sync and recipe matching can import it.

4. **Count-to-weight data lives in system_ingredients** (already seeded with 563 items). The migration adds columns and seeds equivalents for the most common count units. The conversion engine reads this at runtime.

5. **Regional averages need at least 2 stores** to be meaningful. A single-store price is already captured by tiers 3-5. The value of tier 6 is specifically that it aggregates across stores.

6. **Category baselines need at least 5 ingredients** in the category to be meaningful. A category with only 2 known prices would produce a misleading baseline.

7. **USDA expansion:** The `lib/grocery/usda-prices.ts` file has ~95 items. Expanding to 500+ should use USDA's actual "Average Price" dataset for the Northeast Urban region. The data is public. Hardcode it the same way the existing 95 items are hardcoded.

8. **Confidence scoring:** Regional average (0.5) should be LOWER than any single-store real price (0.6-1.0) but HIGHER than government baseline (0.4). Category baseline (0.2) is the lowest real confidence, only above "none" (0.0). This ensures the system always prefers real data over estimates.

9. **No em dashes** anywhere.

10. **Tenant scoping:** Regional averages are per-tenant (each chef has their own ingredient_price_history). Category baselines could be cross-tenant for shared system ingredients, but for simplicity, keep them per-tenant in V1.

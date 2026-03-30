# Universal Price Intelligence: Build Summary

> **Date:** 2026-03-30
> **Spec:** `docs/specs/universal-price-intelligence.md`
> **Status:** Built, pending migration application and verification

---

## What Was Built

### 10-Tier Price Resolution Chain (expanded from 8)

The price resolution chain in `lib/pricing/resolve-price.ts` now has 10 tiers:

1. **RECEIPT** (1.0 confidence) - Chef's own purchases
2. **API_QUOTE** (0.75) - Kroger/Spoonacular/MealMe APIs
3. **DIRECT_SCRAPE** (0.85) - OpenClaw store website prices
4. **FLYER** (0.7) - Weekly circular prices
5. **INSTACART** (0.6) - Instacart catalog (markup-adjusted)
6. **REGIONAL_AVERAGE** (0.5) - NEW: Cross-store average from 2+ stores
7. **GOVERNMENT** (0.4) - USDA/BLS Northeast regional
8. **HISTORICAL** (0.3) - Chef's own purchase history average
9. **CATEGORY_BASELINE** (0.2) - NEW: Category-level median price
10. **NONE** (0.0) - No data available

Both single-resolve (`resolvePrice()`) and batch-resolve (`resolvePricesBatch()`) functions updated.

### New Files Created

| File                                                                          | Purpose                                                                                                                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/pricing/cross-store-average.ts`                                          | Queries `regional_price_averages` materialized view. Single + batch lookups. Also provides `refreshPriceViews()` for post-sync refresh.      |
| `lib/pricing/category-baseline.ts`                                            | Queries `category_price_baselines` materialized view. Single + batch lookups.                                                                |
| `lib/pricing/name-normalizer.ts`                                              | Pure function `normalizeIngredientName()`. Strips prefixes (fresh, organic, dried, etc.), parentheticals, brand qualifiers. No DB, no auth.  |
| `database/migrations/20260401000136_count_equivalents_and_price_averages.sql` | Adds `count_unit`, `count_weight_grams`, `count_notes` to `system_ingredients`. Creates both materialized views. Seeds count-to-weight data. |

### Modified Files

| File                                 | What Changed                                                                                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/pricing/resolve-price.ts`       | Added `regional_average` and `category_baseline` to PriceSource type. Added Tier 6 (regional average) and Tier 9 (category baseline) to both single and batch resolution. Updated header docs.                             |
| `lib/openclaw/sync.ts`               | Imports name normalizer and view refresh. Sends both original and normalized ingredient names to Pi for better match rates. Refreshes materialized views after sync completes (non-blocking).                              |
| `lib/units/conversion-engine.ts`     | Added `COUNT_TO_WEIGHT_GRAMS` lookup table (50+ ingredients). Added `convertCountToGrams()` and `computeIngredientCostWithCountConversion()` functions for count-to-weight costing.                                        |
| `lib/grocery/usda-prices.ts`         | Expanded from ~95 to 500+ USDA NE price entries covering proteins (100+), dairy (60+), produce (180+), oils, baking, pantry, canned, condiments, nuts/seeds, spices (80+), herbs, alcohol, and international pantry items. |
| `components/pricing/price-badge.tsx` | Added `regional_average` and `category_baseline` labels to the source display switch.                                                                                                                                      |

---

## Pending Steps

1. **Apply migration**: `drizzle-kit push` or manual SQL execution (requires user approval per CLAUDE.md)
2. **Refresh materialized views**: After migration and with price data present, run `REFRESH MATERIALIZED VIEW regional_price_averages` and `REFRESH MATERIALIZED VIEW category_price_baselines`
3. **Verify views have data**: Views require existing `ingredient_price_history` rows from OpenClaw sources
4. **Full build check**: Run `npx next build --no-lint` after migration is applied
5. **Playwright verification**: Test that new price tiers appear in recipe cost breakdown UI

---

## Architecture Notes

- Materialized views are refreshed automatically after each Pi sync (non-blocking, fire-and-forget)
- Regional average requires 2+ stores for the same ingredient (HAVING clause in view)
- Category baseline requires 5+ ingredients in the category (HAVING clause in view)
- Name normalization strips up to 5 stacked prefixes ("fresh organic large" -> just the ingredient)
- Count-to-weight conversion works both directions (count->weight and weight->count)
- All new code is backward-compatible; existing 8-tier chain works identically if views don't exist yet
- All new functions gracefully handle missing materialized views (try/catch with console.warn)

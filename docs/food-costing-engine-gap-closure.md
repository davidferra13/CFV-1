# Food Costing Engine: Gap Closure

**Date:** 2026-03-15
**Branch:** feature/openclaw-adoption

## What Changed

Six gaps in the food costing and inventory engine were closed, completing the system from ~85% to ~98% feature coverage.

### Phase 1: Universal Unit Conversion Engine

- **New:** `lib/units/conversion-engine.ts` - Single canonical module for all culinary unit conversions
- Handles same-type (volume-to-volume, weight-to-weight), cross-type (volume-to-weight via density), and cost normalization
- Includes `COMMON_DENSITIES` lookup table (~70 common ingredients with g/ml values from USDA + CIA Baking data)
- Functions: `convertQuantity()`, `convertWithDensity()`, `convertCostToUnit()`, `computeIngredientCost()`, `lookupDensity()`, `canConvert()`, `normalizeUnit()`, `getUnitType()`
- **Modified:** `lib/finance/food-cost-calculator.ts` - Added `calculateRecipeFoodCostWithUnits()` that handles mismatched recipe/cost units

### Phase 2: Ingredient Price History

- **New migration:** `20260401000061_ingredient_price_history.sql` - Append-only price log with source tracking
- **New view:** `ingredient_monthly_price_avg` - Monthly aggregated prices for trend charts
- **New:** `lib/inventory/price-history-actions.ts` - Server actions for recording, querying, trend analysis, and seasonal patterns
- Functions: `recordPricePoint()`, `getIngredientPriceHistory()`, `getIngredientPriceTrend()`, `getSeasonalPricePattern()`, `getMonthlyPriceAverages()`
- **Modified:** `lib/inventory/purchase-order-actions.ts` - `receivePOItems()` now auto-records price history on PO receipt

### Phase 3: Multi-Vendor Price Comparison

- **New migration:** `20260401000062_vendor_ingredient_pricing.sql` - Extends `vendor_preferred_ingredients` with per-vendor pricing, lead times, min order quantities
- **New view:** `ingredient_best_vendor_price` - Best price per ingredient across all vendors
- **New:** `lib/inventory/vendor-comparison-actions.ts` - Server actions for price comparison and best-price selection
- Functions: `getVendorPricesForIngredient()`, `getBestPriceVendor()`, `upsertVendorIngredientPricing()`, `deleteVendorIngredientPricing()`

### Phase 4: Auto-Reorder from Par Levels

- **New:** `lib/inventory/auto-reorder-actions.ts` - Generates draft POs from demand forecast shortfalls and par level deficits
- Uses existing `getReorderSuggestions()` + `createPurchaseOrder()` + `addPOItem()` infrastructure
- Respects `reorder_settings.reorder_qty` when set, falls back to calculated deficit
- Functions: `previewAutoReorder()` (read-only preview), `generateAutoReorderPOs()` (creates draft POs)

### Phase 5: Cost Variance Alerts

- **New migration:** `20260401000063_variance_alert_settings.sql` - Per-chef threshold configuration
- **New:** `lib/inventory/variance-alert-actions.ts` - Threshold monitoring with notification integration
- Functions: `getVarianceAlertSettings()`, `updateVarianceAlertSettings()`, `checkVarianceAlerts()`
- Sends notification via existing `createNotification()` when actual spend exceeds estimate beyond threshold

### Phase 6: Industry Benchmark Data

- **New:** `lib/finance/industry-benchmarks.ts` - Pure TypeScript constants with no server dependencies
- `FOOD_COST_BY_CUISINE` - 17 cuisine types with target range, warning threshold
- `YIELD_BY_CATEGORY` - 30+ ingredient categories with USDA-sourced yield percentages
- `PORTIONS_BY_SERVICE_STYLE` - 8 service styles with food quantity multipliers and expected waste %
- `WASTE_BY_OPERATION` - 7 operation types with target and acceptable waste thresholds
- Functions: `getFoodCostRatingByCuisine()`, `getYieldBenchmark()`, `getCuisineOptions()`, `getServiceStyleOptions()`

## Architecture Decisions

- **Formula > AI:** All new code is deterministic. Zero Ollama/cloud dependency.
- **Additive migrations only:** No DROP, DELETE, or ALTER TYPE statements.
- **Append-only patterns:** Price history follows the same immutable ledger pattern as inventory transactions and financial entries.
- **Non-blocking side effects:** Price history recording, notification sending all wrapped in try/catch to never block the main operation.
- **Existing infrastructure reuse:** Auto-reorder uses existing PO creation. Variance alerts use existing notification system. No new tables for features that can compose existing ones.

## Files Created

- `lib/units/conversion-engine.ts`
- `lib/finance/industry-benchmarks.ts`
- `lib/inventory/price-history-actions.ts`
- `lib/inventory/vendor-comparison-actions.ts`
- `lib/inventory/auto-reorder-actions.ts`
- `lib/inventory/variance-alert-actions.ts`
- `supabase/migrations/20260401000061_ingredient_price_history.sql`
- `supabase/migrations/20260401000062_vendor_ingredient_pricing.sql`
- `supabase/migrations/20260401000063_variance_alert_settings.sql`

## Files Modified

- `lib/finance/food-cost-calculator.ts` - Added unit-aware cost calculation
- `lib/inventory/purchase-order-actions.ts` - Hooked in price history recording
- `lib/events/transitions.ts` - Hooked `checkVarianceAlerts()` into event FSM "completed" transition
- `lib/inventory/variance-actions.ts` - Wired conversion engine for unit-normalized expected vs actual comparison

## UI Components (Phase 7)

All four UI components built to close the final gap:

- `components/inventory/price-history-chart.tsx` - Recharts line chart with monthly avg prices, trend badge (rising/falling/stable), min/max/current summary
- `components/inventory/vendor-comparison-panel.tsx` - Multi-vendor price comparison with best-price highlight, lead times, min order quantities
- `components/inventory/auto-reorder-panel.tsx` - Preview + generate draft POs from par-level shortfalls, grouped by vendor
- `components/inventory/variance-alert-settings.tsx` - Threshold slider (5-50%), enable/disable toggles, save to DB

## Status: Complete

All 6 backend phases + UI components + event FSM wiring + variance unit normalization are done. The food costing engine is at ~100% feature coverage.

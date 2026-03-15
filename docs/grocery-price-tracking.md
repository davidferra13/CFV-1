# Grocery Price Tracking (Feature 3.14)

## Overview

Receipt-based grocery price history tracking. Chefs log prices from receipts to build a personal price database over time, enabling cost estimation and trend analysis.

## Architecture

### Database

- **Table:** `grocery_price_entries` (migration `20260401000027`)
- **Columns:** id, chef_id, ingredient_name, unit, price_cents, quantity, store_name, receipt_date, notes, created_at
- **Indexes:** (chef_id, ingredient_name), (chef_id, store_name)
- **RLS:** chef_id = auth.uid() on all operations

### Server Actions (`lib/finance/grocery-price-actions.ts`)

| Action | Purpose |
|--------|---------|
| `addPriceEntry` | Log a single price from a receipt |
| `bulkAddPrices` | Batch entry for a full receipt |
| `deletePriceEntry` | Remove a logged entry |
| `getPriceHistory` | Retrieve entries with optional ingredient/store filter |
| `getIngredientPriceStats` | Min, max, avg, latest, trend for one ingredient |
| `getFrequentIngredients` | Top 20 most-logged ingredients with latest price |
| `getPriceComparison` | Compare one ingredient's price across stores |
| `getStoreSummary` | All stores with total spend, visit count, avg basket |

### UI Components

| Component | Path | Purpose |
|-----------|------|---------|
| `GroceryPriceLog` | `components/finance/grocery-price-log.tsx` | Quick entry form (single + bulk), recent entries table, filters |
| `GroceryPriceTrends` | `components/finance/grocery-price-trends.tsx` | Per-ingredient stats, trend arrows, store comparison, top 10 chart |
| `GroceryPriceWidget` | `components/dashboard/grocery-price-widget.tsx` | Dashboard widget with monthly spend, avg change, price alerts |

## Key Design Decisions

**Formula over AI.** All trend calculations are deterministic math. No LLM calls.

- Trend direction: compare average of last 5 entries vs previous 5. More than 5% change = up/down, otherwise stable.
- Price alerts: ingredient with >15% increase from historical average to latest price.
- Unit prices: all comparisons use price_cents / quantity for fair cross-quantity comparison.

**Ingredient names normalized.** Stored lowercase/trimmed for consistent grouping.

**Cents everywhere.** All prices stored as integers in cents per project convention.

**Optimistic deletes with rollback.** Delete updates UI immediately, rolls back on server failure.

## How It Works

1. Chef enters prices from a receipt (single entry or bulk mode for the whole receipt).
2. System normalizes ingredient names and stores prices in cents.
3. Over time, the price database grows and enables:
   - Trend analysis per ingredient (going up, down, or stable)
   - Store comparison (which store has better prices for a given ingredient)
   - Spending tracking (monthly grocery spend)
   - Price alerts (ingredients with significant recent increases)
4. Dashboard widget surfaces actionable alerts without requiring chef to visit the full price tracking page.

# Physical Inventory Stocktake (Feature U10)

Periodic physical inventory counting workflow for ChefFlow. Close the kitchen, count everything, reconcile against system quantities, log variances, adjust inventory.

## Overview

Every food business does physical counts weekly or monthly. This feature provides:

1. **Start a count** - pulls all tracked inventory items with their current system quantities as "expected"
2. **Count items** - mobile-friendly interface with large inputs, +/- buttons, progress tracking
3. **Reconcile variances** - review items where counted differs from expected, assign reasons (waste, theft, spoilage, recording error, donation, unknown)
4. **Adjust inventory** - optionally update system quantities to match physical counts
5. **Track trends** - see if variance $ is decreasing over time (are you getting better at inventory control?)

## Database Tables

### `stocktakes`

Header record for each count session.

| Column               | Type              | Description                               |
| -------------------- | ----------------- | ----------------------------------------- |
| id                   | uuid PK           | Auto-generated                            |
| tenant_id            | uuid FK chefs(id) | Tenant scoping                            |
| name                 | text              | "Weekly Count 3/10", "Monthly Full Count" |
| stocktake_date       | date              | When the count was performed              |
| status               | text              | in_progress, completed, cancelled         |
| started_at           | timestamptz       | When counting began                       |
| completed_at         | timestamptz       | When reconciliation finished              |
| counted_by           | text              | Who performed the count                   |
| notes                | text              | General notes                             |
| total_items          | integer           | Number of items in the count              |
| variance_items       | integer           | Items with discrepancies                  |
| variance_value_cents | integer           | Total dollar value of all variances       |

### `stocktake_items`

Line items for each ingredient being counted.

| Column               | Type                   | Description                                                |
| -------------------- | ---------------------- | ---------------------------------------------------------- |
| id                   | uuid PK                | Auto-generated                                             |
| tenant_id            | uuid FK chefs(id)      | Tenant scoping                                             |
| stocktake_id         | uuid FK stocktakes(id) | Parent stocktake                                           |
| ingredient_name      | text                   | Item being counted                                         |
| expected_quantity    | numeric                | System quantity at time of count                           |
| counted_quantity     | numeric                | Actual physical count                                      |
| unit                 | text                   | Unit of measure                                            |
| variance             | numeric                | counted - expected                                         |
| variance_percent     | numeric                | Percentage difference                                      |
| unit_cost_cents      | integer                | For calculating dollar impact                              |
| variance_value_cents | integer                | variance \* unit_cost                                      |
| variance_reason      | text                   | waste, theft, recording_error, spoilage, donation, unknown |
| adjusted             | boolean                | Whether inventory was adjusted to match count              |
| notes                | text                   | Per-item notes                                             |

Both tables have RLS on tenant_id.

## Server Actions

All in `lib/inventory/stocktake-actions.ts`. All use `requireChef()` and tenant scoping. All deterministic (no AI).

- `startStocktake(name, countedBy?)` - creates stocktake, pulls inventory_counts as expected quantities
- `getActiveStocktake()` - finds in_progress stocktake
- `getStocktake(id)` - full stocktake with items
- `updateCount(itemId, countedQuantity)` - record a count, auto-compute variance
- `batchUpdateCounts(items)` - update multiple counts
- `setVarianceReason(itemId, reason, notes?)` - explain a discrepancy
- `toggleAdjusted(itemId, adjusted)` - mark item for inventory adjustment
- `completeStocktake(id)` - calculate summaries, mark complete, adjust marked items
- `adjustInventory(stocktakeId)` - update inventory_counts to match counted quantities
- `getStocktakeHistory(limit?)` - past stocktakes
- `getVarianceTrend(limit?)` - variance $ over time
- `getTopVarianceItems(days?)` - items with frequent/large variances
- `cancelStocktake(id)` - cancel an in-progress count

## Pages

| Route                                 | Purpose                              |
| ------------------------------------- | ------------------------------------ |
| `/inventory/stocktake`                | Start new or resume active stocktake |
| `/inventory/stocktake/[id]`           | Counting interface                   |
| `/inventory/stocktake/[id]/reconcile` | Variance review and reconciliation   |
| `/inventory/stocktake/history`        | Past stocktakes and trend            |

## Components

- `components/inventory/stocktake-counter.tsx` - mobile-optimized counting UI with large inputs, +/- buttons, item list, progress bar, auto-save
- `components/inventory/stocktake-reconciliation.tsx` - variance table with color coding (green <5%, yellow 5-15%, red >15%), reason dropdowns, adjust checkboxes
- `components/inventory/stocktake-history.tsx` - past stocktakes table with variance trend chart

## Workflow

1. Chef navigates to `/inventory/stocktake`
2. Names the count (defaults to "Count [date]"), optionally enters who is counting
3. System pulls all inventory items with current quantities
4. Chef walks through kitchen counting each item, entering actual quantities
5. Progress bar shows completion (auto-saves each count)
6. When done counting, navigates to reconciliation
7. Reviews items with variances, assigns reasons
8. Checks "Adjust" for items where the count should become the new system quantity
9. Clicks "Complete Stocktake" to finalize
10. System adjusts inventory_counts for marked items and records the stocktake

## Migration

File: `supabase/migrations/20260331000023_stocktakes.sql`

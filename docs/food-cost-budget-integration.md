# Feature 3: Food Cost Budget Integration

## Summary

Bridges the grocery quote estimate into the event financial summary so chefs see predicted vs actual food cost at a glance.

## What Changed

### 1. `lib/grocery/pricing-actions.ts` — Persist estimate to event

After a grocery price quote completes and the `grocery_price_quotes` row is marked `complete`, we now write the `averageTotal` (sum of NE-calibrated average prices across all ingredients) to `events.estimated_food_cost_cents`. This is a **non-blocking** write wrapped in `try/catch` per project rules — if it fails, the quote still returns normally.

The column `estimated_food_cost_cents` was added by migration `20260322000027_estimated_food_cost.sql`.

### 2. `lib/expenses/actions.ts` — Add estimate to profit summary

`getEventProfitSummary()` now:

- Includes `estimated_food_cost_cents` in the event data `.select()` query
- Returns a new `estimatedFoodCost` object with four fields:
  - `estimatedCents` — the grocery quote estimate (from the event row)
  - `actualCents` — sum of groceries + alcohol + specialty_items expenses (null if zero)
  - `deltaCents` — `actual - estimated` (null if either is missing)
  - `deltaPct` — percentage delta as a string like `"12.5"` (null if either is missing)

### 3. `app/(chef)/events/[id]/page.tsx` — Display in Profit Summary

Added two conditional displays in the Profit Summary section (inside the `flex flex-wrap gap-4` row of stat spans):

1. **Both estimate and actual exist**: Shows `Estimated: $X -> Actual: $Y (+/-Z%)` with color coding:
   - Green (`text-emerald-600`) if delta within +/-10%
   - Amber (`text-amber-600`) if delta exceeds 10%

2. **Estimate exists but no actual expenses**: Shows `Estimated food cost: $X (from grocery quote)` in neutral stone color.

### 4. `components/events/grocery-quote-panel.tsx` — Confirmation message

After a fresh (non-cached) quote is generated, a blue info line appears in the actions card: "Estimate saved to event — visible in Profit Summary." This gives the chef immediate feedback that the estimate has been persisted.

## Data Flow

```
Chef runs grocery quote
  -> pricing-actions.ts computes averageTotalCents
  -> Writes to grocery_price_quotes (as before)
  -> NEW: Writes to events.estimated_food_cost_cents (non-blocking)
  -> Panel shows "Estimate saved to event" confirmation

Chef views event detail
  -> getEventProfitSummary() reads estimated_food_cost_cents from event
  -> Compares with actual food expenses (groceries + alcohol + specialty)
  -> Returns estimatedFoodCost { estimatedCents, actualCents, deltaCents, deltaPct }
  -> Profit Summary section renders the comparison
```

## Files Modified

| File                                        | Change                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `lib/grocery/pricing-actions.ts`            | Non-blocking write of `averageTotal` to `events.estimated_food_cost_cents`             |
| `lib/expenses/actions.ts`                   | Added `estimated_food_cost_cents` to event select; added `estimatedFoodCost` to return |
| `app/(chef)/events/[id]/page.tsx`           | Estimated vs actual display in Profit Summary section                                  |
| `components/events/grocery-quote-panel.tsx` | "Estimate saved to event" confirmation line                                            |

## Dependencies

- Migration `20260322000027_estimated_food_cost.sql` must be applied (adds `estimated_food_cost_cents` column to `events`)
- Uses `as any` cast for the new column since `types/database.ts` has not been regenerated yet

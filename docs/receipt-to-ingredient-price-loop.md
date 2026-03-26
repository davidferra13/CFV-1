# Receipt-to-Ingredient Price Auto-Population Loop

**Date:** 2026-03-26
**Status:** Implemented

## What Changed

The receipt approval flow (`approveReceiptSummary` in `lib/receipts/actions.ts`) now automatically propagates prices from approved receipts all the way through to the ingredient costing engine. Previously, the flow stopped after creating expense line items with ingredient matches. Prices never reached the ingredients table or price history without manual intervention.

## The Full Loop (Before vs After)

### Before (broken at step 4)

1. Chef uploads receipt photo
2. OCR extracts line items (store, items, prices)
3. Chef approves receipt
4. Business items copied to `expenses` table
5. Expense line items created with auto-matched `ingredient_id` (confidence >= 0.7)
6. **STOP** - `price_applied` stays false, `ingredients.cost_per_unit_cents` never updated

### After (fully closed)

1-5 same as above, then: 6. `applyLineItemPrices()` called for each expense with matched ingredients 7. `ingredients.last_price_cents` AND `ingredients.cost_per_unit_cents` updated 8. `logIngredientPrice()` writes to `ingredient_price_history` (store, date, price) 9. `updateIngredientPriceFields()` recomputes `average_price_cents` from full history

## Files Modified

- **`lib/receipts/actions.ts`** - Added auto-apply and price history logging after line item creation
- **`lib/finance/expense-line-item-actions.ts`** - `applyLineItemPrices()` now also updates `cost_per_unit_cents` (the field the costing engine reads), not just `last_price_cents`

## How It Works

All three steps are non-blocking (wrapped in try/catch). If any price update fails, the receipt approval still succeeds. The expense and line items are already created.

1. **Auto-match** (already existed): `suggestIngredientMatches()` uses deterministic string similarity with 26 abbreviation expansions and 39 food word bonuses. Threshold: 0.7 confidence.

2. **Price apply** (new wiring): `applyLineItemPrices(expenseId)` finds all matched, unapplied line items on that expense, computes unit price (amount / quantity), and writes to `ingredients.last_price_cents`, `ingredients.cost_per_unit_cents`, and `ingredients.last_price_date`.

3. **Price history** (new wiring): `logIngredientPrice()` writes to `ingredient_price_history` with store name, enabling trend tracking (cheapest store, price alerts at 30%+ above average, confidence scoring).

## Impact on Costing Engine

The costing engine (`compute_recipe_cost_cents` SQL function) reads `ingredients.cost_per_unit_cents`. Before this change, that field was only populated by manual entry. Now every approved receipt with matched ingredients automatically feeds fresh prices into the costing pipeline:

```
receipt approval
  → ingredient.cost_per_unit_cents updated
    → recipe_cost_summary view reflects new cost
      → menu_cost_summary view reflects new cost
        → food_cost_percentage recalculated
```

## Remaining Gaps

- **Quantity extraction**: Receipt OCR doesn't always capture quantity (e.g., "2 lbs chicken"). When quantity is missing, price-per-unit assumes qty=1, which may overstate the unit price. Future: improve OCR quantity parsing.
- **Unit mismatch**: If the receipt price is for "1 bag" but the ingredient is priced per "lb", the unit price won't be comparable. Future: unit normalization at matching time.
- **Low-confidence matches**: Items below 0.7 confidence are skipped entirely. Future: present these to the chef for manual confirmation in the UI.

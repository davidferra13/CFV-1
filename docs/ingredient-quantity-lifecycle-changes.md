# Ingredient Quantity Lifecycle - Implementation Summary

**Date:** 2026-04-17
**Spec:** `docs/specs/ingredient-quantity-lifecycle.md`
**Question Set:** `docs/specs/ingredient-lifecycle-question-set.md`

---

## Problem

ChefFlow had the schema for ingredient yield tracking (trim loss, fillet yield, peel waste) but zero write paths. Every `yield_pct` value was the default 100. Shopping lists told chefs to buy the recipe quantity, ignoring that 15-55% of many ingredients get lost to prep. Two separate shopping list generators used different scaling formulas, producing different quantities for the same event. The grocery list silently dropped sub-recipe ingredients.

## What Changed

### Phase 1: Unblock the Dead System (IL1, IL2, IL3, IL4, IL19)

**Yield write path (`lib/recipes/actions.ts`):**

- `AddIngredientToRecipeSchema` + `UpdateRecipeIngredientSchema`: accept `yield_pct` (int, 5-100)
- `CreateIngredientSchema` + `UpdateIngredientSchema`: accept `default_yield_pct` (int, 5-100)
- All four server actions wire the field to DB insert/update
- `computeRecipeIngredientCost()` accepts `overrideYieldPct` param; per-ingredient yield takes precedence over ingredient default
- `lib/pricing/cost-refresh-actions.ts` passes yield through during batch refresh

**Waste factor bridge (`lib/openclaw/reference-library-actions.ts`):**

- New `suggestYieldByName(ingredientName)` function
- Exact match on `ingredient_waste_factors`, fuzzy fallback
- Returns `{ prepMethod, yieldPct, source }[]` for UI auto-suggestion

**Scaling unification:**

- Both generators now use: `(guestCount / recipeServings) * components.scale_factor`
- Shopping list (`lib/culinary/shopping-list-actions.ts`): refactored `getRecipeMultipliersForEvents()` to trace event -> menu -> dish -> component, fetch guest counts and recipe servings
- Grocery list (`lib/grocery/generate-grocery-list.ts`): now fetches and applies `scale_factor`

**Sub-recipe completeness:**

- Grocery list (`lib/grocery/generate-grocery-list.ts`): added recursive `recipe_sub_recipes` traversal with correct scaling and yield adjustment

**Yield safety:**

- Application-layer validation: 5-100 range (Zod schemas)
- Runtime floor: `Math.max(yieldPct, 1)` prevents division by zero
- DB constraint unchanged: `> 0 AND <= 100`

### Phase 2: Data Layer Integrity (IL5, IL9, IL10, IL12)

**Yield inflation verification:**

- Both generators use identical formula: `quantity * multiplier * 100 / yieldPct`
- Multiplier = `(guestCount / recipeServings) * scaleFactor` in both

**Lifecycle view (`database/migrations/20260417000002_ingredient_lifecycle_view.sql`):**

- New `event_ingredient_lifecycle` DB view: 5-stage chain per ingredient per event
- Stages: recipe_qty, buy_qty (yield-adjusted), purchased_qty, used_qty, computed_leftover_qty
- Variance columns: purchase_variance_qty, usage_variance_qty

**Lifecycle server action (`lib/culinary/ingredient-lifecycle.ts`):**

- `getEventIngredientLifecycle(eventId)` returns full lifecycle per ingredient
- `null` = not recorded; `0` = recorded as zero (IL12 fix)
- Cost totals: recipeCostCents, buyCostCents, purchasedCostCents

**Unit conversion in shopping list (`lib/culinary/shopping-list-actions.ts`):**

- Aggregation now uses `normalizeUnit()`, `canConvert()`, `addQuantities()` from grocery unit-conversion module
- Same ingredient in different compatible units (cups + oz) consolidates to one line
- Incompatible units still produce separate lines

## Files Changed

| File                                                               | Changes                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `lib/recipes/actions.ts`                                           | yield_pct in 4 schemas, 4 server actions, cost computation               |
| `lib/culinary/shopping-list-actions.ts`                            | yield inflation, unified scaling, unit conversion, ShoppingListItem type |
| `lib/grocery/generate-grocery-list.ts`                             | yield inflation, scale_factor, sub-recipe recursion, GroceryItem type    |
| `lib/culinary/ingredient-lifecycle.ts`                             | NEW: lifecycle server action                                             |
| `lib/openclaw/reference-library-actions.ts`                        | NEW: suggestYieldByName()                                                |
| `lib/pricing/cost-refresh-actions.ts`                              | yield passthrough                                                        |
| `database/migrations/20260417000002_ingredient_lifecycle_view.sql` | NEW: event_ingredient_lifecycle view                                     |
| `docs/specs/ingredient-quantity-lifecycle.md`                      | NEW: full spec                                                           |
| `docs/specs/ingredient-lifecycle-question-set.md`                  | NEW: 20-question integrity set                                           |

## What's Left

**Remaining SPEC items (Phases 3-4):**

- IL6: Purchase event linkage (link inventory receives to events)
- IL7: Usage logging workflow (post-event prompted deduction)
- IL8: Leftover carry-forward reduction (auto-reduce buy qty from prior leftovers)
- IL11: Package size rounding (suggest real package sizes)
- IL13: Cost projection accuracy (single source of truth for costs)
- IL14: Multi-event ingredient allocation (split one purchase across events)
- IL15: Under-buy detection (alert when purchased < needed)
- IL16: Guest count change propagation (stale saved list warning)
- IL17: Staple ingredient handling (consistent treatment)
- IL18: Waste category consistency (numeric waste quantities everywhere)
- IL20: Prep view with adjusted quantities (chef's prep checklist)

**UI work needed to complete BUILT items:**

- Recipe ingredient form: add yield_pct input field
- Recipe ingredient form: call `suggestYieldByName()` on ingredient selection
- Ingredient master list: add default_yield_pct column/field

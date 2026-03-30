# Spec: Menu Cost Estimator (Instant Menu Costing with Gap Detection)

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `auto-costing-engine.md` (verified)
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-30
> **Built by:** not started

---

## What This Does (Plain English)

When a chef receives an inquiry with a list of dishes (e.g., "Malai Kofta, Paneer Tikka, Shahi Tukra"), they can paste those dish names into a **Menu Cost Estimator** panel. The system instantly:

1. **Matches each dish name to existing recipes** in the chef's recipe book (fuzzy name matching)
2. **Costs out matched dishes** using the existing 8-tier price resolution chain
3. **Flags unmatched dishes as "Recipe needed"** with a clear call-to-action to create the recipe
4. **Shows a live cost summary**: X of Y dishes costed, estimated total so far, cost per guest, food cost % (if event price is known)
5. **Scales costs to guest count** using recipe yield and component scale_factor

The chef sees an honest dashboard: what's costed, what's missing, and what the running total is. No fake numbers. No silent gaps. The moment a missing recipe is created and linked, the cost updates automatically.

This panel lives in two places:

- **Menu editor** (existing `app/(chef)/menus/[id]/editor/`) as an enhanced cost sidebar
- **Standalone estimator** (new `app/(chef)/menus/estimate/`) for quick paste-and-price before creating a formal menu

---

## Why It Matters

A real inquiry just came in (Indian vegetarian dinner, 7 dishes) and there's no way to instantly see "this will cost approximately $X to produce." The auto-costing engine and price database exist, but there's no UI that takes a list of dish names and shows the cost picture with gap detection. Every inquiry should be instantly estimable.

---

## Files to Create

| File                                       | Purpose                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `app/(chef)/menus/estimate/page.tsx`       | Standalone menu cost estimator page                                        |
| `lib/menus/estimate-actions.ts`            | Server actions for dish name matching and cost estimation                  |
| `components/menus/menu-cost-estimator.tsx` | Reusable estimator panel (used in both standalone page and editor sidebar) |
| `components/menus/dish-estimate-row.tsx`   | Single dish row showing match status, cost, or "Recipe needed" flag        |

---

## Files to Modify

| File                                    | What to Change                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `components/nav/nav-config.tsx`         | Add "Estimate" sub-item under Menus section                                                      |
| `app/(chef)/menus/[id]/editor/page.tsx` | Add cost estimator sidebar panel (import MenuCostEstimator)                                      |
| `lib/menus/editor-actions.ts`           | Add `getEditorDishCostBreakdown(menuId)` action that returns per-dish cost detail with gap flags |

---

## Database Changes

None. This feature uses existing tables and views:

- `recipes` (name matching)
- `recipe_cost_summary` (cost data)
- `menu_cost_summary` (aggregate costs)
- `components` (dish-recipe linking)
- `dishes` (menu structure)
- `recipe_ingredients` + `ingredients` (ingredient-level detail)

---

## Data Model

No new entities. This feature reads from existing structures:

```
Input: ["Malai Kofta", "Paneer Tikka", "Shahi Tukra", ...]
  |
  v
For each dish name:
  1. Search recipes table: name ILIKE '%malai kofta%' OR pg_trgm similarity
  2. If match found:
     - Get recipe_cost_summary for cost
     - Check has_all_prices for completeness
     - Scale by guest_count / yield_quantity
  3. If no match:
     - Flag as "Recipe needed"
     - Provide "Create Recipe" link
  |
  v
Output: DishEstimate[] with aggregated totals
```

**DishEstimate type:**

```typescript
interface DishEstimate {
  dishName: string // original input name
  status: 'costed' | 'partial' | 'no_recipe' | 'no_prices'
  matchedRecipe: {
    id: string
    name: string
    category: string
  } | null
  costCents: number | null // total recipe cost (scaled)
  costPerGuestCents: number | null
  ingredientCount: number
  pricedIngredientCount: number // how many have prices
  missingIngredients: string[] // names of unpriced ingredients
  confidence: number // 0-1, average price confidence across ingredients
  scaleFactor: number // applied scale for guest count
}

interface MenuEstimate {
  dishes: DishEstimate[]
  totalCostCents: number // sum of costed dishes only
  costPerGuestCents: number | null
  guestCount: number
  costedCount: number // dishes with full costs
  partialCount: number // dishes with some prices
  missingCount: number // dishes with no recipe
  completeness: number // 0-100 percentage
}
```

---

## Server Actions

| Action                               | Auth            | Input                                                                   | Output                                                                             | Side Effects     |
| ------------------------------------ | --------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------- |
| `estimateMenuCost(input)`            | `requireChef()` | `{ dishNames: string[], guestCount: number, eventPriceCents?: number }` | `{ success: true, estimate: MenuEstimate }` or `{ success: false, error: string }` | None (read-only) |
| `matchDishToRecipe(dishName)`        | `requireChef()` | `{ dishName: string }`                                                  | `{ matches: Array<{ id, name, category, similarity }> }`                           | None (read-only) |
| `getEditorDishCostBreakdown(menuId)` | `requireChef()` | `{ menuId: string }`                                                    | `{ dishes: DishEstimate[], totals: MenuEstimate }`                                 | None (read-only) |

### `estimateMenuCost` (core action)

```typescript
export async function estimateMenuCost(input: {
  dishNames: string[]
  guestCount: number
  eventPriceCents?: number
}): Promise<{ success: true; estimate: MenuEstimate } | { success: false; error: string }>
```

**Algorithm:**

1. For each dish name in `dishNames`:
   a. Normalize: trim, lowercase, strip common prefixes ("homemade", "fresh")
   b. Search `recipes` where `tenant_id = user.tenantId` and `archived = false`:
   - First: exact ILIKE match on name
   - Second: pg_trgm similarity > 0.3 (if pg_trgm extension available), ordered by similarity DESC
   - Third: token overlap (split both into words, count shared words / total words)
     c. Take best match (if similarity > threshold)
     d. If matched: query `recipe_cost_summary` for cost, join `recipe_ingredients` + `ingredients` for per-ingredient detail
     e. Scale: `scaledCost = recipeCost * (guestCount / recipe.yield_quantity)` (default yield = guestCount if null)
     f. If not matched: return `status: 'no_recipe'`
2. Aggregate totals
3. If `eventPriceCents` provided, compute food cost percentage

### `getEditorDishCostBreakdown` (for existing menu editor)

Works on an already-created menu. Instead of name matching (recipes are already linked via components), it reads the component -> recipe -> recipe_cost_summary chain and returns the same DishEstimate format with:

- Dishes where `component.recipe_id IS NULL` flagged as `no_recipe`
- Dishes where recipe exists but `has_all_prices = false` flagged as `partial`
- Full ingredient-level breakdown for each dish

---

## UI / Component Spec

### Standalone Estimator Page (`/menus/estimate`)

**Layout:**

- Page title: "Menu Cost Estimator"
- Left panel (60%): Dish input area
- Right panel (40%): Cost summary dashboard

**Dish Input Area:**

- Large textarea: "Paste dish names (one per line)" with placeholder showing example
- "Estimate" button below textarea
- Guest count input (number, default 2)
- Optional: event price input for food cost % calculation

**After estimation, the textarea is replaced by a dish list:**

Each dish row (`DishEstimateRow` component) shows:

- Dish name (original input)
- Status badge:
  - Green "Costed" with checkmark (all ingredients priced)
  - Yellow "Partial" with warning icon (some ingredients missing prices)
  - Red "Recipe Needed" with plus icon (no matching recipe found)
  - Gray "No Prices" (recipe exists but zero ingredients have prices)
- If matched: recipe name link, cost in dollars, ingredient count "12/12 priced"
- If partial: recipe name link, cost so far, "8/12 priced" with list of missing
- If no_recipe: "Create Recipe" button that navigates to `/recipes/new?name={encodedDishName}`

**Cost Summary Dashboard (right panel):**

- Big number: estimated total cost (sum of costed dishes only)
- Cost per guest
- Food cost % (if event price provided)
- Completeness bar: "5 of 7 dishes costed (71%)"
- Confidence indicator: average confidence across all resolved prices
- Warning if any dishes are uncosted: "2 dishes need recipes before the estimate is complete"

### Menu Editor Integration

In the existing menu editor (`/menus/[id]/editor/`), add a collapsible "Cost Breakdown" panel in the sidebar that shows:

- Per-dish cost breakdown using `getEditorDishCostBreakdown`
- Same DishEstimateRow components
- Same summary dashboard
- "Recipe needed" flags for unlinked components
- Auto-refreshes when recipes are linked/unlinked

### States

- **Loading:** Skeleton cards in dish list, spinner on summary numbers
- **Empty:** Textarea with helpful placeholder text ("Paste your menu items here, one per line")
- **Error:** "Could not estimate costs" with error detail (never show $0.00 on failure)
- **Populated:** Full dish list with cost breakdown and summary

### Interactions

- Paste dish names -> click "Estimate" -> server action runs -> results appear
- Click "Create Recipe" on a missing dish -> navigates to recipe creation with name pre-filled
- Change guest count -> re-estimates with new scale factors (client-side recalc from existing data)
- Click a matched recipe name -> navigates to recipe detail page

---

## Edge Cases and Error Handling

| Scenario                           | Correct Behavior                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dish name matches multiple recipes | Show top match with > 0.5 similarity. If ambiguous (top 2 within 0.1 of each other), show "Multiple matches" with picker                          |
| Recipe has no yield_quantity       | Default to guestCount (scale factor = 1.0). Show info badge: "No yield declared"                                                                  |
| All dishes are "Recipe needed"     | Show $0.00 total with clear message: "No dishes could be costed. Create recipes to get estimates."                                                |
| Server action fails                | Show error state. Never show $0.00 as if it's a real cost.                                                                                        |
| Duplicate dish names in input      | Deduplicate, show each once. If the same dish appears multiple times (e.g., "Naan" x2), count it once for matching but scale quantity accordingly |
| Empty input                        | Disable "Estimate" button. Show placeholder guidance                                                                                              |
| Very long dish list (50+)          | Process in batches of 20. Show progress indicator                                                                                                 |
| pg_trgm not available              | Fall back to ILIKE + token overlap matching only. Log warning but don't fail                                                                      |
| Zero-priced ingredients            | Skip from cost calculation. Flag ingredient as "No price data"                                                                                    |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/menus/estimate`
3. Paste: "Malai Kofta\nPaneer Tikka\nShahi Tukra\nGulab Jamun\nEgg Curry"
4. Set guest count to 2
5. Click "Estimate"
6. Verify: each dish shows either a cost or "Recipe needed" flag
7. Verify: total cost only includes costed dishes
8. Verify: completeness bar shows correct X of Y
9. Click "Create Recipe" on a missing dish, verify it navigates to `/recipes/new?name=Malai+Kofta`
10. Go back, verify estimate state persists
11. Navigate to an existing menu in the editor, verify cost breakdown panel appears
12. Screenshot the final result

---

## Out of Scope

- Recipe creation wizard (that's the existing recipe form)
- Automatic recipe generation from dish names (violates AI recipe ban in CLAUDE.md)
- Ingredient-level price editing (use the existing ingredient/pricing pages)
- Menu PDF export with costs (separate feature)
- Historical cost tracking per menu version (separate feature)
- Automatic dish-to-recipe linking on menu creation (this spec provides the tools; auto-linking is a future enhancement)

---

## Notes for Builder Agent

1. **pg_trgm availability:** The database has `pg_trgm` extension (used in `system_ingredients` table). Use `similarity()` and `%` operator for fuzzy matching. Always wrap in try/catch in case it's not enabled.

2. **Existing patterns to follow:**
   - `searchRecipesForEditor` in `lib/menus/editor-actions.ts:540-575` for recipe search pattern
   - `getEditorMenuCost` in `lib/menus/editor-actions.ts:671-693` for cost summary pattern
   - `resolvePricesBatch` in `lib/pricing/resolve-price.ts` for batch price resolution

3. **Cost computation path:** Don't re-implement cost calculation. Use the existing `recipe_cost_summary` view which already computes `total_ingredient_cost_cents`, `has_all_prices`, `cost_per_portion_cents`, and `ingredient_count`.

4. **Scaling formula** (from `lib/menus/actions.ts`):

   ```
   const yieldQty = recipe.yield_quantity || guestCount
   const scale = (guestCount / yieldQty)
   const scaledCost = recipeCost * scale
   ```

5. **Name normalization for matching:** Strip common prefixes/suffixes before matching:
   - "Homemade X" -> "X"
   - "Fresh X" -> "X"
   - "X (with Y)" -> "X"
   - Trim whitespace, normalize internal spaces

6. **Use `createServerClient()` from `lib/db/compat.ts`** for database queries, consistent with the rest of the editor actions.

7. **Nav config pattern:** Add under the existing "Menus" section in `nav-config.tsx`. Use an appropriate icon (Calculator or DollarSign from lucide-react).

8. **No em dashes** in any UI text. Use commas, semicolons, or parentheses instead.

9. **Tenant scoping:** Every query must include `.eq('tenant_id', user.tenantId!)`. No exceptions.

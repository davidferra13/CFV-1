# Recipe Costing Integrity - Build Spec

> Single source of truth for fixing 5 critical and 6 upgrade findings from the Culinary School Quality Audit.
> Every step is deterministic and sequenced in correct build order.
> No new tables. No new routes. No new components. Surgical fixes to existing code.

---

## System Overview

ChefFlow's recipe costing foundation is strong: integer cents everywhere, 10-tier price resolution, yield-aware AP-to-EP math, non-linear scaling engine. But five bugs cause systematic cost understatement, and six inconsistencies erode trust in the numbers. This spec fixes all eleven.

**Scope:** Backend computation fixes + UI wiring. No schema migrations. No new pages. Existing architecture extended, not duplicated.

**Constraint:** The `knowledge.ts` layer already contains operator targets, Q-factor defaults, archetype mapping, and warning types. The `food-cost-calculator.ts` already has operator-aware `getFoodCostRating()` and `getFoodCostBadgeColor()`. The `generate-warnings.ts` already accepts `operatorType`. All of this is built. The problem is the UI pages ignore it. This spec wires existing systems together.

---

## Architecture and Integration Points

```
chef_preferences.archetype (DB)
        |
        v
archetypeToOperatorType() (knowledge.ts:1027)
        |
        v
OPERATOR_TARGETS[operatorType] (knowledge.ts:463)
        |
        +---> qFactorDefault --> applied in refreshRecipeTotalCost()
        +---> foodCostPctLow/High --> used by UI color thresholds
        +---> getFoodCostRating() (food-cost-calculator.ts:94) <-- already built, unused by pages
        +---> generateRecipeWarnings() (generate-warnings.ts:34) <-- already built, accepts operatorType
```

```
recipe_sub_recipes (DB table)
        |
        v
refreshRecipeTotalCost() (recipes/actions.ts:2180)
        |
        +---> currently: sum recipe_ingredients only
        +---> fix: also sum child recipe costs via recipe_sub_recipes
        |
propagatePriceChange() (cost-refresh-actions.ts:18)
        |
        +---> currently: recomputes recipes using changed ingredient
        +---> fix: also walk recipe_sub_recipes upward to recompute parent recipes
```

---

## Build Sequence

### Phase 1: Core Computation Fixes (backend, no UI)

All five critical bugs. Each fix is independent; no ordering dependency within this phase.

---

#### 1A. Sub-recipe cost cascade in `refreshRecipeTotalCost`

**File:** `lib/recipes/actions.ts` lines 2180-2216

**Problem:** Only sums `recipe_ingredients.computed_cost_cents`. Sub-recipe costs excluded. `recipes.total_cost_cents` understates actual cost.

**Fix:** After summing direct ingredients, query `recipe_sub_recipes` for this recipe's children, read each child's `total_cost_cents`, multiply by sub-recipe quantity, add to total.

**Exact change at line 2195 (after the existing `totalCents` reduce):**

```typescript
// Sum sub-recipe costs (child recipe total * quantity)
const { data: subRecipes } = await db
  .from('recipe_sub_recipes')
  .select('child_recipe_id, quantity')
  .eq('parent_recipe_id', recipeId)

let subRecipeCostCents = 0
if (subRecipes && subRecipes.length > 0) {
  for (const sr of subRecipes) {
    const { data: child } = await db
      .from('recipes')
      .select('total_cost_cents')
      .eq('id', sr.child_recipe_id)
      .single()
    if (child?.total_cost_cents) {
      subRecipeCostCents += Math.round(child.total_cost_cents * (sr.quantity || 1))
    }
  }
}

const grandTotal = totalCents + subRecipeCostCents
```

Then replace all downstream references to `totalCents` with `grandTotal`:

- Line 2206: `const costPerServing = yieldQty && yieldQty > 0 ? Math.round(grandTotal / yieldQty) : null`
- Line 2211: `total_cost_cents: grandTotal > 0 ? grandTotal : null,`

**Edge cases:**

- Child recipe has `total_cost_cents = null` (uncosted): skip it, do not add 0. This matches existing behavior where unpriced ingredients are already skipped.
- Circular references: impossible at DB level (`parent_recipe_id <> child_recipe_id` constraint), and multi-hop cycles are prevented by the shopping list's `visited` set. For `refreshRecipeTotalCost`, we only go one level deep (child's stored total already includes its own children from a prior refresh). This is eventually consistent, not recursive.
- `quantity` is null: default to 1.

**Validation:** Create recipe A with 2 ingredients ($5 total). Create recipe B as sub-recipe of A with 3 ingredients ($3 total), quantity 2. After refresh, A.total_cost_cents should be $5 + ($3 \* 2) = $11, not $5.

---

#### 1B. Sub-recipe cascade in `propagatePriceChange`

**File:** `lib/pricing/cost-refresh-actions.ts` lines 65-72

**Problem:** After refreshing affected recipes, does not walk upward to parent recipes via `recipe_sub_recipes`.

**Fix:** After the existing "refresh each affected recipe total" loop (line 66-72), add:

```typescript
// Walk upward: if any affected recipe is a child in recipe_sub_recipes, refresh the parent too
try {
  const { data: parentLinks } = await db
    .from('recipe_sub_recipes')
    .select('parent_recipe_id')
    .in('child_recipe_id', recipeIds)

  if (parentLinks && parentLinks.length > 0) {
    const parentIds = [...new Set(parentLinks.map((p: any) => p.parent_recipe_id))]
    for (const parentId of parentIds) {
      if (!recipeIds.includes(parentId)) {
        await refreshRecipeTotalCost(db, tenantId, parentId)
      }
    }
  }
} catch (err) {
  console.error('[propagatePriceChange] Parent recipe cascade failed (non-blocking):', err)
}
```

**Note:** One level up is sufficient because parent's `refreshRecipeTotalCost` now reads child's stored `total_cost_cents` (from fix 1A). Deep chains settle on the next propagation cycle.

**Validation:** Change price of ingredient X. Recipe B uses X. Recipe A has B as sub-recipe. After propagation, both B.total_cost_cents and A.total_cost_cents are updated.

---

#### 1C. Q-factor application in `refreshRecipeTotalCost`

**File:** `lib/recipes/actions.ts` lines 2180-2216

**Problem:** Q-factor (incidental ingredients: oil, salt, foil, wrap) is defined per operator type in `OPERATOR_TARGETS` but never applied to any cost.

**Fix:** After computing `grandTotal` (from fix 1A), apply Q-factor before writing to DB.

The function needs the chef's archetype. It already has `tenantId`. Add a query for `chef_preferences.archetype`:

```typescript
// Get chef's operator type for Q-factor
const { data: prefs } = await db
  .from('chef_preferences')
  .select('archetype')
  .eq('chef_id', tenantId)
  .single()

const { getTargetsForArchetype } = await import('@/lib/costing/knowledge')
const targets = getTargetsForArchetype(prefs?.archetype)
const qFactorMultiplier = 1 + targets.qFactorDefault / 100

const qAdjustedTotal = Math.round(grandTotal * qFactorMultiplier)
```

Then use `qAdjustedTotal` for the DB write:

- `total_cost_cents: qAdjustedTotal > 0 ? qAdjustedTotal : null`
- `cost_per_serving_cents` also uses `qAdjustedTotal`

**Important:** Store Q-factor-inclusive cost. The Q-factor is not optional; it represents real costs (oil, salt, wrap) that every recipe incurs. Storing it inclusive means all downstream consumers (plate cost, menu cost, food cost %) automatically get the correct number without needing separate Q-factor logic.

**Edge case:** `chef_preferences` row doesn't exist: `getTargetsForArchetype(null)` falls back to `private_chef` (7% Q-factor). Safe default.

**Validation:** Recipe with $10 ingredient total, private_chef archetype. After refresh: `total_cost_cents` = 1070 (not 1000). Cost-per-serving also reflects the 7% increase.

---

#### 1D. Missing ingredient warning (silent null fix)

**File:** `lib/recipes/actions.ts` line 2016

**Problem:** `if (!ingredient) return { costCents: null, warning: null }` -- no warning when ingredient record is missing.

**Fix:** Change to:

```typescript
if (!ingredient) return { costCents: null, warning: 'ingredient_not_found' }
```

**Validation:** Reference a deleted ingredient_id. The warning should be `'ingredient_not_found'` not `null`.

---

#### 1E. Lifecycle cost unit conversion

**File:** `lib/culinary/ingredient-lifecycle.ts` lines 234-235

**Problem:** `recipeQty * lastPriceCents` without unit conversion. Dimensionally incorrect when recipe unit differs from price unit.

**Current code (lines 197-211):** Each lifecycle item already has `unit` (from `ri.unit`) and `lastPriceCents` (from `ingredient.last_price_cents`). But we need the ingredient's `price_unit` to do conversion.

**Fix:**

1. In the data assembly loop (around line 192-212), also fetch `price_unit` and `default_unit` and `weight_to_volume_ratio` from the ingredient query. The ingredient query is already at line ~170 (need to verify exact location); add these fields to the select.

2. Add `priceUnit` and `density` to the `LifecycleItem` interface or use them inline.

3. Replace lines 234-235:

```typescript
// Before (wrong):
// recipeCostCents += Math.round(item.recipeQty * item.lastPriceCents)
// buyCostCents += Math.round(item.buyQty * item.lastPriceCents)

// After (unit-aware):
const { computeIngredientCost } = await import('@/lib/units/conversion-engine')
// ... (import once outside loop)

const recipeCost = computeIngredientCost(
  item.recipeQty,
  item.unit,
  item.lastPriceCents,
  item.priceUnit,
  item.density
)
recipeCostCents += recipeCost ?? Math.round(item.recipeQty * item.lastPriceCents)

const buyCost = computeIngredientCost(
  item.buyQty,
  item.unit,
  item.lastPriceCents,
  item.priceUnit,
  item.density
)
buyCostCents += buyCost ?? Math.round(item.buyQty * item.lastPriceCents)
```

The `computeIngredientCost` import must happen once before the loop, not inside it. The `?? Math.round(...)` fallback preserves existing behavior when conversion fails.

**Data needed:** Add `price_unit`, `default_unit`, `weight_to_volume_ratio` to the ingredient select in the lifecycle data assembly. Store as `priceUnit` and `density` on the item.

**Validation:** Recipe uses "2 cups" flour. Price is "$0.50/lb". Without fix: cost = 200 _ 50 = $100 (wrong). With fix: 2 cups = ~0.56 lb, cost = 0.56 _ 50 = $0.28 (correct).

---

### Phase 2: UI Wiring (operator-aware thresholds + formatting)

Depends on Phase 1 being complete (Q-factor changes cost values that UI displays).

---

#### 2A. Food cost page: use operator-aware thresholds

**File:** `app/(chef)/culinary/costing/food-cost/page.tsx`

**Problem:** Hardcoded `pctColor()` at lines 10-14 uses fixed 28/35%. The `getFoodCostRating()` function in `food-cost-calculator.ts` already does operator-aware rating but is not used here.

**Fix:**

1. Fetch chef's archetype (already have `requireChef()` at line 17, use the chef object or query `chef_preferences`):

```typescript
const chef = await requireChef()
const db = createServerClient()
const { data: prefs } = await db
  .from('chef_preferences')
  .select('archetype')
  .eq('chef_id', chef.id)
  .single()
```

2. Import and use existing function:

```typescript
import { getFoodCostRating } from '@/lib/finance/food-cost-calculator'
import { archetypeToOperatorType } from '@/lib/costing/knowledge'

const operatorType = archetypeToOperatorType(prefs?.archetype)
```

3. Replace `pctColor()` function (lines 10-14) with:

```typescript
function pctColor(pct: number) {
  const { color } = getFoodCostRating(pct, operatorType)
  return color
}
```

Or inline it since `operatorType` needs to be in scope. Better: compute the rating result once and use its `color` field directly where needed.

4. Fix line 105: replace `${(totalFoodCostCents / 100).toFixed(0)}` with `{formatCurrency(totalFoodCostCents)}` (import `formatCurrency` from `lib/utils/currency`).

**Validation:** Chef with `bakery` archetype (targets 25-38%). A 30% food cost should show green, not amber.

---

#### 2B. Menu cost sidebar: use operator-aware thresholds

**File:** `components/culinary/menu-cost-sidebar.tsx` lines 32-38

**Problem:** Hardcoded color thresholds different from food cost page.

**Fix:** Same pattern as 2A. The sidebar likely receives menu data via props. Add `operatorType` prop (or fetch from chef context). Use `getFoodCostRating()` for the color.

```typescript
import { getFoodCostRating } from '@/lib/finance/food-cost-calculator'

// Replace hardcoded function:
function foodCostColor(pct: number, operatorType: OperatorType = 'private_chef') {
  return getFoodCostRating(pct, operatorType).color
}
```

**Validation:** Same threshold source as 2A. Colors now consistent across all food cost displays.

---

#### 2C. Plate cost + true cost breakdown: consistent margin thresholds

**Files:**

- `components/finance/plate-cost-table.tsx` lines 92-98 (green >= 35%)
- `components/culinary/true-cost-breakdown.tsx` lines 117-121 (green >= 40%)

**Problem:** Two different green cutoffs for the same metric (margin %).

**Fix:** Extract a shared function into `lib/finance/food-cost-calculator.ts` (it already has `getFoodCostRating` for food cost %):

```typescript
export function getMarginRating(marginPercent: number): { color: string; label: string } {
  if (marginPercent >= 40) return { color: 'text-emerald-400', label: 'Strong' }
  if (marginPercent >= 25) return { color: 'text-amber-400', label: 'Fair' }
  return { color: 'text-red-400', label: 'Low' }
}
```

Use in both files. Single source of truth.

**Validation:** 37% margin shows amber in both plate cost table and true cost breakdown (not green in one, amber in the other).

---

#### 2D. Currency formatting consistency

**Files to fix (replace manual `(cents/100).toFixed(2)` with `formatCurrency()`):**

1. `app/(chef)/culinary/costing/food-cost/page.tsx` -- lines 105, 115, 148
2. `app/(chef)/culinary/costing/recipe/page.tsx` -- lines 59, 132
3. `app/(chef)/culinary/costing/menu/page.tsx` -- line 175
4. `components/culinary/true-cost-breakdown.tsx` -- line 12 (the `centsToDisplay` helper)
5. `components/culinary/menu-scale-dialog.tsx` -- line 159
6. `app/(chef)/culinary/costing/sales/sales-client.tsx` -- line 17 (local `formatPrice`)

**Fix:** Add `import { formatCurrency } from '@/lib/utils/currency'` to each file. Replace all `$${(x / 100).toFixed(2)}` and `$${(x / 100).toFixed(0)}` patterns with `formatCurrency(x)`.

For `sales-client.tsx` line 17, replace local `formatPrice`:

```typescript
// Before: function formatPrice(cents: number, unit: string) { return `$${(cents / 100).toFixed(2)}/${unit}` }
// After:
import { formatCurrency } from '@/lib/utils/currency'
function formatPrice(cents: number, unit: string) {
  return `${formatCurrency(cents)}/${unit}`
}
```

**Validation:** "Total food spend" KPI now shows `$1,523.78` instead of `$1523`.

---

### Phase 3: Normalizer Unification (low risk, low dependency)

#### 3A. Merge normalizeUnit functions

**Files:**

- `lib/units/conversion-engine.ts` line 164 -- primary (richer alias set)
- `lib/grocery/unit-conversion.ts` line 73 -- secondary (used by shopping list consolidation)

**Problem:** Two normalizers with different alias sets. `fl oz`, `dl`, `mg`, `sprig`, `slice`, `stick`, `package`, `bag`, `bottle`, `jar` recognized by conversion-engine but not by grocery normalizer.

**Fix:** In `lib/grocery/unit-conversion.ts`, replace the local `normalizeUnit` with a re-export:

```typescript
// Before:
// export function normalizeUnit(unit: string | null): string { ... }

// After:
import { normalizeUnit as engineNormalize } from '@/lib/units/conversion-engine'

export function normalizeUnit(unit: string | null): string {
  if (!unit) return 'each'
  return engineNormalize(unit)
}
```

The wrapper handles the `null` case (conversion-engine's version requires `string`, grocery's accepts `string | null`).

**Validation:** `normalizeUnit('fl oz')` returns `'fl_oz'` in both import paths.

---

## Files Modified (Complete List)

| File                                                 | Phase      | Change                                                     |
| ---------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `lib/recipes/actions.ts`                             | 1A, 1C, 1D | Sub-recipe cascade + Q-factor + missing ingredient warning |
| `lib/pricing/cost-refresh-actions.ts`                | 1B         | Parent recipe cascade in propagatePriceChange              |
| `lib/culinary/ingredient-lifecycle.ts`               | 1E         | Unit-aware cost computation                                |
| `app/(chef)/culinary/costing/food-cost/page.tsx`     | 2A, 2D     | Operator-aware thresholds + formatCurrency                 |
| `components/culinary/menu-cost-sidebar.tsx`          | 2B         | Operator-aware thresholds                                  |
| `components/finance/plate-cost-table.tsx`            | 2C         | Shared margin rating                                       |
| `components/culinary/true-cost-breakdown.tsx`        | 2C, 2D     | Shared margin rating + formatCurrency                      |
| `lib/finance/food-cost-calculator.ts`                | 2C         | Add getMarginRating()                                      |
| `app/(chef)/culinary/costing/recipe/page.tsx`        | 2D         | formatCurrency                                             |
| `app/(chef)/culinary/costing/menu/page.tsx`          | 2D         | formatCurrency                                             |
| `components/culinary/menu-scale-dialog.tsx`          | 2D         | formatCurrency                                             |
| `app/(chef)/culinary/costing/sales/sales-client.tsx` | 2D         | formatCurrency                                             |
| `lib/grocery/unit-conversion.ts`                     | 3A         | Delegate to conversion-engine normalizeUnit                |

**No new files created.** 13 existing files modified.

---

## Validation Criteria (Definition of Done)

1. **Sub-recipe cascade:** Recipe A (3 ingredients, $8) + sub-recipe B ($4, qty 2) = A.total_cost_cents is 1600, not 800
2. **Q-factor applied:** Private chef recipe with $10 ingredients shows $10.70 total (7% Q-factor)
3. **Price propagation:** Changing ingredient price updates child recipe, then parent recipe, then flags events
4. **Missing ingredient warning:** Deleted ingredient produces `warning: 'ingredient_not_found'`, not `null`
5. **Lifecycle unit conversion:** "2 cups flour at $0.50/lb" computes ~$0.28, not $1.00
6. **Consistent food cost colors:** Same percentage, same archetype = same color across food-cost page, sidebar, and dashboard
7. **Currency formatting:** All costing pages use `formatCurrency()`. No manual `.toFixed()` for money display
8. **Margin thresholds:** Plate cost table and true cost breakdown use same cutoffs
9. **Normalizer unity:** `normalizeUnit('fl oz')` returns same value from both import paths
10. **No regressions:** `npx tsc --noEmit --skipLibCheck` passes. `npx next build --no-lint` passes

---

## What This Spec Does NOT Cover (Explicit Exclusions)

- **Cooking yield (separate from trim yield):** Requires schema migration (`cooking_yield_pct` column). Deferred.
- **Menu component portioning:** Requires `quantity` multiplier on menu components. Separate spec.
- **Weighted average margin:** Requires revenue-weighted aggregation. Low impact; deferred.
- **Yield factor editing UI:** Requires new form component in recipe detail. Separate spec (depends on recipe detail page audit).
- **IRS mileage rate staleness:** Cosmetic; annual update. Not a costing integrity issue.

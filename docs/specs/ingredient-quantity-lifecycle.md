# Spec: Ingredient Quantity Lifecycle

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** medium (5-7 files)
> **Built by:** Opus 4.6 (builder gate session 2026-04-17)

## Timeline

| Event            | Date             | Agent/Session           | Commit    |
| ---------------- | ---------------- | ----------------------- | --------- |
| Created          | 2026-04-17 14:00 | Opus session            |           |
| Data layer built | 2026-04-17       | Prior session           |           |
| Verified         | 2026-04-17 19:55 | Opus 4.6 (builder gate) | 3561ba738 |

---

## Developer Notes

### Raw Signal

"We need to perfectly be able to track how much a recipe tells you to buy and then how much a recipe makes you buy and what you end up buying and how much you end up using and how much you have left over. We need to fill in a bunch of numbers here and make sure everything is taken into account."

### Developer Intent

- **Core goal:** Complete, unbroken chain from recipe spec through purchase to leftover, with every number visible and accounted for.
- **Key constraints:** Must use existing tables where possible. No new UI pages yet (data layer first). Yield factors already exist in schema, just aren't wired in.
- **Motivation:** A chef needs to know: "my recipe says 2 lbs salmon, but after filleting I need to BUY 4.4 lbs, I actually bought 5 lbs, used 4 lbs, and have 1 lb left." Every number in that chain must be tracked and visible.
- **Success from the developer's perspective:** Both shopping list generators produce yield-adjusted quantities. A single query can show the full lifecycle per ingredient per event.

---

## What This Does (Plain English)

After this is built, when a chef generates a shopping list for an event, the quantities automatically account for prep yield loss (trim, peel, fillet, etc.). A recipe that needs 2 lbs of usable salmon with 45% yield will tell the chef to buy 4.4 lbs. After the event, a consolidated view shows the full chain: what the recipe needed, what yield adjustment required, what was actually purchased, what was used, and what's left over.

---

## Why It Matters

Shopping lists currently tell chefs to buy the recipe quantity, ignoring that 15-55% of many ingredients get lost to trimming, peeling, and filleting. Chefs either over-buy (waste) or under-buy (emergency store runs mid-event). The data for yield factors already exists in the schema but isn't wired into the two shopping list generators.

---

## Files to Create

| File                                   | Purpose                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `lib/culinary/ingredient-lifecycle.ts` | Server actions: `getEventIngredientLifecycle()` - consolidated per-event report |

---

## Files to Modify

| File                                                                 | What to Change                                                                                                                                                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/culinary/shopping-list-actions.ts`                              | Inflate `totalRequired` by `yield_pct` for each ingredient. Fetch `recipe_ingredients.yield_pct` and `ingredients.default_yield_pct`. Add `recipeQty` (raw) and `buyQty` (yield-adjusted) to `ShoppingListItem` |
| `lib/grocery/generate-grocery-list.ts`                               | Same yield adjustment: scale quantity by `100 / yield_pct` after guest-count scaling. Add yield info to `GroceryItem` type                                                                                      |
| `database/migrations/[next_timestamp]_ingredient_lifecycle_view.sql` | Create `event_ingredient_lifecycle` view joining recipe spec, yield, purchases, usage, leftovers                                                                                                                |

---

## Database Changes

### New Views

```sql
-- Consolidated ingredient lifecycle per event
-- Shows the full chain: recipe_qty -> buy_qty -> purchased -> used -> leftover
CREATE OR REPLACE VIEW event_ingredient_lifecycle AS
WITH recipe_need AS (
  -- What recipes say (raw quantity + yield-adjusted buy quantity)
  SELECT
    e.id AS event_id,
    e.tenant_id AS chef_id,
    i.id AS ingredient_id,
    i.name AS ingredient_name,
    ri.unit,
    SUM(ri.quantity * COALESCE(c.scale_factor, 1)) AS recipe_qty,
    COALESCE(ri.yield_pct, i.default_yield_pct, 100) AS yield_pct,
    SUM(
      ri.quantity * COALESCE(c.scale_factor, 1) * 100.0
      / COALESCE(ri.yield_pct, i.default_yield_pct, 100)
    ) AS buy_qty,
    i.last_price_cents
  FROM events e
  JOIN menus m ON m.event_id = e.id
  JOIN dishes d ON d.menu_id = m.id
  JOIN components c ON c.dish_id = d.id AND c.recipe_id IS NOT NULL
  JOIN recipe_ingredients ri ON ri.recipe_id = c.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id
  GROUP BY e.id, e.tenant_id, i.id, i.name, ri.unit, i.last_price_cents,
           COALESCE(ri.yield_pct, i.default_yield_pct, 100)
),
purchased AS (
  -- What was actually received into inventory for this event
  SELECT
    it.event_id,
    it.ingredient_id,
    it.unit,
    SUM(ABS(it.quantity)) AS purchased_qty,
    SUM(ABS(it.cost_cents)) AS purchased_cost_cents
  FROM inventory_transactions it
  WHERE it.transaction_type = 'receive'
    AND it.event_id IS NOT NULL
  GROUP BY it.event_id, it.ingredient_id, it.unit
),
used AS (
  -- What was actually deducted/used for this event
  SELECT
    it.event_id,
    it.ingredient_id,
    it.unit,
    SUM(ABS(it.quantity)) AS used_qty
  FROM inventory_transactions it
  WHERE it.transaction_type = 'event_deduction'
    AND it.event_id IS NOT NULL
  GROUP BY it.event_id, it.ingredient_id, it.unit
),
leftover AS (
  -- What was logged as leftover for this event
  SELECT
    eld.event_id,
    eld.item_name,
    eld.quantity_leftover,
    eld.unit,
    eld.disposition
  FROM event_leftover_details eld
)
SELECT
  rn.event_id,
  rn.chef_id,
  rn.ingredient_id,
  rn.ingredient_name,
  rn.unit,
  -- Stage 1: What recipe says
  ROUND(rn.recipe_qty, 3) AS recipe_qty,
  -- Stage 2: What you need to buy (yield-adjusted)
  rn.yield_pct,
  ROUND(rn.buy_qty, 3) AS buy_qty,
  -- Stage 3: What was actually purchased
  COALESCE(p.purchased_qty, 0) AS purchased_qty,
  COALESCE(p.purchased_cost_cents, 0) AS purchased_cost_cents,
  -- Stage 4: What was actually used
  COALESCE(u.used_qty, 0) AS used_qty,
  -- Stage 5: What's left (purchased - used, or from leftover log)
  COALESCE(p.purchased_qty, 0) - COALESCE(u.used_qty, 0) AS computed_leftover_qty,
  -- Price reference
  rn.last_price_cents,
  -- Variance: bought vs needed
  COALESCE(p.purchased_qty, 0) - ROUND(rn.buy_qty, 3) AS purchase_variance_qty,
  -- Variance: used vs recipe spec
  COALESCE(u.used_qty, 0) - ROUND(rn.recipe_qty, 3) AS usage_variance_qty
FROM recipe_need rn
LEFT JOIN purchased p
  ON rn.event_id = p.event_id AND rn.ingredient_id = p.ingredient_id
LEFT JOIN used u
  ON rn.event_id = u.event_id AND rn.ingredient_id = u.ingredient_id;
```

### Migration Notes

- Migration filename must be checked against existing files (timestamp collision rule)
- View only, no table changes. Fully additive. No approval needed for DROP/DELETE.
- The `leftover` CTE is defined but not joined yet because `event_leftover_details` uses `item_name` (text) not `ingredient_id` (UUID). Future enhancement: add `ingredient_id` FK to that table. For now, the computed leftover (purchased - used) covers it.

---

## Data Model

Five stages per ingredient per event:

```
recipe_qty       What the recipe formula says (quantity * scale_factor, summed across all components)
  |
  v
buy_qty          recipe_qty * (100 / yield_pct) - how much to actually purchase accounting for trim/peel/fillet loss
  |
  v
purchased_qty    What was actually received (inventory_transactions type='receive' with event_id)
  |
  v
used_qty         What was actually consumed (inventory_transactions type='event_deduction' with event_id)
  |
  v
leftover_qty     purchased - used (computed), or logged in event_leftover_details
```

**Yield formula:** `buy_qty = recipe_qty * 100 / yield_pct`

Example: recipe needs 2 lbs salmon, yield_pct = 45 (whole fish to fillet)

- `buy_qty = 2 * 100 / 45 = 4.44 lbs`

Yield resolution: `COALESCE(recipe_ingredients.yield_pct, ingredients.default_yield_pct, 100)`

---

## Server Actions

| Action                                 | Auth            | Input                 | Output                                                                                      | Side Effects     |
| -------------------------------------- | --------------- | --------------------- | ------------------------------------------------------------------------------------------- | ---------------- |
| `getEventIngredientLifecycle(eventId)` | `requireChef()` | `{ eventId: string }` | `{ items: LifecycleItem[], totals: { recipeCostCents, buyCostCents, purchasedCostCents } }` | None (read-only) |

---

## Code Changes Detail

### 1. `shopping-list-actions.ts` - Yield Adjustment

Current code (line 157-160):

```ts
const { data: recipeIngredients } = await db
  .from('recipe_ingredients')
  .select('recipe_id, ingredient_id, quantity, unit')
```

Change to:

```ts
const { data: recipeIngredients } = await db
  .from('recipe_ingredients')
  .select('recipe_id, ingredient_id, quantity, unit, yield_pct')
```

Current aggregation (line 247):

```ts
const requiredQty = (Number(row.quantity) || 0) * multiplier
```

Change to:

```ts
const recipeQty = (Number(row.quantity) || 0) * multiplier
const yieldPct = Number(row.yield_pct) || ingredientDefaultYield.get(row.ingredient_id) || 100
const requiredQty = (recipeQty * 100) / yieldPct
```

Also fetch `ingredients.default_yield_pct` in the parallel query block (line 180-197) and build a lookup map.

Update `ShoppingListItem` type to include:

```ts
recipeQty: number // what recipe says (before yield adjustment)
yieldPct: number // effective yield percentage
// totalRequired becomes the yield-adjusted buy quantity
```

### 2. `generate-grocery-list.ts` - Yield Adjustment

Current scaling (line 183):

```ts
const scaledQty = (Number(ri.quantity) || 0) * scaleFactor
```

Change to also fetch `yield_pct` from recipe_ingredients and `default_yield_pct` from ingredients:

```ts
const scaledQty = (Number(ri.quantity) || 0) * scaleFactor
const yieldPct = Number(ri.yield_pct) || Number(ingredient.default_yield_pct) || 100
const buyQty = (scaledQty * 100) / yieldPct
```

Use `buyQty` instead of `scaledQty` for the shopping quantity. Add `recipeQuantity` and `yieldPct` to `GroceryItem` for transparency.

---

## Edge Cases and Error Handling

| Scenario                                                   | Correct Behavior                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| yield_pct is 0 or negative                                 | Treat as 100 (no adjustment). Never divide by zero                                                |
| yield_pct is NULL on both recipe_ingredient and ingredient | Default to 100 (no loss)                                                                          |
| No inventory_transactions with event_id for purchases      | Show 0 for purchased_qty. This is expected for events where chef didn't log purchases             |
| Same ingredient in multiple recipes for one event          | Sum recipe_qty across all recipes, apply per-recipe yield_pct individually (don't average yields) |
| Different units for same ingredient across recipes         | Aggregate by unit (existing behavior). Don't try to convert between weight/volume in this spec    |

---

## Verification Steps

1. Read `recipe_ingredients` table for an existing recipe - confirm `yield_pct` column exists
2. Run `generateShoppingList()` before and after changes - confirm quantities increase for ingredients with yield_pct < 100
3. Run `generateGroceryList()` before and after - same check
4. Query `event_ingredient_lifecycle` view for a completed event - confirm all 5 stages populate
5. Type check passes: `npx tsc --noEmit --skipLibCheck`

---

## Out of Scope

- UI for the lifecycle view (separate spec, after data layer is solid)
- Linking `event_leftover_details.item_name` to `ingredients.id` (requires migration + data backfill)
- Unit conversion between weight and volume (existing limitation, separate concern)
- Automatic inventory deductions on event completion (requires workflow automation spec)
- Purchase order receive flow linking to events (PO system is separate)

---

## Notes for Builder Agent

- Both shopping list files have the same gap: neither uses `yield_pct`. Fix both.
- The `yield_pct` column already exists on `recipe_ingredients` (added by migration `20260330000095`). No schema change needed for that.
- `ingredients.default_yield_pct` also already exists (same migration). Just need to fetch it.
- The `event_inventory_variance` view (migration `20260325000005`) is similar but simpler (no yield stage, no purchase stage). The new `event_ingredient_lifecycle` view supersedes it for lifecycle tracking but doesn't replace it (variance view is used elsewhere).
- `COALESCE(yield_pct, default_yield_pct, 100)` is the canonical yield resolution. Use it everywhere.
- Guard against division by zero: `Math.max(yieldPct, 1)` in TypeScript, `GREATEST(yield_pct, 1)` in SQL.

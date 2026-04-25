# Spec: Wire Projected Labor/Travel/Overhead into Pricing Intelligence Pipeline

**Priority:** P0 -- this is the single change that turns ChefFlow from a retrospective ledger into a pre-event pricing tool.

**Problem:** `getEventPricingIntelligence()` in `lib/finance/event-pricing-intelligence-actions.ts` hardcodes projected labor, travel, and overhead to `0` (lines 607-609). Line 507 sets `projectedTotalCostCents = projectedFoodCostCents`. This means pre-event margins are always overstated because they ignore 3 of 4 cost layers. A margin-obsessed chef sees 70% projected margin, but the real margin after labor/travel/overhead is 45%. The system lies before the event and tells the truth after.

**Solution:** Compute projected labor, travel, and overhead from data that ALREADY EXISTS in the database. No new tables. No new UI. No new migrations. The `getTruePlateCost()` function in `lib/pricing/plate-cost-actions.ts` already does this exact computation -- we replicate its data-gathering logic inside the pricing intelligence pipeline.

---

## Scope

**ONE file changed:** `lib/finance/event-pricing-intelligence-actions.ts`

**NO changes to:**

- Database schema or migrations
- UI components (the return shape already has fields for all cost buckets)
- `lib/formulas/true-plate-cost.ts` (the formula is correct as-is)
- `lib/pricing/plate-cost-actions.ts` (standalone calculator, unchanged)
- Any other file

---

## Exact Changes

### Step 1: Add a helper function to compute projected labor/travel/overhead

Add this function ABOVE the `getEventPricingIntelligence` function (around line 414). It mirrors the data-gathering logic from `lib/pricing/plate-cost-actions.ts` lines 104-165.

```typescript
async function computeProjectedNonFoodCosts(
  db: any,
  eventId: string,
  tenantId: string,
  menuIds: string[],
  prefs: any | null
): Promise<{
  laborCostCents: number
  travelCostCents: number
  overheadCostCents: number
  projectedFoodCostCents: number
}> {
  // 1. Get event travel data
  const { data: eventData } = await db
    .from('events')
    .select('mileage_miles, guest_count')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  const mileageMiles = eventData?.mileage_miles || 0
  const guestCount = eventData?.guest_count || 1

  // 2. Get recipe prep/cook times from menu dishes (same pattern as plate-cost-actions.ts)
  let totalPrepMinutes = 0
  let totalCookMinutes = 0
  let totalIngredientCostCents = 0

  if (menuIds.length > 0) {
    // Fetch dishes linked to these menus
    const { data: dishes } = await db
      .from('dishes')
      .select('linked_recipe_id')
      .in('menu_id', menuIds)
      .eq('tenant_id', tenantId)
      .limit(500)

    const recipeIds = ((dishes ?? []) as any[])
      .map((d: any) => d.linked_recipe_id)
      .filter(Boolean) as string[]

    if (recipeIds.length > 0) {
      const { data: recipes } = await db
        .from('recipes')
        .select('id, total_cost_cents, prep_time_minutes, cook_time_minutes')
        .in('id', recipeIds)
        .eq('tenant_id', tenantId)

      for (const r of (recipes ?? []) as any[]) {
        totalIngredientCostCents += r.total_cost_cents || 0
        totalPrepMinutes += r.prep_time_minutes || 0
        totalCookMinutes += r.cook_time_minutes || 0
      }
    }
  }

  // 3. Compute labor cost from recipe times + chef hourly rate
  const laborHours = (totalPrepMinutes + totalCookMinutes) / 60
  const hourlyRateCents = prefs?.owner_hourly_rate_cents || 5000 // default $50/hr
  const laborCostCents = Math.round(laborHours * hourlyRateCents)

  // 4. Compute travel cost from event mileage + IRS rate
  const mileageRateCents = 70 // IRS 2026 rate, matches true-plate-cost.ts constant
  const travelCostCents = Math.round(mileageMiles * mileageRateCents)

  // 5. Compute overhead as 15% of ingredient cost (matches true-plate-cost.ts DEFAULT_OVERHEAD_PERCENT)
  const overheadCostCents = Math.round((totalIngredientCostCents * 15) / 100)

  return {
    laborCostCents,
    travelCostCents,
    overheadCostCents,
    projectedFoodCostCents: totalIngredientCostCents,
  }
}
```

### Step 2: Call the helper inside `getEventPricingIntelligence`

After the `menuCosts` and `ingredientSignals` are fetched (around line 478), add a call to compute projected non-food costs:

```typescript
const projectedNonFood = await computeProjectedNonFoodCosts(
  db,
  eventId,
  tenantId,
  menuCosts.menuIds,
  prefs
)
```

### Step 3: Replace the three zeros and fix projectedTotalCostCents

**Find this block (lines 503-507):**

```typescript
const projectedFoodCostCents =
  menuCosts.projectedFoodCostCents > 0
    ? menuCosts.projectedFoodCostCents
    : eventEstimatedFoodCostCents
const projectedTotalCostCents = projectedFoodCostCents
```

**Replace with:**

```typescript
const projectedFoodCostCents =
  menuCosts.projectedFoodCostCents > 0
    ? menuCosts.projectedFoodCostCents
    : eventEstimatedFoodCostCents
const projectedLaborCostCents = projectedNonFood.laborCostCents
const projectedTravelCostCents = projectedNonFood.travelCostCents
const projectedOverheadCostCents = projectedNonFood.overheadCostCents
const projectedTotalCostCents =
  projectedFoodCostCents +
  projectedLaborCostCents +
  projectedTravelCostCents +
  projectedOverheadCostCents
```

### Step 4: Update the return object

**Find this block (lines 605-612):**

```typescript
projected: {
  foodCostCents: projectedFoodCostCents,
  laborCostCents: 0,
  travelCostCents: 0,
  overheadCostCents: 0,
  rentalsCostCents: 0,
  miscellaneousCostCents: 0,
  totalCostCents: projectedTotalCostCents,
```

**Replace with:**

```typescript
projected: {
  foodCostCents: projectedFoodCostCents,
  laborCostCents: projectedLaborCostCents,
  travelCostCents: projectedTravelCostCents,
  overheadCostCents: projectedOverheadCostCents,
  rentalsCostCents: 0,
  miscellaneousCostCents: 0,
  totalCostCents: projectedTotalCostCents,
```

---

## Data Sources (all pre-existing, no new queries beyond the helper)

| Cost Layer      | Source Table       | Field                                      | Fallback                                                                   |
| --------------- | ------------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| Labor hours     | `recipes`          | `prep_time_minutes + cook_time_minutes`    | 0 (no recipes = no labor projection)                                       |
| Hourly rate     | `chef_preferences` | `owner_hourly_rate_cents`                  | 5000 ($50/hr, matches `DEFAULT_HOURLY_RATE_CENTS` in `true-plate-cost.ts`) |
| Travel miles    | `events`           | `mileage_miles`                            | 0 (no mileage entered = no travel cost)                                    |
| Mileage rate    | constant           | `IRS_MILEAGE_RATE_CENTS_2026 = 70`         | N/A                                                                        |
| Overhead %      | constant           | `DEFAULT_OVERHEAD_PERCENT = 15`            | N/A                                                                        |
| Ingredient cost | `recipes`          | `total_cost_cents` (via dishes -> recipes) | 0                                                                          |

---

## What NOT to Do

1. **Do NOT change the return type.** The `projected` object already has fields for all cost buckets. We are populating fields that were previously hardcoded to 0.
2. **Do NOT add new imports.** The constants from `true-plate-cost.ts` are nice-to-have but not needed. Use literal values (70, 5000, 15) with comments referencing the source constants. This avoids import chain issues.
3. **Do NOT modify `calculateTruePlateCost` or `getTruePlateCost`.** Those are standalone tools. This spec only changes the pricing intelligence pipeline.
4. **Do NOT add a migration.** `owner_hourly_rate_cents` already exists on `chef_preferences` (added in migration `20260306000009`). `mileage_miles` already exists on `events`.
5. **Do NOT touch UI components.** The Money tab, event detail, and costing pages already render whatever values the pipeline returns. Populating the zeros will automatically show real numbers.
6. **Do NOT add error handling beyond what exists.** The helper uses `|| 0` fallbacks. If data is missing, cost defaults to 0 (same behavior as current hardcoded zeros, but only for missing data, not always).
7. **Do NOT fetch `chef_pricing_config` for mileage rate.** The pricing intelligence function does not currently use it. Use the IRS constant for consistency. This can be enhanced later.

---

## Verification

After making the change:

1. Run `npx tsc --noEmit --skipLibCheck` -- must pass with zero errors.
2. Read the modified file and confirm:
   - `computeProjectedNonFoodCosts` function exists above `getEventPricingIntelligence`
   - The three zeros on lines ~607-609 are replaced with the computed variables
   - `projectedTotalCostCents` sums all four cost layers, not just food
   - No new imports were added
   - No other functions were modified

---

## Why This Matters

This single change transforms every event's pre-event financial view from "food cost only" to "full cost stack." A chef who enters recipe times, travel mileage, and hourly rate will see projected margins that actually reflect reality. The system stops lying about future profitability.

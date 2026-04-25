# Simulation Orchestrator

> Build Phase 1: The conductor that connects ChefFlow's 14 existing simulation-capable engines into a single `simulate()` call.

## Problem

ChefFlow has 14 production-quality simulation engines (recipe scaling, pricing, dietary conflicts, prep timeline, completion contract, service simulation, shopping list, menu what-if, chef decision engine, operating spine, demand forecast, ingredient lifecycle, menu engineering, cross-contamination). Each answers one question in isolation. No system can answer: "If I change guest count from 20 to 30, what happens to cost, ingredients, allergens, prep time, equipment, and readiness all at once?"

The engines exist. They need a conductor.

## What to Build

A pure-function orchestrator that takes an event ID + parameter overrides, runs existing engines in dependency order, and returns a unified `EventSnapshot` with all projections. Zero new database tables. Zero AI calls. Zero side effects.

### File: `lib/simulation/orchestrator.ts`

No `'use server'` directive. Called by server actions that have the directive.

```ts
export type SimulationOverrides = {
  guestCount?: number
  serviceStyle?: string
  dishSwaps?: Array<{ courseNumber: number; removeDishId: string; addDishId: string }>
  allergies?: string[]
}

export type EventSnapshot = {
  // Identity
  eventId: string
  tenantId: string
  overrides: SimulationOverrides
  computedAt: string // ISO timestamp

  // Financial
  totalFoodCostCents: number
  costPerGuestCents: number
  marginPct: number
  revenueCents: number

  // Ingredients
  ingredients: SnapshotIngredient[]
  totalIngredientCount: number
  unpricedCount: number
  pricingConfidence: number // 0-100, based on resolution tier distribution

  // Dietary
  allergenConflicts: SnapshotAllergenConflict[]
  dietaryViolations: SnapshotDietaryViolation[]
  safeForAllGuests: boolean

  // Prep
  totalPrepMinutes: number
  prepByCategory: Record<string, number> // e.g. { 'day-before': 120, 'morning': 90 }

  // Readiness
  completionScore: number
  completionStatus: 'incomplete' | 'partial' | 'complete'
  blockingRequirements: string[]

  // Service Simulation (if event is far enough along)
  serviceReadiness: {
    score: number
    label: string
    criticalBlockerCount: number
    warningCount: number
  } | null

  // Comparison (only present when overrides differ from current state)
  delta: SnapshotDelta | null
}

export type SnapshotIngredient = {
  ingredientId: string
  name: string
  unit: string
  recipeQty: number
  scaledBuyQty: number
  priceCents: number | null
  priceSource: string | null
  resolutionTier: string
  allergenFlags: string[]
}

export type SnapshotAllergenConflict = {
  guestName: string
  allergen: string
  conflictingDish: string
  severity: 'critical' | 'warning' | 'info'
}

export type SnapshotDietaryViolation = {
  guestName: string
  diet: string
  violatingDish: string
  severity: 'critical' | 'warning' | 'info'
}

export type SnapshotDelta = {
  foodCostDeltaCents: number
  ingredientCountDelta: number
  prepTimeDeltaMinutes: number
  newAllergenConflicts: SnapshotAllergenConflict[]
  resolvedAllergenConflicts: SnapshotAllergenConflict[]
  completionScoreDelta: number
}
```

### Pipeline Execution Order

The orchestrator runs engines in strict dependency order. Each stage feeds the next.

```
Stage 1: LOAD
  - Fetch event record (with client, menu, dishes, recipes, ingredients, guests)
  - Apply overrides to the in-memory copy (guest count, dish swaps, allergies)
  - DO NOT write anything to the database

Stage 2: SCALE
  - For each recipe ingredient, call computeScaledQuantity() from lib/scaling/recipe-scaling-engine.ts
  - Use overridden guest count + service style
  - Input: recipe_ingredients rows, guest count, service style, component scale factors
  - Output: Map<ingredientId, ScaledResult>

Stage 3: PRICE
  - For each scaled ingredient, call resolvePricesBatch() from lib/pricing/resolve-price.ts
  - Aggregate total food cost, cost per guest, margin
  - Compute pricing confidence from resolution tier distribution
  - Input: ingredient IDs + units + quantities
  - Output: priced ingredient list, totals

Stage 4: DIETARY CHECK
  - Run allergen check against overridden allergy list + all guest allergies
  - Use checkDishAgainstAllergens() from lib/menus/allergen-check.ts
  - Cross-reference DIETARY_RULES from lib/constants/dietary-rules.ts
  - Input: dishes with ingredients, guest allergens/diets
  - Output: conflict list, violation list, safeForAllGuests flag

Stage 5: PREP TIMELINE
  - Generate prep timeline using the same logic as lib/events/prep-timeline.ts
  - Extract total prep minutes and per-category breakdown
  - NOTE: prep-timeline.ts is 'use server' -- extract the pure computation into
    a shared helper, or call the data-fetching parts separately and feed the
    computation the overridden data
  - Input: dishes with recipes, components, event date/time
  - Output: total prep minutes, category breakdown

Stage 6: COMPLETION
  - Run evaluateCompletion('event', eventId, tenantId) from lib/completion/engine.ts
  - NOTE: completion evaluates CURRENT DB state, not overridden state. For Phase 1,
    this is acceptable -- completion score is "how ready is the CURRENT event," not
    "how ready would it be with overrides." Phase 2 can add projected completion.
  - Input: eventId, tenantId
  - Output: score, status, blocking requirements

Stage 7: SERVICE SIMULATION (optional)
  - If event status is 'confirmed' or later, run the service simulation engine
  - Uses runServiceSimulation() from lib/service-simulation/engine.ts
  - NOTE: same caveat as completion -- evaluates current state
  - Input: ServiceSimulationContext (built from DB + overrides where possible)
  - Output: readiness score, label, blocker/warning counts

Stage 8: DELTA (conditional)
  - If overrides were provided, run the pipeline TWICE: once with current values,
    once with overrides. Diff the two EventSnapshots to produce SnapshotDelta.
  - Optimization: cache Stage 1 load, only re-run Stages 2-7 with different params.
```

### File: `lib/simulation/actions.ts`

```ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { simulate } from './orchestrator'
import type { SimulationOverrides, EventSnapshot } from './orchestrator'

export async function runSimulation(
  eventId: string,
  overrides?: SimulationOverrides
): Promise<EventSnapshot> {
  const user = await requireChef()
  return simulate(eventId, user.tenantId!, overrides)
}
```

### File: `lib/simulation/types.ts`

All types from the orchestrator, exported separately so client components can import without pulling in server code.

### File: `lib/simulation/loader.ts`

The data-fetching layer. Single function that loads everything the orchestrator needs from the database in one pass (batch queries, not N+1). Returns a `SimulationInput` object that the pure orchestrator consumes.

```ts
export type SimulationInput = {
  event: { id, status, guest_count, service_style, event_date, serve_time, ... }
  client: { id, full_name, allergies, dietary_restrictions, ... }
  menu: { id, dishes: Array<{ id, name, course_number, recipe_id, ... }> }
  recipes: Map<recipeId, { servings, components, ingredients[] }>
  guests: Array<{ name, allergies[], dietary_restrictions[] }>
  ingredientPrices: Map<ingredientId, ResolvedPrice>  // pre-fetched in batch
}
```

This separation (loader fetches, orchestrator computes) keeps the orchestrator pure and testable with mock data.

## First UI Consumer: Event Simulator Panel

### File: `components/events/event-simulator-panel.tsx`

Client component. Renders on the event detail page.

**Minimal V1 UI:**

- Guest count slider (range: 2 to 100, step 1, default: current event guest count)
- "Simulate" button (not auto-fire on every slider tick; debounce or explicit)
- Results card showing: total food cost, cost/guest, margin %, prep time, allergen conflict count, completion score
- Delta indicators (green/red arrows) when overrides differ from current state
- Loading state during computation

**Not in V1:**

- Dish swap UI (the existing Menu What-If panel already does this; wire it to the orchestrator in Phase 2)
- Service style dropdown (low value; most chefs don't change service style per-event)
- Allergy override (complex UI; dietary conflict page already handles this)

### Integration point: `app/(chef)/events/[id]/page.tsx`

Add the simulator panel as a collapsible section on the event detail page, below the existing service simulation section. Gate behind a feature check -- if the event has no menu, don't render the panel (nothing to simulate).

## What NOT to Build

- **No new database tables.** The orchestrator is pure computation over existing data.
- **No new migrations.**
- **No AI calls.** Formula > AI. Every number is deterministic math.
- **No combinatorial expansion.** Phase 2. The orchestrator must exist first.
- **No auto-cascade triggers.** Phase 3. Need the orchestrator to cascade through.
- **No equipment capacity modeling.** Phase 4. Schema changes needed.
- **No event branching/forking data structure.** The orchestrator with different overrides IS a lightweight branch. Formal branching is premature.

## Dependency Map (Existing Files to Import From)

| Engine              | File                                    | Function to Use                                      |
| ------------------- | --------------------------------------- | ---------------------------------------------------- |
| Recipe Scaling      | `lib/scaling/recipe-scaling-engine.ts`  | `computeScaledQuantity()`                            |
| Price Resolution    | `lib/pricing/resolve-price.ts`          | `resolvePricesBatch()`                               |
| Allergen Check      | `lib/menus/allergen-check.ts`           | `checkDishAgainstAllergens()`                        |
| Dietary Rules       | `lib/constants/dietary-rules.ts`        | `DIETARY_RULES`                                      |
| Prep Timeline       | `lib/events/prep-timeline.ts`           | Extract pure computation                             |
| Completion          | `lib/completion/engine.ts`              | `evaluateCompletion()`                               |
| Service Simulation  | `lib/service-simulation/engine.ts`      | `runServiceSimulation()`                             |
| Shopping List       | `lib/culinary/shopping-list-actions.ts` | Reference for ingredient aggregation pattern         |
| Unit Conversion     | `lib/grocery/unit-conversion.ts`        | `normalizeUnit()`, `canConvert()`, `addQuantities()` |
| Industry Benchmarks | `lib/finance/industry-benchmarks.ts`    | `PORTIONS_BY_SERVICE_STYLE`                          |

## Edge Cases

1. **Event with no menu:** Return early with empty snapshot. No simulation possible.
2. **Menu with no recipes linked:** Ingredients array is empty. Cost is $0. Prep is 0 min. Not an error.
3. **Unpriced ingredients:** Include in snapshot with `priceCents: null`. Compute `unpricedCount` and reduce `pricingConfidence`.
4. **Guest count = 0 override:** Reject. Minimum 1 guest.
5. **Dish swap where addDishId doesn't exist:** Return error, don't partial-simulate.
6. **Event in draft state:** Simulate anyway. Draft events benefit most from simulation.

## Test Plan

### Unit tests: `tests/unit/simulation-orchestrator.test.ts`

Mock the loader to provide synthetic SimulationInput. Test orchestrator logic in isolation.

1. **Basic snapshot:** Load a simple event (1 menu, 3 dishes, 5 ingredients). Verify all snapshot fields populated.
2. **Guest count scaling:** Same event at 10, 20, 50 guests. Verify ingredients scale correctly via computeScaledQuantity.
3. **Delta computation:** Override guest count. Verify delta shows correct cost/prep/ingredient differences.
4. **Allergen detection:** Add a peanut allergy override. Verify conflicts surface for dishes with peanut ingredients.
5. **Zero-menu event:** Verify early return with empty snapshot.
6. **Unpriced ingredients:** Verify unpricedCount and pricingConfidence reflect reality.

### Integration test: `tests/integration/simulation-orchestrator.test.ts`

Use agent account, hit real DB (read-only).

1. Pick an event with a menu. Run `runSimulation(eventId)` with no overrides. Verify snapshot matches current DB state.
2. Run `runSimulation(eventId, { guestCount: currentCount * 2 })`. Verify delta is non-null and directionally correct.

### Browser test: Playwright

1. Navigate to event detail page with agent account.
2. Verify simulator panel renders with current guest count.
3. Change guest count slider, click Simulate.
4. Verify results update with delta indicators.

## Definition of Done

1. `simulate(eventId, tenantId, overrides?)` returns a complete `EventSnapshot` with financial, ingredient, dietary, prep, and readiness data.
2. Delta computation correctly diffs two snapshots when overrides are provided.
3. Event detail page shows the simulator panel with guest count slider and results.
4. Unit tests pass with mocked data.
5. Integration test passes against real DB (read-only).
6. `npx tsc --noEmit --skipLibCheck` passes.
7. `npx next build --no-lint` passes.
8. No new database tables, migrations, or AI calls.
9. No mutations to any database table.

## Phase 2 Preview (Not in Scope)

After the orchestrator exists, these become straightforward additions:

- **Menu What-If integration:** Wire the existing `menu-simulator.ts` swap UI to call the full orchestrator instead of just computing cost delta.
- **Combinatorial expansion:** `MenuTree` data structure that expands poll options into all permutations, runs each through the orchestrator.
- **Projected completion:** Fork the completion evaluators to accept overridden state instead of reading DB.
- **Auto-cascade:** Event mutation hook that calls `simulate()` after guest_count/menu/allergy changes and surfaces delta as a notification.
- **Equipment capacity:** Add capacity specs to equipment_inventory, build a threshold calculator that consumes the scaled ingredient list.

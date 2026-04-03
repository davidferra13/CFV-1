# Spec: Cost Propagation Wiring

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** medium (5-8 files)

## Timeline

| Event         | Date       | Agent/Session | Commit |
| ------------- | ---------- | ------------- | ------ |
| Created       | 2026-04-02 | Planner       |        |
| Status: ready | 2026-04-02 | Planner       |        |

---

## Developer Notes

### Raw Signal

"Right now, systems exist but they are not fully interconnected. Actions taken in one area should automatically inform and update all relevant systems. The system should consistently answer: what does this affect next? Pricing should not exist independently. It should dynamically reflect menu composition, vendor selection, and event constraints. After an event, actual costs, adjustments, and outcomes should feed back into pricing, recipes, and future recommendations, closing the loop."

### Developer Intent

- **Core goal:** Make mutations propagate. When data changes in one system, every downstream consumer updates automatically. No manual refresh, no stale UI, no disconnected chains.
- **Key constraints:** Don't change the pull-based architecture to push-based. Keep `resolvePrice()` as the single source of truth. Just wire it into the places that currently ignore it.
- **Motivation:** The cross-system continuity audit (`docs/research/cross-system-continuity-audit.md`) found 16 break points. This spec fixes the 4 highest-impact ones that affect financial accuracy and decision quality.
- **Success from the developer's perspective:** Recipe costs reflect fresh market data. Editing a menu flags the event. Profitable events inform future quotes. No stale cost data anywhere.

---

## What This Does (Plain English)

After this is built: (1) Recipe ingredient costs use the 10-tier price resolution chain instead of a stale single column, so recipe and menu costs always reflect the freshest available market data. (2) Adding, updating, or deleting menu components automatically flags the linked event for cost review. (3) Menu and event pages get cache invalidation after mutations so the UI never shows stale numbers. (4) The smart quote suggestion engine weighs historical profitability, so it recommends prices that were profitable, not just prices that were charged before.

---

## Why It Matters

The price resolution engine is the most sophisticated part of ChefFlow (10-tier, 27+ sources, confidence scoring, freshness decay). But recipe costing bypasses it entirely, reading a stale column instead. This means the system's best feature has zero impact on the system's most important output (what things cost). Fixing this single connection makes the entire pricing investment pay off.

---

## Files to Modify

| File                                             | What to Change                                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/recipes/actions.ts`                         | `computeRecipeIngredientCost()` (~line 1811): replace `ingredients.cost_per_unit_cents` read with `resolvePrice()` call                                                        |
| `lib/menus/actions.ts`                           | `addComponentToDish()`, `updateComponent()`, and `deleteComponent()` (~line 1131+): add event cost flagging plus real menu/event revalidation after mutations                  |
| `lib/intelligence/smart-quote-suggestions.ts`    | `getSmartQuoteSuggestion()`: add profitability weighting from `event-profitability.ts` to suggestion scoring                                                                   |
| `lib/pricing/cost-refresh-actions.ts`            | `propagatePriceChange()`: keep `/culinary/costing` and `/culinary/recipes`, and add real menu/event path revalidation (`/menus`, `/events`, affected detail pages where known) |
| `components/intelligence/smart-pricing-hint.tsx` | Display profitability context alongside price suggestion (e.g., "Similar events averaged 42% margin")                                                                          |

---

## Database Changes

None. All required tables, columns, and views already exist.

---

## Detailed Changes

### C2: Wire resolvePrice() into recipe costing

**Current behavior** (`lib/recipes/actions.ts:1811`):

```typescript
// CURRENT - reads stale column
const costPerUnit = ingredient.cost_per_unit_cents
const computed = costPerUnit ? Math.round(costPerUnit * quantity) : null
```

**New behavior:**

```typescript
// NEW - uses 10-tier resolution chain
import { resolvePrice } from '@/lib/pricing/resolve-price'

const resolved = await resolvePrice(ingredientId, tenantId)
const costPerUnit = resolved.cents // freshest available price
const computed = costPerUnit ? Math.round((costPerUnit / unitConversionFactor) * quantity) : null
```

**Key considerations:**

- `resolvePrice()` is async and hits the database. For batch recipe costing, use `resolvePricesBatch()` instead to avoid N+1 queries
- `refreshRecipeTotalCost()` already sums `computed_cost_cents` from recipe_ingredients, so it benefits automatically once individual costs are fresh
- The `cost_per_unit_cents` column on `ingredients` still gets updated by `propagatePriceChange()` for backward compatibility, but should no longer be the primary source for recipe costing

### C3: Flag events when menu components change

**Current behavior** (`lib/menus/actions.ts:1131+`):
Adding/removing/updating menu components does NOT:

- Flag the linked event's `cost_needs_refresh`
- Call `revalidatePath` for any page

**New behavior:**
After every component mutation (add/update/delete):

1. Query the component's dish, then the parent menu and its `event_id`
2. If an event exists, set `events.cost_needs_refresh = true`
3. Revalidate the real routes already present in the repo: `/menus`, `/menus/[id]`, `/events`, and `/events/[id]` when the corresponding ids are known

```typescript
// After component INSERT/UPDATE/DELETE:
if (menu.event_id) {
  await db
    .from('events')
    .update({ cost_needs_refresh: true })
    .eq('id', menu.event_id)
    .eq('cost_needs_refresh', false) // CAS guard - only if not already flagged
}
revalidatePath('/menus')
revalidatePath(`/menus/${menu.id}`)
revalidatePath('/events')
revalidatePath(`/events/${menu.event_id}`)
```

### M1: Cache invalidation after menu edits

**Current behavior:** `propagatePriceChange()` revalidates `/culinary/costing` and `/culinary/recipes` but not the real menu and event routes that surface stale cost state.

**New behavior:** Add to `propagatePriceChange()`:

```typescript
revalidatePath('/menus')
revalidatePath('/events')
// Also revalidate affected detail pages when the menu/event ids are available
```

### H1: Profitability-aware quote suggestions

**Current behavior** (`lib/intelligence/smart-quote-suggestions.ts`):

- Scores similarity by guest count, occasion, service style, season
- Suggests price based on average of past similar quotes
- Ignores whether those events were profitable

**New behavior:**

- Import `getEventProfitability()` from `lib/intelligence/event-profitability.ts`
- For each similar historical event, fetch its actual profitability
- Weight the suggestion: events with > 30% margin get 1.2x weight, events with < 10% margin get 0.7x weight
- Add a `profitabilityContext` field to the response: `{ avgMargin, bestMargin, worstMargin }`
- Display in `smart-pricing-hint.tsx`: "Similar events averaged X% margin"

---

## Server Actions

No new server actions. All changes are internal to existing functions.

| Function Modified               | Auth                                | Change                                       | Side Effects                                       |
| ------------------------------- | ----------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `computeRecipeIngredientCost()` | Internal (called by server actions) | Use `resolvePrice()` instead of stale column | Recipe costs become dynamic                        |
| `addComponentToDish()`          | `requireChef()`                     | Add event flagging + revalidation            | `events.cost_needs_refresh = true`, revalidatePath |
| `updateComponent()`             | `requireChef()`                     | Same as above                                | Same                                               |
| `deleteComponent()`             | `requireChef()`                     | Same as above                                | Same                                               |
| `propagatePriceChange()`        | Internal                            | Add menu/event revalidation                  | revalidatePath for menus and events                |
| `getSmartQuoteSuggestion()`     | `requireChef()`                     | Add profitability weighting                  | None (read-only enhancement)                       |

---

## Edge Cases and Error Handling

| Scenario                                                     | Correct Behavior                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `resolvePrice()` returns `cents: null` for an ingredient     | Fall back to `ingredients.cost_per_unit_cents` (stale column becomes the safety net, not the primary source) |
| Menu has no linked event                                     | Skip event flagging (standalone menus exist)                                                                 |
| `getEventProfitability()` returns no data for similar events | Fall back to current averaging behavior (profitability weighting is additive, not required)                  |
| Batch recipe costing hits rate limits                        | `resolvePricesBatch()` is already optimized for 6 queries total; no N+1 concern                              |
| Event already flagged `cost_needs_refresh = true`            | CAS guard prevents redundant updates                                                                         |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to a recipe with ingredients that have OpenClaw pricing
3. Verify: recipe ingredient costs reflect `resolvePrice()` output (check confidence/source in UI if shown)
4. Navigate to a menu linked to an event
5. Add a new component to the menu
6. Verify: the linked event now shows "Cost needs review" indicator
7. Navigate to quote creation for a test event
8. Verify: smart pricing hint shows profitability context ("Similar events averaged X% margin")
9. Refresh a price (log a new receipt for an ingredient)
10. Verify: recipe costs update on next page load (no manual "refresh costs" button needed)
11. Screenshot all verification points

---

## Out of Scope

- Changing the pull-based architecture to push-based (event-driven price updates)
- Real-time WebSocket price streaming
- Menu cost materialization (the on-demand view approach is fine)
- Event financial summary view redesign (that's a separate spec, M2 from the audit)
- Recipe feedback influencing menu recommendations (H2 from audit, separate spec)
- Automatic escalation for aging queue items (M5 from audit, separate spec)

---

## Notes for Builder Agent

1. **Read `lib/pricing/resolve-price.ts` thoroughly.** Understand both `resolvePrice()` (single) and `resolvePricesBatch()` (batch). Use batch for `refreshRecipeTotalCost()` which processes all ingredients in a recipe.

2. **The stale column becomes a fallback, not the source.** `ingredients.cost_per_unit_cents` and `ingredients.last_price_cents` should still be written by `propagatePriceChange()` for backward compatibility. But `computeRecipeIngredientCost()` should prefer `resolvePrice()` output.

3. **Unit conversion matters.** `resolvePrice()` returns a price per unit (e.g., $3.49/lb). `recipe_ingredients` has a quantity and unit that may differ (e.g., 8 oz). The existing `computeRecipeIngredientCost()` already handles unit conversion; preserve that logic.

4. **Menu component mutations are in `lib/menus/actions.ts`.** The relevant functions are `addComponentToDish`, `updateComponent`, `deleteComponent`, and `reorderComponents`. The first three change menu cost composition and need event flagging. `reorderComponents` does not because order alone does not affect cost.

5. **Use real route paths, not guessed aliases.** This repo has both `/menus` and `/events` surfaces, plus `/menus/[id]` and `/events/[id]` detail pages. Do not add revalidation calls for nonexistent `/culinary/menus` pages when the stale state is actually rendered on the real menu and event routes.

6. **The profitability integration is additive.** If `getEventProfitability()` fails or returns no data, the quote suggestion still works exactly as before. The profitability weighting is a bonus signal, not a requirement.

7. **Reference:** `docs/research/cross-system-continuity-audit.md` documents all 16 break points. This spec fixes C2, C3, M1, and H1. The companion vendor spec fixes H3 and M3.

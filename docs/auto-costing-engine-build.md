# Auto-Costing Engine - Build Summary

**Built:** 2026-03-28
**Spec:** `docs/specs/auto-costing-engine.md`
**Status:** SPEC IS BUILT

## What Changed

### New Files

| File                                                             | Purpose                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `lib/pricing/cost-refresh-actions.ts`                            | Core engine: batch price refresh, cascade propagation, event flagging |
| `lib/pricing/ingredient-matching-actions.ts`                     | pg_trgm fuzzy matching, name normalization, confirm/dismiss aliases   |
| `lib/pricing/costing-coverage-actions.ts`                        | Recipe and menu costing coverage queries                              |
| `components/pricing/cost-refresh-button.tsx`                     | "Refresh All Prices" button with result summary                       |
| `components/pricing/costing-confidence-badge.tsx`                | Green/amber/red coverage indicator                                    |
| `components/pricing/ingredient-match-review.tsx`                 | Unmatched ingredient review panel with batch confirm                  |
| `components/pricing/cost-stale-banner.tsx`                       | Amber banner on events when costs need refresh                        |
| `database/migrations/20260401000112_ingredient_aliases.sql`      | ingredient_aliases table (tenant scoped, unique per ingredient)       |
| `database/migrations/20260401000113_seed_system_ingredients.sql` | 563 system ingredients across 14 categories with density data         |
| `database/migrations/20260401000114_menu_cost_scale_factor.sql`  | Updated compute_menu_cost_cents() with scale_factor support           |

### Modified Files

| File                                     | Change                                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `lib/recipes/actions.ts`                 | Exported `computeRecipeIngredientCost` and `refreshRecipeTotalCost`; added cost refresh after ingredient removal |
| `lib/ingredients/pricing.ts`             | Added `propagatePriceChange` call after price logging                                                            |
| `lib/inventory/price-cascade-actions.ts` | Added `propagatePriceChange` call after cascade price update                                                     |
| `lib/openclaw/sync.ts`                   | Added post-sync cost refresh trigger (fire-and-forget)                                                           |
| `app/(chef)/culinary/costing/page.tsx`   | Integrated CostRefreshButton, CostingConfidenceBadge, IngredientMatchReview                                      |
| `app/(chef)/events/[id]/page.tsx`        | Added CostStaleBanner for stale cost alerts                                                                      |
| `package.json`                           | Added `pluralize` dependency for ingredient name normalization                                                   |

## Architecture

### Price Cascade Flow

```
Price change (any source)
  -> propagatePriceChange(ingredientIds)
    -> recompute each recipe_ingredient cost (unit conversion)
    -> refresh each affected recipe total
    -> flag events with cost_needs_refresh = true
    -> bust UI caches
```

### Entry Points

1. **Manual refresh:** CostRefreshButton calls `refreshIngredientCostsAction()`
2. **Price logged:** `logIngredientPrice()` triggers cascade
3. **Inventory cascade:** `cascadeIngredientPrice()` triggers cascade
4. **OpenClaw sync:** post-sync fires `refreshIngredientCostsAction()` (non-blocking)
5. **Match confirmed:** `confirmMatchAction()` triggers single-ingredient refresh

### Ingredient Matching

- Deterministic name normalization (lowercase, depluralize, expand abbreviations, strip articles)
- pg_trgm similarity search against 563 system_ingredients (threshold: 0.3)
- Chef confirms or dismisses matches; confirmed matches copy density data
- Batch confirm for high-confidence matches (>80% similarity)

### Safety

- Advisory lock (`pg_try_advisory_lock`) prevents concurrent refreshes
- All side effects wrapped in try/catch (non-blocking)
- Every `startTransition` has try/catch with rollback per zero-hallucination rules
- Tenant scoping on every query via `requireChef()` session

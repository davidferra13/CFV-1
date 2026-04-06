# Session Digest: Food Costing Pipeline - Full End-to-End Wiring

**Date:** 2026-04-06
**Agent:** General (Claude Opus 4.6)
**Task:** Wire the food costing knowledge system into a fully automatic pipeline

## What Happened

Started with a knowledge layer that was ~40% logic-driving, ~30% display-only, ~30% orphaned. Ended with a fully automatic costing pipeline from ingredient entry through event-level financial analysis, with zero hardcoded magic numbers and automatic ingredient name matching.

## Phase 3: Full Pipeline Wiring

### Centralized constants (10 files, zero duplicated magic numbers)

Every unit conversion file now imports `WEIGHT_CONVERSIONS` and `VOLUME_CONVERSIONS` from `lib/costing/knowledge.ts`:

- `lib/units/conversion-engine.ts`
- `lib/formulas/unit-conversions.ts`
- `lib/grocery/unit-conversion.ts`
- `lib/vendors/price-normalization.ts`
- `lib/pricing/universal-price-lookup.ts`
- `lib/recipes/nutrition-actions.ts`
- `lib/recipes/nutritional-calculator-actions.ts`
- `lib/formulas/grocery-consolidation.ts`

### Operator-aware thresholds (3 files)

- `lib/finance/food-cost-calculator.ts` - `getFoodCostRating()` and `getFoodCostBadgeColor()` accept `operatorType`
- `lib/formulas/pricing-recommendation.ts` - benchmark warnings use `OPERATOR_TARGETS`
- `components/finance/food-cost-widget.tsx` - displays operator-specific target ranges

### Auto-price resolution (the critical gap)

- `ensureIngredientHasPrice()` in `lib/recipes/actions.ts` - resolves 10-tier price chain automatically when an ingredient is added to a recipe
- Falls back to alias-aware sibling lookup when direct resolution returns null

### Ingredient auto-matching (the normalization gap)

- `autoMatchToSystemIngredient()` in `lib/recipes/actions.ts` - pg_trgm similarity against 5,435 system_ingredients on ingredient creation
- Creates `ingredient_alias` automatically when match >= 0.5
- OpenClaw sync now sends canonical names from aliases alongside original/normalized names

### New UI components

- `components/costing/cost-line-reference-panel.tsx` - 80+ operator-specific cost lines on pricing settings
- `components/costing/event-food-cost-insight.tsx` - food cost vs price on event detail Money tab
- Help popovers added to all pricing config sections

### Event detail wiring

- `app/(chef)/events/[id]/page.tsx` - fetches `menu_cost_summary` + `chefArchetype`
- `event-detail-money-tab.tsx` - renders `EventFoodCostInsight` with margin analysis

## Key Decisions

1. **Constants live in knowledge.ts only.** All other files import. One source of truth.
2. **Auto-price is non-blocking.** If resolution fails, ingredient still gets added. Cost shows null with warning.
3. **Auto-matching threshold is 0.5.** Below that, no alias is created. Chef can still manually confirm lower matches.
4. **Alias-aware sync is additive.** Canonical names from aliases are added to the Pi lookup set, not replacing original names.
5. **Stopped at the anti-clutter boundary.** Feedback loop and trend forecasting are new features, not wiring. Deferred to validation phase.

## Commits

1. `988fe7bbd` - feat(food-costing-pipeline): wire knowledge layer into full end-to-end automation (20 files)
2. `9eb86ef0c` - feat(ingredient-matching): auto-match ingredients to canonical names + alias-aware pricing (2 files)

## Verification

- TSC: green (exit 0) on `9eb86ef0c`
- All pushed to GitHub

## Complete Pipeline (automatic)

```
Chef adds ingredient -> findOrCreateIngredient()
  -> autoMatchToSystemIngredient() (pg_trgm vs 5,435 canonical names)
  -> ensureIngredientHasPrice() (10-tier chain + alias fallback)
  -> computeRecipeIngredientCost() (unit conversion + yield)
  -> refreshRecipeTotalCost() (sum all ingredients)
  -> menu_cost_summary (SQL VIEW, live)
  -> EventFoodCostInsight (margin analysis, operator-aware warnings)
```

## Remaining Gaps (deferred - anti-clutter rule)

1. **Feedback loop** - tracking actual vs predicted costs after event completion
2. **Trend forecasting** - business-level cost trends (per-event forecast exists)

Both are new features requiring validation before building.

## For Next Agent

The food costing system is complete. The pipeline is fully automatic. The next work should be validation: test with real recipes, verify auto-matching quality against the 5,435 system_ingredients, confirm that OpenClaw sync picks up aliased names correctly. Do not build new features on top of this without user feedback on whether the current pipeline works correctly in practice.

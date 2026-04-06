# Session Digest: Trust Provenance Layer

**Date:** 2026-04-06
**Agent:** Builder (General)
**Task:** Add recipe-level trust provenance to the food costing pipeline

## What Changed

### Problem

The food costing pipeline had per-ingredient provenance (source, confidence, freshness via PriceBadge) but collapsed all of it into a single `total_cost_cents` number at the recipe level. A recipe could show "100% priced" while every ingredient was sourced from low-confidence category baselines. The chef had no signal that the total was unreliable.

### Solution

Aggregated ingredient-level `last_price_confidence` into three recipe-level metrics:

- `avg_price_confidence` - average trust across all priced ingredients
- `min_price_confidence` - weakest link (lowest confidence ingredient)
- `low_confidence_count` - how many ingredients have confidence below 50%

### Files Changed

1. **`database/migrations/20260406000001_recipe_confidence_provenance.sql`** - Extends `recipe_cost_summary` view with three new columns
2. **`lib/recipes/actions.ts`** - `RecipeListItem` type + `getRecipes()` now select and return confidence data
3. **`components/pricing/costing-confidence-badge.tsx`** - Rewritten to show "High trust" / "Mixed trust" / "Low trust" instead of just coverage percentage. Tooltip shows detailed breakdown.
4. **`app/(chef)/culinary/costing/page.tsx`** - Passes confidence data to badge, column renamed from "Complete Pricing" to "Price Trust"
5. **`components/onboarding/recipe-entry-form.tsx`** - Added null defaults for new RecipeListItem fields

### Architecture Decisions

- **View-level aggregation, not application-level** - Confidence is computed in the SQL view so it's always consistent and available to any consumer, not just the costing page
- **Three metrics, not one** - Average alone hides outliers. Min shows the weakest link. Count shows scope of the problem.
- **Additive only** - No schema changes to tables. One view replacement. Existing consumers unaffected.
- **No AI involved** - All confidence data comes from the deterministic price resolution chain

## What Didn't Change

- Per-ingredient PriceBadge already worked correctly
- Price resolution chain (`resolve-price.ts`) already carried full provenance
- `cost-refresh-actions.ts` already wrote `last_price_confidence` to ingredients table
- Menu-level confidence not yet aggregated (would require joining through dishes/components/recipes)

## Unresolved

- Menu-level `CostingConfidenceBadge` still shows only coverage (not confidence) because the join path is deeper
- The `getRecipeDetail()` function (single recipe view) doesn't yet surface confidence per-ingredient in the recipe detail page
- Event/quote level: when a quote is generated from a menu with low-confidence pricing, there's no warning yet

## Context for Next Agent

The provenance infrastructure is now in place at two levels: per-ingredient (PriceBadge) and per-recipe (CostingConfidenceBadge). The natural next extensions are menu-level and quote-level confidence surfacing, but both require deeper join paths and should be driven by actual usage patterns rather than speculative completeness.

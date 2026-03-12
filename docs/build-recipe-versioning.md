# Build: Recipe Versioning & Cost History (#47)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #47 Recipe Versioning & Cost History (build order #11)

## What Changed

Added automatic recipe versioning that snapshots ingredient lists and costs before every edit, with a version history panel showing cost changes over time.

### New Files

1. **`lib/recipes/version-actions.ts`** - Server actions for recipe versioning:
   - `snapshotRecipeVersion(recipeId, changeSummary?)` - Captures current recipe state (name, category, method, yield, dietary_tags, ingredients with quantities and costs) into `document_versions` table. Computes total cost and per-portion cost at snapshot time.
   - `getRecipeVersionHistory(recipeId)` - Returns version summaries (version number, cost, date, ingredient count) newest first.
   - `getRecipeVersionDetail(versionId)` - Returns full snapshot with ingredient breakdown.

2. **`components/recipes/recipe-version-history.tsx`** - Version history UI panel:
   - Shows version timeline with total cost at each version
   - Displays cost deltas between versions (red for increase, green for decrease, with percentage)
   - Expandable rows showing ingredient list at that point in time with per-ingredient costs
   - Auto-hides when no versions exist yet

### Modified Files

- **`lib/recipes/actions.ts`** - `updateRecipe()` now auto-snapshots before overwriting (non-blocking, wrapped in try/catch)
- **`app/(chef)/recipes/[id]/recipe-detail-client.tsx`** - Added `<RecipeVersionHistory>` panel between cost summary and event history sections

## Design Decisions

- **Uses existing `document_versions` table** - No new migration needed. The table already supports `entity_type = 'recipe'` (from migration `20260310000001_document_versions.sql`).
- **Pre-edit snapshots** - Captures state BEFORE the update so you always have the previous version. The current state is always the live recipe.
- **Non-blocking** - Snapshot failures don't prevent recipe updates. Logged but swallowed.
- **Cost at point in time** - Each snapshot includes ingredient costs from the moment of capture. This tracks cost drift even when ingredient prices change.
- **Lazy-loaded UI** - Version history fetches on mount, doesn't block recipe page load. Expandable detail fetched on click.
- **No new migration** - Leverages existing infrastructure completely.

## Architecture

```
updateRecipe() call
  → snapshotRecipeVersion() [non-blocking]
    → Read current recipe + ingredients + costs
    → Insert into document_versions (entity_type='recipe')
  → Perform the actual update

Recipe detail page
  → <RecipeVersionHistory recipeId={...} />
    → getRecipeVersionHistory() → version list with cost summaries
    → On expand: getRecipeVersionDetail() → ingredient snapshot
```

## Cost Tracking

Each version snapshot stores:

- `totalCostCents` - Sum of (quantity \* average_price_cents) for all non-optional ingredients
- `costPerPortionCents` - totalCostCents / yield_quantity
- `ingredientCount` - Number of ingredients at that version
- Full ingredient list with individual prices at snapshot time

The UI shows cost deltas between consecutive versions, making cost drift visible at a glance.

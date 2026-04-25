# Ingredient Yield UI

## What Changed

- Added usable yield percentage handling to the recipe ingredient edit surface for existing and newly added ingredients.
- New ingredient rows call the reference yield suggestion action on blur and populate the yield field when a match exists.
- Suggested yield helper text now includes the ingredient name, prep method when present, percentage, and waste context.
- The event ingredient lifecycle view now preserves `NULL` for unrecorded purchases and usage instead of collapsing missing data to `0`.
- Added a unit guard covering the recipe editor yield surface, suggestion payload, grocery yield math, cost projection path, and lifecycle null handling.

## Why

Recipe ingredients already stored `yield_pct`, but the edit UI did not expose the field. That made shopping lists, cost projections, and lifecycle views behave as if every ingredient had 100% usable yield.

## Verification

- `tests/unit/ingredient-yield-lifecycle.test.ts` protects the implementation surface.
- Browser verification against `/recipes/[id]/edit` was attempted with the agent account, but the local dev server failed before the recipe edit surface rendered because of unrelated current workspace/server failures.

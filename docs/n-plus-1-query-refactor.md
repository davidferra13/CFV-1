# N+1 Query Refactor - Menu Engine

**Date:** 2026-03-24
**Scope:** 4 files in `lib/menus/`

## Problem

Several menu engine server actions contained N+1 query patterns: issuing individual database queries inside loops, causing query counts proportional to data size. For a chef with 20 past events and 15 dishes per menu, a single page load could fire 100+ queries.

## Files Changed

### 1. `lib/menus/repeat-detection.ts`

**`checkRepeatMenu`**

- Before: 5 + 4P queries (P = past events with same client)
- After: 6 queries total (constant)
- Created `getRecipeMapsForMenus` bulk helper: fetches menus, dishes, components, recipes in 4 queries regardless of count, assembles per-menu recipe maps in memory via Maps.

**`getClientMenuHistory`**

- Before: 1 + E*(2 + D*2) queries (E = events, D = dishes per event)
- After: 5 queries total (constant)
- Bulk-fetches all menus, dishes, components, recipes in parallel, then assembles in memory.

### 2. `lib/menus/menu-engineering-actions.ts`

**`getMenuSimulatorData` (available recipes section)**

- Before: 1 + up to 100 per-recipe ingredient queries (lines 822-842)
- After: 3 queries total (recipe_cost_summary + recipe_ingredients + ingredients)
- Also removed dead `usedRecipeIds` loop (empty loop body that did nothing).

### 3. `lib/menus/template-actions.ts`

**`createMenuFromTemplate`**

- Before: N dish inserts + sum(components per dish) component inserts (sequential)
- After: 1 batch dish insert + 1 batch component insert (2 queries)
- Dishes batch-inserted with `.insert(array)`, then components collected and batch-inserted.

**`saveMenuAsTemplate`**

- Before: N per-dish component queries
- After: 1 bulk component fetch for all dish IDs
- Components fetched once with `.in('dish_id', dishIds)`, grouped and sorted in memory.

### 4. `lib/menus/dish-index-bridge.ts`

**`indexDishesFromMenu`**

- Before: Per-dish: 1 select + 1 insert/update + 1 appearance insert = 3N queries
- After: 1 bulk fetch existing entries + N updates (unavoidable, each has different values) + 1 batch insert new entries + 1 batch insert appearances
- Pre-computes canonical names, bulk-fetches existing dish_index entries, separates into update vs insert batches, batch-inserts new entries and appearances.

## Pattern Used

All fixes follow the same bulk-fetch pattern:

1. Collect all IDs upfront (before any loop)
2. Issue bulk `.in('id', allIds)` queries
3. Build Maps in memory for O(1) lookups
4. Assemble results by iterating in-memory (zero additional queries)

## Error Boundary Hardening (same session)

Also added graceful degradation to menu page server components, fixing Zero Hallucination Law 2 violations where a single failed supplementary fetch would crash the entire page.

### `app/(chef)/menus/[id]/page.tsx` (menu detail)

- **Before:** `Promise.all([getMenuById, getMenuEvent, getMenuCostSummaries])` - if cost summaries or event fetch throws, the whole page crashes even though the menu loaded fine. Recipe map fetch also unprotected.
- **After:** Menu fetch is the only critical path (triggers `notFound()` on failure). Event, cost summaries, recipe map, recommendations, and inquiry link all have `.catch()` handlers that log and return safe defaults. Page renders with whatever data is available.

### `app/(chef)/menus/page.tsx` (menu list)

- **Before:** `Promise.all([getMenus(), getMenuCostSummaries()])` - cost summary failure kills the page. Events fetch also unprotected.
- **After:** Cost summaries and events fetch wrapped in `.catch()` / `try/catch`. Menu list (critical) still throws normally. Cost and event columns degrade to empty when their fetches fail.

### What didn't need fixing

- `menus/[id]/editor/page.tsx` - single critical fetch (`getEditorContext`), nothing to degrade
- `culinary/menus/engineering/page.tsx` - delegates to client component that handles its own fetching
- Intelligence widgets on menus list page - already wrapped in `WidgetErrorBoundary` + `Suspense`

## Verification

- `npx tsc --noEmit --skipLibCheck` passes with zero errors in all edited files
- No functional changes to return types or component props
- All tenant scoping preserved

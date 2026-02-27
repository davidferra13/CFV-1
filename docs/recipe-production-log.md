# Recipe Production Log

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`

## What Changed

Added a recipe production log system — every time a recipe is produced, it gets recorded with full context: who made it, how much, when it expires, and any batch notes.

## Two Views

### 1. Per-Recipe View (Recipe Detail Page)

On each recipe's detail page (`/recipes/[id]`), a new "Production History" card shows:

- Chronological list of every time this specific recipe was produced
- "Log Production" button opens an inline form
- Color-coded shelf life: green (fresh), amber (use soon within 2 days), red (past discard date)
- Each entry shows: quantity, unit, who made it, date, best-before, discard-by, notes
- Entries can be deleted (adjusts `times_cooked` counter)

### 2. Global Production Log (`/recipes/production-log`)

Business owner view across ALL recipes:

- Stats cards: total productions, unique recipes, use-soon count, expired count
- Search by recipe name, person, or notes
- Filter by shelf status: All / Fresh / Use Soon / Expired
- Each entry links to its recipe detail page
- Shows recipe category badge for quick identification

## Database

### Table: `recipe_production_log`

| Column        | Type            | Description                      |
| ------------- | --------------- | -------------------------------- |
| `id`          | UUID PK         | Auto-generated                   |
| `tenant_id`   | UUID FK→chefs   | Tenant scoping                   |
| `recipe_id`   | UUID FK→recipes | Which recipe                     |
| `produced_at` | TIMESTAMPTZ     | When (defaults to now)           |
| `produced_by` | TEXT            | Who made it                      |
| `quantity`    | DECIMAL(10,3)   | How much                         |
| `unit`        | TEXT            | servings, portions, quarts, etc. |
| `best_before` | TIMESTAMPTZ     | Use-by date                      |
| `discard_at`  | TIMESTAMPTZ     | Hard throw-away date             |
| `batch_notes` | TEXT            | Free-text notes                  |
| `event_id`    | UUID FK→events  | Optional event link              |
| `created_at`  | TIMESTAMPTZ     | Record timestamp                 |

**Migration:** `supabase/migrations/20260327000003_recipe_production_log.sql`
**RLS:** Chef can manage their own logs (tenant_id scoped via user_roles)

## Files

- **Migration:** `supabase/migrations/20260327000003_recipe_production_log.sql`
- **Server actions:** `lib/recipes/production-log-actions.ts`
  - `logProduction()` — create entry + increment `times_cooked`
  - `getProductionLog(recipeId)` — per-recipe entries
  - `getAllProductionLogs()` — global view (last 200)
  - `deleteProductionEntry()` — remove entry + decrement `times_cooked`
- **Recipe detail:** `app/(chef)/recipes/[id]/recipe-detail-client.tsx` — Production History panel
- **Global page:** `app/(chef)/recipes/production-log/page.tsx` + `production-log-client.tsx`
- **Recipes list:** `app/(chef)/recipes/recipes-client.tsx` — added "Production Log" button

## Integration with Recipe Stats

When a production is logged:

- `recipes.times_cooked` is incremented
- `recipes.last_cooked_at` is updated to the production date

When a production is deleted:

- `recipes.times_cooked` is decremented (min 0)

## Shelf Life Color Coding

| Status   | Condition                                       | Color             |
| -------- | ----------------------------------------------- | ----------------- |
| Fresh    | Discard date > 2 days away                      | Green left border |
| Use Soon | Discard date within 2 days, OR past best-before | Amber left border |
| Expired  | Past discard date                               | Red left border   |

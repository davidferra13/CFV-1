# Bakery: Batch Production Planning + Dough/Fermentation Tracking

Two features for bakery operations within ChefFlow.

## Feature 1: Batch Production Planning

Plan batches of baked goods with recipe scaling.

### What it does

- Plan batches for any date (product name, target quantity, optional recipe link)
- Auto-calculate scale factor from recipe's base yield (deterministic math: target / base yield)
- Show scaled ingredient list when recipe is selected
- Advance batches through workflow: planned > in_progress > proofing > baking > cooling > finished
- Record actual yield after completion (compare planned vs actual)
- Daily ingredient summary: totals all ingredient needs across planned batches
- Shortfall alerts by comparing requirements against `inventory_counts`

### Database

- Table: `bakery_batches` (migration `20260331000018`)
- RLS on `tenant_id`, indexed on `(tenant_id, planned_date)`
- Status enum: planned, in_progress, proofing, baking, cooling, finished, cancelled

### Files

- Migration: `supabase/migrations/20260331000018_bakery_batches_and_fermentation.sql`
- Server actions: `lib/bakery/batch-planning-actions.ts`
- UI: `components/bakery/batch-planner.tsx`
- Page: `app/(chef)/bakery/batches/page.tsx`

### Key actions

- `createBatch` / `updateBatch` / `deleteBatch` - CRUD
- `getBatchesForDate` / `getBatchesForWeek` - date queries
- `advanceBatchStatus` - workflow progression (auto-sets start/end timestamps)
- `recordYield` - log actual output
- `calculateScaleFactor` - deterministic: targetQuantity / recipe.yield_quantity, returns scaled ingredients
- `getIngredientRequirements` - sums all ingredient needs for a date, compares against inventory

## Feature 2: Dough/Fermentation Tracking

Log proof times, temperatures, and fermentation stages for dough batches.

### What it does

- Track active fermentation stages with live elapsed-time display
- 7 stages: autolyse, bulk_ferment, fold, shape, cold_retard, final_proof, ready
- Log dough temperature, ambient temperature, and humidity
- Visual stage timeline showing progression
- Target duration with "over target" warnings
- Historical averages: see avg duration per stage for any recipe (deterministic aggregation)
- Recent history view (last 7 days of completed stages)

### Database

- Table: `fermentation_logs` (same migration `20260331000018`)
- RLS on `tenant_id`, indexed on `(tenant_id, start_time)` and `(batch_id)`
- Partial index on active stages (`WHERE end_time IS NULL`)

### Files

- Migration: same file as batch planning
- Server actions: `lib/bakery/fermentation-actions.ts`
- UI: `components/bakery/fermentation-tracker.tsx`
- Page: `app/(chef)/bakery/fermentation/page.tsx`

### Key actions

- `startStage` / `endStage` - begin/complete fermentation stage
- `logTemperature` - update dough and ambient temps
- `getActiveStages` - currently running fermentations
- `getLogForBatch` - full fermentation history for a linked batch
- `getRecentLogs` - recent completed logs
- `getAverageTimes` - historical avg duration per stage per recipe (deterministic math)

## Design principles

- All math is deterministic (Formula > AI). No LLM calls.
- tenant_id always derived from session via `requireChef()` + `user.entityId!`
- All startTransition calls have try/catch with rollback and toast feedback
- Error states shown explicitly (never zero-as-failure)
- Timer cleanup via useEffect return function
- Amounts in cents where applicable (ingredient pricing via existing system)

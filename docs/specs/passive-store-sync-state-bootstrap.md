# Passive Store Sync-State Bootstrap Hardening

## Recommendation

Build a one-time and runtime bootstrap path for `passive_product_sync_state` so existing chefs with passive products or source data are not treated as clean just because they do not yet have a sync-state row.

## Why This Is The Highest-Leverage Remaining Action

- The source-driven sync worker now exists, but it only scans rows that already exist in `passive_product_sync_state`.
- Existing chefs created before the new migration can have passive products and source data without a sync-state row.
- A missing sync-state row currently behaves like "clean" during read fallback when products already exist, so stale pre-migration products can remain untouched until a future source mutation.
- This is additive: it does not change product IDs, checkout, fulfillment, public routes, or passive product shaping.

## Evidence

- The sync-state table defaults new rows to dirty, but the migration does not backfill rows for existing chefs: `database/migrations/20260425000006_passive_store_sync_state.sql:4-17`.
- Dirty triggers only cover future writes to `menus`, `recipes`, and completed `events`: `database/migrations/20260425000006_passive_store_sync_state.sql:161-177`.
- The scheduled worker only processes existing dirty sync-state rows: `lib/passive-store/sync-state.ts:156-164`, `lib/passive-store/sync-state.ts:174-198`.
- Read fallback treats `syncState === null` as clean if active products already exist because `!syncState?.dirty` is true: `lib/passive-store/store.ts:330-339`.
- `syncPassiveProductsForAllChefs` already has the eligible chef query needed for an additive bootstrap/backfill path: `lib/passive-store/store.ts:400-424`.

## Build

1. Add an additive migration after `20260425000006_passive_store_sync_state.sql`.
   - Insert one dirty `passive_product_sync_state` row per existing chef that has at least one passive source:
     - non-archived `menus`
     - non-archived `recipes`
     - `events` with `status = 'completed'`
     - existing `passive_products`
   - Use `ON CONFLICT (chef_id) DO UPDATE` conservatively:
     - preserve `last_synced_at`
     - set `dirty = true`
     - set `last_reason = 'bootstrap_existing_passive_sources'`
     - set `last_source_type = 'bootstrap'`
     - set `last_source_id = null`
     - clear nothing else except updating `last_requested_at` and `updated_at`
   - Keep the migration idempotent.

2. Update `loadActiveProductsWithFallback` in `lib/passive-store/store.ts`.
   - Treat missing sync state as dirty for fallback purposes:
     - If products exist and `syncState?.dirty === false`, return products.
     - Otherwise run exactly one inline sync and read again.
   - Preserve current first-load behavior.
   - Do not change `syncPassiveProductsForChef` product shaping.

3. Add helper coverage in `tests/unit/passive-store-read-sync.test.ts`.
   - Existing product + clean sync row does not call sync.
   - Existing product + dirty sync row calls sync once.
   - Existing product + missing sync row calls sync once.

4. Add migration contract coverage.
   - Extend `tests/unit/passive-store-sync-migration.test.ts` or add a focused test for the new migration file.
   - Assert it inserts/selects from `passive_product_sync_state`.
   - Assert it references `menus`, `recipes`, completed `events`, and `passive_products`.
   - Assert the bootstrap reason string is present.

## Constraints

- Additive only.
- No product ID, checkout, fulfillment, public route, or product transformation changes.
- No external services.
- Keep the manual seed script optional.
- Do not broaden the worker cadence or batch size.
- Do not touch unrelated cron monitoring failures.

## Acceptance Criteria

- Existing chefs with passive source data get dirty sync-state rows after migration.
- Scheduled passive-store sync can pick up those chefs without waiting for public reads or source mutations.
- A missing sync-state row no longer makes an existing product set look clean.
- Clean storefront reads still avoid unnecessary syncs.
- Dirty and missing-state reads perform one inline fallback sync.

## Test Plan

- Run:
  - `node --test --import tsx tests/unit/passive-store-read-sync.test.ts tests/unit/passive-store-sync-migration.test.ts`
  - `node --test --import tsx tests/unit/passive-store-generation.test.ts tests/unit/passive-store-sync-state.test.ts tests/unit/passive-store-sync-route.test.ts`
  - `npm run typecheck:app`

## Non-Goals

- New passive product types
- Storefront redesign
- Payment provider integration
- Chef-facing sync controls
- Reworking cron monitoring unrelated to passive store sync

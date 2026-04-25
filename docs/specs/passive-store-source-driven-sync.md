# Passive Store Source-Driven Sync

## Recommendation

Build a DB-backed passive-store dirty-state and sync worker so passive products stay fresh automatically from source-data changes, without relying on public page views or the manual seed script.

## Why This Is The Highest-Leverage Remaining Action

- The passive store currently derives products correctly, but freshness is still request-driven.
- This is the one remaining gap between "products can be generated" and "products stay automatically sellable with zero chef effort."
- It is fully additive: keep current storefront, checkout, fulfillment, and inline sync fallback intact.

## Evidence

- Product sources are the live `menus`, `recipes`, and completed `events` tables: `lib/passive-store/store.ts:210-287`.
- Product generation currently runs inside read paths:
  - public storefront: `lib/passive-store/store.ts:385-420`
  - public product checkout lookup: `lib/passive-store/store.ts:423-462`
  - purchase flow: `lib/passive-store/store.ts:527-629`
  - chef storefront overview: `lib/passive-store/store.ts:647-680`
- The only non-request sync path is a manual backfill script: `scripts/seed-passive-store.ts:8-21`.
- There is no sync-state/dirty-state table in the passive-store migration; only products and purchases exist: `database/migrations/20260422002000_passive_storefront.sql:4-73`.
- Public copy already promises automatic generation from live source data:
  - storefront: `app/(public)/chef/[slug]/store/page.tsx:106-109`
  - gift cards page: `app/(public)/chef/[slug]/gift-cards/page.tsx:21-24`, `app/(public)/chef/[slug]/gift-cards/page.tsx:69-73`
- Source mutations that should dirty the store already exist in stable write surfaces:
  - menu updates: `lib/menus/actions.ts:445-505`
  - showcase changes affect menu ranking: `lib/menus/showcase-actions.ts:15-35`
  - recipe create/update/delete: `lib/recipes/actions.ts:255-264`, `lib/recipes/actions.ts:649-703`, `lib/recipes/actions.ts:710-768`
  - recipe costing recompute changes collection pricing inputs: `lib/recipes/actions.ts:2276-2330`
  - event updates and completed transitions affect prepaid experiences: `lib/events/actions.ts:440-525`, `lib/events/transitions.ts:1658-1669`

## Build

1. Add a new additive migration for `passive_product_sync_state`.
   - Columns: `chef_id` PK, `dirty`, `last_requested_at`, `last_synced_at`, `last_error`, `last_reason`, `last_source_type`, `last_source_id`, `updated_at`.
   - Add an index on `(dirty, last_requested_at)`.
   - Default new rows to `dirty = true`.

2. Add DB trigger functions that upsert dirty state automatically.
   - `menus`: mark the owning `tenant_id` dirty on insert/update/delete.
   - `recipes`: mark the owning `tenant_id` dirty on insert/update/delete.
   - `events`: mark dirty only when the old or new row is `completed`, because passive experiences are sourced only from completed events.
   - Do this in SQL so all write paths are covered without chasing every server action forever.

3. Add a new server module: `lib/passive-store/sync-state.ts`.
   - `markPassiveStoreDirty(...)`
   - `getPassiveStoreSyncState(chefId)`
   - `markPassiveStoreSyncSuccess(chefId)`
   - `markPassiveStoreSyncFailure(chefId, error)`
   - `listDirtyPassiveStoreChefs(limit)`
   - `syncDirtyPassiveStores(limit)` that calls existing `syncPassiveProductsForChef`.

4. Update `syncPassiveProductsForChef` in `lib/passive-store/store.ts`.
   - On success: clear `dirty`, stamp `last_synced_at`, clear `last_error`.
   - On failure: preserve dirty state and persist `last_error`.
   - Do not change product-shaping or fulfillment behavior.

5. Add a scheduled worker route: `app/api/scheduled/passive-store-sync/route.ts`.
   - Use the existing cron auth/monitoring pattern.
   - Process dirty chefs in small batches, e.g. 25 per run.
   - Return counts for scanned/synced/failed.

6. Register the cron in `lib/cron/definitions.ts`.
   - Cadence: `15m` is sufficient for MVP.
   - Description: passive storefront product freshness sync.

7. Reduce read-time syncing, but keep a safe fallback.
   - In `getPassiveStorefrontBySlug`, `getPassiveProductForPublicCheckout`, and `getPassiveStorefrontOverviewForChef`, stop syncing unconditionally on every request.
   - Read current products first.
   - If no products exist yet, or sync state is dirty, do one inline sync fallback, then read again.
   - This keeps first-load behavior safe while removing constant resyncs on clean reads.

## Constraints

- No breaking changes to product IDs, checkout, fulfillment, public routes, or existing passive product transformation logic.
- No external services.
- Keep the manual seed script as an optional backfill tool.

## Acceptance Criteria

- A menu/recipe/completed-event change marks the chef's passive store dirty automatically.
- A scheduled run syncs dirty chefs and clears dirty state on success.
- Clean storefront reads no longer upsert products on every request.
- First-load and lagging-sync scenarios still work because inline fallback remains.
- Existing purchase flow and order fulfillment remain unchanged.

## Test Plan

- Add unit tests for dirty-state helpers and `syncDirtyPassiveStores`.
- Add a route test for `/api/scheduled/passive-store-sync`.
- Extend passive-store tests to cover:
  - dirty row created after source mutation
  - dirty row cleared after sync
  - clean storefront read does not call sync
  - dirty storefront read performs one fallback sync

## Non-Goals

- New product types
- New chef workflows
- Payment provider integration
- Storefront redesign

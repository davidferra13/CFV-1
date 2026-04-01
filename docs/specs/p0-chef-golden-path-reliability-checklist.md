# Checklist: Chef Golden Path Reliability

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** `docs/specs/p0-chef-golden-path-reliability.md`
> **Scope rule:** do not expand beyond the existing chef workflow

## Purpose

This checklist is the execution split of the parent P0 spec. It does not change scope. It breaks the same recovery work into a builder-usable sequence tied to the current repo anchors. Current anchors: `docs/specs/p0-chef-golden-path-reliability.md`, `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357`, `lib/menus/actions.ts:293,298,304,322,327`.

## Scope Lock

- [ ] Stay on the current chef path: `/recipes/new` -> `/recipes/ingredients` -> `/culinary/costing` -> `/menus/new` -> `/menus/[id]` -> `/menus/[id]/editor` -> `/culinary/dish-index`. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/recipes/ingredients/ingredients-client.tsx:126`, `app/(chef)/culinary/costing/page.tsx:208`, `app/(chef)/menus/new/create-menu-form.tsx:188`, `app/(chef)/menus/[id]/page.tsx:17`, `app/(chef)/culinary/dish-index/page.tsx:9`.
- [ ] Do not add new pages, new culinary root objects, or a parallel builder flow. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/culinary/dish-index/page.tsx:9`.
- [ ] Do not create migrations unless schema drift is proven first. Current anchors: `database/migrations/20260327000004_dish_index.sql:59,139,241,253,254`, `lib/menus/dish-index-actions.ts:149,209`.

## Phase 1: Verify Write-Path Contract

- [ ] Trace recipe create from client submit into server write path. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357`, `lib/recipes/actions.ts:214,250,722`.
- [ ] Trace menu create from client submit into menu and dish writes. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320`, `lib/menus/actions.ts:295,310,322,327,911`.
- [ ] Verify whether `requireChef()` identity reaches the DB client path used by writes. Current anchors: `lib/auth/get-user.ts:41,57,122,123`, `lib/db/server.ts:5,7,8`, `lib/db/compat.ts:201,382,387,392,398,1364`.
- [ ] Compare write expectations against existing tenant policies before touching actions. Current anchors: `lib/db/schema/schema.ts:1108,1142,15536,15654`.

## Phase 2: Repair Recipe Create

- [ ] Replace split recipe create plus per-ingredient follow-up with one authoritative result contract. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357,982`, `lib/recipes/actions.ts:214,250,722`.
- [ ] Prevent partial success when ingredient linkage fails after base recipe insert. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:334,357`, `lib/recipes/actions.ts:214,250,722`.
- [ ] Return typed failures instead of generic save errors. Current anchors: `lib/recipes/actions.ts:250`, `app/(chef)/recipes/new/create-recipe-client.tsx:357`.
- [ ] Revalidate recipe list, ingredient library, and costing surfaces together after success. Current anchors: `lib/recipes/actions.ts:253,989,338,340,374,376`.

## Phase 3: Repair Menu Create

- [ ] Make `createMenuWithCourses()` fail the chef flow when any dish insert fails. Current anchors: `lib/menus/actions.ts:293,298,304,310,322,327,911`.
- [ ] Block the create form from advancing to breakdown unless persisted dish rows exist. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:299,300,303,320,330`.
- [ ] Remove fake-success behavior that allows the breakdown panel to render on non-persisted assumptions. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:330`, `components/menus/menu-breakdown-panel.tsx:98,169,237,274,314`.
- [ ] Preserve existing menu-state transition behavior after the write contract is fixed. Current anchors: `lib/menus/actions.ts:168,220,241`.

## Phase 4: Repair Editor Add Course

- [ ] Make `addEditorCourse()` return a typed success or typed failure. Current anchors: `lib/menus/editor-actions.ts:422,454`.
- [ ] Ensure editor costing reads still align to persisted dish rows after course insertion. Current anchors: `lib/menus/editor-actions.ts:671,689,690`.
- [ ] Verify menu detail still resolves correct cost summary after editor writes. Current anchors: `app/(chef)/menus/[id]/page.tsx:22,108`, `lib/menus/actions.ts:1264,1271`.

## Phase 5: Repair Dish Index

- [ ] Prove whether the live `linked_recipe_id` failure is schema drift or query-path failure. Current anchors: `database/migrations/20260327000004_dish_index.sql:59,139,241,253,254`, `lib/menus/dish-index-actions.ts:52,149,209,631`.
- [ ] If schema is intact, harden the join/enrichment path in `getDishIndex()` and related reads. Current anchors: `lib/menus/dish-index-actions.ts:128,149,167,169,200,209,624,631,638`.
- [ ] Ensure the page and client surface terminate in populated, empty, or error states. Current anchors: `app/(chef)/culinary/dish-index/page.tsx:2,3,9,11`, `app/(chef)/culinary/dish-index/dish-index-client.tsx:37,90,127,263`.

## Phase 6: Repair Menu Quick View

- [ ] Ensure uncached quick-view fetches always terminate loading on success or failure. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:236,347,349,354,356,628`.
- [ ] Make the modal show a real retryable error state when detail fetch fails. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:354,356,596,628`.
- [ ] Verify quick-view data assembly still returns component and cost fields correctly after any upstream fixes. Current anchors: `lib/menus/actions.ts:1602,1627,1655,1676,1679,1680`.

## Phase 7: Repair Costing Honesty

- [ ] Stop mapping empty or unknown states into a misleading completion percentage. Current anchors: `app/(chef)/culinary/costing/page.tsx:152,153,155,252,253,255`, `components/pricing/costing-confidence-badge.tsx:4,14,17,19,34`.
- [ ] Expand the read contract or UI mapping to distinguish `no_components`, `no_priced_data`, `partial`, and `complete`. Current anchors: `lib/recipes/actions.ts:338,340,374,376`, `lib/menus/actions.ts:1264,1271,1583,1655,1676`.
- [ ] Keep saved-but-unpriced recipes and menus usable while surfacing incomplete pricing explicitly. Current anchors: `app/(chef)/recipes/ingredients/ingredients-client.tsx:180`, `app/(chef)/culinary/costing/page.tsx:152,153,155,252,253,255`.

## Phase 8: Full Live Verification

- [ ] Create `QA Seared Salmon Spec Check` from `/recipes/new` with the manual ingredients listed in the parent spec. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:441,451,982`.
- [ ] Verify ingredients appear in `/recipes/ingredients`. Current anchors: `app/(chef)/recipes/ingredients/ingredients-client.tsx:126,180`, `lib/recipes/actions.ts:989`.
- [ ] Verify costing reflects priced or incomplete status honestly for that recipe. Current anchors: `lib/recipes/actions.ts:338,340,374,376`, `app/(chef)/culinary/costing/page.tsx:152,153,155`.
- [ ] Create a three-course menu from `/menus/new` and verify persisted course count on create and detail views. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:299,300,303,320,330`, `components/menus/menu-breakdown-panel.tsx:169`, `app/(chef)/menus/[id]/page.tsx:22,108`.
- [ ] Verify quick view resolves, editor add-course persists, dish index loads, and costing does not mark empty content complete. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:336,347,349,356,628`, `lib/menus/editor-actions.ts:422,454`, `app/(chef)/culinary/dish-index/page.tsx:9,11`, `app/(chef)/culinary/costing/page.tsx:252,253,255`.

## Regression Checklist

- [ ] `/recipes` still loads for existing data after recipe write-path changes. Current anchors: `lib/recipes/actions.ts:253,338,340`.
- [ ] `/menus` still loads and quick view still opens for existing data after menu changes. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:336,596`, `lib/menus/actions.ts:1602,1676,1679,1680`.
- [ ] `/culinary/costing` still loads for existing recipe and menu data after completeness changes. Current anchors: `app/(chef)/culinary/costing/page.tsx:208,252`.
- [ ] Menu duplication still works after menu write-path changes. Current anchors: `lib/menus/actions.ts:1293,1323,1353,1382,1389`.
- [ ] Global overlays still do not block recipe create controls. Current anchors: `app/layout.tsx:4,132`, `app/(chef)/layout.tsx:28,175,178`, `app/(chef)/recipes/new/create-recipe-client.tsx:982`.

## Stop Conditions

- [ ] Stop and escalate if request auth or tenant context cannot be proven in the server DB path. Current anchors: `lib/auth/get-user.ts:57,122`, `lib/db/server.ts:7,8`, `lib/db/schema/schema.ts:1108,15536,15654`.
- [ ] Stop and escalate if live DB schema does not match `dish_index` migration expectations. Current anchors: `database/migrations/20260327000004_dish_index.sql:59,139,241,253,254`, `lib/menus/dish-index-actions.ts:149,209`.
- [ ] Stop and revise the parent spec before adding any new object model, page, or parallel flow. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/culinary/dish-index/page.tsx:9`.

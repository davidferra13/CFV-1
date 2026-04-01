# Spec: Chef Golden Path Reliability

> **Status:** built
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-31

## Timeline

| Event                    | Date             | Agent/Session  | Commit |
| ------------------------ | ---------------- | -------------- | ------ |
| Created                  | 2026-03-31 22:33 | Codex planner  |        |
| Tightened with citations | 2026-03-31 23:15 | Codex planner  |        |
| Status: ready            | 2026-03-31 22:33 | Codex planner  |        |
| Build started            | 2026-04-01       | Claude builder |        |
| Type check passed        | 2026-04-01       | Claude builder |        |
| Build completed          | 2026-04-01       | Claude builder |        |

---

## Citation Note

- Repo citations below are current builder anchors. They point to the current route, action, component, schema, or migration line that implements or exposes the behavior being discussed.
- Live QA findings are paired with current repo anchors. The citation does not replace the runtime observation; it tells the builder where the current behavior is wired. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357,982`, `lib/recipes/actions.ts:214,250,722`, `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320`, `lib/menus/actions.ts:293,295,298,304,322,327`, `app/(chef)/menus/menus-client-wrapper.tsx:236,347,349,356,628`, `app/(chef)/culinary/dish-index/page.tsx:2,9,11`, `lib/menus/dish-index-actions.ts:128,149`.

---

## Developer Notes

### Raw Signal

Shift from data validation to real-world usability testing.

Act like a chef using the current ChefFlow application and test the full workflow.

Do not test the engine in isolation. Test the actual website functionality.

Determine whether a chef can:

- create recipes
- attach ingredients
- retrieve pricing
- build dishes
- build menus

using the current system.

Validate each step:

- Does the system allow the action?
- Does it behave correctly?
- Does it break or block the workflow?
- Is anything confusing or missing?

If something does not work, classify it precisely as:

- UI issue
- Feature gap
- Data issue
- Logic issue

This is not about whether the system "can" work. This is about whether a real chef could sit down and use it right now without friction.

Before taking action, confirm exact context, goal, assumptions, proof, scope, regression risk, and plan.

Proceed with the most intelligent decisions on the developer's behalf, but only write specs. Do not build.

### Developer Intent

- **Core goal:** make the live chef website usable for the real culinary chain that matters right now: recipe creation -> ingredient attachment -> price visibility -> dish building -> menu building. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57,294,334,982`, `app/(chef)/recipes/ingredients/ingredients-client.tsx:126,133,180`, `app/(chef)/culinary/costing/page.tsx:152,208,252`, `app/(chef)/culinary/dish-index/page.tsx:9,11`, `app/(chef)/menus/new/create-menu-form.tsx:188,320,756`, `app/(chef)/menus/[id]/page.tsx:17,22,108`.
- **Key constraints:** repair the current workflow, not a parallel model; do not test the engine in isolation; do not hide failures behind fake success states. Current anchors: `lib/menus/actions.ts:293,298,304,322,327`, `components/menus/menu-breakdown-panel.tsx:169,237,274,314`, `components/pricing/costing-confidence-badge.tsx:14,34`.
- **Motivation:** the product may look feature-rich, but if the chef golden path breaks in the live site, the culinary system is not usable regardless of engine depth. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:357`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/culinary/dish-index/page.tsx:9,11`, `app/(chef)/culinary/costing/page.tsx:208,252`.
- **Success from the developer's perspective:** a builder can pick up this spec and restore the actual live workflow so a chef can complete it end-to-end without hidden failure, silent data loss, or misleading costing states. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:357`, `lib/recipes/actions.ts:250`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `lib/menus/editor-actions.ts:454`, `app/(chef)/menus/menus-client-wrapper.tsx:628`, `app/(chef)/culinary/costing/page.tsx:152,252`.

---

## What This Does (Plain English)

This spec restores trust in the live culinary workflow. After it is built, a chef can save a real recipe with real ingredients from `/recipes/new`, see those ingredients exist in `/recipes/ingredients`, see honest pricing or missing-price states in `/culinary/costing`, create a menu with persisted courses and dishes from `/menus/new`, add courses in `/menus/[id]/editor` without server errors, open `/culinary/dish-index` without a crash, and open menu quick view without an endless loader. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357,982`, `app/(chef)/recipes/ingredients/ingredients-client.tsx:126,133,180`, `lib/recipes/actions.ts:214,250,338,340,374,376,722,989`, `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320,330`, `lib/menus/editor-actions.ts:422,454,671,689,690`, `app/(chef)/culinary/dish-index/page.tsx:9,11`, `lib/menus/dish-index-actions.ts:128,149,624,631,638`, `app/(chef)/menus/menus-client-wrapper.tsx:236,347,349,356,596,628`.

---

## Why It Matters

The live website already exposes the chef workflow, but the current write and read contracts do not make that workflow trustworthy. Recipe create currently fans out into one recipe mutation plus separate ingredient mutations and surfaces only a generic save failure; menu create can advance into a "Menu Created" state while the action contract still carries `courseErrors`; dish index relies on a `linked_recipe_id` join path that is failing in the live environment; costing maps a boolean completeness signal into a percentage badge that cannot distinguish empty from complete. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357`, `lib/recipes/actions.ts:214,250,722`, `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320`, `lib/menus/actions.ts:293,298,304,322,327,1264,1271,1602,1627,1676,1679,1680`, `lib/menus/dish-index-actions.ts:52,128,149,167,169,624,631,638`, `database/migrations/20260327000004_dish_index.sql:59,241,253,254`, `app/(chef)/culinary/costing/page.tsx:152,153,155,208,252,253,255`, `components/pricing/costing-confidence-badge.tsx:4,14,17,19,34`.

---

## Workflow Definition

This spec fixes the current product's actual workflow. It does **not** replace it with a new model.

- **Create recipe:** `/recipes/new`, implemented by the existing `CreateRecipeClient` and current `createRecipe` plus `addIngredientToRecipe` action chain. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57,294,334,357,982`, `lib/recipes/actions.ts:214,250,722`.
- **Attach ingredients:** the same recipe save flow plus the existing ingredient library. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:334`, `app/(chef)/recipes/ingredients/ingredients-client.tsx:126,133,143,180`, `lib/recipes/actions.ts:722,989`.
- **Retrieve pricing:** the existing costing read models and current costing page, reached from saved recipe and menu flows. Current anchors: `lib/recipes/actions.ts:338,340,374,376`, `lib/menus/actions.ts:1264,1271`, `app/(chef)/culinary/costing/page.tsx:152,153,155,208,252,253,255`, `components/pricing/costing-confidence-badge.tsx:14,34`.
- **Build dish:** the current `menus -> dishes -> components -> recipes` chain plus the existing `/culinary/dish-index` surface. Current anchors: `lib/menus/actions.ts:295,310,911`, `app/(chef)/culinary/dish-index/page.tsx:9,11`, `lib/menus/dish-index-actions.ts:128,149,167,169,200,209,310,328`.
- **Build menu:** `/menus/new`, `/menus/[id]`, `/menus/[id]/editor`, and the existing quick-view path in `/menus`. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320,337,756`, `app/(chef)/menus/[id]/page.tsx:17,22,108`, `lib/menus/editor-actions.ts:422,454`, `app/(chef)/menus/menus-client-wrapper.tsx:336,347,349,356,596,628`.

If a builder cannot make this current path reliable, they should not add a parallel "better" path in this spec. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/culinary/dish-index/page.tsx:9`, `app/(chef)/culinary/costing/page.tsx:208`.

---

## Current Verified Failures

These failures were verified in the live local website. Each row also includes the current repo anchor that exposes or wires the same behavior.

| Step                  | Observed Live                                                                                                    | Current Anchor                                                                                                                                                                       | Classification         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Recipe create         | Manual recipe save failed and did not persist the recipe.                                                        | `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357,982`; `lib/recipes/actions.ts:214,250,722`                                                                              | Logic issue            |
| Ingredient attach     | Ingredient creation is coupled to recipe save, so upstream recipe failure blocks ingredient creation entirely.   | `app/(chef)/recipes/ingredients/ingredients-client.tsx:180`; `app/(chef)/recipes/new/create-recipe-client.tsx:334`; `lib/recipes/actions.ts:722,989`                                 | Logic issue            |
| Price lookup fallback | Product lookup returned no usable fallback for a common culinary term in the tested UI.                          | `app/(chef)/recipes/ingredients/ingredients-client.tsx:133,143`; `components/recipes/product-lookup-panel.tsx:201,248`                                                               | Data issue             |
| Menu create           | Menu create advanced to a created-state surface while dish persistence was not trustworthy.                      | `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320,330`; `lib/menus/actions.ts:293,298,304,310,322,327`; `components/menus/menu-breakdown-panel.tsx:169,237,274,314`     | Logic issue + UI issue |
| Menu quick view       | Quick view entered a loading state and the live UI did not resolve to usable detail.                             | `app/(chef)/menus/menus-client-wrapper.tsx:236,347,349,354,356,596,628`; `lib/menus/actions.ts:1602,1627,1676,1679,1680`                                                             | UI issue               |
| Menu editor           | `+ Add Course` failed and the editor did not complete the dish create step.                                      | `lib/menus/editor-actions.ts:422,454,671,689,690`                                                                                                                                    | Logic issue            |
| Dish index            | `/culinary/dish-index` failed on the linked-recipe join path.                                                    | `app/(chef)/culinary/dish-index/page.tsx:9,11`; `lib/menus/dish-index-actions.ts:52,128,149,167,169,624,631,638`; `database/migrations/20260327000004_dish_index.sql:59,241,253,254` | Logic issue            |
| Costing               | Empty or incomplete menu states can still collapse into a misleading completion badge.                           | `lib/menus/actions.ts:1264,1271`; `app/(chef)/culinary/costing/page.tsx:152,153,155,208,252,253,255`; `components/pricing/costing-confidence-badge.tsx:4,14,17,19,34`                | Logic issue            |
| Create-page friction  | Nonessential overlays exist at the app and chef-layout level and must not interfere with the recipe create path. | `app/layout.tsx:4,132`; `app/(chef)/layout.tsx:28,175,178`; `app/(chef)/recipes/new/create-recipe-client.tsx:982`                                                                    | UI issue               |

---

## Files to Create

None required by default.

This is a workflow-reliability repair of existing surfaces. Do not add new pages, new culinary models, or a parallel create flow unless this spec is first revised. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/culinary/dish-index/page.tsx:9`, `app/(chef)/culinary/costing/page.tsx:208`.

---

## Files to Modify

| File                                                   | What to Change                                                                                                                                                                                                                                                                         | Current Anchor                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/recipes/actions.ts`                               | Replace the current split recipe-create orchestration with an atomic recipe-plus-ingredients mutation or an equivalent no-partial-write flow. Return actionable errors instead of generic `Failed to create recipe`. Revalidate recipe, ingredient, and costing surfaces together.     | `214,250,338,340,374,376,722,989`                                            |
| `app/(chef)/recipes/new/create-recipe-client.tsx`      | Submit one authoritative save request for recipe + ingredient rows. Only redirect after all required child rows persist. Surface duplicate-name, auth/tenant, ingredient validation, and pricing-state errors clearly.                                                                 | `57,294,334,357,982`                                                         |
| `lib/menus/actions.ts`                                 | Make `createMenuWithCourses()` trustworthy: either persist menu and dish rows together, or fail the entire create. Stop swallowing per-course failures into a fake success state. Harden menu costing and quick-view reads so empty/incomplete menus are distinct from complete menus. | `168,220,293,295,298,304,310,322,327,911,1264,1271,1602,1627,1676,1679,1680` |
| `app/(chef)/menus/new/create-menu-form.tsx`            | Treat returned `courseErrors` or missing persisted dishes as blocking failures. Do not advance to the breakdown step unless the server confirms actual dish rows. Show exact course-level failure messages.                                                                            | `20,139,140,188,299,300,303,305,320,330,337,756`                             |
| `components/menus/menu-breakdown-panel.tsx`            | Render only from persisted server results, not optimistic form assumptions. Show honest empty/error states if recipes are not linked or dishes were not created.                                                                                                                       | `4,98,169,237,242,274,314`                                                   |
| `lib/menus/editor-actions.ts`                          | Fix `addEditorCourse()` reliability and error contract. Verify menu ownership before insert, ensure dish creation works consistently, and keep editor cost/read models aligned with persisted dish rows.                                                                               | `422,454,671,689,690`                                                        |
| `app/(chef)/menus/menus-client-wrapper.tsx`            | Quick-view modal must exit loading on timeout/error and show a retryable error state instead of spinning indefinitely.                                                                                                                                                                 | `27,236,336,343,347,349,354,356,596,628`                                     |
| `lib/menus/dish-index-actions.ts`                      | Repair the dish-index read path against the real schema/query contract. If linked recipe expansion fails, degrade gracefully instead of crashing the whole page.                                                                                                                       | `52,128,149,167,169,200,209,310,328,624,631,638`                             |
| `app/(chef)/culinary/dish-index/page.tsx`              | Stop relying on an unhandled server exception path. Render usable empty/error states for the dish index.                                                                                                                                                                               | `2,3,9,11`                                                                   |
| `app/(chef)/culinary/dish-index/dish-index-client.tsx` | Add an explicit page-level error state if the initial fetch fails or is partial.                                                                                                                                                                                                       | `37,90,127,263`                                                              |
| `app/(chef)/culinary/costing/page.tsx`                 | Distinguish `no_components`, `no_prices`, `partial`, and `complete`. Never show 100% completion for empty menus or recipes with no real priced data.                                                                                                                                   | `152,153,155,208,252,253,255`                                                |
| `components/pricing/costing-confidence-badge.tsx`      | Support an explicit incomplete/pending state instead of collapsing every non-null case into a misleading percentage badge.                                                                                                                                                             | `4,14,17,19,26,27,34`                                                        |
| `lib/auth/get-user.ts`                                 | Keep `requireChef()` as the identity gate, but verify the downstream write path actually carries the auth context that DB policies expect.                                                                                                                                             | `41,57,122,123`                                                              |
| `lib/db/server.ts`                                     | Verify whether the server-side DB client carries the required auth/tenant context for write policies. If not, fix that contract here rather than scattering one-off workarounds across actions.                                                                                        | `5,7,8`                                                                      |
| `lib/db/compat.ts`                                     | If policy-dependent writes fail because request auth context is missing, add the minimum compatible request/session context handling here. Do not guess; verify the failure mechanism first.                                                                                           | `201,382,387,392,398,1364`                                                   |
| `lib/db/schema/schema.ts`                              | Use existing policy definitions as the ground truth for what the write client must satisfy. Do not change policies until request-context failure is proven.                                                                                                                            | `1108,1142,15536,15654`                                                      |

---

## Database Changes

No new product model is required. Current anchors: `lib/menus/dish-index-actions.ts:52,149`, `database/migrations/20260327000004_dish_index.sql:59,241,253,254`.

### New Tables

None.

### New Columns on Existing Tables

None by default.

### Migration Notes

- A migration is only allowed if verification proves schema drift in the actual target database. Current anchors: `database/migrations/20260327000004_dish_index.sql:59,139,241,253,254`; `lib/menus/dish-index-actions.ts:149,167,169,209,631`.
- The current code expects `dish_index.linked_recipe_id` to exist. The current migration declares that column and indexes it. Current anchors: `database/migrations/20260327000004_dish_index.sql:59,139`; `lib/menus/dish-index-actions.ts:52,149,167,169`.
- If the runtime still fails on that relation, the builder must first prove whether the problem is real schema drift or query/parsing behavior in the current compatibility layer. Current anchors: `lib/menus/dish-index-actions.ts:149,209`; `lib/db/compat.ts:201,1364`.
- Do not introduce new culinary tables in this spec. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/culinary/dish-index/page.tsx:9`.

---

## Data Model

No new entities. This spec makes the existing chain reliable and honest.

### Existing Authoritative Chains

```text
recipes
  -> recipe_ingredients
  -> ingredients

menus
  -> dishes
  -> components
  -> recipes

dish_index
  -> linked_recipe_id
  -> recipes

recipe_cost_summary / menu_cost_summary
  -> derived read models for pricing and completeness
```

Current anchors for the existing chain:

- `recipes -> recipe_ingredients -> ingredients`: `lib/recipes/actions.ts:214,722,989`, `app/(chef)/recipes/ingredients/ingredients-client.tsx:180`, `lib/db/schema/schema.ts:15536,15654`
- `menus -> dishes -> components -> recipes`: `lib/menus/actions.ts:295,310,911,1264,1271`, `app/(chef)/menus/[id]/page.tsx:22,108`
- `dish_index -> linked_recipe_id -> recipes`: `lib/menus/dish-index-actions.ts:52,149,167,169,209,310,328,631,638`, `database/migrations/20260327000004_dish_index.sql:59,241,253,254`
- `recipe_cost_summary / menu_cost_summary`: `lib/recipes/actions.ts:338,340,374,376`, `lib/menus/actions.ts:1264,1271`, `app/(chef)/culinary/costing/page.tsx:152,208,252`

### Reliability Rules

- **Recipe create is only successful when the recipe row and its intended ingredient links both persist.** Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357`; `lib/recipes/actions.ts:214,250,722`.
- **Menu create is only successful when the menu row and intended dish rows both persist.** Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320`; `lib/menus/actions.ts:293,298,304,310,322,327,911`.
- **Empty is not complete.** A menu with zero components or zero linked recipes is pending or incomplete, never "100%". Current anchors: `lib/menus/actions.ts:1264,1271,1583,1655,1676`; `app/(chef)/culinary/costing/page.tsx:252,253,255`; `components/pricing/costing-confidence-badge.tsx:14,34`.
- **Missing price data is allowed, but it must be explicit.** Missing prices should preserve the workflow while surfacing a clear incomplete state. Current anchors: `lib/recipes/actions.ts:338,340,374,376`; `app/(chef)/culinary/costing/page.tsx:152,153,155`; `components/pricing/costing-confidence-badge.tsx:14,26,27`.

### Suggested Result Contracts

The shape below is derived from current action seams that already separate recipe create, ingredient attach, menu create, and per-course failure reporting. Current anchors: `lib/recipes/actions.ts:214,722`, `lib/menus/actions.ts:293,298,304,322,327`, `lib/menus/editor-actions.ts:422,454`.

```ts
type RecipeCreateResult =
  | {
      success: true
      recipeId: string
      createdIngredientCount: number
      missingPriceIngredientIds: string[]
    }
  | {
      success: false
      code: 'duplicate_recipe' | 'ingredient_validation' | 'tenant_context_missing' | 'write_failed'
      message: string
      fieldErrors?: Record<string, string>
    }

type MenuCreateWithCoursesResult =
  | {
      success: true
      menuId: string
      persistedDishCount: number
      dishes: Array<{
        id: string
        course_number: number
        course_name: string
        name: string | null
      }>
    }
  | {
      success: false
      code: 'menu_write_failed' | 'dish_write_failed' | 'tenant_context_missing'
      message: string
      failedCourseNumbers?: number[]
    }
```

The exact type names may differ, but the behavior may not.

---

## Server Actions

| Action                                      | Auth            | Input                                   | Output                                     | Side Effects                                                                   | Current Anchor                                                                                                                                  |
| ------------------------------------------- | --------------- | --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `createRecipeWithIngredients(input)`        | `requireChef()` | `{ recipe, ingredients }`               | `RecipeCreateResult`                       | Revalidates `/recipes`, `/recipes/ingredients`, `/culinary/costing`            | `lib/auth/get-user.ts:122,123`; `lib/recipes/actions.ts:214,253,722,989`                                                                        |
| `createMenuWithCourses(menuInput, courses)` | `requireChef()` | Existing menu payload + course rows     | `MenuCreateWithCoursesResult`              | Revalidates `/menus`, `/menus/[id]`, `/menus/[id]/editor`, `/culinary/costing` | `lib/auth/get-user.ts:122,123`; `lib/menus/actions.ts:295,298,304,310,322,327`; `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320` |
| `addEditorCourse(menuId, data)`             | `requireChef()` | `{ course_name, course_number, name? }` | typed success or failure                   | Revalidates editor and menu detail                                             | `lib/auth/get-user.ts:122,123`; `lib/menus/editor-actions.ts:422,454,671,689,690`                                                               |
| `getMenuQuickViewData(menuId)`              | `requireChef()` | `menuId`                                | typed success or failure                   | none                                                                           | `lib/auth/get-user.ts:122,123`; `lib/menus/actions.ts:1602,1627,1676,1679,1680`; `app/(chef)/menus/menus-client-wrapper.tsx:347,349,356,628`    |
| `getDishIndex(filters)`                     | `requireChef()` | existing filters                        | typed success or failure                   | none                                                                           | `app/(chef)/culinary/dish-index/page.tsx:2,3,9,11`; `lib/menus/dish-index-actions.ts:128,149,167,169,624,631,638`                               |
| `getMenuCostSummaries()`                    | `requireChef()` | none                                    | summaries with explicit completeness state | none                                                                           | `lib/menus/actions.ts:1264,1271`; `app/(chef)/culinary/costing/page.tsx:208,252,253,255`                                                        |

### Required Action Behavior

#### `createRecipeWithIngredients`

- This is the authoritative chef-facing create action. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,982`; `lib/recipes/actions.ts:214,722`.
- It must not create a recipe row and then leave the chef in a half-saved state because ingredient linkage failed. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:334,357`; `lib/recipes/actions.ts:214,250,722`.
- Preferred behavior: one transaction for recipe row plus ingredient creation/linkage. Acceptable fallback: compensating rollback that removes the created recipe if child rows fail before success is returned. Current anchors: `lib/recipes/actions.ts:214,722`; `lib/db/compat.ts:382,387,392,398`.
- Missing price data must **not** fail recipe creation. It should save successfully and report incomplete pricing honestly. Current anchors: `lib/recipes/actions.ts:338,340,374,376`; `app/(chef)/culinary/costing/page.tsx:152,153,155`.

#### `createMenuWithCourses`

- The current partial-success contract is not allowed in the chef UI. Current anchors: `lib/menus/actions.ts:293,298,304,322,327`; `app/(chef)/menus/new/create-menu-form.tsx:299,300,303,320`.
- If any dish insert fails, the action must fail as a whole or explicitly return `success: false`. Current anchors: `lib/menus/actions.ts:310,322,327,911`.
- Returning `menu.id` with zero persisted dishes while the UI says "Menu Created" is a hard spec violation. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:299,300,303,320,330`; `components/menus/menu-breakdown-panel.tsx:169`.

#### `getMenuQuickViewData`

- Must return or fail quickly. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:347,349,356,628`; `lib/menus/actions.ts:1602,1627,1676,1679,1680`.
- If detail fetch cannot complete, the UI must receive a terminal error state, not an endless loading state. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:354,356,628`.

#### `getDishIndex`

- Must not take down the whole page because linked recipe enrichment fails. Current anchors: `app/(chef)/culinary/dish-index/page.tsx:9,11`; `lib/menus/dish-index-actions.ts:149,209`.
- If recipe join/enrichment is broken, return dish rows without that enrichment plus a warning or typed failure the UI can display. Current anchors: `lib/menus/dish-index-actions.ts:149,167,169,624,631,638`; `app/(chef)/culinary/dish-index/dish-index-client.tsx:37,90,127,263`.

#### `getMenuCostSummaries`

- Must expose enough information for the UI to distinguish `no_components`, `no_priced_data`, `partial`, and `complete`. Current anchors: `lib/menus/actions.ts:1264,1271,1583,1655,1676`; `app/(chef)/culinary/costing/page.tsx:252,253,255`; `components/pricing/costing-confidence-badge.tsx:14,34`.
- Boolean-only "complete" semantics are not sufficient for empty menus. Current anchors: `lib/menus/actions.ts:1261,1271`; `components/pricing/costing-confidence-badge.tsx:14,34`.

### Current Adjacent Action Anchors

- `createMenu()` and menu state transitions: `lib/menus/actions.ts:168,220,241`
- `addDishToMenu()`: `lib/menus/actions.ts:911,970`
- `getMenuById()` and menu detail assembly: `lib/menus/actions.ts:367`; `app/(chef)/menus/[id]/page.tsx:22,108`
- Menu duplication regression surface: `lib/menus/actions.ts:1293,1323,1353,1382,1389`

---

## UI / Component Spec

### Page Layout

The current pages stay in place. This spec hardens their behavior instead of replacing them. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/menus/[id]/page.tsx:17`, `app/(chef)/culinary/dish-index/page.tsx:9`, `app/(chef)/culinary/costing/page.tsx:208`.

#### Recipe Create (`/recipes/new`)

- The chef fills one form and clicks `Save Recipe`. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:441,451,982`.
- The save action must cover recipe details and ingredient rows together. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334`; `lib/recipes/actions.ts:214,722`.
- Success means redirect to the recipe detail page with the new recipe visible in `/recipes` and its ingredients visible in `/recipes/ingredients`. Current anchors: `lib/recipes/actions.ts:253,989`; `app/(chef)/recipes/ingredients/ingredients-client.tsx:126,180`.
- Failure means staying on the form with a clear message and no fake redirect. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:357`.

#### Menu Create (`/menus/new`)

- Step 1 stays menu metadata. Step 2 stays course entry. Step 3 is only reachable if the server confirms actual persisted dish rows. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320,330`.
- The breakdown panel must render from server-returned dishes, not form-memory assumptions. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:330`; `components/menus/menu-breakdown-panel.tsx:98,169,237,274,314`.

#### Menu Library Quick View

- The existing modal stays. It must either show detail data or a terminal error/retry state. Loading may not continue forever. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:236,336,347,349,354,356,596,628`; `lib/menus/actions.ts:1602,1676,1679,1680`.

#### Menu Editor (`/menus/[id]/editor`)

- The existing `+ Add Course` interaction stays. Add course must create a real dish row or show a clear failure. Save-state UI must not suggest "saved" while the create mutation failed. Current anchors: `lib/menus/editor-actions.ts:422,454`; `app/(chef)/menus/[id]/page.tsx:22,108`.

#### Dish Index (`/culinary/dish-index`)

- The existing page stays. It must load either a populated list, a true empty state, or an explicit error state. An endless loading shell or server crash is not acceptable. Current anchors: `app/(chef)/culinary/dish-index/page.tsx:9,11`; `app/(chef)/culinary/dish-index/dish-index-client.tsx:37,90,127,263`; `lib/menus/dish-index-actions.ts:128,149,624,631,638`.

#### Costing (`/culinary/costing`)

- The existing recipe and menu tables stay. Completeness and cost badges must be honest about missing data and empty models. Current anchors: `lib/recipes/actions.ts:338,340,374,376`; `lib/menus/actions.ts:1264,1271`; `app/(chef)/culinary/costing/page.tsx:152,208,252`; `components/pricing/costing-confidence-badge.tsx:14,34`.

### States

- **Loading:** show loading only while a request is actually in flight. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:236,347,356,628`.
- **Empty:** show "nothing here yet" guidance when no recipe, dish, or menu data exists. Current anchors: `app/(chef)/culinary/dish-index/dish-index-client.tsx:263`; `components/menus/menu-breakdown-panel.tsx:98,274`.
- **Error:** show the actual failure class or a safe actionable summary. Never replace failure with fake zeros or fake completion. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:357`; `lib/menus/editor-actions.ts:454`; `components/pricing/costing-confidence-badge.tsx:14,34`.
- **Populated:** show persisted rows only. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:299,300,330`; `app/(chef)/menus/[id]/page.tsx:22,108`.
- **Incomplete pricing:** show saved recipe/menu state plus explicit missing-price messaging. Current anchors: `lib/recipes/actions.ts:374,376`; `app/(chef)/culinary/costing/page.tsx:152,153,155,252,253,255`.

### Interactions

- **Save Recipe:** one submit, one authoritative server result. No redirect until persisted. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357,982`; `lib/recipes/actions.ts:214,722`.
- **Create Menu:** one submit, one authoritative server result. No "Menu Created" state unless dishes exist. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:188,299,300,303,320,330`; `lib/menus/actions.ts:293,298,304,322,327`.
- **Open Quick View:** cached detail is fine, but every uncached request needs timeout/error handling. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:343,347,349,356`.
- **Add Course in Editor:** append the returned dish row only after the server confirms insert success. Current anchors: `lib/menus/editor-actions.ts:422,454`.
- **Costing badges:** render pending or incomplete when no components or no priced ingredients exist. Current anchors: `app/(chef)/culinary/costing/page.tsx:152,153,155,252,253,255`; `components/pricing/costing-confidence-badge.tsx:14,34`.

---

## Edge Cases and Error Handling

| Scenario                                                         | Correct Behavior                                                                                    | Current Anchor                                                                                                                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate recipe name for same tenant                            | Stay on `/recipes/new`, show a specific duplicate-name error, do not create partial ingredient rows | `app/(chef)/recipes/new/create-recipe-client.tsx:357`; `lib/recipes/actions.ts:214,250,722`; `lib/db/schema/schema.ts:15654`                                     |
| Recipe base row inserts but ingredient linkage fails             | Roll back or compensate. Do not redirect to a broken partial recipe                                 | `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357`; `lib/recipes/actions.ts:214,250,722`                                                              |
| Menu save creates menu row but one or more courses fail          | Fail the whole create for chef-facing flow. No fake success panel                                   | `lib/menus/actions.ts:293,298,304,322,327`; `app/(chef)/menus/new/create-menu-form.tsx:299,300,303,320`                                                          |
| Menu quick view request errors or times out                      | Stop spinner, show error + retry, keep modal usable                                                 | `app/(chef)/menus/menus-client-wrapper.tsx:347,349,354,356,628`                                                                                                  |
| Menu has zero dishes/components                                  | Costing shows pending/incomplete, not 100%                                                          | `lib/menus/actions.ts:1264,1271,1583,1655,1676`; `app/(chef)/culinary/costing/page.tsx:252,253,255`; `components/pricing/costing-confidence-badge.tsx:14,34`     |
| Recipe has ingredients with no price data                        | Recipe still saves; ingredients show missing-price state; costing reflects incomplete pricing       | `lib/recipes/actions.ts:338,340,374,376`; `app/(chef)/recipes/ingredients/ingredients-client.tsx:126,180`; `app/(chef)/culinary/costing/page.tsx:152,153,155`    |
| Dish index recipe enrichment fails                               | Page loads fallback dish rows or explicit error card; no server crash loop                          | `app/(chef)/culinary/dish-index/page.tsx:9,11`; `app/(chef)/culinary/dish-index/dish-index-client.tsx:37,90,127,263`; `lib/menus/dish-index-actions.ts:149,209`  |
| Editor add-course fails                                          | Show alert/toast, keep current editor state, do not append optimistic row                           | `lib/menus/editor-actions.ts:422,454`                                                                                                                            |
| Background services for AI, realtime, or activity return 401/403 | Core culinary create/edit workflow still behaves correctly and does not block primary actions       | `lib/auth/get-user.ts:41,57,122`; `lib/db/server.ts:7,8`; `app/(chef)/recipes/new/create-recipe-client.tsx:357`; `app/(chef)/menus/new/create-menu-form.tsx:305` |
| Nonessential overlays overlap create forms                       | Primary form controls remain operable; overlays cannot trap required actions                        | `app/layout.tsx:4,132`; `app/(chef)/layout.tsx:28,175,178`; `app/(chef)/recipes/new/create-recipe-client.tsx:982`                                                |

---

## Verification Steps

1. Sign in through the real site with a chef-capable account. Current anchors: `lib/auth/get-user.ts:41,57,122`.
2. Navigate to `/recipes/new`. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57,982`.
3. Create a manual recipe named `QA Seared Salmon Spec Check` with these ingredients:
   - salmon fillet, 2 lb
   - olive oil, 2 tbsp
   - butter, 4 tbsp
   - garlic, 3 clove
   - lemon, 2 each
4. Verify: save succeeds, redirect lands on the recipe detail page, and `/recipes` shows the new recipe. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:294,334,357`; `lib/recipes/actions.ts:253`.
5. Navigate to `/recipes/ingredients` and verify the ingredient records exist. Current anchors: `app/(chef)/recipes/ingredients/ingredients-client.tsx:126,180`; `lib/recipes/actions.ts:989`.
6. Navigate to `/culinary/costing` and verify the recipe shows either priced or incomplete, but never fake-complete if prices are missing. Current anchors: `lib/recipes/actions.ts:338,340,374,376`; `app/(chef)/culinary/costing/page.tsx:152,153,155`; `components/pricing/costing-confidence-badge.tsx:14,34`.
7. Navigate to `/menus/new`. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:188,756`.
8. Create a three-course menu with:
   - Starter: Roasted Asparagus
   - Main Course: Seared Salmon
   - Side: Herbed Jasmine Rice
9. Verify: the created menu reports 3 persisted dishes/courses, not `0-course`. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:299,300,303,320,330`; `components/menus/menu-breakdown-panel.tsx:169`; `lib/menus/actions.ts:327`.
10. Open the created menu in `/menus/[id]` and verify the same persisted course count appears there. Current anchors: `app/(chef)/menus/[id]/page.tsx:22,108`; `lib/menus/actions.ts:367`.
11. Open the menu quick-view modal from `/menus` and verify it resolves without an endless spinner. Current anchors: `app/(chef)/menus/menus-client-wrapper.tsx:336,347,349,356,628`.
12. Open `/menus/[id]/editor`, add a fourth course, and verify it persists after refresh. Current anchors: `lib/menus/editor-actions.ts:422,454,671,689,690`.
13. Open `/culinary/dish-index` and verify the page loads without crashing. Current anchors: `app/(chef)/culinary/dish-index/page.tsx:9,11`; `lib/menus/dish-index-actions.ts:128,149`.
14. Revisit `/culinary/costing` and verify:

- empty menus are not marked complete
- menus with unlinked or unpriced content are marked pending/incomplete
- only actually complete menus show full completion
  Current anchors: `lib/menus/actions.ts:1264,1271`; `app/(chef)/culinary/costing/page.tsx:252,253,255`; `components/pricing/costing-confidence-badge.tsx:14,34`.

15. Refresh the browser on the created recipe, menu detail, menu editor, and dish index pages to confirm persistence. Current anchors: `lib/recipes/actions.ts:253,989`; `app/(chef)/menus/[id]/page.tsx:22,108`; `app/(chef)/culinary/dish-index/page.tsx:9,11`.

---

## Out of Scope

- Rebuilding the culinary workflow around a new root object
- New AI recipe generation or AI dish creation
- New price-catalog search features
- Broad navigation refactors
- Cosmetic redesigns unrelated to the blocked workflow
- Seeding fake menu, recipe, or pricing data to make the workflow look healthy
- Replacing the existing dish/menu model with a separate standalone dish-builder product

Current surface anchors for scope lock: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/culinary/dish-index/page.tsx:9`, `app/(chef)/culinary/costing/page.tsx:208`.

---

## Notes for Builder Agent

1. **This is a reliability spec, not a feature spec.** The job is to make the current chef path true, not add parallel tooling. Current anchors: `app/(chef)/recipes/new/create-recipe-client.tsx:57`, `app/(chef)/menus/new/create-menu-form.tsx:320`, `app/(chef)/culinary/dish-index/page.tsx:9`.
2. **Fix upstream first.** Start with the write-path contract for recipe and menu creation before touching downstream read surfaces. Current anchors: `lib/recipes/actions.ts:214,722`; `lib/menus/actions.ts:295,310,911`; `app/(chef)/culinary/costing/page.tsx:208`.
3. **Do not trust generic errors.** The current code throws `Failed to create recipe`, `Failed to create menu`, and `Failed to add course`, and the menu create path already carries partial-success semantics through `courseErrors`. Replace these with typed, actionable failure paths. Current anchors: `lib/recipes/actions.ts:250`, `app/(chef)/recipes/new/create-recipe-client.tsx:357`, `app/(chef)/menus/new/create-menu-form.tsx:305`, `lib/menus/actions.ts:293,298,304,322,327`, `lib/menus/editor-actions.ts:454`.
4. **Be careful with auth and RLS assumptions.** The codebase uses `requireChef()` for identity, `createServerClient()` as the server DB entry point, and policy definitions that expect `get_current_tenant_id()` or `auth.uid()`. Verify whether the write path actually carries that request context. Treat this as a verified-or-false question, not a guess. Current anchors: `lib/auth/get-user.ts:41,57,122,123`, `lib/db/server.ts:5,7,8`, `lib/db/compat.ts:201,382,387,392,398,1364`, `lib/db/schema/schema.ts:1108,1142,15536,15654`.
5. **Do not create a migration first.** The dish-index failure mentions `linked_recipe_id`, but the existing migration already declares that column and related joins. Verify live schema before changing the database. Current anchors: `database/migrations/20260327000004_dish_index.sql:59,139,241,253,254`; `lib/menus/dish-index-actions.ts:52,149,209,631`.
6. **Keep read models honest.** `recipe_cost_summary` and `menu_cost_summary` are derived surfaces. If they cannot distinguish empty from incomplete, fix the contract or the UI mapping so the chef never sees fake completion. Current anchors: `lib/recipes/actions.ts:338,340,374,376`, `lib/menus/actions.ts:1264,1271`, `app/(chef)/culinary/costing/page.tsx:152,153,155,252,253,255`, `components/pricing/costing-confidence-badge.tsx:14,34`.
7. **No silent success.** If a mutation cannot complete the full chef-facing action, the UI must not advance to a success state. Current anchors: `app/(chef)/menus/new/create-menu-form.tsx:299,300,303,320`; `lib/menus/actions.ts:322,327`; `lib/menus/editor-actions.ts:454`.
8. **Build order:** verify write auth/tenant context, repair recipe create, repair menu create, repair editor add-course, repair dish-index load path, repair quick-view terminal states, repair costing completeness semantics, run the live verification flow exactly as listed above. Current anchors: `lib/db/server.ts:7,8`, `lib/recipes/actions.ts:214,722`, `lib/menus/actions.ts:295,310,911`, `lib/menus/editor-actions.ts:422`, `lib/menus/dish-index-actions.ts:128,149`, `app/(chef)/menus/menus-client-wrapper.tsx:347,349,356`, `app/(chef)/culinary/costing/page.tsx:152,252`.
9. **Adjacent regression checks:** after fixing culinary writes, verify `/recipes`, `/menus`, and `/culinary/costing` still load for existing data, and verify menu duplication still works. Current anchors: `lib/recipes/actions.ts:253,338,340`, `lib/menus/actions.ts:1264,1271,1293,1323,1353,1382,1389`, `app/(chef)/menus/[id]/page.tsx:22,108`, `app/(chef)/culinary/costing/page.tsx:208`.

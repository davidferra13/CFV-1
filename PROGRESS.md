# PROGRESS.md - What's Been Done

> Updated by the team as work is completed. Most recent entries at top.
> Include: what was done, which files were changed, any decisions made and why.

---

## 2026-03-13 - Quote Builder: Menu Food Cost Integration (Priority 4 Connection)

### Done

- Connected the quote form to the menu costing engine so chefs see their food cost while pricing events.
- Added `getEventMenuCost(eventId)` server action in `lib/quotes/actions.ts` that fetches the linked menu's cost summary.
- Added a Menu Food Cost hint card to the quote form showing total food cost, cost per guest, and food cost % with color indicators.
- Updated both new quote and edit quote pages to pass event context for cost loading.

### Files changed

- `lib/quotes/actions.ts` (new server action)
- `components/quotes/quote-form.tsx` (menu cost state, loader, hint card)
- `app/(chef)/quotes/[id]/edit/page.tsx` (passes prefilledEventId)
- `app/(chef)/quotes/new/page.tsx` (reads event_id from search params)

### Decisions

- The hint is informational only. It does NOT auto-fill the quote amount. Chefs set their own prices; the cost data helps them make informed decisions.
- Food cost % uses same industry-standard thresholds as menu editor (green <= 30%, amber 30-40%, red > 40%).
- Links to the menu detail page so chefs can review the full costing breakdown.

### Verification

- ESLint passes on all 4 changed files with zero errors.

## 2026-03-13 - Menu Builder: Recipe Linking + Live Food Cost (Priority 1 Crown Jewel)

### Done

- Connected recipes to the Menu Doc Editor with live food cost calculation.
- Added 4 new server actions in `lib/menus/editor-actions.ts`:
  - `searchRecipesForEditor`: searches recipes with cost data from `recipe_cost_summary`
  - `linkRecipeToEditorDish`: creates a component linking a recipe to a dish (idempotent)
  - `unlinkRecipeFromEditorDish`: removes a recipe-dish link
  - `getEditorMenuCost`: fetches live cost data from `menu_cost_summary` view
- Updated `getEditorContext` to load linked recipes per dish via the components table.
- Created `components/menus/recipe-link-picker.tsx`: compact collapsible search picker with 300ms debounce, cost per serving display, and partial cost warnings.
- Integrated recipe linking into each course card in the Menu Doc Editor.
- Added a live Food Cost panel to the editor sidebar showing total cost, per-guest cost, and food cost % with industry-standard color coding (green <= 30%, amber 30-40%, red > 40%).
- Cost data refreshes automatically on every link/unlink action.

### Files changed

- `lib/menus/editor-actions.ts` (new server actions + EditorDish type update)
- `components/menus/recipe-link-picker.tsx` (new component)
- `components/menus/menu-doc-editor.tsx` (recipe linking UI + cost sidebar)

### Decisions

- Use the existing `components` table as the join between dishes and recipes (Menu -> Dishes -> Components with recipe_id). This matches the existing data model.
- Collapsible recipe picker to keep the editor clean by default.
- Food cost % thresholds: 30% (green/good), 40% (amber/warning), above (red/alert). Standard private chef margins.
- Idempotent linking: if a recipe is already linked to a dish, the action silently succeeds.

### Verification

- ESLint passes on all 3 changed files with zero errors.

## 2026-03-13 - AI Policy Phase 2+3 Compliance (Complete)

### Done

- Deleted `lib/ai/gemini-service.ts` (dead code, zero imports anywhere in codebase).
- Migrated `lib/ai/recipe-scaling.ts` from Gemini to Ollama (`parseWithOllama`).
- Added AI policy exception notices to `parse-receipt.ts` and `parse-document-vision.ts`.
- All 8 original AI policy violations now resolved (4 HIGH migrated in Phase 1, 2 MEDIUM documented with vision exceptions, 2 LOW fixed).

### Files changed

- `lib/ai/gemini-service.ts` (deleted)
- `lib/ai/recipe-scaling.ts` (Gemini -> Ollama migration)
- `lib/ai/parse-receipt.ts` (policy exception notice)
- `lib/ai/parse-document-vision.ts` (policy exception notice with HIGH severity warning)

### Decisions

- Vision files cannot migrate to Ollama yet (no local vision model on 6GB VRAM). Documented as TODO.
- The `client_info` detection path in `parse-document-vision.ts` is flagged HIGH sensitivity because it sends names, emails, phones, dietary restrictions to cloud.

### Verification

- ESLint passes on all changed files.

## 2026-03-13 - Recipe library duplicate clear-filter cleanup

### Done

- Removed the extra `Clear quick filter` button from the canonical recipe-library quick-filter row.
- Kept quick-filter dismissal on the active filter chip in the summary row, where the current slice is already surfaced.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library clear-filter dedup pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-clear-filter-dedup-pass.md`

### Decisions

- Prefer one clear path for quick-filter dismissal instead of duplicate controls in two places.
- Keep dismissal anchored to the summary row because that is where active filter state now lives.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library clearable sort chip

### Done

- Made the active sort chip on the canonical recipe library directly clickable so chefs can reset ordering back to the default `A-Z` mode from the summary row.
- Kept the action in the existing summary-pill row so ordering can be understood and dismissed in one place.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library clear-sort pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-clear-sort-chip-pass.md`

### Decisions

- Reuse the existing `updateFilters` helper to reset sort state instead of adding a new path.
- Keep the sort chip visible in default mode because ordering always affects the visible list, but show the clear affordance only when the sort is non-default.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library clearable filter chip

### Done

- Made the active quick-filter chip on the canonical recipe library directly clickable so chefs can clear the current quick filter from the summary row.
- Kept the action in the existing summary-pill row so the current slice can be understood and dismissed in one place.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library clear-filter pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-clear-filter-chip-pass.md`

### Decisions

- Reuse the existing `toggleQuickFilter` helper instead of adding a new clear action path.
- Scope the clearable chip only to quick filters so category, cuisine, and meal-type filters keep their existing controls.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library active sort chip

### Done

- Added an explicit active sort chip to the canonical recipe library summary row so the current ordering is visible at a glance.
- Kept the sort chip beside the existing in-view and active-filter chips so chefs can understand both slice and ordering together.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library active-sort pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-active-sort-chip-pass.md`

### Decisions

- Render the sort chip at all times because ordering always affects what the chef is reviewing.
- Reuse the existing summary-pill row instead of adding another control area.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library in-view count chip

### Done

- Added an `in view` summary chip to the canonical recipe library so chefs can see how many recipes match the current review state at a glance.
- Kept the count in the existing summary-pill row beside priced, tagged, and component counts.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library in-view count pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-in-view-count-pass.md`

### Decisions

- Use the existing filtered result length instead of adding another top stat card because this is view-state context, not a library-wide metric.
- Keep the count adjacent to the other summary pills so filter orientation stays in one place.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library active quick-filter chip

### Done

- Added an explicit active quick-filter chip to the canonical recipe library summary row so the current review mode is visible at a glance.
- Kept the chip alongside the existing priced, tagged, and component summary pills instead of introducing another UI section.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library active-filter pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-active-filter-chip-pass.md`

### Decisions

- Prioritize orientation because the growing set of recipe-library builder filters makes it easier to lose track of the active slice.
- Reuse the existing summary-pill row for the active state so the improvement stays lightweight.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library menu-ready empty-state guidance

### Done

- Expanded the canonical recipe-library empty state with specific guidance for the `Menu-ready only` quick filter.
- Made the zero-result menu-ready state explain that timing, yield, or equipment coverage is still missing on the visible recipe set.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library menu-ready empty-state pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-menu-ready-empty-state-pass.md`

### Decisions

- Keep menu-readiness guidance on the existing `/recipes` workflow instead of sending chefs into another setup surface.
- Treat a zero-result menu-ready filter as actionable readiness feedback, not just a generic filtered empty state.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library ops empty-state guidance

### Done

- Expanded the canonical recipe-library empty state with specific guidance for the `Needs ops details` quick filter.
- Rounded out the builder-readiness messaging so the main recipe-library quick filters now explain what zero results actually mean.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library ops empty-state pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-ops-empty-state-pass.md`

### Decisions

- Keep ops-readiness guidance on the existing `/recipes` workflow instead of creating another audit surface.
- Treat zero results on `Needs ops details` as a success state that should point chefs toward menu-ready review, not a dead end.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library components quick filter

### Done

- Added a `Has components` quick filter to the canonical recipe library so chefs can isolate recipes already using linked sub-recipes.
- Expanded the filtered empty state with component-specific guidance so the filter stays useful even when no visible recipes include sub-recipes yet.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library components pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-components-filter-pass.md`

### Decisions

- Prioritize component visibility because the menu-builder chain depends on recipes rolling up through sub-recipes like sauces and stocks.
- Reuse the existing sub-recipe count field instead of adding another page or query path.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library cost-gap stats

### Done

- Reworked the top summary cards on the canonical recipe library to surface missing cost coverage directly.
- Added a dedicated `Missing Cost Data` stat card so chefs can see how many recipes still block complete menu pricing at a glance.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library cost-gap stats pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-cost-gap-stats-pass.md`

### Decisions

- Replace the less actionable structured-metadata top stat with missing-cost visibility because costing gaps are more directly tied to menu-builder readiness.
- Keep detailed cost triage in the existing quick filters instead of adding another dashboard layer.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library cost-gap quick filter

### Done

- Added a `Needs cost data` quick filter to the canonical recipe library so chefs can isolate recipes still blocking menu pricing.
- Expanded the filtered empty state with cost-specific guidance so the new filter stays actionable instead of dead-ending.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library cost-gap pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-cost-gap-filter-pass.md`

### Decisions

- Prioritize missing cost coverage because recipe pricing gaps directly block accurate menu costing.
- Reuse the existing recipe cost-summary data instead of adding another audit surface or query path.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Recipe library food-cost sorting

### Done

- Added a highest-food-cost sort option to the canonical recipe library so chefs can review the recipes with the most menu-cost pressure first.
- Applied the sort client-side against already-loaded recipe cost summary data instead of adding another query path.
- Updated the living app audit and wrote a follow-up implementation note for the recipe-library cost-sorting pass.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-food-cost-sort-pass.md`

### Decisions

- Prioritize food-cost sorting because recipe-level cost review is one of the fastest ways to tighten menu margins before a menu is assembled.
- Keep recipes without cost coverage at the bottom of the highest-cost view so fully costed recipes stay actionable first.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-13 - Menu library food-cost sorting

### Done

- Added a highest-food-cost sort option to the canonical menu library so chefs can review the menus with the most cost pressure first.
- Wired the existing menu-library sorting logic to use already-loaded food-cost summary data instead of introducing another query path.
- Kept the sort improvement on the mature `/menus` surface as part of the real menu-builder workflow.

### Files changed

- `app/(chef)/menus/menus-client-wrapper.tsx`

### Decisions

- Prioritize food-cost sorting because cost review is one of the fastest ways to spot menus that need operational attention.
- Reuse the menu cost summaries already present on the page to keep the improvement lightweight and fast.

### Verification

- Ran `npx eslint "app/(chef)/menus/menus-client-wrapper.tsx"` successfully.

## 2026-03-13 - Menu library guided empty states

### Done

- Improved the canonical menu library empty state so it distinguishes between an empty menu library and an over-filtered result set.
- Added builder-aware guidance for the costed, templates, and needs-guest-count quick filters so the page points chefs toward the right next fix.
- Kept the guidance on the existing `/menus` workflow instead of pushing chefs into a separate audit page.

### Files changed

- `app/(chef)/menus/menus-client-wrapper.tsx`

### Decisions

- Use context-aware empty-state guidance because menu-builder readiness problems are often workflow problems, not missing features.
- Keep the recommendations tied to quick-filter intent so the UI helps chefs recover from zero-result states faster.

### Verification

- Ran `npx eslint "app/(chef)/menus/menus-client-wrapper.tsx"` successfully.

## 2026-03-13 - Menu card builder-readiness alerts

### Done

- Added builder-readiness alerts directly onto menu cards for menus still missing guest count or food-cost coverage.
- Surfaced the two most important menu-builder blockers at the card level so chefs do not need to open filters or detail views to spot incomplete menus.
- Kept the readiness cues on the canonical `/menus` surface instead of creating another audit layer.

### Files changed

- `app/(chef)/menus/menus-client-wrapper.tsx`

### Decisions

- Prioritize guest-count and costing visibility first because those are the minimum requirements before menus can scale and price accurately.
- Use lightweight card-level warnings before introducing heavier menu-builder-specific workflows.

### Verification

- Ran `npx eslint "app/(chef)/menus/menus-client-wrapper.tsx"` successfully.

## 2026-03-13 - Menu library builder-coverage stats

### Done

- Added top-level summary cards to the canonical menu library for total menus, active menus, costed menus, and menus still missing guest count.
- Surfaced builder coverage directly on `/menus` so chefs can see readiness gaps without opening filters first.
- Kept the summary work on the mature menu-management surface instead of creating another dashboard.

### Files changed

- `app/(chef)/menus/menus-client-wrapper.tsx`

### Decisions

- Reuse already-loaded menu, event, and cost-summary data instead of adding more queries.
- Prioritize guest-count and cost-coverage visibility because those are the two core blockers before menus can scale cleanly into the menu-builder chain.

### Verification

- Ran `npx eslint "app/(chef)/menus/menus-client-wrapper.tsx"` successfully.

## 2026-03-13 - Menu library builder-triage quick filters

### Done

- Added quick filters to the canonical menu library for costed menus, reusable templates, and menus still missing guest count.
- Tightened the existing menu library search surface so chefs can isolate the menus that are actually ready for costing or still missing builder-critical setup.
- Kept the menu triage work on the mature `/menus` page instead of creating another menu-audit surface.

### Files changed

- `app/(chef)/menus/menus-client-wrapper.tsx`

### Decisions

- Use the already-loaded menu cost summaries and template flags instead of introducing another query layer.
- Prioritize quick filters around costing coverage, reusable templates, and guest-count completeness because those are the most actionable menu-builder states right now.

### Verification

- Ran `npx eslint "app/(chef)/menus/menus-client-wrapper.tsx"` successfully.

## 2026-03-13 - Ingredient library sort-control pass

### Done

- Added a sort control to the canonical ingredient library so chefs can switch between alphabetical order, most-used ingredients, and highest current price signals.
- Switched the ingredient table rendering to respect the active sort after quick-filtering, which makes staple and pricing reviews much faster.
- Wired the ingredient page search params to preserve sort state cleanly in the URL.

### Files changed

- `app/(chef)/recipes/ingredients/ingredients-client.tsx`
- `app/(chef)/recipes/ingredients/page.tsx`

### Decisions

- Keep sorting client-side on the mature ingredient surface for now because the page already loads the full filtered dataset and this avoids premature server complexity.
- Prioritize usage and current-price sorts because those are the most operationally useful ingredient review modes for menu planning.

### Verification

- Ran `npx eslint "app/(chef)/recipes/ingredients/ingredients-client.tsx" "app/(chef)/recipes/ingredients/page.tsx"` successfully.

## 2026-03-13 - Ingredient library quick-filter pass

### Done

- Added quick filters to the canonical ingredient library so chefs can instantly isolate currently priced ingredients, staples, or ingredients carrying accommodation metadata.
- Switched the main ingredient table to respect the active quick filter instead of forcing full-table scanning for common planning tasks.
- Improved the ingredient empty state so the page distinguishes between an empty library and an over-filtered result set.

### Files changed

- `app/(chef)/recipes/ingredients/ingredients-client.tsx`

### Decisions

- Keep ingredient triage on the mature `/recipes/ingredients` surface instead of introducing another audit page for common operational checks.
- Focus the quick filters on live pricing, staples, and accommodation metadata because those are the highest-value ingredient states for menu planning right now.

### Verification

- Ran `npx eslint "app/(chef)/recipes/ingredients/ingredients-client.tsx"` successfully.

## 2026-03-13 - Recipe library quick-filter pass

### Done

- Added quick filters to the canonical recipe library so chefs can instantly isolate menu-ready recipes, priced recipes, or recipes still missing operational details.
- Switched the main grid and cover-flow rendering to respect the active quick filter instead of forcing chefs to scan the full library manually.
- Improved the filtered empty state so the page distinguishes between an empty library and an over-filtered library.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`

### Decisions

- Keep recipe-readiness filtering on the mature `/recipes` surface instead of introducing a separate readiness page.
- Focus the quick filters on menu-building decisions, pricing coverage, and missing operational metadata because those are the highest-value recipe triage states right now.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx"` successfully.

## 2026-03-12 - Ingredient library planning-flags pass

### Done

- Expanded the canonical ingredient library to surface staple status plus existing allergen and dietary metadata directly in the main table.
- Added an accommodation-data summary card and filter summary chip so ingredient planning coverage is visible at a glance.
- Made staple status editable inline from the ingredient table instead of hiding it in backend-only fields.

### Files changed

- `app/(chef)/recipes/ingredients/ingredients-client.tsx`

### Decisions

- Keep strengthening the mature ingredient library instead of creating a separate ingredient audit page for basic planning visibility.
- Surface planning flags on the main table because ingredient substitutions, staples, and accommodations all feed the eventual menu-builder workflow.

### Verification

- Ran `npx eslint "app/(chef)/recipes/ingredients/ingredients-client.tsx"` successfully.

## 2026-03-12 - Recipe library operations snapshot pass

### Done

- Expanded the canonical `/recipes` list data so recipe cards can carry yield description and equipment data directly from the main recipe library query.
- Added a new menu-readiness summary card to highlight how many recipes already include timing, yield, and equipment coverage.
- Added an operations snapshot block on recipe cards so chefs can scan prep time, cook time, yield, and equipment needs before opening detail pages.

### Files changed

- `lib/recipes/actions.ts`
- `app/(chef)/recipes/recipes-client.tsx`

### Decisions

- Keep strengthening the mature `/recipes` surface instead of creating another recipe-readiness dashboard.
- Prioritize operational metadata visibility on list cards because menu building starts with fast library scanning, not opening every recipe one by one.

### Verification

- Ran `npx eslint "app/(chef)/recipes/recipes-client.tsx" "lib/recipes/actions.ts"` successfully.

## 2026-03-12 - Recipe detail chef-safe actions pass

### Done

- Reworked the canonical recipe detail header so routine actions stay grouped while destructive deletion is separated and explained.
- Added chef-safe workflow messaging to make the page easier to use without accidental damage.
- Added a follow-up implementation note and updated the living app audit.

### Files changed

- `app/(chef)/recipes/[id]/recipe-detail-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-detail-chef-safe-actions-pass.md`

### Decisions

- Bias the main recipe workflow toward safe iteration instead of treating deletion like a normal peer action.
- Use lightweight interface guardrails before adding heavier system logic.

### Verification

- Reviewed the updated recipe detail structure and confirmed the chef-safe alert plus dedicated high-impact actions card render separately from the main action cluster.

## 2026-03-12 - Recipe library visual QoL pass

### Done

- Gave the main recipe page a stronger visual hierarchy so progress is more obvious on the active local server.
- Added summary cards, a dedicated Library Tools section, and a framed search/filter panel to the canonical recipe library.
- Added a follow-up implementation note and updated the living app audit.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-qol-visual-pass.md`

### Decisions

- Prioritize visible quick wins on the canonical `/recipes` page before diving into heavier menu-builder system work.
- Keep all recipe-library polish on the mature recipe surface instead of splitting attention across duplicate routes.

### Verification

- Reviewed the updated component structure to confirm the new header, stat-card grid, library-tools card section, and filter panel render in sequence without changing recipe list behavior.

## 2026-03-12 - Ingredient library visual QoL pass

### Done

- Gave the main ingredient page a more intentional visual hierarchy so active progress is obvious on the live local server.
- Added summary cards, a framed filter panel, and clearer table context to the canonical ingredient library.
- Added a follow-up implementation note and updated the living app audit.

### Files changed

- `app/(chef)/recipes/ingredients/ingredients-client.tsx`
- `docs/app-complete-audit.md`
- `docs/ingredient-library-qol-visual-pass.md`

### Decisions

- Use visible polish on the canonical ingredient page rather than spending another pass on hidden structural changes only.
- Keep the visual pass tightly scoped to the active Priority 1 ingredient workflow.

### Verification

- Reviewed the updated component structure to confirm the new header, stat-card grid, filter card, and titled table section render in sequence without changing the underlying ingredient editing flow.

## 2026-03-12 - Ingredient price visibility improved in library

### Done

- Expanded the main ingredient library to show the freshest known saved price alongside the existing average price.
- Surfaced `last_price_cents` and `last_price_date` through the ingredient query as explicit client-facing fields.
- Updated the app audit and added a follow-up implementation note for the ingredient price visibility pass.

### Files changed

- `lib/recipes/actions.ts`
- `app/(chef)/recipes/ingredients/ingredients-client.tsx`
- `docs/app-complete-audit.md`
- `docs/ingredient-library-price-visibility-pass.md`

### Decisions

- Use the existing ingredient pricing fields already stored in the table instead of introducing new schema.
- Prioritize current price visibility because it feeds menu costing more directly than a hidden historical field.

### Verification

- Verified the ingredient query now returns explicit current-price fields and the ingredient table renders both current and average price columns.

## 2026-03-12 - Recipe field coverage expanded in main workflow

### Done

- Surfaced `yield_description` and `adaptations` in the main recipe create, edit, and detail flows.
- Closed a real gap where the backend recipe model supported richer operational metadata than the canonical `/recipes` UI exposed.
- Updated the app audit and added a follow-up implementation note for the field coverage pass.

### Files changed

- `app/(chef)/recipes/new/create-recipe-client.tsx`
- `app/(chef)/recipes/[id]/edit/edit-recipe-client.tsx`
- `app/(chef)/recipes/[id]/recipe-detail-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-field-coverage-pass.md`

### Decisions

- Keep extending the mature `/recipes` workflow instead of creating new recipe surfaces.
- Prioritize exposing existing backend recipe metadata before adding more complexity on top of the library.

### Verification

- Verified the new state variables, save payloads, and rendered sections through targeted source inspection and grep checks across create, edit, and detail surfaces.

## 2026-03-12 - Recipe library tooling surfaced in main book

### Done

- Exposed the existing recipe support views directly from the main `/recipes` page instead of leaving them buried under `/culinary/recipes/*`.
- Added four quick-access library tool cards to the recipe book for incomplete recipes, dietary flags, recipe tags, and seasonal notes.
- Updated the living app audit for the `/recipes` page and added a follow-up implementation note doc.

### Files changed

- `app/(chef)/recipes/recipes-client.tsx`
- `docs/app-complete-audit.md`
- `docs/recipe-library-tooling-surface.md`

### Decisions

- Keep using the mature `/recipes` surface as the main recipe library home.
- Surface already-built support views rather than rebuilding the same workflows somewhere else.

### Verification

- Reviewed the rendered JSX structure in the updated client file to confirm the new library-tool card block sits above search and filters without changing existing recipe-grid behavior.

## 2026-03-12 - Recipe Library foundation pass

### Done

- Audited the existing recipe and culinary code paths before changing anything.
- Found that the app already has a fuller recipe system under `app/(chef)/recipes/*`, while the newer culinary entry points were partially broken and stale.
- Fixed the culinary recipe library entry points so they use the mature recipe flows instead of duplicating weaker UI:
  - replaced `app/(chef)/culinary/recipes/page.tsx` with a redirect to the mature recipe library
  - added `app/(chef)/culinary/recipes/new/page.tsx` redirecting to the working recipe creation flow
  - added `app/(chef)/culinary/recipes/[id]/edit/page.tsx` redirecting to the working recipe edit flow
  - replaced `app/(chef)/culinary/recipes/[id]/page.tsx` with the mature `RecipeDetailClient` view so culinary recipe detail now shows the real ingredient, cost, sub-recipe, production, and event history data

### Files changed

- `app/(chef)/culinary/recipes/page.tsx`
- `app/(chef)/culinary/recipes/new/page.tsx`
- `app/(chef)/culinary/recipes/[id]/edit/page.tsx`
- `app/(chef)/culinary/recipes/[id]/page.tsx`

### Decisions

- Do not rebuild recipe-library UI that already exists and works elsewhere in the app.
- Use the stronger `/recipes` implementation as the foundation for Priority 1, then unify or extend from there.
- Treat broken culinary routes and stale recipe pages as product debt blocking the Menu Builder foundation.

### Verification

- Route wiring change reviewed via diff.
- Targeted TypeScript transpile verification passed for the changed culinary recipe route files.
- Full repo typecheck attempt (`npx tsc --noEmit`) hit Node heap OOM in this environment before completion, so broader verification still needs a narrower pass or higher-memory run.

## Deployment Date: 2026-03-12

Initial autonomous team deployment. ROADMAP loaded with 6 priority areas.
Starting from Priority 1: Menu Builder System.

### Existing Infrastructure (already in codebase, don't rebuild)

- Event lifecycle (8-state FSM): `lib/events/transitions.ts`
- Ledger system (immutable, append-only): `lib/ledger/`
- Recipe model exists but needs enhancement for portion-level costing
- Quote system exists but needs connection to menu costing
- Client management with dietary tracking
- GOLDMINE lead scoring (deterministic, no AI)
- Remy AI concierge (Ollama-powered, local only)
- Calendar integration
- Loyalty system
- Embeddable inquiry widget
- Email integration with Gmail

### What Needs Building (from ROADMAP)

1. Menu Builder System (Priority 1) - the crown jewel
2. Inquiry Pipeline refinement (Priority 2)
3. Time Tracking (Priority 3)
4. Quote Builder connected to menu costing (Priority 4)
5. Communication Automation (Priority 5)
6. Financial Dashboard (Priority 6)

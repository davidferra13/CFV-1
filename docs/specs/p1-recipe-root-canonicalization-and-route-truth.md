# Spec: Recipe Root Canonicalization and Route Truth

> **Status:** built
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** large (15+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 03:49 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 03:49 EDT | Planner (Codex) |        |
| Claimed (in-progress) | 2026-04-29 11:32 EDT | Worker B        |        |
| Spike completed       | 2026-04-29 11:32 EDT | Worker B        |        |
| Pre-flight passed     | Skipped: no build/dev server per task | Worker B        |        |
| Build completed       | 2026-04-29 11:32 EDT | Worker B        |        |
| Type check passed     | 2026-04-29 11:32 EDT | Worker B        |        |
| Build check passed    |                      |                 |        |
| Playwright verified   |                      |                 |        |
| Status: verified      |                      |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Before taking action, fully understand the current system, constraints, and context.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.
- The phase-shift audit already identified recipe overlap clearly: `/culinary/recipes` and `/recipes` both exist, and the system should have one recipe path.
- The builder needs route truth and canonical ownership, not another vague memo that recipes are "duplicated."
- If a recipe route is real, it should keep a clear job. If a culinary recipe link points to a route that does not exist, that needs to be corrected directly.

### Developer Intent

- **Core goal:** make `/recipes` the canonical recipe workspace and recipe CRUD path while keeping the specialized culinary companion pages alive and adding compatibility redirects where older culinary recipe URLs still matter.
- **Key constraints:** do not delete the specialized companion pages under `/culinary/recipes`, do not rebuild recipe logic or schema, do not widen this into the separate menus or events overlap lanes, and do not leave stale culinary CRUD links pointing to routes that 404 today.
- **Motivation:** the repo already behaves like `/recipes` is the real recipe home in shortcuts, Remy, search, revalidation, and the richer recipe UI, but many culinary, activity, nav, and help surfaces still speak in the older `/culinary/recipes` language.
- **Success from the developer's perspective:** a builder can answer, without guessing, that recipes live at `/recipes`, recipe create lives at `/recipes/new`, recipe detail lives at `/recipes/[id]`, recipe edit lives at `/recipes/[id]/edit`, and `/culinary/recipes/*` only remains for the companion views plus deliberate compatibility aliases.

---

## What This Does (Plain English)

This spec makes `/recipes` the one canonical recipe root. The standalone recipe library, create page, detail page, edit page, production log, ingredients, import hub, step photos, sprint flow, and dump flow all continue to live under `/recipes`.

The older `/culinary/recipes` root becomes compatibility-only for the generic library and CRUD surfaces:

- `/culinary/recipes` redirects to `/recipes`
- `/culinary/recipes/new` redirects to `/recipes/new`
- `/culinary/recipes/[id]` redirects to `/recipes/[id]`
- `/culinary/recipes/[id]/edit` redirects to `/recipes/[id]/edit`

The specialized companion pages under `/culinary/recipes` stay alive:

- `/culinary/recipes/dietary-flags`
- `/culinary/recipes/drafts`
- `/culinary/recipes/seasonal-notes`
- `/culinary/recipes/tags`

After this spec is built, generic recipe navigation, generic recipe detail links, activity links, dashboard recipe links, and help metadata all speak the same route truth.

---

## Why It Matters

The current repo already has a de facto winner. `/recipes` is the richer and more modern recipe workspace, and many system-level helpers already point there. The problem is that the older culinary recipe surface still competes with it and still points to missing culinary CRUD routes.

That means the recipe lane is no longer just an overlap problem. It is also a route-honesty problem:

- generic recipe entry is split
- help metadata describes routes that do not exist
- activity links still emit the older route family
- culinary empty states still point to missing create routes

The builder needs one truth before implementation drifts farther.

---

## Current State (What Already Exists)

### Verified overlap and route drift

- The phase-shift audit explicitly flags `/culinary`, `/culinary/recipes`, `/recipes`, and `/recipes/[id]/edit` as the recipe overlap lane and recommends one recipe path.
- `app/(chef)/recipes/*` already contains a broad standalone recipe workspace:
  - `/recipes`
  - `/recipes/new`
  - `/recipes/[id]`
  - `/recipes/[id]/edit`
  - `/recipes/production-log`
  - `/recipes/ingredients`
  - `/recipes/import`
  - `/recipes/photos`
  - `/recipes/sprint`
  - `/recipes/dump`
- `app/(chef)/culinary/recipes/*` is partial:
  - `/culinary/recipes`
  - `/culinary/recipes/[id]`
  - `/culinary/recipes/dietary-flags`
  - `/culinary/recipes/drafts`
  - `/culinary/recipes/seasonal-notes`
  - `/culinary/recipes/tags`
- There is no real `/culinary/recipes/new`.
- There is no real `/culinary/recipes/[id]/edit`.

### Verified stale links to missing culinary CRUD routes

- `app/(chef)/culinary/recipes/page.tsx` links to `/culinary/recipes/new`.
- `app/(chef)/culinary/ingredients/page.tsx` empty state links to `/culinary/recipes/new`.
- `app/(chef)/culinary/recipes/[id]/page.tsx` links to `/culinary/recipes/[id]/edit`.

### Verified canonical behavior already centered on `/recipes`

- `lib/keyboard/shortcuts.ts` uses `/recipes` and `/recipes/new`.
- `lib/ai/remy-actions.ts` and `app/api/remy/stream/route-prompt-utils.ts` describe the recipe library as `/recipes`.
- `lib/search/universal-search.ts` sends recipe search results to `/recipes/[id]`.
- Most recipe mutations and revalidation logic already target `/recipes` and `/recipes/[id]`.
- `app/(chef)/recipes/page.tsx` plus `app/(chef)/recipes/recipes-client.tsx` are the richer recipe-library experience.
- `app/(chef)/recipes/[id]/recipe-detail-client.tsx` is the richer canonical recipe detail experience.

### Verified older route language still leaking through the system

- `components/navigation/nav-config.tsx` still uses `/culinary/recipes` in the Culinary hub submenu and the `Recipe Library` child entry.
- `app/(chef)/culinary/page.tsx` still sends the main `Recipe Book` tile to `/culinary/recipes`.
- Activity surfaces still emit `/culinary/recipes/[id]`:
  - `components/activity/activity-dot.tsx`
  - `components/activity/chef-activity-feed.tsx`
  - `components/activity/client-activity-timeline.tsx`
  - `app/(chef)/activity/activity-page-client.tsx`
- Dashboard surfaces still point at the old recipe root or old detail routes:
  - `app/(chef)/dashboard/_sections/metrics-strip.tsx`
  - `app/(chef)/dashboard/_sections/smart-suggestions.tsx`
- Culinary-context pages still deep-link to `/culinary/recipes/[id]` even when they mean generic recipe detail.
- Help metadata still claims `/culinary/recipes/new` and `/culinary/recipes/[id]/edit` are real first-class pages.

### Verified menu precedent already exists

- `app/(chef)/culinary/menus/page.tsx` already redirects `/culinary/menus` to `/menus`.
- That means the repo already has a proven pattern for:
  - choosing a standalone canonical root
  - preserving domain-specific companion routes
  - avoiding a giant culinary rewrite

---

## Files to Create

| File                                             | What to Create                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `app/(chef)/culinary/recipes/new/page.tsx`       | Compatibility redirect from `/culinary/recipes/new` to `/recipes/new`.             |
| `app/(chef)/culinary/recipes/[id]/edit/page.tsx` | Compatibility redirect from `/culinary/recipes/[id]/edit` to `/recipes/[id]/edit`. |

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/culinary/recipes/page.tsx`                                     | Replace the older recipe library implementation with a redirect to `/recipes`, matching the existing `/culinary/menus` pattern.                                                                                                                    |
| `app/(chef)/culinary/recipes/[id]/page.tsx`                                | Replace the older recipe detail implementation with a redirect to `/recipes/[id]`.                                                                                                                                                                 |
| `app/(chef)/culinary/page.tsx`                                             | Repoint the `Recipe Book` tile from `/culinary/recipes` to `/recipes`.                                                                                                                                                                             |
| `app/(chef)/culinary/ingredients/page.tsx`                                 | Repoint the empty-state CTA from `/culinary/recipes/new` to `/recipes/new`.                                                                                                                                                                        |
| `app/(chef)/recipes/photos/page.tsx`                                       | Repoint the empty-state `Browse Recipes` CTA from `/culinary/recipes` to `/recipes`.                                                                                                                                                               |
| `components/navigation/nav-config.tsx`                                     | Make all generic recipe entry links use `/recipes`. Keep the companion routes for `dietary-flags`, `drafts`, `seasonal-notes`, and `tags`, but stop using `/culinary/recipes` as the generic library root.                                         |
| `lib/help/page-info-sections/08-chef-portal-culinary.ts`                   | Rewrite recipe page metadata so `/recipes`, `/recipes/[id]`, `/recipes/new`, and `/recipes/[id]/edit` are canonical. Remove or relabel the fake first-class culinary CRUD entries as compatibility aliases. Keep the companion-route help entries. |
| `lib/activity/breadcrumb-types.ts`                                         | Make breadcrumb labeling treat `/recipes` as the canonical recipe root while keeping any legacy alias mapping only if needed during transition.                                                                                                    |
| `components/activity/activity-dot.tsx`                                     | Repoint recipe entity links to `/recipes/[id]`.                                                                                                                                                                                                    |
| `components/activity/chef-activity-feed.tsx`                               | Repoint recipe entity links to `/recipes/[id]`.                                                                                                                                                                                                    |
| `components/activity/client-activity-timeline.tsx`                         | Repoint recipe entity links to `/recipes/[id]`.                                                                                                                                                                                                    |
| `app/(chef)/activity/activity-page-client.tsx`                             | Repoint recipe entity links to `/recipes/[id]`.                                                                                                                                                                                                    |
| `app/(chef)/dashboard/_sections/metrics-strip.tsx`                         | Repoint the generic recipe metrics link to `/recipes`.                                                                                                                                                                                             |
| `app/(chef)/dashboard/_sections/smart-suggestions.tsx`                     | Repoint generic recipe suggestions and recipe detail suggestions to `/recipes` and `/recipes/[id]`.                                                                                                                                                |
| `lib/pricing/cost-refresh-actions.ts`                                      | Stop treating `/culinary/recipes` as a canonical revalidation target where `/recipes` already owns freshness.                                                                                                                                      |
| `lib/inventory/price-cascade-actions.ts`                                   | Same canonical revalidation alignment as above.                                                                                                                                                                                                    |
| `docs/app-complete-audit.md`                                               | Update the redundancy note so the target state is explicit: `/recipes` is canonical, `/culinary/recipes` is compatibility plus companion routes.                                                                                                   |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Add this as the recipe-specific consolidation slice under the redundancy lane and execution order.                                                                                                                                                 |

Builder note:

- The grep hit list for `/culinary/recipes` is larger than the table above. After the canonical redirects land, do one explicit sweep and convert any generic recipe detail/library link from `/culinary/recipes` to `/recipes` unless the route is one of the preserved companion pages.
- The high-signal sweep must include culinary components, culinary costing, substitutions, prep, dish detail cross-links, dashboard links, and activity links.

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No schema work is part of this slice.
- Do not create redirect tables, route alias registries, or recipe-surface config records just to settle route ownership.

---

## Data Model

This is a route-ownership and surface-ownership correction, not a persistence change.

### Canonical route contract

- `canonicalRecipeRoot = '/recipes'`
- `canonicalRecipeCreate = '/recipes/new'`
- `canonicalRecipeDetail = '/recipes/[id]'`
- `canonicalRecipeEdit = '/recipes/[id]/edit'`
- `compatibilityRecipeRoot = '/culinary/recipes'`

### Meaning of each recipe route family

- `/recipes`
  - canonical recipe library
  - generic destination for recipe nav, dashboard metrics, queue activity, and generic recipe CTAs
- `/recipes/new`
  - canonical create flow
- `/recipes/[id]`
  - canonical recipe detail
- `/recipes/[id]/edit`
  - canonical edit flow
- `/recipes/production-log`
  - canonical production-log workspace
- `/recipes/ingredients`
  - canonical ingredients workspace
- `/recipes/import`
  - canonical recipe import hub
- `/recipes/photos`
  - canonical step-photo gallery
- `/recipes/sprint`
  - canonical sprint flow
- `/recipes/dump`
  - canonical capture/dump flow
- `/culinary/recipes`
  - compatibility alias only for the generic library root
  - not allowed to remain a peer or equal first-class root
- `/culinary/recipes/[id]`
  - compatibility alias only for generic recipe detail
- `/culinary/recipes/new`
  - compatibility alias only for generic recipe create
- `/culinary/recipes/[id]/edit`
  - compatibility alias only for generic recipe edit
- `/culinary/recipes/dietary-flags`
  - specialized culinary companion view
- `/culinary/recipes/drafts`
  - specialized culinary companion view
- `/culinary/recipes/seasonal-notes`
  - specialized culinary companion view
- `/culinary/recipes/tags`
  - specialized culinary companion view

### Explicit invariants

- Do not move `production-log`, `ingredients`, `import`, `photos`, `sprint`, or `dump` back under `/culinary/recipes`.
- Do not delete the companion routes under `/culinary/recipes`.
- Do not let generic recipe entry or generic recipe detail continue to resolve primarily through `/culinary/recipes`.
- Do not leave help metadata or nav copy implying that `/culinary/recipes/new` and `/culinary/recipes/[id]/edit` are real primary pages.

---

## Server Actions

No new server actions are required.

| Function / Surface                                                               | Current Problem                                                                                                               | Required Change                                                                                                                                                              |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| recipe freshness revalidation that still treats `/culinary/recipes` as canonical | canonical root freshness is already centered on `/recipes`, but old alias revalidation still lingers in a few support actions | make `/recipes` and `/recipes/[id]` the canonical freshness targets; keep alias revalidation only if the builder confirms it is still needed during the compatibility window |
| route emitters in activity and dashboard surfaces                                | route truth is still split between canonical recipe pages and legacy culinary links                                           | emit `/recipes` and `/recipes/[id]` for generic recipe navigation                                                                                                            |

Builder note:

- Do not introduce a new route-abstraction layer just for recipe routing.
- A small internal helper is acceptable only if the builder finds repeated canonical recipe URL logic during the sweep.

---

## UI / Component Spec

### Page Layout

#### `/recipes`

- This remains the one canonical recipe home.
- Keep the richer standalone library experience intact.
- Keep create, import, ingredients, production log, photos, sprint, and dump actions under this route family.

#### `/culinary/recipes`

- Replace the current page with a redirect to `/recipes`.
- Do not keep a second full recipe library implementation here.

#### `/recipes/[id]`

- This remains the canonical recipe detail page.
- Keep the richer detail feature set intact.

#### `/culinary/recipes/[id]`

- Replace the current page with a redirect to `/recipes/[id]`.
- Do not keep the older detail implementation as a competing peer.

#### Compatibility alias routes

- `/culinary/recipes/new` must redirect to `/recipes/new`.
- `/culinary/recipes/[id]/edit` must redirect to `/recipes/[id]/edit`.
- These compatibility routes exist to stop stale links from breaking during cleanup, not to preserve dual ownership forever.

#### Companion culinary recipe pages

- Keep `/culinary/recipes/dietary-flags`, `/culinary/recipes/drafts`, `/culinary/recipes/seasonal-notes`, and `/culinary/recipes/tags`.
- When these pages link to the generic recipe library, use `/recipes`.
- When these pages link to a specific recipe record, use `/recipes/[id]`.

### Navigation and copy rules

- Top-level Culinary submenu `Recipes` goes to `/recipes`.
- The `Recipe Library` child under the `Recipes` group goes to `/recipes`.
- `New Recipe` continues to use `/recipes/new`.
- Companion entries such as `By Dietary Flags`, `Drafts`, `Seasonal Notes`, and `Tags` may stay under `/culinary/recipes/*`.
- The Culinary hub tile for the recipe book goes to `/recipes`.

### Route-truth fixes

- Any generic `Browse Recipes`, `All Recipes`, or `Recipe Book` CTA goes to `/recipes`.
- Any generic `Add Recipe` CTA goes to `/recipes/new`.
- Any generic recipe record link goes to `/recipes/[id]`.
- Any generic edit link goes to `/recipes/[id]/edit`.
- Only the preserved companion routes may remain under `/culinary/recipes/*`.

### States

- **Loading:** direct visits to old culinary CRUD routes should redirect cleanly without showing a second older loading surface first.
- **Empty:** empty states that encourage recipe creation or browsing should now point to `/recipes` or `/recipes/new`.
- **Error:** error and not-found states should use the canonical recipe route family in retry/back links.
- **Populated:** a populated culinary companion page does not make `/culinary/recipes` the generic root again.

---

## Edge Cases and Error Handling

| Scenario                                                                                                           | Correct Behavior                                                                                   |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| A builder deletes `/culinary/recipes` without adding compatibility aliases first                                   | That is wrong. Old links already exist and would break. Add the redirect routes first.             |
| A builder keeps the old culinary recipe library implementation alive and also keeps `/recipes`                     | That recreates the overlap. `/recipes` is the canonical library.                                   |
| A builder redirects the companion pages like `dietary-flags` or `drafts` into `/recipes`                           | Do not do that in this slice. Those are specialized companion pages and can remain where they are. |
| A builder updates nav but leaves activity and dashboard links on `/culinary/recipes/[id]`                          | Route truth stays fragmented. Generic recipe links should converge on `/recipes/[id]`.             |
| A builder rewrites only library links but leaves `/culinary/recipes/new` and `/culinary/recipes/[id]/edit` missing | That leaves 404s in the system. Add the compatibility redirects.                                   |
| A builder updates route truth but leaves help metadata describing fake first-class culinary CRUD pages             | That keeps the repo documentation wrong. Help metadata must match actual route truth.              |

---

## Verification Steps

1. Sign in as a chef and open `/recipes`.
2. Verify: the standalone recipe library still works as the primary recipe home.
3. Open `/recipes/new`.
4. Verify: recipe creation still works from the canonical route.
5. Open any existing recipe detail page under `/recipes/[id]`.
6. Verify: the richer canonical detail page still works.
7. Open `/recipes/[id]/edit`.
8. Verify: recipe editing still works from the canonical route.
9. Visit `/culinary/recipes`.
10. Verify: it redirects to `/recipes`.
11. Visit `/culinary/recipes/new`.
12. Verify: it redirects to `/recipes/new`.
13. Visit `/culinary/recipes/[id]`.
14. Verify: it redirects to `/recipes/[id]`.
15. Visit `/culinary/recipes/[id]/edit`.
16. Verify: it redirects to `/recipes/[id]/edit`.
17. Open the Culinary hub tile for recipes and the top-level Culinary submenu recipe link.
18. Verify: both now land on `/recipes`.
19. Trigger the ingredients empty-state CTA and any dashboard or activity recipe link touched by this slice.
20. Verify: they land on `/recipes` or `/recipes/[id]`, not stale culinary CRUD routes.
21. Open the preserved companion pages:

- `/culinary/recipes/dietary-flags`
- `/culinary/recipes/drafts`
- `/culinary/recipes/seasonal-notes`
- `/culinary/recipes/tags`

22. Verify: they still work and their generic recipe back-links or detail links use the canonical `/recipes` route family.
23. Trigger a recipe-cost or price-refresh mutation already covered by current actions.
24. Verify: the canonical `/recipes` library or detail page refreshes correctly without depending on `/culinary/recipes` as a peer root.

---

## Out of Scope

- Rebuilding the recipe library UI or recipe detail architecture.
- Moving the companion culinary recipe pages under `/recipes`.
- Reworking the separate menus overlap lane.
- Reworking the separate events versus production overlap lane.
- Changing recipe schema, recipe import logic, or nutrition/allergen features.
- Rewriting every culinary-context page in one huge sweep beyond the route-truth cleanup this slice requires.

---

## Notes for Builder Agent

1. **Follow the menus precedent.** The repo already chose `/menus` as canonical while keeping specialized culinary menu routes alive. Do the same for recipes.

2. **Compatibility first, then sweep stale links.** The redirect aliases stop breakage immediately. After that, convert high-signal old recipe links so the redirect layer becomes a safety net instead of the main path.

3. **Keep companion routes distinct.** `dietary-flags`, `drafts`, `seasonal-notes`, and `tags` are not evidence that `/culinary/recipes` should remain the generic root.

4. **Help metadata must match route reality.** Right now the help layer still describes fake culinary create and edit pages. That needs to be corrected in the same slice.

5. **Do not widen this into recipe feature work.** This is a route ownership and surface honesty correction. It is not a license to redesign recipes, costing, or imports.

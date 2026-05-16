# Spec: Dish-Level Menu Assembly

> **Status:** SPEC-READY
> **Priority:** P1
> **Depends on:** None (builds on existing dish_index, dish_source_actions, canonical-dish-menu-core)
> **Estimated complexity:** medium (10-14 files)
> **Created:** 2026-05-16
> **Built by:** not started

---

## What This Does (Plain English)

Lets you build a menu by picking dishes from your catalog instead of starting from a blank page. You browse your repertoire, filter by season or course or dietary needs, pick the dishes you want, slot them into courses, and the system creates the menu. It also tells you when dishes clash (allergens, repeated for that client, off-season) and suggests complementary dishes to round out the menu.

## Why It Matters

Your creative process is bottom-up. You think: "The duck breast killed last month. That bisque is perfect for October. Client loves chocolate, so the mousse." You're assembling from proven winners, not inventing from scratch every time. Right now ChefFlow only supports top-down (create menu, add dishes manually). This unlocks the way you actually think about menus.

## The Problem Today

1. **No assembly workflow.** You can add a canonical dish to an existing menu one at a time (`addCanonicalDishToMenu`), but there's no "build a whole menu from catalog picks" flow.
2. **No smart suggestions.** When you've picked 3 dishes, nothing tells you "your 4th should probably be X because of cuisine coherence, allergen safety, and the client hasn't seen it."
3. **No compatibility checking at assembly time.** Allergen conflicts between courses, cuisine mismatches, and seasonal misalignment are invisible until after the menu is built.
4. **No client-history exclusion during assembly.** You can't see "dishes this client has already had" filtered out while picking.
5. **The catalog curate panel (`catalog-curate-panel.tsx`) is client-facing** (send selections for client picks). There's no chef-facing "build my own menu from catalog" equivalent.

## How It Works

### Flow 1: Build New Menu from Catalog

1. Chef clicks "Build from Catalog" on `/menus/new` or `/culinary/menus`
2. Assembly panel opens: full catalog with search, filters, course grouping
3. Chef picks dishes (checkbox or drag). Each pick lands in a "staging area" organized by course slot
4. Chef assigns/reorders course positions (drag to reorder, or auto-assign by dish.course)
5. Compatibility panel shows live warnings (allergen conflicts, cuisine mismatch, off-season)
6. If a client/event is selected, client history exclusion highlights "already served" dishes
7. Suggestions panel recommends complementary dishes based on what's already selected
8. Chef confirms. System calls `materializeCanonicalDishIntoMenu` for each dish, creates the menu in one transaction

### Flow 2: Add Catalog Dishes to Existing Menu

1. On any draft/shared menu editor page, "Add from Catalog" button
2. Same assembly panel opens, pre-filtered to exclude courses already filled
3. Chef picks additional dishes, assigns to available course slots
4. System materializes each into the existing menu

### Flow 3: Smart Suggestions Engine

Given the current dish selection, suggest complementary dishes ranked by:

- **Cuisine coherence:** dishes sharing cuisine tags with the majority
- **Allergen safety:** no new allergen conflicts introduced
- **Seasonal alignment:** dishes whose season_affinity matches the event month
- **Client novelty:** dishes the target client hasn't been served (via dish_appearances)
- **Course gaps:** if you have appetizer + main but no dessert, weight desserts higher
- **Chef confidence:** higher times_served + higher avg_rating = higher confidence

## Files to Create

| File                                              | Purpose                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/menus/assembly-actions.ts`                   | Server actions: `buildMenuFromCatalogPicks`, `getAssemblySuggestions`, `checkAssemblyCompatibility` |
| `lib/menus/assembly-suggestions.ts`               | Pure logic: scoring, ranking, compatibility checks (no DB calls, testable)                          |
| `lib/menus/assembly-types.ts`                     | Shared types: `AssemblyPick`, `AssemblySuggestion`, `CompatibilityWarning`, `AssemblySession`       |
| `components/menus/assembly-panel.tsx`             | Main assembly UI: catalog browser + staging area + course slots                                     |
| `components/menus/assembly-staging.tsx`           | Right-side staging area showing picked dishes in course order                                       |
| `components/menus/assembly-suggestions-panel.tsx` | AI-free suggestion cards with scores                                                                |
| `components/menus/assembly-compatibility-bar.tsx` | Live warning bar (allergen conflicts, season, repeats)                                              |
| `app/(chef)/menus/assemble/page.tsx`              | Standalone assembly route (deep-link target)                                                        |
| `tests/lib/menus/assembly-suggestions.test.ts`    | Unit tests for scoring/ranking logic                                                                |
| `tests/lib/menus/assembly-actions.test.ts`        | Integration tests for menu creation from picks                                                      |

## Files to Modify

| File                                        | Change                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `lib/menus/dish-index-actions.ts`           | Add `searchCatalogForAssembly` (paginated, filtered, with client-history annotations) |
| `lib/menus/catalog-selection-actions.ts`    | Extract shared `getAvailableCatalog` filter logic into reusable helper                |
| `components/menus/catalog-curate-panel.tsx` | Extract filter UI into shared `CatalogFilterBar` component                            |
| `app/(chef)/menus/new/page.tsx`             | Add "Build from Catalog" entry point button                                           |
| `app/(chef)/culinary/menus/page.tsx`        | Add "Assemble Menu" action button                                                     |
| `app/(chef)/culinary/menus/[id]/page.tsx`   | Add "Add from Catalog" button for draft/shared menus                                  |

## Database Changes

**No new tables required.** The existing schema supports everything:

- `dish_index` is already the canonical catalog
- `dish_index_components` already stores canonical components
- `dishes.dish_index_id` + `dishes.source_mode` already link menu dishes to catalog
- `dish_appearances` already tracks serving history per client
- `catalog_selections` handles client-facing picks (separate workflow, not modified)

**One optional index addition** (for the client-history exclusion query):

```sql
-- Migration: 20260517000001_assembly_client_history_index.sql

-- Composite index for fast "which dishes has this client seen" lookups during assembly
CREATE INDEX IF NOT EXISTS idx_dish_appearances_tenant_client_dish
  ON dish_appearances(tenant_id, client_name, dish_id)
  WHERE client_name IS NOT NULL;

-- Partial index for active catalog dishes (assembly browse query)
CREATE INDEX IF NOT EXISTS idx_dish_index_active_catalog
  ON dish_index(tenant_id, course, rotation_status)
  WHERE archived = false AND rotation_status = 'active';
```

## State Machine / Rules

### Assembly Session (client-side only, no DB state)

```
idle -> picking -> reviewing -> confirmed -> menu_created
         |            |
         v            v
       picking     picking   (back-and-forth allowed)
```

No persistence needed for the assembly session itself. It lives in React state. If you navigate away, you lose your picks (same as any unsaved form).

### Rules

1. **Only active, non-archived dishes appear in assembly catalog.** Retired/resting dishes hidden by default (toggle to show).
2. **Locked menus cannot receive assembled dishes.** Assembly targets draft or shared menus only.
3. **Course uniqueness enforced.** If the menu already has Course 3, you can't assign another dish to Course 3 unless you explicitly replace it.
4. **Reference is default mode.** Assembled dishes link back to catalog by reference. Chef can detach later via existing `convertReferencedMenuDishToCopy`.
5. **Allergen conflicts are warnings, not blockers.** Chef decides. The system flags, it doesn't refuse.
6. **Client history is advisory.** "Already served" dishes are dimmed but selectable.
7. **Suggestions require at least 1 dish selected.** No suggestions on empty selection.
8. **Maximum 12 courses per assembly.** Practical limit matching existing menu constraints.

### Compatibility Check Logic

```typescript
type CompatibilityWarning = {
  type: 'allergen_conflict' | 'cuisine_mismatch' | 'off_season' | 'client_repeat' | 'dietary_clash'
  severity: 'info' | 'warning' | 'critical'
  message: string
  dishIds: [string, string] | [string] // conflicting pair or single dish
}
```

- **allergen_conflict (critical):** Two dishes in same menu introduce conflicting allergens (e.g., nut-free main + almond dessert)
- **cuisine_mismatch (warning):** Majority of dishes are Italian but one is Thai
- **off_season (info):** Dish's season_affinity doesn't include event month
- **client_repeat (warning):** Client was served this dish in last 6 months (via dish_appearances)
- **dietary_clash (critical):** Menu tagged as "vegetarian" but selected dish has meat components

### Suggestion Scoring

```typescript
function scoreDish(candidate: CatalogDish, context: AssemblyContext): number {
  let score = 0
  score += cuisineCoherenceScore(candidate, context.selectedDishes) // 0-30
  score += seasonalFitScore(candidate, context.eventMonth) // 0-20
  score += clientNoveltyScore(candidate, context.clientHistory) // 0-20
  score += courseGapScore(candidate, context.filledCourses) // 0-15
  score += chefConfidenceScore(candidate) // 0-15
  score -= allergenPenalty(candidate, context.selectedDishes) // 0 to -50
  return score
}
```

## Edge Cases

1. **Empty catalog.** New chef with zero indexed dishes. Show empty state with CTA to upload past menus or create dishes manually.
2. **Single-dish menu.** Valid. Some events are just "dessert for 50 people."
3. **Dish retired mid-assembly.** If another tab retires a dish while you're assembling, the confirm step re-validates. Warn if any picks are now retired.
4. **Client with no history.** Client novelty score gives all dishes equal weight. No "already served" dimming.
5. **Seasonal data missing.** Dishes with empty `season_affinity` are season-neutral; never penalized, never boosted.
6. **Duplicate picks.** Same dish cannot be added twice to same menu. UI prevents selection if already in staging.
7. **Course number conflicts on existing menu.** If adding to a menu with courses 1,2,3 and you pick 2 more dishes, auto-assign to 4,5. Never overwrite without explicit replace action.
8. **Very large catalog (500+ dishes).** Paginate server-side. Client-side filter + infinite scroll. Never load all 500 at once.
9. **Menu with mixed source modes.** A menu can have some manual dishes, some referenced, some copied. Assembly adds referenced dishes alongside whatever already exists.
10. **Detached/offline dish_index entry.** If a referenced dish_index entry is later archived, the menu dish remains (it's a row in `dishes` table). Only the sync-from-canonical stops working.

## Definition of Done

- [ ] Chef can open assembly panel from menu creation and existing draft menus
- [ ] Catalog browser shows all active dishes with search, course filter, dietary filter, season filter
- [ ] Chef can pick multiple dishes and see them in a staged course layout
- [ ] Course assignment works (auto-assign + manual reorder)
- [ ] Compatibility warnings display in real-time as dishes are selected
- [ ] Client history exclusion dims already-served dishes when a client/event is linked
- [ ] Suggestions panel shows ranked complementary dishes after first pick
- [ ] "Confirm" creates the menu with all dishes materialized via reference mode
- [ ] Works for both new menu creation and adding to existing draft/shared menus
- [ ] Unit tests pass for scoring logic (assembly-suggestions.test.ts)
- [ ] Integration tests pass for menu creation from picks
- [ ] No TypeScript errors (`npx tsc --noEmit --skipLibCheck`)
- [ ] No build errors (`npx next build --no-lint`)
- [ ] Mobile-responsive assembly panel (stacked layout on small screens)
- [ ] Empty states handled (no catalog, no suggestions, no client history)

# Menu System Upgrade: Phase 2 Implementation

> Phase 2 (Seamless Menu Assembly) of the menu system upgrade designed in `docs/menu-system-upgrade-design.md`.
> Phase 1 implementation: `docs/menu-system-upgrade-phase1-implementation.md`.

## What Was Built

### Server Actions (`lib/menus/menu-intelligence-actions.ts`)

Five new server actions added to the Phase 1 file, all deterministic, zero LLM calls:

| Action                                                                     | Purpose                                                                                                                                                     | Returns                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `getAssemblySources(filters?)`                                             | Lists menus available as assembly sources (templates and/or past menus), with search, service style, and cuisine filtering                                  | `AssemblySource[]` with dish counts, client names, event dates |
| `getDishesFromMenu(sourceMenuId)`                                          | Lists all dishes in a source menu with component counts and recipe flags                                                                                    | `AssemblyDish[]`                                               |
| `addDishFromSource(targetMenuId, sourceDishId, courseNumber, courseName?)` | Deep copies a dish + all components from any source menu into the target menu. Auto-adjusts scale_factor for guest count differences                        | `AddDishResult` with new dish ID, components added, scale info |
| `addRecipeAsComponent(targetMenuId, targetDishId, recipeId)`               | Creates a new component linked to a recipe, auto-calculating scale_factor from recipe yield vs menu guest count. Maps recipe category to component category | Component ID + scale factor                                    |
| `quickAddDish(targetMenuId, dishName, courseNumber, courseName)`           | Creates an empty dish (no components) at a specified course position                                                                                        | Dish ID                                                        |

### Deep Copy Behavior

When copying a dish from a source menu:

1. **Copies:** name, description, dietary_tags, allergen_flags, chef_notes, client_notes, plating_instructions, beverage_pairing
2. **Preserves:** course structure (chef can override target course)
3. **Resets:** sort_order (appends to end of target course)
4. **Auto-adjusts:** scale_factor if guest counts differ between source and target menus
   - Formula: `originalScaleFactor * (targetGuestCount / sourceGuestCount)`
5. **Links (not copies):** recipe_id on components (references same recipe, does not duplicate it)

### Recipe-to-Component Mapping

When adding a recipe as a component, the recipe category maps to component category:

| Recipe Category            | Component Category |
| -------------------------- | ------------------ |
| protein                    | protein            |
| starch, pasta              | starch             |
| vegetable                  | vegetable          |
| sauce, condiment           | sauce              |
| dessert                    | dessert            |
| bread                      | bread              |
| soup                       | soup               |
| salad                      | salad              |
| appetizer, fruit, beverage | other              |

### UI Component

| Component             | File                                            | What It Shows                                                                                                                                       |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MenuAssemblyBrowser` | `components/culinary/menu-assembly-browser.tsx` | Collapsible panel with 4 tabs for adding dishes from templates, past menus, recipe bible, or quick add. Click-to-add with course position selector. |

**Tab 1: Templates** - Lists all `is_template=true` menus. Click to expand and see dishes. Click "+ Add" on any dish to deep copy it into the current menu.

**Tab 2: Past Menus** - Lists all past menus with client names and event dates. Same expand/add pattern as templates.

**Tab 3: Recipes** - Search the recipe bible (min 2 characters). Click "+ Add" to add a recipe as a new component on an existing dish.

**Tab 4: Quick Add** - Type a dish name, select a course (existing or new), and add an empty dish. Fastest path for building a menu from scratch.

### Course Position Selector

When adding a dish, if the target menu has multiple courses, a selector appears letting the chef choose which course to place the dish in. Options include all existing courses plus "New course" which auto-increments the course number.

### Page Integration

**Menu Detail Page** (`app/(chef)/culinary/menus/[id]/page.tsx`)

- Added `MenuAssemblyBrowser` between the hero image and the menu editor
- Extracts unique courses from existing dishes for the course selector
- Hidden for locked menus (assembly only works on draft/shared menus)

## What Was NOT Built (Phase 3-4)

Per the design doc, these are deferred:

- **Drag-and-drop reordering** between courses (design spec mentions this, but click-to-add covers the core need)
- **Remy NL assembly** ("Add the scallop appetizer from the Johnson dinner") - requires Remy command integration
- **Dish Index** tab (from menu upload pipeline) - not yet populated
- **Phase 3 (Tracking):** Menu lifecycle dashboard, revision history, food cost trend
- **Phase 4 (Documents):** Auto-generated document packs

## Validation

- TypeScript: zero new errors (`npx tsc --noEmit --skipLibCheck`)
- All new code compiles cleanly
- Design patterns followed: tenant scoping, `requireChef()`, `revalidatePath`, deep copy pattern matches existing `duplicateMenu`
- Zero Hallucination compliance: all `startTransition` calls have try/catch, error states shown, added confirmations ("Added" feedback)
- Locked menu guard: assembly browser hidden for locked menus, all server actions check menu status

## Files Created/Modified

### Created

- `components/culinary/menu-assembly-browser.tsx` (MenuAssemblyBrowser + SourceBrowser + RecipeBrowser + QuickAddPanel, ~460 lines)
- `docs/menu-system-upgrade-phase2-implementation.md` (this file)

### Modified

- `lib/menus/menu-intelligence-actions.ts` (5 new server actions: getAssemblySources, getDishesFromMenu, addDishFromSource, addRecipeAsComponent, quickAddDish)
- `app/(chef)/culinary/menus/[id]/page.tsx` (assembly browser integration, course extraction)

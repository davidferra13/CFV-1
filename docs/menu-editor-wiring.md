# Menu Editor Wiring

## What Changed

Connected the culinary menu editing UI to the real database. Before this change, `/culinary/menus/[id]` displayed hardcoded mock data and the `MenuEditor` component was an 88-line stub that called `console.log`. After this change, the page loads real menus and every add/edit/delete mutation persists to Supabase.

## Why It Matters

The menu → dishes → components hierarchy is the data source for every downstream operational document:

- **Prep Sheet** — generates tasks from components, split by `is_staple` ingredients
- **Service Execution Sheet** — course breakdown and arrival tasks from `make_ahead_window_hours`
- **Packing List** — make-ahead components sorted by `transport_category`
- **Grocery List** — ingredient quantities scaled by guest count

None of those documents had real data to work with until the editor was wired up.

## Files Changed

| File | Change |
|------|--------|
| `lib/menus/actions.ts` | Fixed `component_category` enum to match DB (added fruit, dessert, bread, cheese, condiment, beverage; removed base, topping, seasoning). Added `transport_category` to both Create and Update schemas. Exported `COMPONENT_CATEGORIES`, `TRANSPORT_CATEGORIES`, `ComponentCategory`, `TransportCategory` for UI consumption. |
| `components/culinary/MenuEditor.tsx` | Full rebuild. Now a real `'use client'` component that reads real data and calls server actions for every mutation. |
| `app/(chef)/culinary/menus/[id]/page.tsx` | Converted from a client component using mock data to a proper async server component calling `getMenuById`. |

## MenuEditor Architecture

The component is split into three layers:

1. **`ComponentForm`** — reusable inline form for add and edit. Handles all component fields: name, category, is_make_ahead, transport_category (conditional), make_ahead_window_hours (conditional), execution_notes, storage_notes.

2. **`ComponentRow`** — read view for a single component with hover-reveal edit/delete. Switches to an inline `ComponentForm` when editing.

3. **`DishCard`** — a `Card` per course. Renders course name (inline editable), allergen flag badges, the list of `ComponentRow`s, and an "Add component" expansion form. Handles dish-level edit and delete.

4. **`MenuEditorClient`** — top-level shell. Renders the menu header with status badge, all `DishCard`s, and the "Add Course N" button.

## Key Behaviors

**Locked menus** — if `menu.status === 'locked'`, all edit/add/delete controls are hidden and a banner is shown. The menu renders as read-only.

**Make-ahead toggle** — when `is_make_ahead` is checked on a component, two additional fields appear: transport zone (cold / frozen / room_temp / fragile / liquid) and lead time in hours. Both feed directly into the packing list and execution sheet generators. When unchecked, `transport_category` is set to `null` on save.

**Category enum fix** — the old schema had `base`, `topping`, `seasoning` which don't exist in the database. The corrected enum is: `sauce | protein | starch | vegetable | fruit | dessert | garnish | bread | cheese | condiment | beverage | other`.

**No optimistic UI** — mutations call the server action and rely on Next.js `revalidatePath` to refresh the data. This keeps the component simple and ensures what's on screen always reflects what's in the database.

## What's Still Stubbed

- `MenuDetail.tsx` — the read-only view component is still a stub. It's not used by the new page (which uses `MenuEditorClient` for both view and edit), so it can be addressed separately if a dedicated read-only view is needed.
- Recipe linking — the component form shows a placeholder comment but doesn't yet have a recipe search/link UI. The `recipe_id` field exists on components and `linkRecipeToComponent` exists in `lib/recipes/actions.ts`; a recipe picker can be added as a follow-on.
- Allergen flags on dishes — the dish card displays existing allergen flags from the database but the edit form doesn't yet include an allergen tag editor. Allergens are most reliably set from the client/event dietary data upstream.

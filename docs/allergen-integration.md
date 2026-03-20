# Allergen Safety Integration

## What Changed

The allergen cross-contamination warning system was already fully built (engine, UI components, server actions) but was not wired into any page. This change connects the existing components to three key surfaces so chefs get automatic, real-time allergen safety feedback.

## Components Wired

### 1. AllergenConflictAlert (Event Detail Overview Tab)

**File:** `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx`

- Renders automatically when the event has a `menu_id` and status is not `draft` or `cancelled`
- Placed above the AI-based `AllergenRiskPanel` for instant deterministic feedback
- Auto-runs `checkMenuAllergenConflicts(eventId)` on mount (no button click needed)
- Shows red banners for FDA Big 9 allergens, amber for other sensitivities
- Expandable per-person view showing which dishes conflict and which are safe
- No AI involved; pure set comparison of guest allergens vs dish ingredient allergen flags

### 2. AllergenConflictAlert (Menu Editor Sidebar)

**File:** `components/menus/menu-doc-editor.tsx`

- Renders in the sidebar when the menu is linked to an event
- Gives real-time allergen feedback while the chef is building/editing the menu
- Same component, same behavior as the event detail version
- Positioned after the Client panel (which shows dietary needs) for natural context flow

### 3. AllergenMatrix (Menu Detail Page)

**File:** `app/(chef)/menus/[id]/menu-detail-client.tsx`

- Renders as a card below the Prep Timeline section when the menu has dishes
- Shows a full allergen-vs-dish grid (rows = allergens, columns = dishes)
- Red cells = dish contains allergen, green cells = safe
- FDA Big 9 allergens highlighted with "Big 9" badge
- Scrollable table for menus with many dishes
- Fetches data via `getMenuAllergenMatrix(menuId)` server action

## How It Works

The system uses a deterministic approach (Formula > AI):

1. **Data sources:** Guest allergies from `event_guests` table, client allergies from `clients` table, dish allergen flags from `dishes` table, recursive ingredient-level allergen flags via `get_dish_allergen_flags` RPC
2. **Matching:** Case-insensitive comparison with alias support (e.g., "dairy" matches "milk", "lactose")
3. **Classification:** FDA Big 9 allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy, sesame) get "critical" severity; everything else gets "caution"
4. **Safe dish identification:** For each person, lists dishes with no allergen conflicts

## Key Files

| File                                            | Purpose                                |
| ----------------------------------------------- | -------------------------------------- |
| `components/events/allergen-conflict-alert.tsx` | Alert banner component (event-scoped)  |
| `components/menus/allergen-matrix.tsx`          | Grid component (menu-scoped)           |
| `lib/dietary/cross-contamination-check.ts`      | Server actions backing both components |
| `lib/constants/allergens.ts`                    | FDA Big 9 list and display helpers     |

## No Migration Needed

All data structures already exist. No new tables, columns, or server actions were created.

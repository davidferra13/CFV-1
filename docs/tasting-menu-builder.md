# Feature 6.2: Tasting Menu Builder

## Overview

Multi-course tasting menu builder with course progression planning and wine/beverage pairings. Allows chefs to design, preview, and manage elegant multi-course tasting experiences.

## Database Schema

### `tasting_menus`
Header table for tasting menu definitions.
- Scoped by `chef_id` (FK to `chefs`)
- Tracks price per person (cents), wine pairing upcharge (cents), occasion, and season
- RLS enforced via `user_roles` join

### `tasting_menu_courses`
Individual courses within a tasting menu.
- FK to `tasting_menus` with CASCADE delete
- UNIQUE constraint on `(tasting_menu_id, course_number)` prevents duplicate ordering
- 11 course types follow the classic French tasting progression: amuse-bouche, appetizer, soup, salad, fish, intermezzo, main, cheese, pre-dessert, dessert, mignardise
- Optional `recipe_id` FK links to existing recipes
- Portion sizes: bite, small, standard

**Migration:** `supabase/migrations/20260401000028_tasting_menus.sql`

## Server Actions

**File:** `lib/menus/tasting-menu-actions.ts`

| Action | Purpose |
|--------|---------|
| `getTastingMenus()` | List all tasting menus for the chef |
| `getTastingMenu(id)` | Get single menu with all courses |
| `createTastingMenu(data)` | Create menu header |
| `updateTastingMenu(id, data)` | Update menu header |
| `deleteTastingMenu(id)` | Delete menu (CASCADE removes courses) |
| `addCourse(menuId, data)` | Add a course to a menu |
| `updateCourse(courseId, data)` | Update a course |
| `removeCourse(courseId)` | Remove a course |
| `reorderCourses(menuId, courseIds[])` | Reorder courses by updating course_number |
| `duplicateTastingMenu(id, newName)` | Deep copy menu + all courses |

All actions use `requireChef()` and scope by `user.tenantId!`.

## Components

### `TastingMenuForm` (`components/menus/tasting-menu-form.tsx`)
- Create/edit form with header fields and ordered course list
- Up/down buttons for course reordering (no external drag library)
- Color-coded course type badges
- Suggested course type based on position in progression
- startTransition with try/catch error handling

### `TastingMenuList` (`components/menus/tasting-menu-list.tsx`)
- Grid layout showing menu cards with name, course count, price, season
- Duplicate and delete actions per card
- Click to edit, preview button

### `TastingMenuPreview` (`components/menus/tasting-menu-preview.tsx`)
- Elegant read-only display with course progression timeline
- Wine pairing shown alongside each course in purple highlight
- Per-person pricing with wine upcharge calculation
- Print-friendly layout (action buttons hidden in print)
- "Created with ChefFlow" print footer

## Course Type Progression

The standard French tasting menu progression:

1. Amuse-Bouche (bite-size teaser)
2. Appetizer (first course)
3. Soup
4. Salad
5. Fish
6. Intermezzo (palate cleanser, often sorbet)
7. Main (protein)
8. Cheese
9. Pre-Dessert (bridge to dessert)
10. Dessert
11. Mignardise (petit fours with coffee)

Chefs can customize the order and skip/repeat types as needed.

## Pricing

- `price_per_person_cents`: base tasting menu price
- `wine_pairing_upcharge_cents`: additional cost for the wine pairing option
- All values stored in cents (integers)
- Preview shows both base and with-wine totals

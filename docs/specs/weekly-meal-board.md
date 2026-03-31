# Spec: Weekly Meal Board

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** medium (5-7 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29

---

## What This Does (Plain English)

A new "Meals" tab in every Dinner Circle hub group that displays a persistent, always-visible weekly meal calendar. The chef posts meals organized by day (Mon-Sun) and meal type (Breakfast, Lunch, Dinner), and every circle member sees the current and upcoming weeks at a glance. No scrolling through chat to find "what's for dinner Tuesday." Open the circle, tap Meals, see the board. The chef updates it from a simple inline editor. Family members see a clean, read-only calendar view with dish names, dietary tags, and allergen flags.

---

## Why It Matters

This is the core product for a residency chef scenario (cooking daily for a family over weeks/months). Without a dedicated meal board, weekly menus get buried in chat history. A tech billionaire opening this app should see a clean, organized calendar of what's planned, not a chat thread.

---

## Files to Create

| File                                                    | Purpose                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `components/hub/weekly-meal-board.tsx`                  | Main meal board component (calendar grid + edit mode) |
| `lib/hub/meal-board-actions.ts`                         | Server actions: CRUD for meal board entries           |
| `database/migrations/20260401000123_hub_meal_board.sql` | New table for meal board entries                      |

---

## Files to Modify

| File                                                 | What to Change                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Add 'meals' to Tab type, add Meals tab to baseTabs, render `WeeklyMealBoard` component |
| `app/(public)/hub/g/[groupToken]/page.tsx`           | Fetch meal board data in `Promise.all`, pass as prop                                   |
| `lib/hub/types.ts`                                   | Add `MealBoardEntry` and `MealBoardWeek` type definitions                              |

---

## Database Changes

### New Tables

```sql
CREATE TABLE hub_meal_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  -- When and what meal
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),

  -- What's being served
  title TEXT NOT NULL,                    -- e.g. "Pan-Seared Salmon with Risotto"
  description TEXT,                       -- optional detail or notes
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  allergen_flags TEXT[] NOT NULL DEFAULT '{}',

  -- Optional link to existing menu/dish
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  dish_id UUID REFERENCES dishes(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'served', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One entry per group + date + meal type (chef can update, not duplicate)
  UNIQUE(group_id, meal_date, meal_type)
);

CREATE INDEX idx_hub_meal_board_group_date ON hub_meal_board(group_id, meal_date);
CREATE INDEX idx_hub_meal_board_date_range ON hub_meal_board(meal_date) WHERE status != 'cancelled';
```

### Migration Notes

- Timestamp `20260401000123` is strictly higher than the current highest (`20260401000122`)
- Additive only, no destructive operations
- The UNIQUE constraint on (group_id, meal_date, meal_type) enforces one entry per meal slot, enabling upsert semantics

---

## Data Model

**MealBoardEntry** represents a single meal on a single day. Key relationships:

- Belongs to a `hub_group` (the dinner circle)
- Created by a `hub_guest_profile` (the chef's profile in the circle)
- Optionally linked to an existing `menu` or `dish` for rich data (allergens, components)
- Unique per group + date + meal type (upsert model: posting to the same slot overwrites)

**Weekly view** is derived: query all entries for a date range, group by ISO week, then by day, then by meal_type.

---

## Server Actions

| Action                         | Auth                            | Input                                                                                                                | Output                        | Side Effects                                                       |
| ------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `getMealBoard(input)`          | None (public)                   | `{ groupId: string, startDate?: string, endDate?: string }`                                                          | `MealBoardEntry[]`            | None                                                               |
| `upsertMealEntry(input)`       | Profile token + chef/admin role | `{ groupId, profileToken, mealDate, mealType, title, description?, dietaryTags?, allergenFlags?, menuId?, dishId? }` | `{ success, entry?, error? }` | Posts system message to chat: "Menu updated for [date]"            |
| `deleteMealEntry(input)`       | Profile token + chef/admin role | `{ entryId, profileToken }`                                                                                          | `{ success, error? }`         | None                                                               |
| `bulkUpsertMealEntries(input)` | Profile token + chef/admin role | `{ groupId, profileToken, entries: { mealDate, mealType, title, description?, dietaryTags?, allergenFlags? }[] }`    | `{ success, count?, error? }` | Posts single system message: "Weekly menu posted for [date range]" |

**Auth model:** No server-side auth (public hub, token-based). Validate `profileToken` matches a group member with role `owner`, `admin`, or `chef`. Members and viewers cannot edit the board.

---

## UI / Component Spec

### Page Layout

The `WeeklyMealBoard` component renders inside the hub group view's main content area (max-w-2xl, dark theme).

**Structure:**

1. **Week navigation bar** - Previous/Next week arrows + "This Week" button + week label ("Mar 30 - Apr 5")
2. **Day columns** (mobile: vertical stack; desktop: 7-column grid) - Each day shows:
   - Day header: "Mon Mar 30"
   - Breakfast slot
   - Lunch slot
   - Dinner slot
3. **Each meal slot** shows:
   - Meal type label (small, muted)
   - Dish title (bold, stone-100)
   - Dietary tags as small colored pills
   - Allergen flags as warning pills (amber)
   - Status indicator (planned = outline, confirmed = solid, served = checkmark)
4. **Edit mode** (chef/admin only): Pencil icon in header toggles edit mode. In edit mode, each empty slot shows a "+" button. Each filled slot shows edit/delete icons. Tapping a slot opens an inline form (title input + optional description + dietary tag multi-select + save/cancel).

### States

- **Loading:** Skeleton grid with 7 day columns, 3 meal slots each (pulsing stone-800 blocks)
- **Empty:** "No meals planned yet. The chef will post the weekly menu here." centered message with a subtle plate emoji
- **Error:** "Could not load meal board" with retry button (never show empty grid as if no meals exist)
- **Populated:** Full calendar grid with meals. Current day highlighted with a left border accent

### Interactions

- **Week navigation:** Previous/Next arrows load adjacent weeks. Default view: current week (Mon-Sun)
- **Add meal (chef):** Tap "+" on empty slot -> inline form appears -> type title, optionally add description and tags -> Save (optimistic: entry appears immediately, rolls back on error with toast)
- **Edit meal (chef):** Tap pencil icon -> inline form pre-filled -> Save (optimistic update with rollback)
- **Delete meal (chef):** Tap trash icon -> confirm -> remove (optimistic with rollback)
- **Bulk post (chef):** "Post Full Week" button opens a form with all 21 slots (7 days x 3 meals). Chef fills in what they want, leaves others blank. Single save posts all entries at once via `bulkUpsertMealEntries`

---

## Edge Cases and Error Handling

| Scenario                                       | Correct Behavior                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Server action fails on save                    | Rollback optimistic update, show toast "Failed to save meal"                    |
| Chef posts to a slot that already has an entry | Upsert (overwrite). Old entry replaced. No duplicate                            |
| Group has no chef member                       | Meals tab still shows (read-only), empty state message                          |
| Meal date is in the past                       | Display normally (history). Chef can still edit past entries for record-keeping |
| Very long dish title                           | Truncate with ellipsis at 80 chars in grid view, full title on hover/tap        |
| No profile token (anonymous viewer)            | Read-only view, no edit controls shown                                          |
| Multiple chefs in circle                       | All chefs can edit. Last-write-wins on same slot (UNIQUE constraint handles it) |

---

## Verification Steps

1. Sign in with agent account as chef
2. Navigate to an existing dinner circle (or create one via `/circles`)
3. Verify the "Meals" tab appears in the hub group view
4. Tap the Meals tab - verify empty state shows correctly
5. Toggle edit mode - verify "+" buttons appear on each meal slot
6. Add a meal to Monday Breakfast - verify it appears immediately
7. Navigate to next week - verify the board is empty (no data for that week)
8. Navigate back - verify Monday Breakfast entry persists
9. Edit the entry - verify update shows correctly
10. Delete the entry - verify slot returns to empty
11. Test bulk post: fill multiple meals, save all at once
12. Open the circle link in an incognito window (no auth) - verify read-only view works
13. Screenshot the populated board and the empty state

---

## Out of Scope

- Linking to existing menus from the chef's menu library (optional field exists in schema but UI for browsing/linking menus is a separate spec)
- Recurring weekly templates / cloning weeks (separate spec: weekly-template-cloning)
- Meal-specific feedback from family members (separate spec: meal-feedback)
- Push notifications when chef posts a new week (covered by existing hub notification system)
- Grocery list generation from meal board (future feature)

---

## Notes for Builder Agent

- Follow the exact same dark theme pattern as `hub-notes-board.tsx` and `hub-availability-grid.tsx` (stone-900/950 backgrounds, stone-100/200/300 text)
- The Tab type union in `hub-group-view.tsx` line 23 needs `'meals'` added
- The baseTabs array (line 97) needs the meals entry: `{ id: 'meals', label: 'Meals', emoji: '🍽️' }` - show it always (not conditionally), since this is the primary feature for residency circles
- The page.tsx server component (line 35) needs a `getMealBoard` call added to the Promise.all
- Pass `mealBoardEntries` as a new prop to `HubGroupView`
- For the inline edit form, reference the pinned notes creation form pattern in `hub-notes-board.tsx`
- Mobile layout: stack days vertically. Desktop (md+): 7-column grid or horizontal scroll
- Week starts on Monday (ISO standard), not Sunday
- Use `date-fns` for date manipulation (already in project dependencies)
- The system message posted to chat on menu update should use message_type `'system'` with `system_event_type: 'menu_update'`

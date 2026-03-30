# Dinner Circle: Residency Chef Build

> **Date:** 2026-03-29
> **Context:** Built for a real use case - private chef working 3-month residency for a high-profile client, cooking B/L/D 5-7 days/week.

## What Was Built

Six features across 8 new files and 6 modified files, transforming the Dinner Circle from a social chat hub into a professional residency chef communication system.

### 1. Weekly Meal Board (P0)

- **What:** Persistent calendar grid showing 7 days x 3 meals (breakfast, lunch, dinner)
- **Where:** `components/hub/weekly-meal-board.tsx`, `lib/hub/meal-board-actions.ts`
- **DB:** `hub_meal_board` table with UNIQUE(group_id, meal_date, meal_type) for upsert
- **Key features:** Week navigation (prev/next/today), today highlighting, inline edit mode (chef only), optimistic updates with rollback

### 2. Meal Feedback (P0)

- **What:** Thumbs up/down reactions per meal, optional notes (200 char)
- **Where:** `components/hub/meal-feedback.tsx`, `lib/hub/meal-feedback-actions.ts`
- **DB:** `hub_meal_feedback` table with UNIQUE(meal_entry_id, profile_id)
- **Key features:** One-tap toggle, aggregated counts, expandable notes list, batch fetch for performance

### 3. Household Profiles (P1)

- **What:** Per-person dietary tracking within a family (allergies, restrictions, favorites, dislikes)
- **Where:** `components/hub/household-editor.tsx`, `lib/hub/household-actions.ts`
- **DB:** `hub_household_members` table
- **Key features:** Relationship types (partner, child, nanny, etc.), age groups, chip-based allergy/dietary input, aggregated dietary summary on Members tab

### 4. Weekly Template Cloning (P1)

- **What:** Clone current week to next/prev, save week patterns as reusable templates
- **Where:** Built into `weekly-meal-board.tsx` and `meal-board-actions.ts`
- **DB:** `hub_meal_templates` table with JSONB entries column
- **Key features:** Clone week (remaps dates), save/load/delete templates, dayOffset-based storage for date independence

### 5. Curated Viewer Experience / Residency Mode (P2)

- **What:** Configurable circle defaults: default tab, silent notifications, circle mode
- **Where:** Built into `hub-group-settings.tsx`
- **DB:** `hub_groups` gains `default_tab`, `silent_by_default`, `circle_mode` columns
- **Key features:** Residency mode sets meals tab as default, silences notifications by default

### 6. Ad-Hoc Schedule Changes (P2)

- **What:** Flag schedule changes on specific days (extra guests, skip day, time change, etc.)
- **Where:** `components/hub/schedule-change-flag.tsx`, built into `weekly-meal-board.tsx`
- **DB:** `hub_schedule_changes` table
- **Key features:** 7 change types with icons, inline form on hover, acknowledge/resolve workflow for chef, amber badges for unacknowledged changes, system message on post

## Design Decisions

1. **No approval gates.** The chef is a trusted professional. The meal board is communication, not a sign-off system. The menu approval spec was deferred to P3/backlog.

2. **Meals tab is a first-class citizen.** Added to baseTabs (always visible), not conditional. In residency mode it becomes the default landing tab.

3. **Minimal interaction for the client.** Open link, see meals, tap thumbs up/down, close. No login required (token-based auth). No forms to fill out. No approvals to give.

4. **Household members live under the profile, not the group.** A family's dietary needs follow them across circles. The aggregated summary on the Members tab gives the chef a single view of all dietary constraints.

5. **Schedule changes are flags, not chat messages.** They appear on the specific day they affect, not buried in a chat thread. The chef sees amber alerts on affected days and can acknowledge/resolve them.

## Database Migrations

| Timestamp      | Table                    | Purpose                                    |
| -------------- | ------------------------ | ------------------------------------------ |
| 20260401000123 | hub_meal_board           | Core meal entries                          |
| 20260401000124 | hub_meal_feedback        | Per-meal reactions                         |
| 20260401000125 | hub_household_members    | Per-person dietary tracking                |
| 20260401000127 | hub_meal_templates       | Saved weekly patterns                      |
| 20260401000128 | hub_group_residency_mode | Circle mode settings (ALTER on hub_groups) |
| 20260401000129 | hub_schedule_changes     | Schedule change flags                      |

All migrations are additive. No drops, no alters to existing columns.

## Files Modified

- `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` - Added meals tab, default tab support
- `app/(public)/hub/g/[groupToken]/page.tsx` - Added getMealBoard to data fetch
- `app/(client)/my-hub/g/[groupToken]/page.tsx` - Same as above
- `lib/hub/types.ts` - Added MealBoardEntry, MealFeedback, and related types
- `components/hub/hub-member-list.tsx` - Added household dietary summary card
- `components/hub/hub-group-settings.tsx` - Added residency mode settings

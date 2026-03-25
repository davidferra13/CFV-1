# Tasting Menu Bridge

**Date:** 2026-03-24
**Status:** Migration pending (code complete, needs `drizzle-kit push`)

## Problem

The tasting menu system (`tasting_menus` + `tasting_menu_courses`) was completely disconnected from the main menu engine (`menus` > `dishes` > `components`). Tasting menus had no event linking, no client linking, and were invisible to all intelligence features: cost breakdown, margin alerts, allergen checks, repeat detection, dish indexing, menu engineering, the what-if simulator, and the approval workflow.

## Solution: Materialization Bridge

When a tasting menu is linked to an event, the bridge materializes its courses as real `dishes` + `components` rows in the main model. The tasting menu tables remain the source of truth for editing (wine pairings, portion sizes, prep notes). The materialized rows are a read projection for the intelligence engine.

### Architecture

```
tasting_menus ──(event_id)──> events
      │
      ├── materialized_menu_id ──> menus (shadow)
      │                              ├── dishes (synced from courses)
      │                              │     └── components (synced from recipe links)
      │                              └── [all intelligence features work automatically]
      │
      └── tasting_menu_courses (source of truth for editing)
```

### Migration

File: `database/migrations/20260401000100_tasting_menu_bridge.sql`

Adds:

- `tasting_menus.event_id` (FK to events)
- `tasting_menus.materialized_menu_id` (FK to menus)
- `dishes.source_tasting_course_id` (FK to tasting_menu_courses)
- `components.source_tasting_course_id` (FK to tasting_menu_courses)

All additive. No drops or destructive changes.

### New Files

- `lib/menus/tasting-menu-bridge.ts` - Internal bridge module (not `'use server'`). Contains:
  - `syncTastingMenuToEngine()` - Full sync: creates shadow menu, syncs all courses
  - `syncSingleCourse()` - Delta sync for individual course changes
  - `removeMaterializedDish()` - Cleans up dish when a course is deleted
  - `deleteMaterializedMenu()` - Removes the entire shadow menu

### New Server Actions

Added to `lib/menus/tasting-menu-actions.ts`:

- `linkTastingMenuToEvent(tastingMenuId, eventId)` - Links tasting menu to event, triggers full sync
- `unlinkTastingMenuFromEvent(tastingMenuId)` - Unlinks and deletes materialized menu

### Hooks on Existing Actions

All hooks are non-blocking (wrapped in try/catch, failures logged but don't block the main operation):

| Action              | Sync Behavior                                                          |
| ------------------- | ---------------------------------------------------------------------- |
| `addCourse`         | If materialized, syncs the new course as a dish                        |
| `updateCourse`      | If materialized, syncs changes to the corresponding dish               |
| `removeCourse`      | If materialized, deletes the corresponding dish before course deletion |
| `reorderCourses`    | If materialized, updates course_number/sort_order on dishes            |
| `updateTastingMenu` | If name changed and materialized, updates shadow menu name             |
| `deleteTastingMenu` | Cleans up materialized menu before deleting tasting menu               |

### What This Unlocks (Zero Downstream Changes)

Once materialized, the shadow menu automatically participates in:

- Cost breakdown (`getMenuBreakdown`)
- Margin alerts (`checkMenuMargins`)
- Allergen checks (components > recipes > ingredients)
- Repeat detection (`checkRepeatMenu`)
- Dish indexing (`indexDishesFromMenu`)
- Menu engineering (Star/Plowhorse/Puzzle/Dog)
- What-if simulator
- Approval workflow (draft > shared > locked FSM)
- Menu history logging

### Field Mapping

| tasting_menu_courses | dishes                               |
| -------------------- | ------------------------------------ |
| `course_number`      | `course_number`, `sort_order`        |
| `course_type` (enum) | `course_name` (human-readable label) |
| `dish_name`          | `name`                               |
| `description`        | `description`                        |
| `prep_notes`         | `chef_notes`                         |
| `recipe_id`          | component's `recipe_id`              |

Wine pairings and portion sizes stay on the tasting menu tables only (no column in dishes).

### Bug Fix (Same Session)

Also fixed `menu-history-actions.ts::autoLogMenuFromEvent` which was querying `menu_items` (wrong table, engineering analysis) instead of `dishes` (actual menu builder). Now correctly follows event > menu_id > dishes path with tenant scoping.

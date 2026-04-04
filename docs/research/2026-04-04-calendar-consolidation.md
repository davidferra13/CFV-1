# Calendar System Consolidation

**Date:** 2026-04-04
**Agent:** Claude Opus 4.6 (Builder)
**Type:** Architecture consolidation (not a new feature)

## Problem

ChefFlow had **two competing calendar implementations**:

1. **`/calendar`** (custom grid) - 7 unified data types, filter panel, drag-to-reschedule, entry creation modal. Missing: time grid views, keyboard shortcuts, holiday overlay.

2. **`/schedule`** (FullCalendar) - Only 2 data types (events + inquiry holds). Had: time grid week/day views, keyboard shortcuts (M/W/D/A/T/N/arrows), mini calendar sidebar, US holiday overlay.

Chefs had to choose between data completeness (`/calendar`) and interaction quality (`/schedule`). Neither system showed the other's data.

## Solution

Consolidated into a single `/calendar` route that combines:

- **FullCalendar rendering** (month/week/day/agenda views, time grids, keyboard shortcuts)
- **Unified data model** (7 types: events, prep blocks, calls, availability blocks, waitlist, calendar entries, inquiries)
- **Filter panel** (8 toggleable categories, saved view presets)
- **Mini calendar sidebar** (quick date navigation)
- **US holiday overlay** (federal + cultural)
- **Drag-to-reschedule** (events only, validated by status)
- **Entry creation modal** (13 entry types)
- **Date detail panel** (click any date to see all items with color coding)

## Files Changed

| File                                              | Change                                                  |
| ------------------------------------------------- | ------------------------------------------------------- |
| `components/calendar/unified-calendar-view.tsx`   | **NEW** - Unified FullCalendar component                |
| `app/(chef)/calendar/page.tsx`                    | Rewritten to use UnifiedCalendarView via dynamic import |
| `app/(chef)/calendar/unified-calendar-client.tsx` | **NEW** - Thin client wrapper for dynamic import        |
| `app/(chef)/schedule/page.tsx`                    | Replaced with redirect to `/calendar`                   |
| `components/navigation/nav-config.tsx`            | Updated `/schedule` references to `/calendar`           |
| `lib/scheduling/actions.ts`                       | Added `revalidatePath('/calendar')` to rescheduleEvent  |

## Files NOT Changed (Intentionally Preserved)

- `app/(chef)/calendar/week/page.tsx` - Week planner (has weather, prep blocks by event, unique layout)
- `app/(chef)/calendar/day/page.tsx` - Day view (time slots, weather)
- `app/(chef)/calendar/year/page.tsx` - Year heatmap (52-week density grid)
- `components/scheduling/calendar-view.tsx` - Still importable but no longer used by any route
- `lib/scheduling/actions.ts` - getCalendarEvents still exists (used by other components)

## What This Does NOT Do

- No new database tables
- No new data model
- No new features
- No changes to the week/day/year sub-views (they stay as specialized views)
- No removal of old components (they can be cleaned up later)

## Keyboard Shortcuts

| Key    | Action             |
| ------ | ------------------ |
| T      | Today              |
| M      | Month view         |
| W      | Week view          |
| D      | Day view           |
| A      | Agenda view        |
| N      | New entry          |
| Arrows | Navigate prev/next |

## Data Flow

```
Server (getUnifiedCalendar) -> 7 parallel DB queries -> UnifiedCalendarItem[]
  |
  v
Client (UnifiedCalendarView)
  |-> CalendarFilters (client-side filtering)
  |-> toFullCalendarEvent() conversion
  |-> FullCalendar renders month/week/day
  |-> Holiday overlay (pure client-side date math)
  |-> Detail panel on date click
  |-> Drag-to-reschedule -> rescheduleEvent server action
  |-> Entry creation -> CalendarEntryModal -> server action -> refetch
```

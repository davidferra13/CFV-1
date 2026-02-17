# Phase 13: Scheduling Engine & Default Operating Procedures

## What Changed

Phase 13 adds the **Scheduling Engine** — a system that computes day-of timelines, tracks Default Operating Procedures (DOPs), generates progressive prep prompts, and provides a weekly schedule overview. It also introduces **Chef Preferences** as persistent per-chef configuration.

## Files Created

### Database
- **`supabase/migrations/20260216000001_layer_5_scheduling.sql`** — Layer 5 migration
  - `chef_preferences` table (1:1 with chefs): home address, default stores, timing defaults, DOP preferences
  - `travel_time_minutes INTEGER DEFAULT 30` added to events
  - RLS policies for chef_preferences (select/insert/update scoped to own chef record)
  - Auto-update trigger for `updated_at`

### Types
- **`lib/scheduling/types.ts`** — All scheduling type definitions
  - `ChefPreferences`, `SpecialtyStore`, `DEFAULT_PREFERENCES`
  - `TimelineItem`, `EventTimeline`, `RouteStop`
  - `DOPTask`, `DOPSchedule`, `DOPPhase`
  - `PrepPrompt`, `SchedulingEvent`, `WeekDay`, `WeekSchedule`

### Pure Engines (no DB calls)
- **`lib/scheduling/timeline.ts`** — Backwards-from-arrival timeline generation
  - Calculates: arrival → departure → car packed → finish prep → start prep → shopping → wake
  - `estimatePrepMinutes()` — 15 min per menu component, min 90, max 240
  - `buildRoute()` — home → grocery → liquor → specialty stores → client
  - Warnings for early wake times and tight timelines

- **`lib/scheduling/dop.ts`** — DOP schedule with standard/compressed variants
  - 5 phases: atBooking, dayBefore, morningOf, preDeparture, postService
  - Standard timeline (48+ hours out) vs compressed (<48 hours)
  - `getDOPProgress()` — returns { completed, total } from event boolean flags

- **`lib/scheduling/prep-prompts.ts`** — Time-aware preparation nudges
  - Prompt rules at 5+ days, 48h, 24h, morning-of, and overdue
  - Sorted by urgency: overdue → actionable → upcoming
  - Each prompt has urgency level, action URL, and contextual message

### Server Actions
- **`lib/scheduling/actions.ts`** — Data fetching layer feeding pure engines
  - `getEventTimeline(eventId)`, `getEventDOPSchedule(eventId)`, `getEventDOPProgress(eventId)`
  - `getAllPrepPrompts()`, `getTodaysSchedule()`, `getWeekSchedule(weekOffset)`
  - `updateEventTravelTime(eventId, minutes)`
  - Uses `mapEventToScheduling()` explicit field mapper to handle missing generated types

- **`lib/chef/actions.ts`** — Chef preferences CRUD
  - `getChefPreferences()` — returns preferences with sensible defaults if none exist
  - `updateChefPreferences(input)` — upsert with Zod validation
  - Uses `fromChefPreferences()` type assertion helper for ungenerated table type

### UI Components
- **`components/scheduling/timeline-view.tsx`** — Day-of timeline display with route plan
- **`components/scheduling/dop-view.tsx`** — DOP status view + compact progress bar
- **`components/scheduling/prep-prompts-view.tsx`** — Grouped prep prompts by urgency
- **`components/scheduling/weekly-schedule-view.tsx`** — 7-day grid with week navigation
- **`components/settings/preferences-form.tsx`** — Full preferences form (home, stores, timing, DOPs)

### Pages
- **`app/(chef)/settings/page.tsx`** — Settings page
- **`app/(chef)/events/[id]/schedule/page.tsx`** — Event schedule (timeline + DOP)
- **`app/(chef)/schedule/page.tsx`** — Weekly schedule overview

## Files Modified

- **`app/(chef)/dashboard/page.tsx`** — Added today's schedule card, prep prompts section, weekly view link
- **`app/(chef)/events/[id]/page.tsx`** — Added DOP progress bar, schedule link button
- **`components/navigation/chef-nav.tsx`** — Added Schedule and Settings nav items

## Architecture Decisions

### Pure Engine Pattern
The three computation engines (`timeline.ts`, `dop.ts`, `prep-prompts.ts`) are **pure functions** — they take data in, return results, and never touch the database. Server actions in `actions.ts` handle all DB queries and feed the engines. This makes the engines testable in isolation and keeps the data layer separate from business logic.

### Type Assertion Strategy
Since we can't regenerate `types/database.ts` without local Supabase (no Docker), all references to the new `chef_preferences` table and the new `travel_time_minutes` column use type assertions:
- `fromChefPreferences(supabase)` returns `any` for the new table
- `mapEventToScheduling()` uses explicit field mapping instead of spreads
- `updateEventTravelTime()` casts supabase to `any` for the update

These assertions should be removed once `types/database.ts` is regenerated after applying the Layer 5 migration.

### Backwards-From-Arrival Timeline
The timeline works backwards from `arrival_time`, not forwards from wake time. This ensures the chef's on-site time is the anchor, and everything else fits around it. If the calculated wake time is unreasonably early, a warning is generated rather than adjusting the timeline.

### Standard vs Compressed DOPs
Events booked 48+ hours out get the full DOP flow (day-before shopping, morning-of prep). Events booked <48 hours get a compressed variant that merges phases. The system detects this automatically from the event date relative to current time.

### Weekly Burnout Warnings
The weekly schedule view detects back-to-back event days without prep days between them, and flags weeks with 4+ events as heavy schedules. These are surfaced as amber warning cards.

## How It Connects

```
Dashboard
  ├── Today's Schedule card → timeline-view.tsx → timeline.ts
  ├── Prep Prompts card → prep-prompts-view.tsx → prep-prompts.ts
  └── "Weekly View" link → /schedule

Event Detail (/events/[id])
  ├── DOP Progress Bar → dop-view.tsx → dop.ts
  └── "Schedule" link → /events/[id]/schedule
        ├── Timeline → timeline-view.tsx → timeline.ts
        └── DOP Status → dop-view.tsx → dop.ts

Weekly Schedule (/schedule)
  └── weekly-schedule-view.tsx → actions.ts → getWeekSchedule()

Settings (/settings)
  └── preferences-form.tsx → chef/actions.ts → chef_preferences table
```

## Data Flow

```
DB (events + menus + dishes + chef_preferences)
  ↓ server actions fetch + map
SchedulingEvent + ChefPreferences
  ↓ pure engines compute
EventTimeline / DOPSchedule / PrepPrompt[] / WeekSchedule
  ↓ React components render
UI (cards, timelines, progress bars, grids)
```

## Migration Notes

- Layer 5 migration must be applied before chef preferences or travel time features work at runtime
- The `travel_time_minutes` column defaults to 30 and is nullable
- `chef_preferences` defaults are handled in code (`DEFAULT_PREFERENCES`) so the table row is optional
- RLS policies scope chef_preferences to the chef's own record via `get_chef_id_for_user()`

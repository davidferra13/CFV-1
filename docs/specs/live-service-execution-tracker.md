# Live Service Execution Tracker

> Build Spec | Calendar System Gap: Sections 6, 9, 13 (Execution Layer)
> Status: Ready to build
> Priority: P1 (last major missing system in Calendar spec)
> Risk: Low (fully additive, no breaking changes)

---

## Problem

ChefFlow has no live course-by-course tracking during event service. The `in_progress` FSM state exists but the chef has no way to:

- Track which course is firing, which is served, which is queued
- Capture actual timing per course (fired_at, served_at)
- Compare planned vs actual timing after the event
- Feed real execution data into the post-event learning system (AAR)

The existing `ServiceTimelinePanel` (`components/ai/service-timeline-panel.tsx`) generates a suggested timeline via AI but does not track live execution.

---

## Solution

A deterministic course progression tracker that:

1. Auto-initializes from the event's menu dishes (using `course_number` + `course_name` from `menu_dishes`)
2. Lets the chef advance courses through states: `queued` > `firing` > `served` (or `skipped`)
3. Captures timestamps at each transition
4. Shows elapsed time per course and total service duration
5. Surfaces on the event detail page only when `status === 'in_progress'`

---

## Data Model

### New table: `event_course_progress`

```sql
CREATE TABLE IF NOT EXISTS event_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  menu_dish_id UUID REFERENCES menu_dishes(id) ON DELETE SET NULL,
  course_name TEXT NOT NULL,
  course_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'firing', 'served', 'skipped')),
  planned_time TEXT,
  fired_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_progress_event ON event_course_progress(event_id);
CREATE INDEX idx_course_progress_tenant ON event_course_progress(tenant_id);

-- Prevent duplicate courses per event
CREATE UNIQUE INDEX idx_course_progress_event_order
  ON event_course_progress(event_id, course_order);
```

### Migration file

**Name:** `database/migrations/20260425000003_event_course_progress.sql`

(Timestamp is strictly higher than existing `20260425000002_ticketed_events_share_settings.sql`)

---

## Server Actions

### File: `lib/service-execution/actions.ts`

Mark as `'use server'`. All functions require `requireChef()` and tenant scoping.

#### `getCourseProgress(eventId: string): Promise<CourseProgress[]>`

- Query `event_course_progress` WHERE `event_id` = eventId AND `tenant_id` = user.tenantId
- Order by `course_order ASC`
- Return array (may be empty if not initialized)

#### `initializeCourseProgress(eventId: string): Promise<CourseProgress[]>`

- First check: if rows already exist for this event, return them (idempotent)
- Query `menu_dishes` joined through `menus` WHERE `menus.event_id` = eventId
- Order by `course_number ASC, sort_order ASC`
- Group by `course_number` + `course_name` (one progress row per course, not per dish)
- Insert rows into `event_course_progress` with status `'queued'`
- If no menu dishes found, return empty array (do not error)
- Return the newly created rows
- Revalidate `/events/[eventId]`

**Grouping logic:** Multiple dishes share the same course (e.g., course 1 = "Amuse-Bouche" might have 2 dishes). Create ONE progress row per unique `course_number`. Use the `course_name` from the first dish in that group. Store `course_order` = `course_number`.

#### `advanceCourseStatus(progressId: string, newStatus: 'firing' | 'served' | 'skipped'): Promise<CourseProgress>`

- Validate ownership (tenant_id check)
- Update the row:
  - If `newStatus === 'firing'`: set `fired_at = now()` (only if not already set)
  - If `newStatus === 'served'`: set `served_at = now()` (only if not already set)
  - Always set `status = newStatus`, `updated_at = now()`
- Revalidate `/events/[eventId]`
- Return updated row

#### `updateCourseNotes(progressId: string, notes: string): Promise<void>`

- Validate ownership
- Update `notes` and `updated_at`
- Non-blocking, no revalidation needed

### Types (in same file)

```typescript
export type CourseStatus = 'queued' | 'firing' | 'served' | 'skipped'

export type CourseProgress = {
  id: string
  event_id: string
  tenant_id: string
  menu_dish_id: string | null
  course_name: string
  course_order: number
  status: CourseStatus
  planned_time: string | null
  fired_at: string | null
  served_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
```

---

## UI Component

### File: `components/events/live-service-tracker.tsx`

Mark as `'use client'`.

#### Props

```typescript
type Props = {
  eventId: string
  initialCourses: CourseProgress[]
}
```

#### Behavior

1. On mount, if `initialCourses` is empty, call `initializeCourseProgress(eventId)` and set state
2. Render a vertical list of courses ordered by `course_order`
3. Each course row shows:
   - Course name (bold)
   - Status badge: `queued` (stone), `firing` (amber, pulsing), `served` (emerald), `skipped` (stone/strikethrough)
   - Timing: if `fired_at`, show "Fired at HH:MM". If `served_at`, show "Served at HH:MM". If both, show elapsed (e.g., "12 min").
   - Action button:
     - `queued` > shows "Fire" button (amber)
     - `firing` > shows "Served" button (emerald) and "Skip" button (ghost)
     - `served` or `skipped` > no action buttons (done)
4. At the top: show overall progress (e.g., "3 of 6 courses served")
5. At the top: show total service elapsed time (from first `fired_at` to now, updating every 30 seconds via `setInterval`)
6. Use `startTransition` for status updates with try/catch + toast on error (Zero Hallucination Rule)
7. If no menu is attached (initialCourses stays empty after init), show: "No menu attached to this event. Add a menu to track service progression."

#### Visual Design

- Use existing `Card`, `Button`, `Badge` components
- Amber pulsing dot for "firing" status (CSS animation, `animate-pulse` from Tailwind)
- Compact layout suitable for mobile (chef will use phone during service)
- Button hit targets minimum 44px (touch-friendly)

---

## Integration Point

### File: `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`

Add the `LiveServiceTracker` component to the Ops tab, visible ONLY when `event.status === 'in_progress'`.

**Placement:** At the TOP of the Ops tab content (before staff panel, before temp logs). This is the primary view during active service.

**Data loading:** In `app/(chef)/events/[id]/page.tsx`, add to the existing `Promise.all` block:

```typescript
// Only fetch for in_progress events
event.status === 'in_progress' ? getCourseProgress(params.id).catch(() => []) : Promise.resolve([])
```

Pass the result as `courseProgress` prop to `EventDetailOpsTab`, which passes it to `LiveServiceTracker`.

---

## What NOT to Do

- Do NOT modify the event FSM or state machine
- Do NOT modify `menu_dishes` table or any existing tables
- Do NOT add AI/Ollama calls (this is deterministic)
- Do NOT add offline mode or service workers
- Do NOT modify `types/database.ts` (it is auto-generated)
- Do NOT run `drizzle-kit push`
- Do NOT create course progress rows for events that are not `in_progress`
- Do NOT delete or modify any existing components
- Do NOT add exports from `@ts-nocheck` files

---

## Files to Create

1. `database/migrations/20260425000003_event_course_progress.sql`
2. `lib/service-execution/actions.ts`
3. `components/events/live-service-tracker.tsx`

## Files to Modify

1. `app/(chef)/events/[id]/page.tsx` - add `getCourseProgress` to Promise.all, pass to ops tab
2. `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx` - accept + render `LiveServiceTracker`

---

## Verification Criteria

1. `npx tsc --noEmit --skipLibCheck` passes
2. `npx next build --no-lint` passes
3. Navigating to an `in_progress` event shows the tracker in the Ops tab
4. Clicking "Fire" advances a course to `firing` with timestamp
5. Clicking "Served" advances a course to `served` with timestamp
6. Elapsed time displays correctly between fired and served
7. Overall progress counter updates correctly
8. Empty state shows when no menu is attached
9. Initializing is idempotent (refreshing page does not duplicate courses)

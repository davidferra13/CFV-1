# Spec: Staff Operations Unified Workflow

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5-7 files)

## Timeline

| Event         | Date             | Agent/Session      | Commit |
| ------------- | ---------------- | ------------------ | ------ |
| Created       | 2026-03-31 23:30 | Planner (Opus 4.6) |        |
| Status: ready | 2026-03-31 23:30 | Planner (Opus 4.6) |        |

---

## Developer Notes

### Raw Signal

Developer revisited screenshots from a conversation with Evan Mancini, a restaurant owner friend. Evan uses Toast (POS) and Sling (scheduling/tasks) to run his restaurant.

> "We have looked at these pictures a long time ago, and we have built functions around them as feedback a long time ago, but now I'm revisiting them as if they were fresh. I would like you to tell me what we can do with this feedback that can help us even further. How can we use this feedback for our advantage? Because I know that there's still points of leverage that we can use. I know there are still things that we can do. I know that we've built this website around private chefs, and this is my friend that owns a restaurant. I also just need to figure out what we should be doing, and we need to understand that the infrastructure is already really well built, and we have a lot of things we might be asking for. We just need to make sure that they're fine-tuned and polished and figure out what is missing."

Evan's specific feedback:

- Toast is "pretty good" but he wishes he could "do more from the app"
- His #1 complaint: can't manage employees or assign tasks in Toast
- Uses Sling separately for scheduling and to-do/task assignment
- Running two disconnected apps to operate one restaurant

Developer's framing: The infrastructure IS built. The question is what's unpolished, what's disconnected, and where are the leverage points we haven't exploited.

### Developer Intent

- **Core goal:** Turn ChefFlow's existing staff features from a collection of independent pages into a cohesive, unified workflow that's obviously better than Toast + Sling combined.
- **Key constraints:** Don't rebuild. Polish what exists, connect what's disconnected, fill only the gaps that matter most. Infrastructure is solid; the problem is workflow cohesion and UX friction.
- **Motivation:** Real user feedback from a restaurant owner confirms ChefFlow already solves the exact pain points Evan described. But nobody has walked the end-to-end journey to make sure it feels like one system instead of seven separate pages.
- **Success from the developer's perspective:** A chef can schedule staff for an event, assign prep tasks in the same flow, and staff members immediately see everything (tasks, events, context) in their portal. One app, one workflow, zero fragmentation.

---

## What This Does (Plain English)

This spec unifies ChefFlow's existing staff management features into a cohesive workflow. Today, a chef who wants to prepare staff for an event must visit 3+ separate pages: schedule staff, create tasks, check availability. Staff members see tasks with no event context and receive no notifications. After this spec, the chef gets a single "Event Staffing" flow (schedule + assign tasks + see availability in one place), tasks automatically link to events so staff see the full context ("Prep mise en place for the Thompson dinner, 6 guests, nut allergy"), and staff get notified when new tasks or schedule changes happen.

---

## Why It Matters

Competitive research shows no private chef tool has staff management at all (Traqly, Private Chef Manager, PCO, Modernmeal, WorkQuote all have zero). Restaurant scheduling tools (7shifts, Sling, HotSchedules, Homebase) are all location-locked and shift-based. ChefFlow is the only platform that can do event-based staff scheduling where assignments carry full context (client, location, menu, dietary restrictions, equipment). But the current UX is fragmented across 7+ disconnected pages, so the advantage is invisible. This spec makes it visible.

---

## Files to Create

| File | Purpose                                                              |
| ---- | -------------------------------------------------------------------- |
| None | This spec modifies existing files only. No new pages, no new tables. |

---

## Files to Modify

| File                                      | What to Change                                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/events/event-staff-panel.tsx` | Add inline task creation: after assigning staff, chef can create tasks for that person directly from the event detail page. Tasks auto-populate event_id.                            |
| `lib/staff/staff-portal-actions.ts`       | Update `getMyTasks()` and `getMyTasksGroupedByDate()` to join tasks with events (via event_id) and return event name, date, client name, and location alongside each task.           |
| `app/(staff)/staff-tasks/page.tsx`        | Display event context on each task card: "For: Thompson Dinner (Sat Mar 28, 6 guests)" when event_id is present. Group tasks by event when multiple tasks share the same event.      |
| `app/(staff)/staff-dashboard/page.tsx`    | Update "Today's Tasks" widget to show event context. Add "Upcoming Events" section that combines event_staff_assignments with associated tasks into a unified view.                  |
| `lib/notifications/triggers.ts`           | Fix `notifyTaskAssigned()`: send notification to the assigned staff member, not the chef. Add `notifyScheduleChange()` for when a staff member is added to or removed from an event. |

---

## Database Changes

None. All required columns already exist:

- `tasks.event_id` - already nullable FK to events (verified: migration `20260324000001_restaurant_ops_foundation.sql` creates the `tasks` table)
- `tasks.assigned_to` - already references `staff_members(id)`
- `event_staff_assignments` - already links staff to events
- `staff_members` - already has full contact info for notifications

The only change is that the application code starts **using** `event_id` consistently when creating tasks from the event staff panel, and **joining** on it when displaying tasks in the staff portal.

---

## Data Model

No schema changes. The existing relationships are:

```
events (1) --< event_staff_assignments (many) >-- (1) staff_members
events (1) --< tasks (many) >-- (1) staff_members (via assigned_to)
```

Tasks created from the event staff panel will populate `tasks.event_id` to link them. Tasks created from the standalone `/tasks` page remain unlinked (event_id = null) which is fine for general operational tasks.

---

## Server Actions

| Action                                                                                                            | Auth             | Input                                                                                          | Output                                                                     | Side Effects                                               |
| ----------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `createTaskFromEvent(input)` (new helper in `lib/tasks/actions.ts`)                                               | `requireChef()`  | `{ title, description?, assigned_to, event_id, due_date?, due_time?, priority?, station_id? }` | `{ success: boolean, id?: string, error?: string }`                        | Revalidates `/tasks`, triggers `notifyStaffTaskAssigned()` |
| `getMyTasksWithEventContext()` (modify existing in `lib/staff/staff-portal-actions.ts`)                           | `requireStaff()` | `{ date?: string }`                                                                            | `Task[]` with joined `event_name`, `event_date`, `client_name`, `location` | None                                                       |
| `notifyStaffTaskAssigned(staffMemberId, taskTitle, eventName?, dueDate)` (fix in `lib/notifications/triggers.ts`) | Internal         | staff member ID + task details                                                                 | void                                                                       | Creates notification for staff member (not chef)           |
| `notifyStaffScheduleChange(staffMemberId, eventName, changeType)` (new in `lib/notifications/triggers.ts`)        | Internal         | staff member ID + event + "added"/"removed"                                                    | void                                                                       | Creates notification for staff member                      |

---

## UI / Component Spec

### Event Staff Panel Enhancement (`components/events/event-staff-panel.tsx`)

**Current state:** Chef sees a list of assigned staff with role, hours, and remove button.

**New state:** Below each assigned staff member, add a collapsible "Tasks" section:

- Shows existing tasks for this staff member on this event (query by `event_id` + `assigned_to`)
- "Add Task" button opens an inline form (title, priority, due_time, optional notes)
- New tasks auto-populate `event_id` and `assigned_to` from context
- Task checkboxes show completion status (read-only for chef; staff completes in their portal)
- Small counter badge on each staff member row: "3 tasks (1 done)"

### Staff Tasks Page Enhancement (`app/(staff)/staff-tasks/page.tsx`)

**Current state:** Tasks grouped by date with checkboxes and progress bars.

**New state:** Tasks with `event_id` show an event context badge:

- Event name, date, guest count (from joined event data)
- Client dietary notes summary (if any critical allergies)
- Tasks for the same event grouped together under an event header
- Tasks without event_id display as they do today (general tasks)

### Staff Dashboard Enhancement (`app/(staff)/staff-dashboard/page.tsx`)

**Current state:** "Today's Tasks" count, "Upcoming Events" list, "My Stations" list.

**New state:** "Today's Tasks" cards include event name when linked. "Upcoming Events" section shows associated tasks inline: "Thompson Dinner (Sat) - 3 tasks (1 done)". This creates a unified "what do I need to do for each event" view.

### States

- **Loading:** Skeleton cards (existing pattern)
- **Empty:** "No tasks assigned yet" with friendly guidance (existing pattern)
- **Error:** DataError component with "Could not load tasks" (never show empty as if no tasks exist)
- **Populated:** Tasks with event context badges, grouped by event when applicable

### Interactions

- Chef adds task from event panel: optimistic insert with rollback on failure, toast confirmation
- Staff completes task: existing checkbox behavior (optimistic toggle + rollback + completion log)
- Notification delivery: non-blocking, failure logged but doesn't affect task creation

---

## Edge Cases and Error Handling

| Scenario                                                         | Correct Behavior                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Task created from event panel but event is later deleted         | Task persists with event_id pointing to deleted event. Query gracefully handles null join (show task without event badge). |
| Staff member removed from event but has tasks                    | Tasks remain assigned. Chef sees warning: "This staff member has X tasks for this event" before removal.                   |
| Notification delivery fails                                      | Non-blocking. Log warning. Task creation succeeds regardless.                                                              |
| Event has no staff assigned yet                                  | "Assign staff first" prompt in task section. Cannot create event-linked tasks without assigned staff.                      |
| Task has event_id but staff member is not assigned to that event | Allow it (chef may pre-assign tasks before formal scheduling). No validation gate.                                         |
| Staff portal loads but events query fails                        | Show tasks without event context (degrade gracefully, don't show error for the context portion).                           |

---

## Verification Steps

1. Sign in as chef (agent account). Navigate to any event detail page.
2. Assign a staff member to the event via the event staff panel.
3. Create a task for that staff member from the event staff panel inline form.
4. Verify: task appears in the panel with correct assignment.
5. Sign in as staff member (create staff login if needed). Navigate to staff dashboard.
6. Verify: "Today's Tasks" shows the task WITH event context (event name, date).
7. Navigate to `/staff-tasks`. Verify: task appears with event context badge.
8. Complete the task via checkbox. Verify: optimistic update works, completion persists on refresh.
9. Sign in as chef again. Verify: event staff panel shows updated task completion count.
10. Create a task from the standalone `/tasks` page (no event). Verify: it appears in staff portal without event context (graceful handling).
11. Screenshot all states.

---

## Out of Scope

- Recurring shift templates (separate spec, different complexity)
- Shift swap requests between staff (separate spec)
- Team announcements / broadcast messaging (separate spec)
- Tip tracking (not in V1 scope)
- Chef-side unified "command center" page that replaces the 7 separate staff pages (separate larger spec)
- Recurring task UI controls (the data model supports it, but exposing recurrence in the form is a separate spec)
- Real-time SSE updates for task completion (nice-to-have, not in this spec)
- Mobile-specific layout optimizations for staff portal (separate spec, CSS-only)

---

## Notes for Builder Agent

### What This Spec Does NOT Do

This spec does NOT reorganize the staff section navigation, does NOT add new pages, and does NOT create new database tables. It takes existing features and connects them. The work is surgical: add event context to task display, add inline task creation to the event panel, fix notification direction.

### Key File References

- **Task creation pattern:** See existing `createTask()` in `lib/tasks/actions.ts` for the Zod schema and DB insert pattern. The new `createTaskFromEvent()` is a thin wrapper that pre-populates `event_id`.
- **Event staff panel pattern:** See `components/events/event-staff-panel.tsx` for the existing staff assignment UI. New task section goes below each staff member row.
- **Notification pattern:** See `lib/notifications/triggers.ts` for existing notification functions. The fix is changing the recipient from chef to staff member in `notifyTaskAssigned()`.
- **Staff portal task display:** See `app/(staff)/staff-tasks/page.tsx` for existing task grouping. Add event context via a LEFT JOIN in the server action query.
- **Compat shim joins:** The DB compat layer (`lib/db/compat.ts`) supports joins. Use `.from('tasks').select('*, events(name, event_date, location)').eq(...)` pattern or raw SQL via the Drizzle connection.

### Pitfalls

1. **Do NOT create a new `staff_tasks` table.** Tasks for staff use the existing `tasks` table with `assigned_to` pointing to `staff_members(id)`. This is intentional.
2. **Do NOT break standalone task creation.** The `/tasks` page creates tasks without `event_id`. This must continue to work. `event_id` is nullable and that's correct.
3. **Notification fix must not break existing notification consumers.** The chef notification for task creation should be replaced with staff notification, not duplicated. Don't send to both.
4. **Event context in staff portal must degrade gracefully.** If the LEFT JOIN returns null event data (deleted event, or task without event_id), the task still displays normally without the event badge. Never crash on missing context.
5. **The event staff panel task section must not add network calls on initial render.** Lazy-load the task list when the user expands the section, or batch it with the existing staff assignment query.

### Research That Informs This Spec

Full competitive landscape report: `docs/research/staff-ops-competitive-landscape.md`

Key findings:

- No private chef tool has ANY staff management (Traqly, PCO, Modernmeal, WorkQuote: zero)
- Restaurant tools (7shifts, Sling, HotSchedules) are all location-locked, shift-based
- ChefFlow's unique advantage: event-based scheduling where tasks carry client/menu/dietary context
- 76% of operators want tech advantage but only 13% are satisfied (fragmentation problem)
- Staff want: schedule predictability, mobile access, real-time notifications, simple UI
- The "one app" consolidation trend is real and ChefFlow is already positioned for it

---

## Spec Validation (Planner Gate)

### 1. What exists today that this touches?

- **Event staff panel:** `components/events/event-staff-panel.tsx` - renders assigned staff list with role/hours/remove actions. Uses `getEventStaffRoster(eventId)` from `lib/staff/actions.ts`.
- **Tasks system:** `lib/tasks/actions.ts` - CRUD for tasks table. `tasks` table created in `database/migrations/20260324000001_restaurant_ops_foundation.sql` with columns: id, chef_id, title, description, assigned_to, station_id, event_id, due_date, due_time, priority, status, notes, recurring_rule, completed_at, created_at.
- **Staff portal tasks:** `app/(staff)/staff-tasks/page.tsx` - groups tasks by date, shows checkboxes. Calls `getMyTasksGroupedByDate()` from `lib/staff/staff-portal-actions.ts`.
- **Staff portal dashboard:** `app/(staff)/staff-dashboard/page.tsx` - shows today's task count, upcoming events, stations.
- **Notifications:** `lib/notifications/triggers.ts` - has `notifyTaskAssigned()` which currently notifies the chef (bug: should notify staff).

### 2. What exactly changes?

- **ADD** to `components/events/event-staff-panel.tsx`: collapsible task section per staff member with inline task creation form
- **ADD** to `lib/tasks/actions.ts`: `createTaskFromEvent()` wrapper that pre-populates event_id and triggers staff notification
- **MODIFY** `lib/staff/staff-portal-actions.ts`: `getMyTasksGroupedByDate()` LEFT JOINs events table to return event context
- **MODIFY** `app/(staff)/staff-tasks/page.tsx`: render event context badge when event data is present
- **MODIFY** `app/(staff)/staff-dashboard/page.tsx`: show event name in today's tasks widget
- **FIX** `lib/notifications/triggers.ts`: `notifyTaskAssigned()` sends to staff member, not chef. Add `notifyStaffScheduleChange()`.

### 3. What assumptions am I making?

- **Verified:** `tasks.event_id` column exists as nullable FK (read migration `20260324000001`)
- **Verified:** `tasks.assigned_to` references staff_members (read migration `20260324000001`)
- **Verified:** `event_staff_assignments` links events to staff (read migration `20260303000005`)
- **Verified:** Staff portal uses `requireStaff()` auth (read `app/(staff)/staff-tasks/page.tsx`)
- **Verified:** Notification triggers exist in `lib/notifications/triggers.ts` (read file)
- **Assumption (unverified):** The compat shim supports LEFT JOIN syntax for the event context query. If not, raw SQL via Drizzle is the fallback. Builder should verify `lib/db/compat.ts` join support before starting.

### 4. Where will this most likely break?

1. **The LEFT JOIN query in staff portal actions.** If the compat shim doesn't support nested select joins, the builder will need to write raw SQL. This is the most likely friction point.
2. **Notification recipient change.** If other code depends on the chef receiving task-assigned notifications, changing the recipient could break that expectation. Builder must search for all callers of `notifyTaskAssigned()`.

### 5. What is underspecified?

- The exact UI layout of the inline task form in the event staff panel (builder should match existing task form patterns from `/tasks` page).
- Whether task completion count on the event staff panel updates in real-time or on page refresh (spec says no SSE, so refresh is fine).

### 6. What dependencies or prerequisites exist?

None. All tables, columns, and base features already exist. This spec is purely additive application-layer work.

### 7. What existing logic could this conflict with?

- `notifyTaskAssigned()` is called from `createTask()` in `lib/tasks/actions.ts`. Changing who it notifies could surprise code that expects chef notification. Builder must audit all callers.
- The event staff panel currently has a clean staff-only view. Adding a task section increases its complexity. Builder must ensure it doesn't break the assignment/removal workflow.

### 8. What is the end-to-end data flow?

**Chef creates task from event:**
Chef clicks "Add Task" on event staff panel -> fills inline form (title, priority, due_time) -> calls `createTaskFromEvent({ title, assigned_to: staffId, event_id: eventId, ... })` -> INSERT into `tasks` with event_id populated -> `notifyStaffTaskAssigned(staffMemberId, title, eventName, dueDate)` fires (non-blocking) -> revalidatePath -> UI shows new task in panel

**Staff views task with context:**
Staff opens `/staff-tasks` -> page calls `getMyTasksWithEventContext()` -> query: `SELECT tasks.*, events.name as event_name, events.event_date, clients.business_name as client_name FROM tasks LEFT JOIN events ON tasks.event_id = events.id LEFT JOIN clients ON events.client_id = clients.id WHERE tasks.assigned_to = $staffMemberId` -> page renders task cards with event context badge when event data present

### 9. What is the correct implementation order?

1. Fix `notifyTaskAssigned()` direction in `lib/notifications/triggers.ts` (smallest change, immediate value)
2. Add `createTaskFromEvent()` to `lib/tasks/actions.ts`
3. Update `getMyTasksGroupedByDate()` in `lib/staff/staff-portal-actions.ts` with event JOIN
4. Update `app/(staff)/staff-tasks/page.tsx` to render event context
5. Update `app/(staff)/staff-dashboard/page.tsx` for event context in today's tasks
6. Add inline task section to `components/events/event-staff-panel.tsx` (most complex, do last)

### 10. What are the exact success criteria?

1. Chef can create a task for a staff member directly from the event detail page
2. Task is stored with `event_id` linking it to the event
3. Staff member's task list shows event name, date, and client for linked tasks
4. Staff member's dashboard shows event context on today's tasks
5. Notifications for task assignment go to the staff member, not the chef
6. Standalone task creation (no event) continues to work unchanged
7. Tasks without event context display normally (no crashes, no missing data)

### 11. What are the non-negotiable constraints?

- Auth: all chef actions require `requireChef()`, all staff actions require `requireStaff()`
- Tenant scoping: every query scoped by `chef_id` or `tenant_id`
- No new tables, no migrations
- Non-blocking notifications (failure must not prevent task creation)
- Graceful degradation when event context is unavailable

### 12. What should NOT be touched?

- `/tasks` page standalone task creation flow (must remain unchanged)
- `va_tasks` system (separate concern, separate table)
- `chef_todos` dashboard widget (personal todos, not staff tasks)
- `staff_schedules` table or scheduling pages (separate spec for recurring shifts)
- Staff portal navigation structure
- Any existing migration files

### 13. Is this the simplest complete version?

Yes. This spec does the minimum to create the connection between events and staff tasks. It doesn't reorganize navigation, doesn't add new pages, doesn't change data models. It adds event context to existing task display and adds inline task creation to an existing panel. Five files modified, zero files created, zero migrations.

### 14. If implemented exactly as written, what would still be wrong?

- Staff management is still scattered across 7 pages on the chef side (a unified command center is a separate larger spec)
- Recurring task and recurring shift UI is still missing (separate specs)
- No shift swap capability (separate spec)
- No team announcements (separate spec)
- No real-time task completion updates (chef must refresh to see progress)
- Mobile layout optimization for staff portal not addressed (CSS-only separate spec)

These are all real gaps, but each warrants its own spec. This spec is the highest-leverage, lowest-effort improvement: connecting what already exists.

### Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

Production-ready with one caveat: the compat shim's JOIN support needs builder verification before writing the event context query. If the shim doesn't support LEFT JOIN with nested selects, the builder should use raw SQL via the Drizzle connection (`db.execute(sql\`...\`)`). This is a known pattern in the codebase and not a blocker.

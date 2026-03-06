# Daily Ops Improvements - Implementation Plan

> **Goal:** A business owner opens the app in the morning and instantly knows where everything stands, what needs doing, who's doing what, and what fell through the cracks yesterday.

> **Branch:** `feature/daily-ops-improvements` (create when work begins)

---

## Phase 1: Task Carry-Forward (LOW effort, HIGH impact)

**Problem:** If a task wasn't completed yesterday, it's invisible unless you manually navigate back a day. Incomplete work silently disappears.

**What to build:**

1. **Auto-carry-forward logic in the task query**
   - When loading today's tasks (`/tasks`), also query all tasks from previous days where `status != 'done'` and `status != 'cancelled'`
   - These appear in a "Carried Over" section at the top, visually distinct (amber left border, "from [date]" badge)
   - Carried tasks keep their original assignee and priority

2. **Overdue badge on dashboard**
   - Dashboard task widget shows count of overdue/carried tasks
   - Red badge: "3 overdue tasks" linking to `/tasks` with overdue filter

3. **Daily Ops (`/daily`) integration**
   - Remy's daily plan generation checks for incomplete tasks from previous days
   - Surfaces them in the relevant swim lane with "Yesterday" or "Overdue" tag

**Files likely touched:**

- `app/(chef)/tasks/page.tsx` (query + UI)
- `lib/tasks/queries.ts` or equivalent server action
- `app/(chef)/dashboard/page.tsx` (overdue badge)
- `lib/ai/remy-actions.ts` (daily plan context)

**Acceptance criteria:**

- [ ] Incomplete tasks from any previous day appear on today's task board
- [ ] Visual distinction between today's tasks and carried-over tasks
- [ ] Dashboard shows overdue count
- [ ] Completing a carried-over task removes it from the carried section

---

## Phase 2: Shift Handoff Notes (MEDIUM effort, HIGH impact)

**Problem:** No place for a closing person to write "we ran out of salmon, walk-in thermostat acting up, wine delivery tomorrow." The ops log captures system actions but not human context.

**What to build:**

1. **Handoff notes table** (new migration)
   - `shift_handoff_notes` table: `id`, `tenant_id`, `author_id`, `shift` (opening/mid/closing), `date`, `content` (text), `pinned` (boolean), `created_at`
   - RLS: tenant-scoped read/write

2. **Handoff note entry UI**
   - Add a "Shift Notes" section to the Daily Ops Command Center (`/stations/daily-ops`)
   - Simple text area + shift selector (Opening / Mid / Closing) + "Post Note" button
   - Notes from previous shifts shown above the input, most recent first
   - "Pin" toggle for critical notes that should persist until manually unpinned

3. **Morning briefing integration**
   - Pinned notes and yesterday's closing notes appear prominently in the morning briefing (Phase 3)
   - Notification: when a closing note is posted, opening staff see it on their staff dashboard

**Files likely touched:**

- New migration file
- New server actions file: `lib/shifts/actions.ts`
- `app/(chef)/stations/daily-ops/page.tsx` (UI)
- `app/(staff)/staff-dashboard/page.tsx` (show notes)

**Acceptance criteria:**

- [ ] Staff/owner can write a free-form note tagged to a shift and date
- [ ] Previous shift's notes visible when opening the Daily Ops Command Center
- [ ] Pinned notes persist across days until manually unpinned
- [ ] Staff portal shows relevant handoff notes on their dashboard

---

## Phase 3: Morning Briefing View (MEDIUM effort, HIGHEST impact)

**Problem:** Information exists but it's scattered across 4-5 pages. No single "here's your day at a glance" view.

**What to build:**

1. **New route: `/briefing` (or enhance `/daily`)**
   - Single-scroll page, mobile-first, designed to be read in 60 seconds

2. **Sections (top to bottom):**

   **A. Yesterday's Recap (auto-generated)**
   - Events completed yesterday (count, names, revenue collected)
   - Tasks completed vs. missed (with missed tasks highlighted)
   - Inventory changes (items that hit 86, low stock alerts triggered)
   - Client communications received (unread inquiry count, messages)

   **B. Shift Handoff Notes (from Phase 2)**
   - Pinned notes (always on top)
   - Last closing shift notes
   - Highlighted if any notes are flagged urgent

   **C. Today's Events**
   - Timeline view of today's events (time, client, venue, guest count, dietary flags)
   - Per-event: prep status (% of prep tasks done), staff assigned, outstanding items
   - Tap to expand: full event details, menu, allergens

   **D. Today's Tasks**
   - Grouped by assignee (owner first, then staff)
   - Carried-over tasks from Phase 1 shown first with overdue badge
   - Quick-complete checkboxes inline

   **E. Staff Schedule**
   - Who's working today, what shift, what station
   - Unconfirmed schedules highlighted

   **F. Alerts & Action Items**
   - 86'd items
   - Expiring inventory (today/tomorrow)
   - Low stock below par
   - Unanswered inquiries (SLA timer)
   - Pending follow-ups (stale 3+ days)
   - Outstanding invoices / payments due

3. **"Good morning" entry point**
   - Dashboard greeting banner links to `/briefing`
   - Or: `/briefing` replaces the daily ops banner entirely

**Files likely touched:**

- New page: `app/(chef)/briefing/page.tsx`
- New server action: `lib/briefing/get-morning-briefing.ts` (aggregates all data)
- `app/(chef)/dashboard/page.tsx` (link/banner update)
- Nav config update

**Acceptance criteria:**

- [ ] Single page loads all sections in under 3 seconds
- [ ] Mobile-friendly (owner reads this on their phone walking into the kitchen)
- [ ] Yesterday's recap is fully automated (no manual input needed)
- [ ] Tapping any item navigates to the relevant detail page
- [ ] Works offline-first if possible (or graceful degradation)

---

## Phase 4: Event-Specific Pre-Service Checklist (MEDIUM effort, HIGH impact)

**Problem:** Task templates are generic (opening/closing). No auto-generated checklist for "tonight's Johnson dinner: these allergies, this menu, this equipment, this prep."

**What to build:**

1. **Auto-generated checklist per event**
   - When an event is in `confirmed` or `paid` status and its date is today or tomorrow, auto-generate a pre-service checklist
   - Pulls from: event menu items, dietary restrictions/allergies, guest count, equipment needs, venue details, staff assignments
   - Checklist items are concrete: "Confirm 2 guests are nut-free", "Prep 4 servings of risotto", "Pack immersion circulator", "Confirm venue access at 3pm"

2. **Checklist UI**
   - New tab or section on event detail page: "Pre-Service Checklist"
   - Also appears in the Morning Briefing (Phase 3) under each event
   - Checkboxes with assignee and time estimate
   - Auto-items (generated) vs. manual items (owner can add custom ones)

3. **Generation logic (Formula > AI)**
   - Deterministic first: menu items -> prep tasks, dietary flags -> verification tasks, equipment list -> pack tasks
   - Remy can suggest additional items only if the chef opts in
   - No AI required for the core checklist

**Files likely touched:**

- New: `lib/events/generate-pre-service-checklist.ts`
- `app/(chef)/events/[id]/page.tsx` (new tab/section)
- `components/events/pre-service-checklist.tsx`

**Acceptance criteria:**

- [ ] Checklist auto-generates from event data (no manual creation needed)
- [ ] Dietary restrictions and allergies are the FIRST items (safety-critical)
- [ ] Owner can add/remove custom checklist items
- [ ] Completion state persists (checked items stay checked)
- [ ] Visible in both event detail and morning briefing

---

## Phase 5: Cross-Day Prep Timeline (HIGHER effort, MEDIUM impact)

**Problem:** Multi-day prep (48-hour brine, overnight proof, reducing stock) has no timeline. The clipboard only tracks today.

**What to build:**

1. **Prep timeline entries** (new migration)
   - `prep_timeline` table: `id`, `tenant_id`, `title`, `description`, `start_at` (timestamp), `end_at` (timestamp), `station_id` (nullable), `event_id` (nullable), `status` (active/completed/missed), `alert_before_minutes` (default 30), `created_by`
   - RLS: tenant-scoped

2. **Timeline UI**
   - New section on station clipboard: "Active Prep Timers"
   - Shows items currently in progress with countdown ("Brine: 18h 42m remaining")
   - Items due today highlighted
   - Alert when an item is approaching its end time

3. **Creation flow**
   - From station clipboard: "Start Timed Prep" button (item name, start now or schedule, duration or end time)
   - From event detail: link prep timeline to specific event
   - From morning briefing: "Prep items completing today" section

4. **Notifications**
   - Push notification (or in-app) when a prep item is approaching completion
   - Morning briefing shows "Items completing today" with times

**Files likely touched:**

- New migration
- New: `lib/prep/actions.ts`, `lib/prep/queries.ts`
- `app/(chef)/stations/[id]/clipboard/page.tsx` (timer section)
- `components/stations/prep-timer.tsx`
- Morning briefing integration

**Acceptance criteria:**

- [ ] Can create a prep item with start/end spanning multiple days
- [ ] Active prep items visible on station clipboard with countdown
- [ ] Morning briefing shows items completing today
- [ ] Alert fires before completion time
- [ ] Completed items logged to ops log

---

## Phase 6: Yesterday's Recap Digest (builds on Phase 3)

**Problem:** No automated summary of what happened yesterday. The activity log is raw data, not a digest.

**What to build:**

1. **Digest generation** (deterministic, not AI)
   - Query yesterday's data: events completed, revenue, tasks done/missed, inventory changes, communications received, waste logged
   - Format into structured summary object

2. **Digest display**
   - Part of the Morning Briefing (Phase 3, Section A)
   - Also available as standalone: `/briefing/yesterday`
   - Optional: email digest sent at 6am (if chef enables it in settings)

3. **Key metrics in the digest:**
   - Events: completed count, total revenue, avg rating (if AAR submitted)
   - Tasks: X completed, Y missed/carried, Z by staff member breakdown
   - Inventory: items 86'd, waste logged (count + estimated value), deliveries received
   - Pipeline: new inquiries received, quotes sent, bookings confirmed
   - Finance: payments received, invoices sent, expenses logged

**Files likely touched:**

- New: `lib/briefing/generate-recap.ts`
- Morning briefing page (Phase 3)
- Optional: email trigger in daily cron or Supabase edge function

**Acceptance criteria:**

- [ ] Recap is 100% deterministic (Formula > AI)
- [ ] Covers all 5 metric categories
- [ ] Loads as part of morning briefing
- [ ] Shows "nothing to report" gracefully when a day was quiet

---

## Phase 7: Quick-Assign / Delegation Flow (LOWER priority)

**Problem:** Assigning tasks requires a full form. Owner walking in can't quickly swipe through unassigned items and flick them to staff.

**What to build:**

1. **Quick-assign modal**
   - On any unassigned task: tap the assignee area -> shows staff list -> one tap assigns
   - No full form, no page navigation

2. **Bulk assign from morning briefing**
   - "Unassigned tasks" section with staff avatars
   - Drag-and-drop (desktop) or tap-to-assign (mobile)

3. **Staff availability indicator**
   - Show who's scheduled today next to the assignment picker
   - Grey out staff not working today

**Files likely touched:**

- `components/tasks/quick-assign.tsx` (new component)
- Task list/board components
- Morning briefing page

**Acceptance criteria:**

- [ ] Assigning a task takes exactly 2 taps (tap task -> tap staff member)
- [ ] Only shows staff scheduled for today
- [ ] Assignment triggers notification to the staff member

---

## Phase 8: Real-Time Staff Activity Board (LOWEST priority, HIGHEST effort)

**Problem:** No live "who's doing what right now" view.

**What to build:**

1. **Activity heartbeat**
   - Staff portal sends periodic "I'm working on [task X] at [station Y]" updates
   - Could be implicit (based on task status changes, clipboard edits, check-ins) rather than explicit pings

2. **Live board UI**
   - New route: `/staff/live` or section in Daily Ops Command Center
   - Per staff member: name, current station, current task, time on task, last activity timestamp
   - Color coding: green (active in last 15min), yellow (idle 15-30min), grey (no activity 30min+)

3. **Supabase realtime subscription**
   - Subscribe to task completions, clipboard edits, check-ins
   - Update board in real-time without refresh

**Files likely touched:**

- New: `app/(chef)/staff/live/page.tsx`
- Supabase realtime subscription setup
- Staff portal: activity heartbeat integration

**Acceptance criteria:**

- [ ] Shows all on-duty staff with their current activity
- [ ] Updates in real-time (no manual refresh)
- [ ] Works on a wall-mounted tablet/screen (auto-refresh, no sleep)

---

## Implementation Order

| Phase | Feature                 | Effort | Impact  | Dependencies                 |
| ----- | ----------------------- | ------ | ------- | ---------------------------- |
| 1     | Task Carry-Forward      | Low    | High    | None                         |
| 2     | Shift Handoff Notes     | Medium | High    | None                         |
| 3     | Morning Briefing        | Medium | Highest | Better with 1 + 2 done first |
| 4     | Pre-Service Checklist   | Medium | High    | None                         |
| 5     | Cross-Day Prep Timeline | Higher | Medium  | None                         |
| 6     | Yesterday's Recap       | Low    | High    | Phase 3 (display surface)    |
| 7     | Quick-Assign Flow       | Medium | Medium  | None                         |
| 8     | Real-Time Staff Board   | High   | Medium  | None                         |

**Recommended approach:** Phases 1-2 first (independent, can be parallel). Then Phase 3 (ties everything together). Then 4-6 in any order. Phases 7-8 are quality-of-life, do last.

---

## What This Unlocks

When all 8 phases are done, the owner's morning looks like this:

1. **Walk in, open app** -> Morning Briefing loads
2. **60-second scan:** yesterday's recap, shift notes from closing crew, today's events with prep status, overdue tasks, alerts
3. **Quick-assign** any unassigned tasks to staff who just arrived
4. **Check prep timers** for anything completing soon
5. **Review event checklists** for today's events (allergies, equipment, menu)
6. **Staff check in** to their stations, tasks appear on their portal
7. **Throughout the day:** real-time board shows who's doing what
8. **End of day:** closing crew writes shift notes, incomplete tasks auto-carry to tomorrow

No gaps. No "what did we forget." No digging through 5 pages. One view, one flow.

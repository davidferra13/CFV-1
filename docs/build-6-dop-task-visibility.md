# Build 6: DOP Task Visibility + Smart Task Dashboard

**Branch:** `fix/grade-improvements`
**Status:** Complete
**Date:** 2026-02-20

---

## What Changed

### Problem Being Solved

ChefFlow's DOP (Default Operating Procedures) engine was fully functional under the hood — it computed exactly what tasks a chef needed to complete before, during, and after every event. But those tasks were **invisible on the dashboard**. A chef had to navigate into each individual event's schedule page to see what was pending. This was a significant UX blindspot: tasks silently went overdue because no single place showed the full picture.

Grade before: **C**. Grade after: **B+** (toward A as tasks accumulate real data).

---

## New Files

### `lib/scheduling/task-digest.ts`
**Server action** that aggregates all outstanding DOP tasks across every active/recent event into a single digest.

- Fetches events from 7 days ago → future (non-cancelled) — covers both upcoming tasks and post-service tasks
- For each event, runs `getDOPSchedule()` and collects all incomplete tasks
- Applies manual completions from `dop_task_completions` table in a single batch query (no N+1)
- Returns `DOPTaskDigest`: flat list of `DigestTask` objects with event context, sorted by urgency (overdue first) then event date

Key type:
```typescript
interface DigestTask {
  taskId, taskLabel, taskDescription, taskCategory
  isOverdue, deadline, phase
  eventId, eventOccasion, eventDate, clientName
  eventHref, scheduleHref
}
```

### `components/dashboard/dop-task-panel.tsx`
**Dashboard widget** that renders the DOP task digest as a card grouped by event.

- Overdue tasks: red background, red text, "Was due [time]" label
- Due-today tasks: amber phase badge
- Upcoming tasks: neutral stone styling
- `DOPTaskCheckbox` embedded — chef can mark tasks done directly from dashboard (optimistic UI)
- Shows up to 5 tasks per event, "+N more → Full schedule" link for the rest
- Empty state: green card with "All caught up" message

### `components/dashboard/accountability-panel.tsx`
**Extracted and enhanced accountability widget** that was previously rendered inline in the dashboard page.

- Shows: events completed this week, follow-ups sent (ratio), closed on time, receipts uploaded
- Closure streak with 🔥 milestone celebration (2+ in a row triggers display)
- Overdue follow-up alert banner with direct link
- Returns `null` when there's nothing to report (zero events this week, no streak, no overdue)

---

## Modified Files

### `lib/scheduling/dop-completions.ts`
Added `revalidatePath('/dashboard')` to `toggleDOPTaskCompletion` — so when a chef checks a task from anywhere (dashboard panel, event schedule, etc.), the dashboard's server state also revalidates on the next visit.

### `app/(chef)/dashboard/page.tsx`
- Added imports: `getDOPTaskDigest`, `DOPTaskPanel`, `AccountabilityPanel`
- Added `emptyDOPDigest` default constant
- Added `dopTaskDigest` to the `Promise.all()` batch (with `safe()` wrapper)
- Inserted `<DOPTaskPanel digest={dopTaskDigest} />` as Section 4.6, between the overdue follow-ups card and the prep prompts section
- Replaced 30 lines of inline weekly accountability JSX with `<AccountabilityPanel weeklyStats={...} closureStreak={...} overdueFollowUpCount={...} />`

---

## Architecture Notes

- **Pure computation preserved**: `getDOPSchedule()` in `lib/scheduling/dop.ts` remains untouched — it's still a pure function with no DB calls. The digest layer wraps it with DB fetching.
- **No N+1 queries**: completions are fetched in a single `.in('event_id', eventIds)` query for all events at once.
- **Tenant-scoped**: all queries include `.eq('tenant_id', user.tenantId!)`.
- **Graceful degradation**: `safe('dopTaskDigest', ...)` means if the digest fails, the dashboard still loads with empty state (no tasks shown, no error).
- **TypeScript clean**: `npx tsc --noEmit --skipLibCheck` exits 0 after changes.

---

## How It Connects to the System

```
Dashboard Page (server)
  └── getDOPTaskDigest() [lib/scheduling/task-digest.ts]
        ├── supabase: events (1 query, up to 20 events)
        ├── getChefPreferences() (for shop_day_before)
        ├── dop_task_completions (1 batch query)
        └── getDOPSchedule() × N (pure, no DB)
              └── returns DOPTaskDigest
  └── <DOPTaskPanel digest={dopTaskDigest} />
        └── <DOPTaskCheckbox /> per task
              └── toggleDOPTaskCompletion() [lib/scheduling/dop-completions.ts]
                    └── revalidatePath('/dashboard') + event pages
```

---

## What to Test

1. Navigate to `/dashboard` — if any upcoming events have incomplete DOP tasks, the panel appears between "Follow-Ups Overdue" and "Prep Prompts"
2. Check a task on the panel — the checkbox should optimistically go green, and on next page load the task should be gone from the panel
3. If all tasks are complete, the panel shows the green "All caught up" card
4. If no events in the window, the panel is hidden (condition: `totalIncomplete > 0`)
5. The "This Week" accountability card now uses the extracted component — verify it still shows correctly when `eventsCompletedThisWeek > 0`

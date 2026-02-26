# Labor Hours Tracking Enhancement

## What Changed

The Hours Log widget on the chef dashboard was upgraded to support structured labor categories and encourage consistent tracking. The change is purely additive — no database migration was required.

**Files modified:**

- `lib/dashboard/actions.ts`
- `components/dashboard/hours-log-widget.tsx`
- `app/(chef)/dashboard/page.tsx`

---

## Why

Chefs perform substantial work that is never captured by event timers: planning menus, answering client emails, handling admin, developing recipes, posting on social media. Without a prompt to log these, this labor becomes invisible. The enhancement makes it easy to categorize any kind of work and nudges chefs to track consistently through a streak counter and contextual encouragement.

---

## Category System

13 categories cover both physical and mental labor. The category is stored in the `context.category` field (JSONB) of the `chef_activity_log` row.

| Key                 | Label                    |
| ------------------- | ------------------------ |
| `planning`          | Planning & Menu Design   |
| `admin`             | Admin & Bookkeeping      |
| `client_comms`      | Client Communication     |
| `marketing`         | Marketing & Social Media |
| `recipe_dev`        | Recipe Development       |
| `shopping_sourcing` | Shopping & Sourcing      |
| `prep_work`         | Prep Work                |
| `cooking_service`   | Cooking & Service        |
| `cleanup`           | Cleanup & Reset          |
| `travel`            | Travel                   |
| `learning`          | Learning & Training      |
| `charity`           | Charity / Volunteer      |
| `other`             | Other                    |

---

## How Categories Are Stored

Categories are written into the `context` JSONB column of `chef_activity_log`:

```json
{
  "minutes": 90,
  "logged_for": "2026-02-19",
  "category": "client_comms",
  "note": "Follow-up calls for spring events"
}
```

No schema migration was needed. The `context` column already accepts arbitrary JSON.

The `logDashboardHours` server action also determines the `action` value from the category:

- `category === 'charity'` → `action = 'charity_hours_logged'` (preserves backward compat with legacy charity rows)
- all other categories → `action = 'hours_logged'`

---

## Backward Compatibility

Legacy rows in `chef_activity_log` do not have `context.category`. The `getDashboardHoursSnapshot` read path handles this gracefully:

1. If `context.category` is a valid `ManualLaborCategory` value → bucket under that category key
2. If `row.action === 'charity_hours_logged'` (and no category) → bucket as `charity`
3. Otherwise → bucket as `manual` (the legacy catch-all)

Legacy rows still count in all totals and still appear in the Recent Entries list (with no category label shown).

---

## Tracking Streak Algorithm

The streak counts the number of consecutive calendar days (walking backwards from today) where at least one manual hours entry was logged.

- Uses the `logged_for` date on each entry (not `created_at`) — so backdating yesterday's hours today does not break a streak
- Only manual entries (from `chef_activity_log`) count toward the streak — event timer minutes do not
- A streak of 0 means no entry has been logged today

```
streak = 0
cursor = today

loop:
  if cursor date exists in logged_for dates → streak++, cursor -= 1 day
  else → break
```

The streak is displayed in the widget as a 7-cell block indicator (▰ = filled, ▱ = empty) plus a text count.

---

## Encouragement Messaging

A contextual message appears above the form based on today's logged minutes:

| Condition                     | Message                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| 0 min today, no week history  | "Start building your labor log — every hour you track helps you understand your true value." |
| 0 min today, has week history | "Add today's hours — even 30 minutes of planning or admin counts."                           |
| 1–59 min today                | "Good start! Mental work counts too — log any planning, emails, or admin time."              |
| 60–239 min today              | "You've been tracking well today. Keep capturing all the invisible work."                    |
| 240+ min today                | "Great tracking today! Consistent logs reveal what your time is truly worth."                |

"Has week history" uses `weekMinutes > 0` which includes both event-timer minutes and manual entries.

---

## Top Activity

The `topActivity` field in `DashboardHoursSnapshot` now surfaces specific category names instead of the generic "Manual Log". For example: "Client Communication: 4h (35% of all time)".

The `DashboardHoursActivityKey` type was expanded from 7 keys to 18, covering all event-timer buckets plus all manual categories.

The `travel` manual category maps to the same `activityTotals.travel` bucket as event-timer travel, so total driving time is unified in the top-activity calculation.

---

## `DashboardHoursSnapshot` Shape (current)

```typescript
type DashboardHoursSnapshot = {
  todayMinutes: number
  weekMinutes: number
  allTimeMinutes: number
  topActivity: DashboardHoursTopActivity | null
  recentEntries: DashboardHoursEntry[]
  trackingStreak: number
  todayLogged: boolean
  weekCategoryBreakdown: DashboardHoursCategoryEntry[]
}

type DashboardHoursEntry = {
  id: string
  minutes: number
  loggedFor: string
  category: ManualLaborCategory | null // null for legacy entries
  note: string | null
  createdAt: string
}

type DashboardHoursCategoryEntry = {
  key: DashboardHoursActivityKey
  label: string
  minutes: number
}
```

---

## Round 2 Enhancements

### Streak fix — from-yesterday logic

`computeTrackingStreak` now returns `{ streak, todayLogged }`. If today has no entry, it walks backwards from _yesterday_ instead of today, so the streak count reflects work done — not whether the chef has already logged this morning. The widget shows "X day streak — log today to keep it going!" when `!todayLogged` and the streak is active, and "Log today's hours to start a streak." when streak = 0.

Milestone labels surface at 7 / 14 / 30 day thresholds.

### Quick-log preset buttons

Four buttons (15m / 30m / 1h / 2h) above the hours input pre-fill the hours field. Reduces friction for common durations without changing the server action.

### Week category breakdown

A second totals accumulator (`weekActivityTotals`) runs in parallel with the all-time accumulator. After both loops, the top 5 non-zero categories for the past 7 days are sorted by minutes and returned as `weekCategoryBreakdown`. The widget shows this breakdown instead of the single `topActivity` line when there is week data, and falls back to `topActivity` when the week is empty.

---

## Round 3 Enhancements

### Future date prevention

Chefs can no longer log hours for dates in the future. Two layers of protection:

1. **Client** — the Date input has `max={today}`. The browser blocks future selection natively.
2. **Server** — `LogDashboardHoursSchema` now includes a Zod `.refine()` on `logged_for` that rejects any date string greater than today's ISO date (`val <= new Date().toISOString().slice(0, 10)`). Even if the browser restriction is bypassed, the server action throws a validation error before writing.

### Active preset button highlight

The quick-log preset buttons (15m / 30m / 1h / 2h) now visually reflect the currently selected duration. When `hours === p.value`, the button renders with `bg-stone-100 border-stone-500 font-semibold`. Clicking a number field directly (not via preset) clears the highlight — the preset style only appears when the value exactly matches one of the four preset values.

### Consistent recent-entry count

Previously the server collected up to 6 entries (`if (recentEntries.length < 6)`) but the widget rendered only 4 (`.slice(0, 4)`), silently discarding 2 rows. Both sides are now aligned at 5: the server caps at 5 entries and the widget renders `.slice(0, 5)`.

### Date reset after submission

After a successful save, the date field now resets to today (`setLoggedFor(today)`). Previously only `hours`, `note`, and `category` were cleared. If the chef had backdated an entry (e.g., logged for yesterday), the date would silently stay on yesterday and the next submission would go to the wrong day.

**Files modified in Round 3:**

- `lib/dashboard/actions.ts` — future-date Zod refine on `logged_for`; entry cap changed from `< 6` to `< 5`
- `components/dashboard/hours-log-widget.tsx` — `today` constant; `max={today}` on date Input; preset highlight; `.slice(0, 5)` on entries; `setLoggedFor(today)` on success

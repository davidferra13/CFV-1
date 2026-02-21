# Build: Holiday Intelligence System

**Branch:** `feature/scheduling-improvements`
**Date:** 2026-02-21

---

## What Was Built

A proactive holiday intelligence system that tells Chef Low exactly which upcoming holidays are in their outreach window, which past clients to reach out to, and what menu direction to lead with.

---

## Why It Was Built

Private chef businesses have highly predictable seasonal peaks. Valentine's Day, Mother's Day, Thanksgiving, NYE, Passover, and Yom Kippur break-the-fast are among the highest-converting dates of the year. Without a system, chefs miss these windows — either booking too late or not reaching out to past clients at all.

The goal: **turn the calendar into a revenue engine** by surfacing the right outreach at the right time, automatically.

---

## Files Created

### `lib/holidays/constants.ts`

- 35 holidays defined across US cultural, religious, family, and social categories
- Each holiday has: relevance level (`high` / `medium` / `low`), premium pricing flag, menu direction notes, outreach lead time (days), and a ready-to-copy outreach message hook
- Floating holidays (Mother's Day, Thanksgiving, Easter, etc.) computed via helper functions (`nthWeekday`, `lastWeekday`)
- Religious holidays with variable-year dates (Passover, Yom Kippur, Hanukkah, Eid, Diwali, Lunar New Year, Rosh Hashanah) use lookup tables through 2035

### `lib/holidays/upcoming.ts`

- `getHolidayDate(holiday, year)` — compute a holiday's date for a specific year
- `getNextOccurrence(holiday, from)` — returns this year's date, or next year's if passed
- `getUpcomingHolidays({ from, lookaheadDays, minRelevance })` — sorted list of upcoming holidays within a window
- `getHolidaysInOutreachWindow(from)` — filter to holidays actively in their outreach window
- `findNearestHoliday(eventDate, windowDays)` — used for lead scoring and surge pricing detection
- `holidayLeadScoreBoost(eventDate)` — returns 0–20 point boost for inquiries near high-relevance holidays
- `formatHolidayDate(date, daysUntil)` — human-friendly label ("Tomorrow", "in 5 days", "Mar 14")

### `lib/holidays/outreach-actions.ts`

- `'use server'` server action file
- `getHolidayOutreachSuggestions()` — main action: finds upcoming holidays in outreach window, then queries the past 3 years of completed events to find clients who booked near that same holiday window (±21 days)
- Returns up to 5 suggestion objects, each containing: the upcoming holiday, list of matched past clients (sorted by loyalty / repeat count), premium pricing flag, outreach hook, and menu notes
- `getHolidayOutreachCount()` — lightweight count for badge/notification dot use cases
- Uses `requireChef()` + `tenant_id` scoping on all queries
- Failure is non-blocking (wrapped in `safe()` in dashboard)

### `components/dashboard/holiday-outreach-panel.tsx`

- `'use client'` component — receives pre-fetched suggestions as props from the server page
- Accordion-style: each holiday expands to reveal the outreach hook (with copy-to-clipboard), menu direction, and a list of past clients to contact
- Urgency indicators: red dot for holidays ≤7 days away, amber dot otherwise
- Premium pricing badge (star icon) for Valentine's Day, Mother's Day, Thanksgiving, Christmas, NYE
- Copy button on outreach hook — copies the message to clipboard with visual confirmation
- Past client list shows name, last booking date, and repeat count (e.g. "3× client")
- Panel hides entirely when no holidays are in outreach window

---

## Dashboard Integration

### `app/(chef)/dashboard/page.tsx` changes:

1. Imported `HolidayOutreachPanel` and `getHolidayOutreachSuggestions`
2. Added `holidayOutreachSuggestions` fetch via `safe()` wrapper after the main `Promise.all`
3. Panel renders between the Scheduling Gap Banner and the Onboarding Checklist — position is intentional: it's a time-sensitive opportunity signal, not a persistent widget

---

## How It Works End-to-End

```
Dashboard load
  → getHolidayOutreachSuggestions() (server action)
    → getUpcomingHolidays({ lookaheadDays: 60, minRelevance: 'medium' })
      → filters to holidays in their outreach window (daysUntil ≤ outreachLeadDays)
      → caps at 5 suggestions
    → fetches chef's past events (last 3 years, completed/paid/confirmed)
    → for each holiday: finds clients who booked ±21 days of that holiday in prior years
    → returns suggestions sorted by soonest holiday
  → HolidayOutreachPanel renders
    → first holiday auto-expanded
    → chef sees: outreach hook, menu direction, past client list
    → chef copies hook, sends message, books the date
```

---

## Future Enhancements (not built yet)

| Feature                               | Description                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| **Holiday menu templates**            | Pre-built menu objects auto-attached to quotes for each holiday               |
| **Surge pricing flag in event form**  | Auto-suggest premium rate when event date is near high-relevance holiday      |
| **Lead score boost integration**      | Wire `holidayLeadScoreBoost()` into the inquiry lead scoring pipeline         |
| **Rebooking automation draft**        | One-click draft of an outreach message to a specific past client              |
| **Year-over-year holiday comparison** | "You did $X in Valentine's events last year — here's your pipeline this year" |

---

## Key Design Decisions

- **No new migrations** — computed entirely from existing `events` and `clients` tables
- **No AI / Ollama** — pure date math and SQL queries; no private data is processed through any LLM
- **Non-blocking** — wrapped in `safe()` on the dashboard; if the query fails, the panel silently hides
- **Copy-to-clipboard** — the outreach hook is designed to be the starting point of a real message, not a fully automated send (respects AI Policy: AI assists, chef confirms)
- **±21-day matching window** — broad enough to catch "near Easter" and "near Valentine's" bookings that weren't explicitly holiday-labeled

---

## Testing Checklist

1. Load the dashboard — confirm `HolidayOutreachPanel` appears if any holiday is within its outreach window
2. Expand a holiday row — confirm outreach hook, menu notes, and client list are visible
3. Click "Copy" on the outreach hook — confirm clipboard is populated
4. Confirm the panel is hidden if no holidays are in window (e.g., test with a date far from any holiday)
5. `npx tsc --noEmit --skipLibCheck` → must exit 0
6. `npx next build --no-lint` → must exit 0

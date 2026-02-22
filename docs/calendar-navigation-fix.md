# Calendar Navigation Fix — 2026-02-22

## Problem

The calendar was buggy and frustrating to use:

1. **Month navigation didn't work** — clicking ← / → arrows often did nothing. The `router.push()` with search param changes wasn't triggering server component re-renders in Next.js 14 App Router.

2. **Selected date panel showed wrong month** — if you selected Feb 15 and then navigated to April, the detail panel still showed "Sunday, February 15, 2026" below April's grid. The two widgets (calendar grid + detail panel) were completely out of sync.

3. **Infinite re-render loop** — `CalendarFilterPanel` called `onChange()` inside a `useEffect`, but `onChange` was a new function reference on every render, causing "Maximum update depth exceeded" errors.

4. **No "Today" button** on the month view — once you navigated away from the current month, there was no quick way back.

## Root Cause

The core issue was using `router.push()` for navigation between server-rendered pages. In Next.js App Router, `router.push()` with only query param changes on the same path uses client-side caching and often doesn't trigger a fresh server render. This made navigation feel broken — clicks were swallowed silently.

## Fix

### Navigation: `router.push()` → `<Link>`

All calendar navigation buttons across all 4 views (month, day, week, year) were converted from `router.push()` click handlers to Next.js `<Link>` components. `<Link>` handles server component data fetching correctly in App Router.

**Files changed:**

- `app/(chef)/calendar/availability-calendar-client.tsx` — month prev/next/today
- `app/(chef)/calendar/day/day-view-client.tsx` — day prev/next/today
- `app/(chef)/calendar/week/week-planner-client.tsx` — week prev/today/next
- `app/(chef)/calendar/year/year-view-client.tsx` — year prev/next/this-year, week cell clicks

### Selected date reset on month change

Added a `useEffect` in `AvailabilityCalendarClient` that clears `selectedDate`, `showBlockForm`, and `error` whenever the `year` or `month` props change. This ensures the detail panel never shows a date from a different month.

### Filter panel infinite loop fix

In `CalendarFilterPanel`, the `onChange` callback was being called inside `useEffect` which triggered parent re-renders. Fixed by storing `onChange` in a `useRef` so the effect doesn't depend on the callback identity.

### Today button

Added a "Today" button next to the month/year header that appears only when not viewing the current month. Links directly to `/calendar?year=YYYY&month=MM` for the current month.

## Testing

All 6 automated Playwright tests pass:

1. Next month navigation — PASS
2. Today button appears — PASS
3. Selected date resets on month change — PASS
4. Day view navigation — PASS
5. Week view navigation — PASS
6. No infinite re-render loop — PASS

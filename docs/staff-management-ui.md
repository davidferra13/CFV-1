# Staff Management UI Components

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements

## What Changed

Added 5 new `'use client'` UI components under `components/staff/` for staff management workflows:

### 1. `components/staff/availability-grid.tsx` -- Staff Availability Grid

A staff-by-date toggle grid. Rows are staff members, columns are 7 visible dates with prev/next navigation. Each cell toggles between available (green), unavailable (red), and unknown (gray). Calls `setAvailability` from `@/lib/staff/availability-actions` via `useTransition` for optimistic updates. Includes a summary row showing available count per date with color-coded badges.

**Props:** `staffMembers`, `availability`, `startDate`, `endDate`

### 2. `components/staff/clock-panel.tsx` -- Clock In/Out Panel

Event-day time tracking for staff. Active timers display at the top with elapsed time (auto-refreshed every 30 seconds) and a clock-out button. A "Clock In" button opens a staff selector dropdown filtered to only show staff not already clocked in. Completed entries show duration badges. A GPS indicator dot appears when coordinates are present. Calls `clockIn`/`clockOut` from `@/lib/staff/clock-actions`.

**Props:** `entries` (ClockEntry[]), `staffMembers`, `eventId?`

### 3. `components/staff/performance-board.tsx` -- Performance Board

Sortable table displaying staff performance metrics. Columns: Name, On-Time Rate, Cancellations, Avg Rating, Total Events. Click any column header to sort (toggle asc/desc). Color-coded badges for on-time rate (green >= 90%, amber 70-90%, red < 70%). Ratings shown as star characters. Highlights the top performer (highest on-time rate with >= 3 events) with a trophy icon.

**Props:** `scores` (StaffPerformanceScore[])

### 4. `components/staff/labor-dashboard.tsx` -- Labor Cost Analytics

Three summary cards (current month labor, labor ratio with target badge, all-time average). A Recharts `ComposedChart` showing labor cost bars, revenue bars, and ratio line by month with dual Y axes (dollars left, percentage right). Below the chart: a current month detail table breaking down labor cost per event with per-event ratio badges. Target ratio indicator shows 20-30% as the healthy range.

**Props:** `laborByMonth`, `currentMonthDetail`

### 5. `components/staff/drag-schedule.tsx` -- Week View Staff Schedule

7-column Mon-Sun grid with prev/next week navigation and a "Today" button. Events display as cards in their respective day columns showing the event name and assigned staff (checkmark icons). An "Assign" button on each card opens a staff picker dropdown showing only unassigned staff. Uses click-to-assign pattern (no drag-and-drop library dependency). Staff roster summary at the bottom shows each staff member as a badge with their weekly assignment count.

**Props:** `events`, `staffMembers`, `weekStart`

## Patterns Followed

- All files start with `'use client'`
- Imports: Card/CardHeader/CardTitle/CardContent, Button (variants: primary/secondary/danger/ghost), Badge (variants: default/success/warning/error/info), Input with label/error/helperText
- Icons from `lucide-react`
- `useTransition` for all server action calls
- Stone color palette for neutrals, brand-600 (#d47530) for accent
- Recharts: ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
- Money formatting: `$${(cents / 100).toFixed(2)}`
- No react-markdown usage
- Optimistic UI updates with rollback on error

## Server Actions Used

| Component | Actions |
|-----------|---------|
| availability-grid | `setAvailability` from `lib/staff/availability-actions` |
| clock-panel | `clockIn`, `clockOut` from `lib/staff/clock-actions` |
| performance-board | Read-only (scores passed as props) |
| labor-dashboard | Read-only (data passed as props) |
| drag-schedule | `assignStaffToEvent` from `lib/staff/actions` |

## TypeScript Status

All 5 files pass `npx tsc --noEmit --skipLibCheck` with zero errors.

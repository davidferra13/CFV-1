# Google Calendar-Style Schedule Page

## What Changed

The schedule page was rebuilt from a basic 7-day grid into a full Google Calendar-style experience using FullCalendar. Phase 2 added drag-and-drop rescheduling, Agenda view, mini calendar sidebar, click-to-create, and keyboard shortcuts.

### Previous State
- `WeeklyScheduleView` — a hand-rolled 7-card grid showing Mon–Sun
- Previous/Next week navigation only
- Minimal event cards with occasion, client name, serve time

### Current State (Phase 2)
- Full interactive calendar with **Month**, **Week**, **Day**, and **Agenda** views
- **Drag-and-drop** rescheduling — grab any event and move it to a new date/time
- **Click empty date** to create a new event (pre-fills date and time)
- **Agenda view** — shows only days that have events, skips empty days, groups by month
- **Mini calendar sidebar** — small month grid for quick date navigation with event-dot indicators
- **Keyboard shortcuts** — T(oday), M(onth), W(eek), D(ay), A(genda), N(ew event), arrow keys
- Event color coding by FSM status (draft, proposed, accepted, paid, confirmed, etc.)
- Prep readiness dot indicators (green/yellow/red)
- Prep days rendered as all-day events (amber) when `shop_day_before` is enabled
- Click any event to see a detail popover with status, date, time, location, guest count
- Quick-action links to event detail and timeline from popover
- Today button + prev/next navigation + "New Event" button in toolbar
- "Now" indicator line in week/day views (brand-colored, like Google Calendar's red line)
- "+X more" popover when days have many events (month view)
- Today's date highlighted with a brand-colored circle
- Reschedule toast notifications on drag-and-drop
- Shortcut reference panel in sidebar

## Why

The previous 7-day grid was functional for the current week but lacked:
- Month-level visibility for planning ahead
- Day-level detail for event-day scheduling
- Visual status differentiation across the event lifecycle
- Quick event interaction without full page navigation
- Any way to see "which days am I busy?" at a glance (Agenda)

A chef managing multiple events needs a calendar they can scan at a glance — status colors, prep readiness, and clickable detail without leaving the page. The Agenda view specifically answers "what does my month look like?" by showing only booked days and excluding empty ones.

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Added `@fullcalendar/react`, `@fullcalendar/core`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`, `@fullcalendar/list` |
| `lib/scheduling/actions.ts` | Added `getCalendarEvents()`, `rescheduleEvent()`, and `CalendarEvent` type |
| `components/scheduling/calendar-view.tsx` | Full calendar with drag-drop, keyboard shortcuts, mini calendar, view switching |
| `components/scheduling/event-detail-popover.tsx` | Click-to-show popover with event summary and quick actions |
| `components/scheduling/agenda-view.tsx` | **New** — Agenda view showing only booked days grouped by month |
| `components/scheduling/mini-calendar.tsx` | **New** — Small month grid sidebar with event-dot indicators |
| `app/(chef)/schedule/page.tsx` | Rewired to use `CalendarView` with SSR-prefetched events |
| `app/globals.css` | FullCalendar CSS overrides matching brand design system |

## How It Connects

### Data Flow
```
SchedulePage (server)
  → getCalendarEvents(rangeStart, rangeEnd)
    → requireChef() + tenant scoping
    → Query events table for date range
    → Compute prep status from readiness flags
    → Build FullCalendar-compatible event objects
    → Optionally add prep day events (day before each event)
  → Pass initialEvents to CalendarView (SSR)

CalendarView (client)
  → Renders FullCalendar (Month/Week/Day) or AgendaView
  → Mini calendar sidebar for quick navigation (xl screens)
  → On date range change → calls getCalendarEvents() for new range
  → On event click → shows EventDetailPopover
  → On date click → navigates to /events/new?event_date=...&serve_time=...
  → On event drag → calls rescheduleEvent() → refreshes events
  → Keyboard shortcuts listen on document for T/M/W/D/A/N/arrows
  → Status colors applied via eventDidMount callback

AgendaView (client)
  → Groups events by date, then by month
  → Skips any day with zero events
  → Shows: day number, day of week, event cards with status/time/guests/location
  → "View details →" link on hover per event
  → Booked day counter in header
  → Reuses same events[] state from CalendarView (auto-updates)

MiniCalendar (client)
  → Small month grid in left sidebar
  → Dots on dates that have events
  → Click date → jumps main calendar to that date
  → Month navigation independent of main calendar
  → Today highlight + selected date highlight

rescheduleEvent (server action)
  → Validates event exists + tenant match
  → Blocks in_progress, completed, cancelled
  → Updates event_date (and optionally serve_time)
  → Revalidates /schedule, /events, /events/{id}
```

### Existing Components Preserved
- `WeeklyScheduleView` still exists — usable elsewhere (e.g., dashboard widget)
- All scheduling engine files (`timeline.ts`, `dop.ts`, `prep-prompts.ts`) are untouched
- The `getWeekSchedule()` action still works for any component that needs it

### Feature Matrix

| Feature | Status | Details |
|---------|--------|---------|
| Month view | Done | Full month grid with event pills |
| Week view | Done | Time slots 6am–11pm, event blocks show duration |
| Day view | Done | Single day with time grid |
| Agenda view | Done | Only booked days, grouped by month, excludes empty |
| Drag-and-drop | Done | Move events to new dates/times, prep days locked |
| Click-to-create | Done | Click empty date/time → /events/new pre-filled |
| Mini calendar | Done | Sidebar with event dots, quick navigation |
| Keyboard shortcuts | Done | T/M/W/D/A/N/arrows |
| Event popover | Done | Click event → status, date, location, guests, links |
| Now indicator | Done | Brand-colored line in week/day views |
| "+X more" | Done | Overflow popover for busy days |
| New Event button | Done | In toolbar, always visible |
| Reschedule toast | Done | Feedback on drag-and-drop success/failure |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `T` | Jump to today |
| `M` | Switch to Month view |
| `W` | Switch to Week view |
| `D` | Switch to Day view |
| `A` | Switch to Agenda view |
| `N` | Create new event |
| `←` `→` | Navigate prev/next |

### Reschedule Rules
- **Allowed**: draft, proposed, accepted, paid, confirmed
- **Blocked**: in_progress, completed, cancelled
- **Prep days**: Cannot be dragged (they follow their parent event automatically)
- Toast feedback on success or error

### Status Color Mapping
| Event Status | Background | Border | Text |
|-------------|-----------|--------|------|
| draft | stone-50 | stone-300 | stone-600 |
| proposed | blue-100 | blue-300 | blue-800 |
| accepted | amber-100 | amber-300 | amber-800 |
| paid | emerald-100 | emerald-300 | emerald-800 |
| confirmed | brand-100 | brand-300 | brand-700 |
| in_progress | brand-50 | brand-500 | brand-800 |
| completed | emerald-100 | emerald-400 | emerald-800 |
| Prep day | amber-100 | amber-500 | amber-800 |

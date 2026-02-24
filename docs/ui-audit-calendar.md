# UI Audit: ChefFlow Calendar System

> **Generated:** 2026-02-23
> **Scope:** Every UI element across the 8 calendar-related pages and all imported components.
> **Purpose:** Exhaustive element-by-element reference for design review, QA, and future development.

---

## Table of Contents

1. [Calendar (Month View)](#1-calendar-month-view)
2. [Day View](#2-day-view)
3. [Week Planner](#3-week-planner)
4. [Year View](#4-year-view)
5. [Share Availability](#5-share-availability)
6. [Schedule (FullCalendar)](#6-schedule-fullcalendar)
7. [Waitlist Management](#7-waitlist-management)
8. [Shared Components Reference](#8-shared-components-reference)
9. [Color System Quick Reference](#9-color-system-quick-reference)
10. [Filter System Reference](#10-filter-system-reference)
11. [Cross-Page Navigation Map](#11-cross-page-navigation-map)

---

## 1. Calendar (Month View)

| Property                  | Value                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| **Route**                 | `/calendar`                                                      |
| **Server File**           | `app/(chef)/calendar/page.tsx`                                   |
| **Client File**           | `app/(chef)/calendar/availability-calendar-client.tsx`           |
| **Page Title (metadata)** | `Calendar -- ChefFlow`                                           |
| **Auth**                  | `requireChef()` -- chef role required                            |
| **URL Params**            | `?year=YYYY&month=MM` (both optional, defaults to current month) |

### Layout

Two-column layout on xl screens: main calendar grid (left) + Seasonal Palate Sidebar (right, hidden below xl breakpoint). Max width 7xl, horizontal padding 4, vertical padding 8.

### Headings

| Element  | Text                                                                       | Style                               |
| -------- | -------------------------------------------------------------------------- | ----------------------------------- |
| h1       | "Calendar"                                                                 | `text-2xl font-bold text-stone-900` |
| Subtitle | "Your complete schedule -- events, prep, personal commitments, and goals." | `text-sm text-stone-500`            |

### Navigation Buttons (Top Right)

| Button Label | Variant     | Size | Destination      |
| ------------ | ----------- | ---- | ---------------- |
| Day          | `secondary` | `sm` | `/calendar/day`  |
| Week         | `secondary` | `sm` | `/calendar/week` |
| Year         | `secondary` | `sm` | `/calendar/year` |

### Empty State

Shown when both `unifiedItems` and `waitlistEntries` are empty.

| Element      | Description                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Icon         | Calendar SVG icon in a brand-colored circle (`bg-brand-50`, icon `text-brand-600`, `h-7 w-7`)                                  |
| Heading (h2) | "Your calendar is empty" (`text-lg font-semibold text-stone-900`)                                                              |
| Description  | "Events, prep days, and personal commitments will appear here once you start scheduling." (`text-sm text-stone-500`, max-w-md) |
| Button 1     | "Create an Event" -- `primary`/`sm`, links to `/events/new`                                                                    |
| Button 2     | "Log an Inquiry" -- `secondary`/`sm`, links to `/inquiries/new`                                                                |

### Filter Panel (CalendarFilterPanel)

**File:** `components/calendar/calendar-filter-panel.tsx`

Located at the top of the client component, above the month navigation.

#### Calendar Sets (Saved Views)

Row of view-selector buttons prefixed with the label "View:" in small gray text (`text-xs text-stone-400`).

| View Name     | ID            | What It Shows                                                      |
| ------------- | ------------- | ------------------------------------------------------------------ |
| Full View     | `full`        | Events, Drafts, Prep, Calls, Personal, Business, Goals (Leads OFF) |
| Events Only   | `events-only` | Events + Draft Events only                                         |
| Ops View      | `ops`         | Events + Prep + Calls                                              |
| Planning View | `planning`    | Draft Events + Goals + Leads                                       |

Active view button: `bg-stone-800 text-white border-stone-800`. Inactive: `bg-white text-stone-500 border-stone-200` with hover to `border-stone-400 text-stone-700`.

#### Individual Filter Pills

Each pill is a rounded toggle button (`rounded-full`) with a 2px color dot to its left.

| Filter Key      | Pill Label | Dot Color (Hex) | Active Pill Style                                 | Default State |
| --------------- | ---------- | --------------- | ------------------------------------------------- | ------------- |
| showEvents      | Events     | #F59E0B         | `bg-amber-100 text-amber-800 border-amber-300`    | ON            |
| showDraftEvents | Drafts     | #FDE68A         | `bg-yellow-100 text-yellow-800 border-yellow-300` | ON            |
| showPrepBlocks  | Prep       | #16A34A         | `bg-green-100 text-green-800 border-green-300`    | ON            |
| showCalls       | Calls      | #3B82F6         | `bg-blue-100 text-blue-800 border-blue-300`       | ON            |
| showPersonal    | Personal   | #7C3AED         | `bg-purple-100 text-purple-800 border-purple-300` | ON            |
| showBusiness    | Business   | #0D9488         | `bg-teal-100 text-teal-800 border-teal-300`       | ON            |
| showIntentions  | Goals      | #4ADE80         | `bg-green-50 text-green-700 border-green-200`     | ON            |
| showLeads       | Leads      | #EA580C         | `bg-orange-100 text-orange-800 border-orange-300` | OFF           |

Inactive pill: `bg-stone-50 text-stone-400 border-stone-200`, dot becomes gray (#D1D5DB).

- **Reset link**: Appears only when any filter is off. Text: "Reset" (underlined, `text-xs text-stone-400 hover:text-stone-600`). Restores `DEFAULT_CALENDAR_FILTERS` and selects "Full View".
- **Persistence**: Filters saved to `localStorage` keyed by `chef-calendar-filters-{chefId}`. Loaded on mount. On load, checks if stored filters match any built-in view and highlights it.

### "+ New Entry" Button

| Property | Value                                             |
| -------- | ------------------------------------------------- |
| Label    | "+ New Entry"                                     |
| Variant  | `primary`                                         |
| Size     | `sm`                                              |
| Action   | Opens the CalendarEntryModal with no default date |
| Position | Right-aligned in the top action bar               |

### Month Navigation Row

| Element             | Description                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Left arrow button   | `ghost` variant Button with left arrow character, wrapped in Link to previous month URL                     |
| Center heading (h2) | Month name + year, e.g., "February 2026" (`text-lg font-semibold text-stone-900`)                           |
| "Today" button      | `secondary`/`sm`, appears only when viewing a month other than the current one. Links to current month URL. |
| Right arrow button  | `ghost` variant Button with right arrow character, wrapped in Link to next month URL                        |

Month URL format: `/calendar?year=YYYY&month=MM`

### Calendar Grid

7-column CSS grid (`grid-cols-7 gap-1`). Day headers: Sun, Mon, Tue, Wed, Thu, Fri, Sat -- centered, `text-xs text-stone-400 py-1 font-medium`.

Empty cells fill the gap before the first day of the month (based on first day of week).

#### Day Cell Buttons

Each day is a `<button>` element with `min-h-[56px]`, `rounded-lg border p-1.5`.

| Visual State        | CSS Classes                                           | Trigger                                               |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Default (available) | `bg-white border-stone-200 hover:bg-stone-50`         | No events or blocks                                   |
| Has event           | `bg-amber-50 border-amber-200`                        | At least one item of type `event`                     |
| Has block           | `bg-red-50 border-red-200`                            | Has `availability_block` or blocking `calendar_entry` |
| Selected            | `ring-2 ring-brand-500 ring-offset-1`                 | User clicked this day                                 |
| Today (day number)  | `bg-brand-600 text-white w-6 h-6 rounded-full` circle | Current date                                          |
| Today (cell)        | `font-bold`                                           | Current date                                          |

**Click behavior**: Clicking a day toggles its selection. Clicking an already-selected day deselects it. Also resets the block form and clears errors.

#### Color Dots

Up to 4 colored dots (1.5px circles, `w-1.5 h-1.5 rounded-full`) appear below each day number. Each dot's background color matches `item.color`. Native tooltip shows `item.title`.

If more than 4 items: a "+N" overflow indicator in `text-stone-400 text-[8px]`.

### Selected Date Detail Panel

Appears below the calendar grid when a day is clicked. White card: `rounded-xl border border-stone-200 bg-white p-5`.

| Element                  | Description                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| **Date heading** (h3)    | Full date: "Wednesday, February 23, 2026" (`font-semibold text-stone-900`) |
| **"+ Add Entry" button** | `secondary`/`sm`, opens CalendarEntryModal pre-filled with selected date   |

#### Schedule Section

Shown when items exist on the selected date. Label: "SCHEDULE" (`text-xs font-semibold text-stone-400 uppercase tracking-wider`).

Each item renders as a card with:

- Left color border: `3px [borderStyle] [color]` (solid, dashed, or dotted)
- Tinted background: `item.color + '18'` (10% opacity)
- Title: `text-sm font-medium text-stone-900 truncate`
- Time range (if timed): e.g., "10:00 -- 14:00" (`text-xs text-stone-500`)
- Multi-day range (if multi-day): "2026-02-20 -- 2026-02-23" (`text-xs text-stone-500`)
- "View" link (if `item.url` exists): `text-xs text-brand-600 hover:underline`, text "View -->"

#### Quick Block Section

Shown when selected date is NOT blocked and has NO event.

| State     | UI                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial   | Text "This date is available." (`text-sm text-stone-500`) + "Quick Block" button (`secondary`/`sm`)                                                                                      |
| Form open | Text input (placeholder "Reason (optional)", `rounded border border-stone-300 px-3 py-2 text-sm`) + "Block" button (default/`sm`, with loading spinner) + "Cancel" button (`ghost`/`sm`) |

Server action: `blockDate({ block_date, block_type: 'full_day', reason })`. On success: form closes, page refreshes. On error: red error text shown.

#### Remove Manual Block Button

Shown when selected date has an `availability_block` item. Separated by a border-t divider.

Button: "Remove Manual Block" (`secondary`/`sm`, loading state). Calls `unblockDate(selectedDate)`.

#### Waitlist Section

Shown when waitlist entries exist for the selected date. Separated by a border-t divider.

| Element    | Description                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header     | "Waitlist (N)" (`text-sm font-medium text-stone-700`)                                                                                                                               |
| Entry card | Blue card (`rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm`): client name (`font-medium text-stone-900`), occasion + guest count + notes (`text-xs text-stone-500`) |

### Error Display

`text-sm text-red-600`, shown below the detail panel on block/unblock failure.

### Color Legend (CalendarLegend)

**File:** `components/calendar/calendar-legend.tsx`

Collapsible panel: `border border-stone-200 rounded-xl overflow-hidden`.

| State     | Display                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| Collapsed | Full-width button: "Color Legend" + down arrow (`bg-stone-50 text-sm font-medium text-stone-600 hover:bg-stone-100`) |
| Expanded  | Same header with up arrow + grid of entries (`grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4`)                           |

Legend entries grouped by category. Each category has an uppercase label. Each entry: 3x3 rounded color swatch + text label.

| Category               | Items                                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Events**             | Confirmed Event (#F59E0B), Draft / Proposed (#FDE68A)                                                                                                                            |
| **Prep**               | Grocery Run (#16A34A), Prep Session (#059669), Packing (#166534), Travel to Event (#475569), Equipment Prep (#6B7280), Mental Prep (#4338CA), Admin Prep (#78716C)               |
| **Calls**              | Scheduled Call (#3B82F6)                                                                                                                                                         |
| **Personal**           | Vacation (#1E3A8A), Time Off (#7C3AED), Personal Appt (#A78BFA)                                                                                                                  |
| **Business**           | Farmers Market (#0D9488), Food Festival (#059669), Class / Teaching (#0891B2), Photo Shoot (#E11D48), Media / Press (#DB2777), Business Meeting (#2563EB), Admin Block (#78716C) |
| **Goals & Intentions** | Seeking Booking (#4ADE80, dotted border), Soft Day Pref (#7DD3FC, dashed border)                                                                                                 |
| **Leads**              | Inquiry Targeted (#CA8A04, dashed border), Waitlist Entry (#EA580C, dashed border)                                                                                               |

Items with non-solid borders show a 2px border on the swatch at 60% opacity.

### Seasonal Palate Sidebar

**File:** `components/calendar/seasonal-palate-sidebar.tsx`

Shown on xl screens only (`hidden xl:block`), in the right column. Sticky: `sticky top-8`.

| Section             | Content                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Header**          | "Seasonal Palate" (`font-display text-lg text-stone-900`), season label subtitle (`text-xs text-stone-500`)                                                                                           |
| **Category groups** | Each produce category: emoji + uppercase label (`text-xs font-semibold text-stone-500 uppercase tracking-wider`)                                                                                      |
| **Produce pills**   | Inline `rounded-full` pills. Peak items: `bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200` with a brand-500 dot. Non-peak: `bg-stone-50 text-stone-600 ring-1 ring-inset ring-stone-200`. |
| **Legend**          | Tiny text at bottom: brand dot = "Peak season", "Gray = available" (`text-[10px] text-stone-400`)                                                                                                     |

Scrollable content area: `max-h-[calc(100vh-12rem)] overflow-y-auto`.

---

## 2. Day View

| Property                  | Value                                            |
| ------------------------- | ------------------------------------------------ |
| **Route**                 | `/calendar/day`                                  |
| **Server File**           | `app/(chef)/calendar/day/page.tsx`               |
| **Client File**           | `app/(chef)/calendar/day/day-view-client.tsx`    |
| **Page Title (metadata)** | `Day View -- ChefFlow`                           |
| **Auth**                  | `requireChef()`                                  |
| **URL Params**            | `?date=YYYY-MM-DD` (optional, defaults to today) |
| **Max Width**             | `max-w-2xl`                                      |

### Headings

| Element | Text       | Style                               |
| ------- | ---------- | ----------------------------------- |
| h1      | "Day View" | `text-2xl font-bold text-stone-900` |

### View-Switching Buttons (Top Right)

| Button Label | Variant     | Size | Destination      |
| ------------ | ----------- | ---- | ---------------- |
| Month        | `secondary` | `sm` | `/calendar`      |
| Week         | `secondary` | `sm` | `/calendar/week` |
| Year         | `secondary` | `sm` | `/calendar/year` |

### Day Navigation Row

| Element       | Description                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| "Prev" button | `ghost`/`sm` with left arrow, links to `/calendar/day?date=YYYY-MM-DD` for previous day                                                       |
| Date display  | Full date ("Wednesday, February 23, 2026") -- `text-lg font-semibold`. Brand-colored (`text-brand-600`) if today, `text-stone-900` otherwise. |
| "Today" label | `text-xs text-brand-500 font-medium`, appears below date only when viewing today                                                              |
| "Next" button | `ghost`/`sm` with right arrow, links to next day                                                                                              |

### "Go to Today" Button

Shown only when NOT viewing today. Centered. `secondary`/`sm`. Links to `/calendar/day` (no date param = today).

### All-Day Banner Area

Shown when all-day items or items without a start time exist. Section label: "All Day" (`text-xs font-semibold text-stone-400 uppercase tracking-wider`).

Each banner: full-width colored bar with white text. Title left-aligned, optional "View -->" link right-aligned (white text, underline on hover). Background = `item.color`.

### "+ New Entry" Button

Right-aligned. `primary`/`sm`. Opens CalendarEntryModal with the current date (no default time).

### Time Grid

36 time slots from 6:00 AM to midnight (24:00) in 30-minute increments. Container: `border border-stone-200 rounded-xl overflow-hidden`.

| Component               | Description                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Time label column**   | `w-16` wide, right-aligned. Hour labels shown on even slots only (e.g., "6am", "7am", "12pm"). `text-xs text-stone-400 font-medium`. |
| **Content column**      | Fills remaining width. Clickable. `hover:bg-stone-50`. Min height 40px per slot.                                                     |
| **Hour separator**      | `border-t border-stone-200`                                                                                                          |
| **Half-hour separator** | `border-t border-stone-100`                                                                                                          |

#### Timed Items

Items appear in their first slot only (deduplication via a Set). Each item card:

- Left border: `3px [borderStyle] [color]`
- Background: `item.color + '25'` (15% opacity)
- Title: `font-medium`, text color from `CATEGORY_TEXT_COLORS` map
- Time range: `text-stone-400` (e.g., "10:00 -- 14:00")
- "View -->" link: `text-brand-600 hover:underline`
- Click on item card: `stopPropagation()` -- does not trigger slot click

Category text colors:
| Category | Class |
|---|---|
| events | `text-amber-900` |
| draft | `text-yellow-900` |
| prep | `text-green-900` |
| calls | `text-blue-900` |
| personal | `text-purple-900` |
| business | `text-teal-900` |
| intentions | `text-green-700` |
| leads | `text-orange-900` |
| blocked | `text-red-900` |

#### Empty Slot Behavior

- **Hover**: Shows "+ Add at HH:MM" (`text-xs text-stone-300`, fades in via `opacity-0 group-hover:opacity-100`)
- **Click**: Opens CalendarEntryModal with `defaultDate` = current day and `defaultStartTime` = slot time (e.g., "10:30")
- **Title attribute**: "Add entry at HH:MM"

### Empty State

Shown when zero items for the day. Centered, `py-12 text-stone-400`.

| Element | Description                                                  |
| ------- | ------------------------------------------------------------ |
| Text    | "Nothing scheduled for this day." (`text-sm`)                |
| Button  | "Add an entry" -- `secondary`/`sm`, opens CalendarEntryModal |

### CalendarEntryModal

Same modal as in Month View (see [Section 8](#calendar-entry-modal)), but receives both `defaultDate` and `defaultStartTime` props.

---

## 3. Week Planner

| Property                  | Value                                                                       |
| ------------------------- | --------------------------------------------------------------------------- |
| **Route**                 | `/calendar/week`                                                            |
| **Server File**           | `app/(chef)/calendar/week/page.tsx`                                         |
| **Client File**           | `app/(chef)/calendar/week/week-planner-client.tsx`                          |
| **Page Title (metadata)** | Not set explicitly                                                          |
| **Auth**                  | `requireChef()`                                                             |
| **URL Params**            | `?offset=N` (integer: 0 = current week, negative = past, positive = future) |
| **Max Width**             | `max-w-7xl`                                                                 |

### Header

| Element  | Text                                       | Style                             |
| -------- | ------------------------------------------ | --------------------------------- |
| h1       | "Week Planner"                             | `text-xl font-bold text-gray-900` |
| Subtitle | Date range, e.g., "Feb 17 -- Feb 23, 2026" | `text-sm text-gray-500`           |

### Navigation Buttons

| Button Label | Variant     | Size | Destination                   |
| ------------ | ----------- | ---- | ----------------------------- |
| "< Prev"     | `ghost`     | `sm` | `/calendar/week?offset={N-1}` |
| Today        | `ghost`     | `sm` | `/calendar/week?offset=0`     |
| "Next >"     | `ghost`     | `sm` | `/calendar/week?offset={N+1}` |
| Year View    | `secondary` | `sm` | `/calendar/year`              |
| Availability | `ghost`     | `sm` | `/calendar`                   |

### Gap Alerts

Shown at the top when events in this week are missing required prep blocks.

#### Critical Gap Alert

Red styling: `border-red-200 bg-red-50 text-red-900`.

| Element    | Description                                                              |
| ---------- | ------------------------------------------------------------------------ |
| Text       | "Urgent: [Event name -- Client name] (in Xd) missing: [block type list]" |
| Event link | Underlined Link to `/events/{id}`                                        |
| Button     | "Auto-schedule" -- `danger`/`sm`. Triggers auto-suggestion flow.         |

#### Warning Gap Alert

Amber styling: `border-amber-200 bg-amber-50 text-amber-900`.

| Element | Description                                                        |
| ------- | ------------------------------------------------------------------ |
| Text    | "[Event name] -- [Client name] (in Xd) missing: [block type list]" |
| Button  | "Auto-schedule" -- `secondary`/`sm`                                |

#### All-Clear Banner

Shown when all week events have prep blocks. Green: `text-green-700 bg-green-50 border-green-200`.
Text: "All events this week have required prep blocks scheduled." with checkmark.

### Multi-Day Calendar Entry Banners

Shown above the grid when calendar entries span multiple days (vacations, multi-day markets, etc.). Full-width colored bar with white text: entry title + dot separator + date range.

### 7-Column Day Grid (Mon--Sun)

CSS grid: `grid-cols-7 gap-2`.

#### Day Column Header

| Element  | Style                                               |
| -------- | --------------------------------------------------- |
| Day name | 3-letter abbreviation (e.g., "Mon")                 |
| Date     | "Feb 17" format                                     |
| Today    | `bg-amber-500 text-white` with amber-100 date text  |
| Normal   | `bg-gray-100 text-gray-600` with gray-400 date text |

#### Column Content (top to bottom)

**1. Single-day calendar entries**: Colored pills (`rounded-md px-1.5 py-1 text-xs text-white truncate`) with background color from `CALENDAR_COLORS[entry_type]`. Title attribute shows full text.

**2. Confirmed events**: Amber-bordered cards linked to `/events/{id}`.
| Sub-element | Style |
|---|---|
| Occasion | `font-semibold text-amber-900 truncate` |
| Client name | `text-amber-700 truncate text-xs` |
| Serve time | `text-amber-600 text-xs` |
| Card | `bg-amber-50 border border-amber-300 rounded-md px-1.5 py-1 hover:bg-amber-100` |

**3. Prep blocks**: Color-coded by block type (see table below). Sorted by start time.

| Block Component        | Description                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Title                  | `font-medium truncate text-xs`. Line-through + `text-gray-400` if completed.                                  |
| Time info              | Formatted as "10:30am ~60m" or "Flexible" or "~Nmin"                                                          |
| Complete toggle button | Checkmark icon (incomplete) or undo arrow (completed). Calls `completePrepBlock()` / `uncompletePrepBlock()`. |
| Delete button          | X icon. Triggers browser `confirm('Delete this prep block?')` dialog, then `deletePrepBlock()`.               |

Completed blocks: `bg-green-50 border-green-200 opacity-70`.

**Prep block type color classes:**

| Block Type         | CSS Classes                                          |
| ------------------ | ---------------------------------------------------- |
| grocery_run        | `bg-green-100 text-green-800 border-green-200`       |
| specialty_sourcing | `bg-emerald-100 text-emerald-800 border-emerald-200` |
| prep_session       | `bg-orange-100 text-orange-800 border-orange-200`    |
| packing            | `bg-blue-100 text-blue-800 border-blue-200`          |
| travel_to_event    | `bg-purple-100 text-purple-800 border-purple-200`    |
| mental_prep        | `bg-pink-100 text-pink-800 border-pink-200`          |
| equipment_prep     | `bg-yellow-100 text-yellow-800 border-yellow-200`    |
| admin              | `bg-gray-100 text-gray-700 border-gray-200`          |
| cleanup            | `bg-slate-100 text-slate-700 border-slate-200`       |
| custom             | `bg-indigo-100 text-indigo-800 border-indigo-200`    |

**4. "+ add" button**: Dashed-border button at the bottom of each column (`border-dashed border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600`). Clicking opens the inline AddBlockForm.

### Inline Add Block Form (AddBlockForm)

Dashed-border gray card (`bg-gray-50 border-dashed border-gray-300 rounded-lg`).

| Field      | Type                   | Placeholder / Label         | Notes                                              |
| ---------- | ---------------------- | --------------------------- | -------------------------------------------------- |
| Block type | `<select>`             | All 10 prep block types     | Auto-fills title with type label if title is empty |
| Title      | Text input             | "Title \*"                  | Required                                           |
| Block date | Date input             | Pre-filled with column date |                                                    |
| Start time | Time input             | Empty (optional)            |                                                    |
| Duration   | Number (min 5, step 5) | "Duration (min)"            |                                                    |

| Button | Variant        | Label                      |
| ------ | -------------- | -------------------------- |
| Save   | `primary`/`sm` | "Save" / "..." when saving |
| Cancel | `ghost`/`sm`   | "Cancel"                   |

Error text in red on validation or server failure.

### Auto-Schedule Suggestion Modal

Full-screen overlay: `fixed inset-0 bg-black/40 z-50`. White card: `rounded-xl shadow-xl max-w-lg max-h-[85vh]`.

**Header:**

- Title: "Auto-schedule -- [Event Name]" (`font-semibold`)
- Subtitle: "Review suggestions, edit dates/times, then confirm." (`text-xs text-gray-500`)
- Close button: X icon, `text-gray-400 hover:text-gray-600`

**Per Suggestion Card:**

Each is a bordered card. Included: `border-amber-300 bg-amber-50`. Excluded: `border-gray-200 opacity-50`.

| Element          | Description                                        |
| ---------------- | -------------------------------------------------- |
| Include checkbox | Toggle inclusion in final confirmation             |
| Block type badge | Colored label matching prep block type             |
| Title            | Block title text (`font-medium`)                   |
| Duration         | "~Nmin" (`text-xs text-gray-400`)                  |
| Reason           | AI-generated explanation (`text-xs text-gray-500`) |
| Date input       | Editable date, pre-filled with suggestion          |
| Time input       | Editable time (labeled "Time (opt.)"), pre-filled  |

**Footer:**

| Button  | Variant        | Label                | Condition                            |
| ------- | -------------- | -------------------- | ------------------------------------ |
| Confirm | `primary`/`sm` | "Confirm N Block(s)" | Disabled if none included or pending |
| Cancel  | `ghost`/`sm`   | "Cancel"             | Disabled while pending               |

### Legend

Horizontal row at the bottom of the page:

| Swatch                            | Label              |
| --------------------------------- | ------------------ |
| `bg-amber-100 border-amber-300`   | Event (anchor)     |
| `bg-orange-100 border-orange-200` | Prep session       |
| `bg-green-100 border-green-200`   | Grocery / Sourcing |
| `bg-blue-100 border-blue-200`     | Packing            |
| `bg-green-50 border-green-200`    | Completed          |

---

## 4. Year View

| Property                  | Value                                             |
| ------------------------- | ------------------------------------------------- |
| **Route**                 | `/calendar/year`                                  |
| **Server File**           | `app/(chef)/calendar/year/page.tsx`               |
| **Client File**           | `app/(chef)/calendar/year/year-view-client.tsx`   |
| **Page Title (metadata)** | Not set explicitly                                |
| **Auth**                  | `requireChef()`                                   |
| **URL Params**            | `?year=YYYY` (optional, defaults to current year) |
| **Max Width**             | `max-w-5xl`                                       |

### Header

| Element  | Text                                  | Style                             |
| -------- | ------------------------------------- | --------------------------------- |
| h1       | "Year View -- [YYYY]"                 | `text-xl font-bold text-gray-900` |
| Subtitle | "Click any week to open the planner." | `text-sm text-gray-500`           |

### Navigation Links

All styled as pill buttons: `px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700`.

| Link                | Destination                     | Condition                                                                |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| "< [Previous Year]" | `/calendar/year?year={Y-1}`     | Always                                                                   |
| "This Year"         | `/calendar/year?year={current}` | Hidden if already viewing current year                                   |
| "[Next Year] >"     | `/calendar/year?year={Y+1}`     | Always                                                                   |
| "Week Planner"      | `/calendar/week`                | Always. Styled differently: `bg-amber-500 text-white hover:bg-amber-600` |

### Stats Strip

Three-column grid (`grid-cols-3 gap-3 text-center`):

| Card            | Content                                                                       | Style                                                                                     |
| --------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Events          | `summary.total_events` count + "Events" label                                 | `bg-gray-50 border-gray-200`                                                              |
| Fully Scheduled | "X / Y" (fully scheduled weeks / total event weeks) + "Fully Scheduled" label | `bg-amber-50 border-amber-200`                                                            |
| Gaps            | Gap count + "Events with Gaps" or "No Gaps" with checkmark                    | Red (`bg-red-50 border-red-200`) if gaps > 0, green (`bg-green-50 border-green-200`) if 0 |

Count text: `text-lg font-bold`. Label text: `text-xs`.

### Month-Grouped Week Grid

Weeks grouped by month. Each month section:

| Element     | Description                                                                       |
| ----------- | --------------------------------------------------------------------------------- |
| Month label | `text-xs font-semibold text-gray-500 uppercase tracking-wide` (e.g., "FEB 2026")  |
| Week grid   | 4-5 columns depending on weeks in month (`grid-cols-4` or `grid-cols-5`, `gap-1`) |

#### Week Cell

Each cell is a Link to `/calendar/week?offset=N`.

| Visual State     | Condition                         | Style                                                                   |
| ---------------- | --------------------------------- | ----------------------------------------------------------------------- |
| No events        | event_count = 0                   | `bg-gray-50 hover:bg-gray-100 text-gray-400`                            |
| Events, no gaps  | event_count > 0, has_gaps = false | `bg-amber-50 hover:bg-amber-100 text-amber-900`                         |
| Events with gaps | event_count > 0, has_gaps = true  | `bg-amber-50 hover:bg-amber-100 text-amber-900 border-red-400 border-2` |
| Current week     | week_start matches today's Monday | `ring-2 ring-amber-500 ring-offset-1`                                   |

Cell content:

- Week start date in "M/d" format (`font-medium text-xs`)
- Event count: "N ev" (`text-xs`)
- Gap warning: "N" + warning character in `text-red-600 font-semibold`

Tooltip: "Week of [date]: N event(s), N gap(s)".

### Legend

Horizontal row, separated from content by `border-t border-gray-100`:

| Swatch                                             | Label                   |
| -------------------------------------------------- | ----------------------- |
| `bg-gray-50 border-gray-200`                       | No events               |
| `bg-amber-50 border-amber-200`                     | Events, fully scheduled |
| `bg-amber-50 border-red-400 border-2`              | Events with gaps        |
| `ring-2 ring-amber-500 bg-gray-50 border-gray-200` | Current week            |

---

## 5. Share Availability

| Property                  | Value                                                 |
| ------------------------- | ----------------------------------------------------- |
| **Route**                 | `/calendar/share`                                     |
| **Server File**           | `app/(chef)/calendar/share/page.tsx`                  |
| **Client File**           | `components/calendar/availability-share-settings.tsx` |
| **Page Title (metadata)** | Not set explicitly                                    |
| **Auth**                  | `requireChef()`                                       |
| **Max Width**             | `max-w-3xl`                                           |

### Headings

| Element  | Text                                                                                | Style                               |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| h1       | "Share Availability"                                                                | `text-2xl font-bold text-stone-900` |
| Subtitle | "Generate a public link showing your availability without revealing event details." | `text-sm text-stone-500`            |

### Generate Share Link Card

| Element         | Description                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Card title      | "Generate Share Link" (`CardTitle`, `text-base`)                                                                         |
| Description     | "Create a public link that shows your availability without revealing event details or client names."                     |
| Label input     | Text field, placeholder "Label (e.g., Website embed)" (`flex-1 border border-stone-300 rounded px-3 py-2 text-sm`)       |
| Generate button | Default variant. Label: "Generate" / "Generating..." when pending. Disabled while pending. Calls `generateShareToken()`. |

### Active Links List

Shown when at least one active token exists. Section heading: "Active Links" (`text-sm font-medium text-stone-700`).

Each active token card:

| Element       | Description                                                                            |
| ------------- | -------------------------------------------------------------------------------------- |
| Label         | Token label or "Untitled" (`text-sm font-medium text-stone-900 truncate`)              |
| Status badge  | `<Badge variant="success">` -- "Active"                                                |
| URL           | Full share URL (`{origin}/availability/{token}`), truncated (`text-xs text-stone-400`) |
| Created date  | "Created [localized date]" (`text-xs text-stone-400`)                                  |
| Copy button   | `ghost`/`sm`. Copies URL to clipboard via `navigator.clipboard.writeText()`.           |
| Revoke button | `ghost`/`sm`. Calls `revokeShareToken(id)`. Disabled while pending.                    |

---

## 6. Schedule (FullCalendar)

| Property                  | Value                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| **Route**                 | `/schedule`                                                        |
| **Server File**           | `app/(chef)/schedule/page.tsx`                                     |
| **Client File**           | `components/scheduling/calendar-view.tsx`                          |
| **Sub-components**        | `event-detail-popover.tsx`, `agenda-view.tsx`, `mini-calendar.tsx` |
| **Sidebar**               | `components/seasonal/seasonal-sidebar.tsx`                         |
| **Page Title (metadata)** | `Schedule - ChefFlow`                                              |
| **Auth**                  | `requireChef()`                                                    |

### Layout

Two-column grid on lg screens: CalendarView (left) + SeasonalSidebar (right, shown only when palette exists).

### Headings

| Element  | Text                                                    | Style                               |
| -------- | ------------------------------------------------------- | ----------------------------------- |
| h1       | "Schedule"                                              | `text-3xl font-bold text-stone-900` |
| Subtitle | "Your events at a glance. Click any event for details." | `text-stone-500`                    |

### Toolbar

#### Left Section -- Navigation

| Element          | Description                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Today" button   | `secondary`/`sm`. Jumps to today.                                                                                                                                                                                         |
| Prev/Next arrows | Combined bordered button group (`border border-stone-200 rounded-lg`). Each arrow: `px-2.5 py-1.5 hover:bg-stone-100 text-stone-600`. Left = "Previous" (aria-label), Right = "Next" (aria-label). Hidden in Agenda view. |
| Title (h2)       | Dynamic from FullCalendar (e.g., "February 2026"). `text-lg font-semibold text-stone-900 ml-2`.                                                                                                                           |
| Loading spinner  | `w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin`. Shown during data fetch.                                                                                                                |

#### Right Section -- View Switcher + Create

| Element          | Description                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| View switcher    | 4-button segmented control in bordered container. Each button: `px-3 py-1.5 text-sm font-medium`. Active: `bg-brand-500 text-white`. Inactive: `text-stone-600 hover:bg-stone-100`. |
| Views            | Month, Week, Day, Agenda                                                                                                                                                            |
| "+ Event" button | Default/`sm`. SVG plus icon + "Event" text. Navigates to `/events/new`.                                                                                                             |

### Keyboard Shortcuts

| Key         | Action                                       |
| ----------- | -------------------------------------------- |
| T           | Go to today                                  |
| M           | Switch to Month view                         |
| W           | Switch to Week view                          |
| D           | Switch to Day view                           |
| A           | Switch to Agenda view                        |
| N           | Create new event (navigate to `/events/new`) |
| Left Arrow  | Previous period                              |
| Right Arrow | Next period                                  |

Disabled when focus is inside `INPUT`, `TEXTAREA`, or `SELECT` elements.

Displayed in a sidebar card on xl screens with `<kbd>` styled keys: `px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-mono font-medium text-stone-600`.

### Mini Calendar Sidebar

**File:** `components/scheduling/mini-calendar.tsx`

Shown on xl screens in a `w-52` sidebar. White bordered card: `bg-white rounded-xl border border-stone-200 shadow-sm p-3`.

| Element           | Description                                                                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prev month button | Chevron-left icon, aria-label "Previous month"                                                                                                                                                                                                        |
| Month label       | Clickable button showing "Month YYYY". Click = jump to today. `text-sm font-semibold text-stone-700 hover:text-brand-600`.                                                                                                                            |
| Next month button | Chevron-right icon, aria-label "Next month"                                                                                                                                                                                                           |
| Day headers       | Mo, Tu, We, Th, Fr, Sa, Su (`text-[10px] font-semibold text-stone-400 uppercase`)                                                                                                                                                                     |
| Day cells         | Circular buttons (`aspect-square rounded-full`). Non-current-month: `text-stone-300`. Today: `text-brand-600 font-bold`. Selected: `bg-brand-500 text-white font-bold`. Event indicator: `w-1 h-1 rounded-full bg-brand-400` positioned below number. |

Clicking a date calls `onDateSelect(date)` which jumps the main FullCalendar to that date.

### Seasonal Time Machine Banner

Shown above the FullCalendar grid when `viewSeason` is active. `p-3 border-b bg-stone-50`.

| Element              | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| Season label         | "[emoji] [Season Name] ([date range])" -- `text-sm font-semibold`         |
| Sensory anchor       | "The Vibe: [text]" -- `text-xs text-stone-600 italic`                     |
| Peak ingredients     | "Peak Ingredients: [comma-separated up to 6]" -- `text-xs text-stone-600` |
| Go-to dishes         | "Go-To Dishes: [comma-separated up to 3]" -- `text-xs text-stone-600`     |
| "Time Machine" label | Right-aligned, `text-xs text-stone-400`                                   |

Season emojis: Winter = snowflake, Spring = cherry blossom, Summer = sun, Autumn = leaf.

### FullCalendar Configuration

| Setting                 | Value                                                       |
| ----------------------- | ----------------------------------------------------------- |
| Plugins                 | dayGrid, timeGrid, interaction, list                        |
| Initial view            | dayGridMonth                                                |
| Custom header toolbar   | false (toolbar above is custom)                             |
| Editable                | true                                                        |
| Event start editable    | true                                                        |
| Event duration editable | false                                                       |
| dayMaxEvents            | 3 (overflow: "+N more" popover)                             |
| moreLinkClick           | "popover"                                                   |
| nowIndicator            | true                                                        |
| weekNumbers             | false                                                       |
| fixedWeekCount          | false                                                       |
| eventDisplay            | "block"                                                     |
| dayHeaderFormat         | Short weekday (e.g., "Mon")                                 |
| slotMinTime             | "06:00:00"                                                  |
| slotMaxTime             | "23:00:00"                                                  |
| slotDuration            | "00:30:00"                                                  |
| slotLabelInterval       | "01:00:00"                                                  |
| slotLabelFormat         | `{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }` |
| allDaySlot              | true (labeled "All Day")                                    |
| height                  | "auto"                                                      |

### Event Rendering

**Month view**: Compact row -- prep status dot (2px circle) + optional time text (`text-[10px]`) + title (`text-xs font-medium truncate`).

**Week/Day view**: Block -- dot (2px) + title (`text-xs font-semibold truncate`) + client name (`text-[10px]`) + time text.

**List view**: Full row -- dot (2.5px) + title (`font-medium text-stone-900`) + client name + guest count.

**Holiday rendering**: `bg-#fff1f2`, border `#f43f5e` (3px left), `color #881337`, cursor default, 0.9 opacity. Non-clickable.

**Event status styling (applied via `eventDidMount`):**

| Status      | Background | Border  | Text    | Extra                      |
| ----------- | ---------- | ------- | ------- | -------------------------- |
| draft       | #f5f3ef    | #d6d3d1 | #57534e |                            |
| proposed    | #dbeafe    | #93c5fd | #1e40af |                            |
| accepted    | #fef3c7    | #fcd34d | #92400e |                            |
| paid        | #d1fae5    | #6ee7b7 | #065f46 |                            |
| confirmed   | #fcf0e0    | #f3c596 | #b15c26 |                            |
| in_progress | #fef9f3    | #e88f47 | #8e4a24 |                            |
| completed   | #d1fae5    | #34d399 | #065f46 |                            |
| inquiry     | #f3f4f6    | #9ca3af | #6b7280 | Dashed border, 0.8 opacity |
| prep day    | #fef3c7    | #f59e0b | #92400e |                            |

All events: `border-left-width: 3px`, `border-radius: 6px`, `cursor: pointer`.

**Prep status dot colors:**

| Status      | Color            |
| ----------- | ---------------- |
| ready       | #22c55e (green)  |
| partial     | #eab308 (yellow) |
| not_started | #ef4444 (red)    |
| (fallback)  | #94a3b8 (gray)   |

### Click Interactions

| Action                   | Result                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Click an event           | Opens EventDetailPopover at event position                                                  |
| Click an empty date/time | Navigates to `/events/new?event_date=YYYY-MM-DD` (+ `&serve_time=HH:MM` in time grid views) |
| Drag an event            | Reschedules. Toast: "Rescheduling..." then success/error message. Auto-refreshes.           |
| Drag a prep day          | Reverted (not allowed)                                                                      |
| Drag an inquiry hold     | Reverted (not allowed)                                                                      |
| Resize an event          | Reverted (not yet implemented)                                                              |

### Event Detail Popover

**File:** `components/scheduling/event-detail-popover.tsx`

Fixed-position popover (`fixed z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-80`). Rounded white card with shadow. Auto-adjusts position to stay within viewport. Animation: `fade-in slide-in-from-top-2 duration-200`.

**Closes on:** Clicking outside (`.event-popover` and `.fc-event`), pressing Escape.

#### Header Section

| Element      | Description                                                           |
| ------------ | --------------------------------------------------------------------- |
| Background   | Amber-50 for prep, gray-50 for inquiry, surface-accent for events     |
| Title (h3)   | `font-semibold text-stone-900 truncate text-base`                     |
| Client name  | `text-sm text-stone-500`                                              |
| Close button | X SVG icon, `text-stone-400 hover:text-stone-600`, aria-label "Close" |

#### Status Badges

| Badge            | Condition                    | Style                                                  |
| ---------------- | ---------------------------- | ------------------------------------------------------ |
| Event status     | Always                       | Colored pill -- colors match `STATUS_BADGE_COLORS` map |
| Prep status      | When prep status data exists | "Prep: Ready/Partial/Not Started" -- green/yellow/red  |
| "Prep Day"       | When `dayType === 'prep'`    | `bg-amber-100 text-amber-700`                          |
| "Tentative Hold" | When `dayType === 'inquiry'` | `bg-gray-100 text-gray-600 border-dashed`              |

Status labels supported: Draft, Proposed, Accepted, Paid, Confirmed, In Progress, Completed, Cancelled, New, Awaiting Client, Awaiting Chef, Quoted, Declined, Expired.

#### Detail Rows

| Row         | Icon                   | Content                                                                |
| ----------- | ---------------------- | ---------------------------------------------------------------------- |
| Date        | Calendar               | Full date (e.g., "Saturday, February 22, 2026")                        |
| Time        | (included in date row) | "Service at [time]" + "(arrive [arrivalTime])" -- hidden for prep days |
| Location    | Map pin                | Address + city (if `locationAddress` exists)                           |
| Guest count | People                 | "N guests" (if > 0)                                                    |

#### Footer Actions

| Condition     | Buttons                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Regular event | "View Event" (link, `bg-brand-500 text-white`) + "Timeline" (link, bordered, to `/events/{id}#timeline`) |
| Inquiry       | "View Inquiry" (link, `bg-stone-600 text-white`, to `/inquiries/{id}`)                                   |

### Agenda View

**File:** `components/scheduling/agenda-view.tsx`

Shown when "Agenda" tab is selected. Replaces the FullCalendar grid.

#### Empty State

| Element      | Description                                                                    |
| ------------ | ------------------------------------------------------------------------------ |
| Icon         | Calendar SVG in stone-100 circle (`w-16 h-16 rounded-full bg-stone-100`)       |
| Heading (h3) | "No events this period" (`text-lg font-semibold text-stone-900`)               |
| Text         | "Your schedule is clear. Navigate to a different month or create a new event." |

#### Populated View

White bordered card: `bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden`.

**Header bar**: List icon + "Agenda" label (`text-sm font-semibold text-stone-700`) + "N day(s) booked" count (`text-xs text-stone-500`).

Events grouped by month, then by day. Only days with events shown.

**Month header**: Sticky, `bg-surface-accent`, `text-xs font-bold text-stone-500 uppercase tracking-wider`.

**Day row layout**: Flex. Left column (date, `w-14`): 3-letter day abbreviation + large day number. Today: white number on brand-500 circle. Right column: event cards.

**Event card**:

| Element             | Description                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Card style          | `group rounded-lg border p-3 cursor-pointer hover:shadow-sm`. Prep: `border-amber-200 bg-amber-50/50`. Regular: `border-stone-200 bg-white`. |
| Prep status dot     | Colored circle matching prep status                                                                                                          |
| Title               | `font-medium text-sm text-stone-900 truncate`                                                                                                |
| Client name         | `text-xs text-stone-500`, indented                                                                                                           |
| Status badge        | Small pill, top-right, colored by status                                                                                                     |
| Time                | Clock icon + formatted time (non-prep only)                                                                                                  |
| "Prep Day" label    | `text-amber-600 font-medium` (prep only)                                                                                                     |
| Guest count         | People icon + count                                                                                                                          |
| Location            | Map pin icon + city name (truncated)                                                                                                         |
| "View details" link | `text-xs font-medium text-brand-600` -- appears on hover (`opacity-0 group-hover:opacity-100`), links to `/events/{id}`                      |
| Click               | Opens EventDetailPopover at card position                                                                                                    |

### Schedule Page Legend

Centered row below calendar: `flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-stone-500 justify-center`.

**Event status swatches**: Draft, Proposed, Confirmed, Paid, Completed, Prep Day, Tentative Hold (dashed border).

**Separator**: Vertical border line.

**Prep status dots**: Ready (green), Partial (yellow), Not Started (red).

**Separator**: Vertical border line.

**Other**: Holiday (#fff1f2 bg, #f43f5e border).

### Reschedule Toast

Fixed bottom-center: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50`. Styled: `bg-stone-900 text-white text-sm font-medium rounded-lg shadow-lg`.

Messages:

- "Rescheduling..." (while saving)
- "Event rescheduled" (success)
- "Event rescheduled -- N prep block(s) cleared" (success with prep blocks affected)
- Error message (on failure)

Auto-dismisses after 3-3.5 seconds.

### Seasonal Sidebar

**File:** `components/seasonal/seasonal-sidebar.tsx`

Shown in right column on lg screens when palette exists. Left border accent: sky-400 (Winter), emerald-400 (Spring), amber-400 (Summer), orange-400 (Autumn). `border-l-4 pl-4`.

#### Season Header Card

| Element          | Description                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Season name (h3) | `font-semibold text-stone-900`, "[Season Name] ([date range])"                                 |
| "Edit" link      | `text-xs text-brand-600 hover:text-brand-700`, navigates to `/settings/repertoire/{paletteId}` |
| Sensory anchor   | `text-sm text-stone-600`. Or empty state: "No notes yet. [Add notes]" link                     |

#### Empty State Card

"Your [Season] palette is empty." + "Add notes, seasonal ingredients, and go-to dishes to build your reference."

#### "What's In Season" Card

Card title: "What's In Season" (`CardTitle text-sm`).

Each ingredient: `text-sm p-2 rounded-lg`. Active items on `bg-stone-50`. Ending-soon items: `bg-amber-50 border border-amber-100` with "ending soon" in `text-amber-600 font-medium`.

Shows: ingredient name (bold), date range, optional notes.

#### "Go-To Dishes" Card

Card title: "Go-To Dishes" (`CardTitle text-sm`).

Bulleted list: brand-500 bullet + dish name (bold) + optional notes (stone-500).

---

## 7. Waitlist Management

| Property                  | Value                                       |
| ------------------------- | ------------------------------------------- |
| **Route**                 | `/waitlist`                                 |
| **Server File**           | `app/(chef)/waitlist/page.tsx`              |
| **Client File**           | `app/(chef)/waitlist/waitlist-add-form.tsx` |
| **Page Title (metadata)** | `Waitlist -- ChefFlow`                      |
| **Auth**                  | `requireChef()`                             |
| **Max Width**             | `max-w-2xl`                                 |

### Headings

| Element  | Text                                                                          | Style                               |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| h1       | "Waitlist"                                                                    | `text-2xl font-bold text-stone-900` |
| Subtitle | "Clients waiting for a date to open. Contact them when availability changes." | `text-sm text-stone-500`            |

### Empty State

Simple text: "No active waitlist entries." (`text-sm text-stone-500`). Shown when no waiting or contacted entries exist.

### Waitlist Entry Cards

Shows entries with status "waiting" and "contacted". Each entry is a Card component.

| Element      | Description                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| Client name  | `font-medium text-stone-900` or "Unknown client" if missing                  |
| Status badge | Badge component with status-specific variant (see below)                     |
| Date info    | Formatted as "Feb 23, 2026". If `requested_date_end`: " -- Feb 25" appended. |
| Occasion     | After dot separator (if present)                                             |
| Guest count  | "N guests" after dot separator (if present)                                  |
| Notes        | `text-xs text-stone-400` (if present)                                        |

#### Status Badge Mapping

| Status    | Label       | Badge Variant              |
| --------- | ----------- | -------------------------- |
| waiting   | "Waiting"   | `warning`                  |
| contacted | "Contacted" | `info` (cast as `default`) |
| converted | "Converted" | `success`                  |
| expired   | "Expired"   | `default`                  |

#### Action Buttons (per entry)

| Button           | Variant     | Size | Condition                       | Action                                         |
| ---------------- | ----------- | ---- | ------------------------------- | ---------------------------------------------- |
| "Mark Contacted" | `secondary` | `sm` | Status = "waiting" only         | Server action form: `contactWaitlistEntry(id)` |
| "Expire"         | `ghost`     | `sm` | Always shown (`text-stone-400`) | Server action form: `expireWaitlistEntry(id)`  |

Both buttons are wrapped in `<form>` elements with inline server actions (no JavaScript required).

### Add to Waitlist Form

Located at the bottom in a Card. Section heading (h2): "Add to Waitlist" (`text-base font-semibold text-stone-900 mb-3`).

**File:** `app/(chef)/waitlist/waitlist-add-form.tsx`

#### Form Fields

| Field          | Label            | Type                                     | Required              | Placeholder                       | Validation |
| -------------- | ---------------- | ---------------------------------------- | --------------------- | --------------------------------- | ---------- |
| Requested date | "Requested date" | Date (`<Input type="date">`)             | Yes (HTML `required`) | Browser default                   | Required   |
| Guest count    | "Guest count"    | Number (`<Input type="number" min="1">`) | No                    | "Optional"                        | Min 1      |
| Occasion       | "Occasion"       | Text (`<Input>`)                         | No                    | "Birthday dinner, anniversary..." | None       |
| Notes          | "Notes"          | Text (`<Input>`)                         | No                    | "Any additional context"          | None       |

Layout: Date and guest count in 2-column grid; occasion and notes full-width.

Labels: `text-xs font-medium text-stone-600 mb-1`.

#### Form Actions

| Button | Type     | Size | Label                           | State                 |
| ------ | -------- | ---- | ------------------------------- | --------------------- |
| Submit | `submit` | `sm` | "Add to Waitlist" / "Adding..." | Disabled while saving |

Error: `text-xs text-red-600` on server action failure.

On success: form clears all fields, page refreshes.

---

## 8. Shared Components Reference

### Calendar Entry Modal

**File:** `components/calendar/calendar-entry-modal.tsx`

Full-screen overlay: `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm`. White card: `rounded-2xl shadow-xl max-w-lg max-h-[90vh] overflow-y-auto`.

**Used by:** Month View ("+ New Entry" and "+ Add Entry"), Day View ("+ New Entry" and slot clicks).

#### Modal Header

| Element      | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| Title (h2)   | "New Calendar Entry" (`text-lg font-semibold text-stone-900`) |
| Close button | X character (`text-stone-400 hover:text-stone-600 text-xl`)   |

#### Entry Type Selector

Label: "Type" (`text-sm font-medium text-stone-700`). Types organized in three groups with uppercase category labels.

**Personal Group:**

| Type Value | Label         | Icon      | Default Blocks Bookings |
| ---------- | ------------- | --------- | ----------------------- |
| `vacation` | Vacation      | Beach     | Yes                     |
| `time_off` | Time Off      | Couch     | Yes                     |
| `personal` | Personal Appt | Clipboard | Yes                     |

**Business Group:**

| Type Value    | Label            | Icon       | Default Blocks Bookings |
| ------------- | ---------------- | ---------- | ----------------------- |
| `market`      | Farmers Market   | Leaf       | Yes                     |
| `festival`    | Food Festival    | Tent       | Yes                     |
| `class`       | Class / Teaching | Chef       | Yes                     |
| `photo_shoot` | Photo Shoot      | Camera     | Yes                     |
| `media`       | Media / Press    | Microphone | Yes                     |
| `meeting`     | Business Meeting | Handshake  | No                      |
| `admin_block` | Admin Block      | Folder     | No                      |
| `other`       | Other            | Pin        | No                      |

**Intentions Group:**

| Type Value        | Label           | Icon   | Default Blocks Bookings |
| ----------------- | --------------- | ------ | ----------------------- |
| `target_booking`  | Seeking Booking | Target | No                      |
| `soft_preference` | Prefer Day Off  | Cloud  | No                      |

Active type: filled background from `CALENDAR_COLORS`, white text. Inactive: `border-stone-200 text-stone-600 bg-stone-50 hover:bg-stone-100`.

Changing type auto-resets: title, blocking toggle, revenue, and public signal settings.

#### Form Fields

| Field      | Label              | Type                         | Required | Placeholder                            | Validation                                |
| ---------- | ------------------ | ---------------------------- | -------- | -------------------------------------- | ----------------------------------------- |
| Title      | "Title \*"         | Text (max 200)               | Yes      | Dynamic (e.g., "e.g. Time Off...")     | "Title is required"                       |
| Notes      | "Notes (optional)" | Textarea (2 rows, no resize) | No       | "Any additional notes..."              | None                                      |
| Start Date | "Start Date"       | Date                         | Yes      | Default: selected date or today        | Auto-adjusts end date if start > end      |
| End Date   | "End Date"         | Date (min = startDate)       | Yes      | Default: selected date or today        | "End date must be on or after start date" |
| All Day    | "All day"          | Checkbox                     | N/A      | N/A                                    | Checked by default                        |
| Start Time | "Start Time"       | Time                         | No       | Default: `defaultStartTime` or "09:00" | Only shown when "All day" unchecked       |
| End Time   | "End Time"         | Time                         | No       | Default: "17:00"                       | Only shown when "All day" unchecked       |

All inputs: `border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500`.

#### Blocking Toggle

Gray section: `bg-stone-50 rounded-lg p-3`.

| Element            | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| Checkbox           | `rounded border-stone-300 text-brand-600`                                 |
| Label              | "Block bookings for these date(s)" (`text-sm font-medium text-stone-700`) |
| Helper (checked)   | "These dates will be marked as unavailable." (`text-xs text-stone-500`)   |
| Helper (unchecked) | "These dates remain open for client bookings." (`text-xs text-stone-500`) |

#### Revenue Section (Conditional)

Shown for revenue-capable types: `market`, `festival`, `class`, `photo_shoot`, `media`, `other`.

Container: `border border-teal-200 rounded-lg p-4 bg-teal-50`.

| Element          | Description                                       |
| ---------------- | ------------------------------------------------- |
| Section label    | "Revenue" (`text-sm font-semibold text-teal-800`) |
| Revenue checkbox | "This engagement generates revenue"               |

**When revenue enabled:**

| Field            | Type                 | Description                                                                         |
| ---------------- | -------------------- | ----------------------------------------------------------------------------------- |
| Revenue type     | Radio group          | "Income (paid)" vs "Promotional (no pay)"                                           |
| Expected Revenue | Number with $ prefix | Only for "income" type. Step 0.01. Placeholder "0.00". Focus ring: `ring-teal-500`. |
| Revenue Notes    | Text input           | Placeholder "e.g. booth fee $400 + tips". Focus ring: `ring-teal-500`.              |

Stored as cents: `Math.round(parseFloat(value) * 100)`.

#### Public Signal Section (Conditional)

Shown only for `target_booking` type. Container: `border border-green-200 rounded-lg p-4 bg-green-50`.

| Element         | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| Section label   | "Public Availability Signal" (`text-sm font-semibold text-green-800`)                      |
| Public checkbox | "Show on my public profile" (`text-sm text-stone-700 font-medium`)                         |
| Helper          | "Clients visiting your profile will see this date as available, with a button to inquire." |

**When public enabled:**

| Field          | Type           | Description                                                                              |
| -------------- | -------------- | ---------------------------------------------------------------------------------------- |
| Public Message | Text (max 500) | Placeholder "e.g. Available for a Valentine's Day dinner". Focus ring: `ring-green-500`. |

#### Error Display

`text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2`.

#### Action Buttons

| Button | Variant     | Label                                       | Width    |
| ------ | ----------- | ------------------------------------------- | -------- |
| Cancel | `secondary` | "Cancel"                                    | `flex-1` |
| Submit | `primary`   | "Add to Calendar" (loading state supported) | `flex-1` |

### Protected Time Form

**File:** `components/calendar/protected-time-form.tsx`

Inline form (not a modal). Used from calendar or settings pages.

| Field      | Label        | Type               | Required | Placeholder                         | Validation                                 |
| ---------- | ------------ | ------------------ | -------- | ----------------------------------- | ------------------------------------------ |
| Title      | "Title"      | Text               | Yes      | "e.g. Family weekend, Recovery day" | "Please enter a title."                    |
| Start date | "Start date" | Date               | Yes      | Browser default                     | "Please select a start date."              |
| End date   | "End date"   | Date (min = start) | No       | Defaults to start date              | "End date must be on or after start date." |
| Block type | "Block type" | Select             | Yes      | N/A                                 | N/A                                        |

Block type options:

- `protected_personal` -- "Protected Personal Time"
- `rest` -- "Rest Day"

Labels: `text-xs font-medium text-stone-600`.
Inputs: `border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500`.

| Button | Variant   | Size | Label                      |
| ------ | --------- | ---- | -------------------------- |
| Cancel | `ghost`   | `sm` | "Cancel"                   |
| Submit | `primary` | `sm` | "Block Time" / "Saving..." |

Error: `text-sm text-red-600 rounded-lg bg-red-50 border border-red-100 px-3 py-2`.

### Availability Signal Toggle

**File:** `components/calendar/availability-signal-toggle.tsx`

Chef-facing settings component (embedded in settings pages, not standalone).

| Element        | Description                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Container      | `border border-stone-200 rounded-xl p-4`                                                                                                  |
| Title          | "Public Availability Signals" (`font-medium text-stone-900`)                                                                              |
| Description    | Explains target_booking dates on public profile                                                                                           |
| Toggle         | Custom switch (`role="switch"`, `h-6 w-11 rounded-full`). On: `bg-brand-600`. Off: `bg-stone-200`. Knob: `h-4 w-4 bg-white rounded-full`. |
| Active message | Green box (`text-xs text-green-700 bg-green-50 rounded-lg`): "Active -- your public target booking dates will appear on your profile."    |
| Error          | `text-xs text-red-600` if toggle save fails                                                                                               |

### Client Signal Notification Toggle

**File:** `components/calendar/client-signal-notification-toggle.tsx`

Client-facing settings component. Same structure as Availability Signal Toggle.

| Element     | Description                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Title       | "Chef Availability Notifications"                                                                    |
| Description | "When enabled, your chef can notify you when they are actively seeking a booking on specific dates." |
| Toggle      | Same custom switch as above                                                                          |
| On message  | Green: "On -- you will be notified when your chef posts available booking dates."                    |
| Off message | Gray: "Off -- you will not receive availability date notifications."                                 |
| Error       | Red text if save fails                                                                               |

---

## 9. Color System Quick Reference

All calendar colors defined in `lib/calendar/colors.ts`.

### Event Status Colors

| Type Key        | Hex     | Usage                               |
| --------------- | ------- | ----------------------------------- |
| event_confirmed | #F59E0B | Confirmed, paid, in-progress events |
| event_draft     | #FDE68A | Draft, proposed, accepted events    |
| event_cancelled | #D1D5DB | Cancelled events                    |

### Calendar Entry Type Colors

| Type               | Hex                  | Category   |
| ------------------ | -------------------- | ---------- |
| vacation           | #1E3A8A (navy)       | Personal   |
| time_off           | #7C3AED (purple)     | Personal   |
| personal           | #A78BFA (lavender)   | Personal   |
| market             | #0D9488 (teal)       | Business   |
| festival           | #059669 (emerald)    | Business   |
| class              | #0891B2 (cyan)       | Business   |
| photo_shoot        | #E11D48 (rose)       | Business   |
| media              | #DB2777 (pink)       | Business   |
| meeting            | #2563EB (blue)       | Business   |
| admin_block        | #78716C (stone)      | Business   |
| other              | #6B7280 (gray)       | Business   |
| target_booking     | #4ADE80 (sage green) | Intentions |
| soft_preference    | #7DD3FC (sky blue)   | Intentions |
| inquiry            | #CA8A04 (amber/gold) | Leads      |
| waitlist           | #EA580C (orange)     | Leads      |
| availability_block | #EF4444 (red)        | Blocked    |

### Prep Block Colors

| Type               | Hex               |
| ------------------ | ----------------- |
| grocery_run        | #16A34A (green)   |
| specialty_sourcing | #65A30D (lime)    |
| prep_session       | #059669 (emerald) |
| packing            | #166534 (forest)  |
| travel_to_event    | #475569 (slate)   |
| equipment_prep     | #6B7280 (gray)    |
| mental_prep        | #4338CA (indigo)  |
| admin              | #78716C (stone)   |
| cleanup            | #737373 (neutral) |
| custom             | #737373 (neutral) |

### Other Colors

| Type | Hex            |
| ---- | -------------- |
| call | #3B82F6 (blue) |

### Border Styles

| Type            | Style  | Meaning                |
| --------------- | ------ | ---------------------- |
| target_booking  | dotted | Non-blocking intention |
| soft_preference | dashed | Soft preference        |
| inquiry         | dashed | Lead / tentative       |
| waitlist        | dashed | Lead / tentative       |
| Everything else | solid  | Standard               |

---

## 10. Filter System Reference

Defined in `lib/calendar/constants.ts`. Used only on the Month View calendar page.

| Filter Key      | Default | Affects                                     |
| --------------- | ------- | ------------------------------------------- |
| showEvents      | ON      | Confirmed/paid/in-progress events           |
| showDraftEvents | ON      | Draft and proposed events                   |
| showPrepBlocks  | ON      | All prep block types                        |
| showCalls       | ON      | Scheduled calls                             |
| showPersonal    | ON      | Vacation, time off, personal appointments   |
| showBusiness    | ON      | Markets, festivals, classes, meetings, etc. |
| showIntentions  | ON      | Target bookings, soft preferences           |
| showLeads       | OFF     | Inquiries, waitlist entries                 |

Leads are OFF by default to reduce visual noise for everyday chef workflows.

### Built-In Saved Views

| View          | Filters Enabled                   |
| ------------- | --------------------------------- |
| Full View     | All except Leads                  |
| Events Only   | Events + Draft Events             |
| Ops View      | Events + Prep + Calls             |
| Planning View | Draft Events + Intentions + Leads |

---

## 11. Cross-Page Navigation Map

```
/calendar (Month) -----> /calendar/day
      |                    |
      |   <-------------  |
      |                    |
      +----------------> /calendar/week -----> /calendar/year
      |                    ^                       |
      |                    |                       |
      |                    +-----------------------+
      |
      +----------------> /calendar/share

/schedule (FullCalendar) --- separate entry point, not linked from /calendar
/waitlist --- separate entry point, not linked from /calendar
```

### All Navigation Links

| From             | To                          | Link Element                                            |
| ---------------- | --------------------------- | ------------------------------------------------------- |
| `/calendar`      | `/calendar/day`             | "Day" button (top nav)                                  |
| `/calendar`      | `/calendar/week`            | "Week" button (top nav)                                 |
| `/calendar`      | `/calendar/year`            | "Year" button (top nav)                                 |
| `/calendar`      | `/events/new`               | "Create an Event" (empty state)                         |
| `/calendar`      | `/inquiries/new`            | "Log an Inquiry" (empty state)                          |
| `/calendar`      | Event/item URLs             | "View -->" links in selected date detail                |
| `/calendar/day`  | `/calendar`                 | "Month" button                                          |
| `/calendar/day`  | `/calendar/week`            | "Week" button                                           |
| `/calendar/day`  | `/calendar/year`            | "Year" button                                           |
| `/calendar/day`  | Event/item URLs             | "View -->" links on timed items                         |
| `/calendar/week` | `/calendar/year`            | "Year View" button                                      |
| `/calendar/week` | `/calendar`                 | "Availability" button                                   |
| `/calendar/week` | `/events/{id}`              | Event cards (click) + gap alert event links             |
| `/calendar/year` | `/calendar/week`            | Week cells (click any week) + "Week Planner" button     |
| `/calendar/year` | `/calendar/year?year=N`     | Year navigation links                                   |
| `/schedule`      | `/events/new`               | "+ Event" button + empty date click                     |
| `/schedule`      | `/events/{id}`              | Event popover "View Event" link + agenda "View details" |
| `/schedule`      | `/events/{id}#timeline`     | Event popover "Timeline" link                           |
| `/schedule`      | `/inquiries/{id}`           | Event popover "View Inquiry" link                       |
| `/schedule`      | `/settings/repertoire/{id}` | Seasonal sidebar "Edit" link                            |

---

_End of UI Audit -- Calendar System_

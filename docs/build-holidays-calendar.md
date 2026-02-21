# Build: US Holidays on Calendar

## What Changed

Added 24 US holidays to the ChefFlow scheduling calendar as Google Calendar-style all-day banners.

## Files Created / Modified

| File                                      | Action                                          |
| ----------------------------------------- | ----------------------------------------------- |
| `lib/holidays/us-holidays.ts`             | Created — pure holiday computation utility      |
| `components/scheduling/calendar-view.tsx` | Modified — holiday state, rendering, and legend |

---

## How It Works

### `lib/holidays/us-holidays.ts`

Pure utility file — no server, no DB, no external dependencies. Exports a single function:

```ts
getUSHolidaysInRange(start: string, end: string): HolidayEvent[]
```

Computes all 24 US holidays that fall within the given date range. Handles:

- **Fixed-date holidays** (e.g. Independence Day = July 4)
- **Floating holidays** via `nthWeekday()` (e.g. MLK Day = 3rd Monday of January)
- **Last-weekday holidays** via `lastWeekday()` (e.g. Memorial Day = last Monday of May)
- **Easter-relative holidays** via the Anonymous Gregorian algorithm (Good Friday, Easter, Mardi Gras)
- **Derived holidays** (Black Friday = day after Thanksgiving, Ash Wednesday = 46 days before Easter)

### Holiday List (24 total)

**Federal (11):** New Year's Day, MLK Day, Presidents' Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas

**Cultural (13):** Groundhog Day, Valentine's Day, Mardi Gras, St. Patrick's Day, Good Friday, Easter, Mother's Day, Cinco de Mayo, Father's Day, Halloween, Black Friday, Christmas Eve, New Year's Eve

### Display

Holidays appear as **rose-colored all-day banners** at the top of each day cell, identical in style to how Google Calendar shows them. They are:

- Non-draggable (`editable: false`)
- Non-clickable (guarded at the top of `handleEventClick`)
- Styled with rose-50 background / rose-500 border / rose-900 text
- Listed in the calendar legend as "Holiday"

### Integration

`CalendarView` maintains a separate `holidayEvents` state array. On every `handleDatesSet` (fired by FullCalendar whenever the visible date range changes), holidays are recomputed for the visible range and merged with chef events when passed to FullCalendar:

```ts
events={[...events, ...holidayEvents]}
```

Since `getUSHolidaysInRange` is pure synchronous computation, there is no loading state, no API call, and no server round-trip.

---

## Why This Approach

- **No external API** — holiday data never goes stale, never requires an API key, works offline
- **No DB migration** — holidays are computed on demand from date math
- **Separate state** — holidays don't pollute the `CalendarEvent[]` typed array; they're their own `HolidayEvent[]` type
- **Agenda view excluded** — the agenda view intentionally shows only days with booked chef events; holiday-only days staying out of it is correct behavior

---

## Build Verification

- `npx tsc --noEmit --skipLibCheck` → 0 errors in new files
- `npx next build --no-lint` → exit 0

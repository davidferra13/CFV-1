# Seasonal Availability Management (Feature 4.7)

## Purpose

Chefs who travel seasonally (e.g., Hamptons in summer, Aspen in winter) need to manage location-based availability periods. This feature provides a year-at-a-glance calendar, per-period booking rules, and conflict checking.

## Database

**Table:** `seasonal_availability_periods`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| chef_id | uuid FK | References chefs(id), RLS-scoped |
| period_name | text | e.g. "Hamptons Summer" |
| location | text | e.g. "Hamptons, NY" |
| start_date | date | Period start |
| end_date | date | Must be after start_date (CHECK constraint) |
| is_accepting_bookings | boolean | Whether chef takes bookings during this period |
| max_events_per_week | int | Capacity cap per week |
| travel_radius_miles | int | Nullable, how far chef will travel from period location |
| notes | text | Freeform notes |
| recurring_yearly | boolean | If true, period repeats annually |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Migration:** `supabase/migrations/20260401000030_seasonal_availability.sql`

## Server Actions

**File:** `lib/scheduling/seasonal-availability-actions.ts`

- `getSeasonalPeriods()` - All periods for the chef, ordered by start date
- `getActiveSeasonalPeriod()` - Current period based on today's date
- `createSeasonalPeriod(input)` - Creates with overlap detection
- `updateSeasonalPeriod(id, input)` - Updates with overlap detection (excludes self)
- `deleteSeasonalPeriod(id)` - Removes a period
- `getAvailabilityForDate(date)` - Which period covers this date, booking status, location
- `getYearOverview()` - All periods for the current year with deterministic color assignment
- `checkBookingConflict(date)` - Can the chef accept a booking? Checks seasonal rules + events-per-week capacity

All actions use `requireChef()` and scope by `user.tenantId!`. All date logic is deterministic (Formula > AI).

## UI Components

### SeasonalCalendar (`components/scheduling/seasonal-calendar.tsx`)
- Year-at-a-glance view with 12 month mini-grids
- Color-coded by location (deterministic palette)
- Today indicator with ring highlight
- Click any day within a period to edit that period
- Legend shows location/color mapping
- Error state on fetch failure (never silent zeros)

### SeasonalPeriodForm (`components/scheduling/seasonal-period-form.tsx`)
- Create/edit form for seasonal periods
- Fields: name, location, date range, booking toggle, max events/week, travel radius, notes, recurring yearly
- Client-side + server-side overlap validation
- Save/cancel/delete actions with try/catch error handling
- Pending states on all buttons

### LocationBadge (`components/scheduling/location-badge.tsx`)
- Small badge for header/nav showing chef's current location
- Falls back to "Home base" when no active seasonal period
- Non-blocking fetch (failure shows fallback, not error)

## Design Decisions

- **Formula > AI:** All date comparisons, overlap detection, week calculations, and color assignment are deterministic. Zero AI involvement.
- **Overlap prevention:** Both create and update check for date range overlaps before writing. Overlapping periods are rejected with a descriptive error naming the conflicting period(s).
- **Booking conflict:** `checkBookingConflict()` checks both the seasonal period's `is_accepting_bookings` flag and the week's event count against `max_events_per_week`.
- **Color assignment:** Deterministic by location order. Same location always gets the same color within a year view.
- **RLS:** Standard chef-scoped RLS using `user_roles` table lookup.

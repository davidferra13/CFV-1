# Comprehensive Chef Calendar System

## Summary

This document records the full implementation of the unified calendar system for ChefFlow V1. The calendar was previously a simple availability blocker; it is now a complete scheduling intelligence layer giving chefs a whole-picture view of every commitment — personal, professional, aspirational, and logistical — in a single color-coded interface.

---

## Why This Was Built

The previous calendar only showed confirmed events and prep blocks. This meant:

- A chef on vacation had no way to block the calendar — creating double-booking risk
- Farmers markets, cooking classes, and food festivals were tracked nowhere in the system
- There was no way to signal "I really want to book a dinner on Valentine's Day"
- Multi-day commitments (3-day food festival, 1-week vacation) couldn't be represented
- The calendar showed ~⅓ of the chef's actual real-world schedule

---

## Architecture

### New Database Tables

**`chef_calendar_entries`** (`supabase/migrations/20260304000007_chef_calendar_entries.sql`)

- 13 entry types via `chef_calendar_entry_type` ENUM
- Date range support (`start_date`, `end_date`) — vacations can span multiple days
- `all_day` flag + `start_time`/`end_time` for timed entries
- `blocks_bookings` — auto-set by type but chef-overridable
- Revenue tracking: `is_revenue_generating`, `revenue_type` ('income' | 'promotional'), `expected_revenue_cents`, `actual_revenue_cents`
- Public signal support: `is_public`, `public_note` (only for `target_booking` type)
- `color_override` for custom colors
- `is_completed` / `completed_at` for marking entries done

**`availability_signal_notification_log`** (`supabase/migrations/20260304000008_public_availability_signals.sql`)

- Deduplication table: prevents re-notifying clients about the same signal
- UNIQUE constraint on `(calendar_entry_id, client_id)`

**Column additions** (Migration 08):

- `chefs.show_availability_signals BOOLEAN DEFAULT false` — chef opt-in to show target dates publicly
- `clients.availability_signal_notifications BOOLEAN DEFAULT true` — client opt-out from notifications

---

## Calendar Entry Types

### Hard Blocks (blocks bookings by default)

| Type          | Color              | Description                                    |
| ------------- | ------------------ | ---------------------------------------------- |
| `vacation`    | Navy `#1E3A8A`     | Multi-day personal travel                      |
| `time_off`    | Purple `#7C3AED`   | Rest days                                      |
| `personal`    | Lavender `#A78BFA` | Doctor appts, errands                          |
| `market`      | Teal `#0D9488`     | Farmers market / pop-up                        |
| `festival`    | Emerald `#059669`  | Multi-day food festival                        |
| `class`       | Cyan `#0891B2`     | Teaching a cooking class                       |
| `photo_shoot` | Rose `#E11D48`     | Brand/food photography                         |
| `media`       | Pink `#DB2777`     | Press, podcast, interview                      |
| `meeting`     | Blue `#2563EB`     | Business meetings (non-blocking by default)    |
| `admin_block` | Stone `#78716C`    | Protected admin time (non-blocking by default) |
| `other`       | Gray `#6B7280`     | Catch-all custom                               |

### Soft Intentions (does NOT block bookings)

| Type              | Color          | Border | Description                              |
| ----------------- | -------------- | ------ | ---------------------------------------- |
| `target_booking`  | Sage `#4ADE80` | Dotted | Chef hopes to book a dinner on this date |
| `soft_preference` | Sky `#7DD3FC`  | Dashed | Would prefer off but open to events      |

---

## New Library Files

| File                                      | Purpose                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `lib/calendar/colors.ts`                  | Single source of truth for all calendar colors, border styles, category mappings, legend data |
| `lib/calendar/entry-actions.ts`           | Full CRUD for `chef_calendar_entries` + public signal notification                            |
| `lib/calendar/actions.ts`                 | Unified aggregator — merges all 7 data sources into `UnifiedCalendarItem[]`                   |
| `lib/calendar/signal-settings-actions.ts` | Chef opt-in + client opt-out server actions                                                   |

### `UnifiedCalendarItem` Shape

All calendar views consume a common normalized shape:

```typescript
type UnifiedCalendarItem = {
  id: string
  type:
    | 'event'
    | 'prep_block'
    | 'call'
    | 'availability_block'
    | 'waitlist'
    | 'calendar_entry'
    | 'inquiry'
  category:
    | 'events'
    | 'draft'
    | 'prep'
    | 'calls'
    | 'personal'
    | 'business'
    | 'intentions'
    | 'leads'
    | 'blocked'
  title: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD (same as startDate for single-day)
  startTime?: string // HH:MM
  endTime?: string
  allDay: boolean
  color: string // hex
  borderStyle: 'solid' | 'dashed' | 'dotted'
  url?: string // deep link
  isBlocking: boolean
  status?: string
  subType?: string
  isMultiDay: boolean
}
```

---

## New UI Components

| Component                        | Location                                                    | Purpose                                                                                   |
| -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `CalendarFilterPanel`            | `components/calendar/calendar-filter-panel.tsx`             | 8-category pill toggles; state persisted to localStorage                                  |
| `CalendarEntryModal`             | `components/calendar/calendar-entry-modal.tsx`              | Full creation modal with type selector, date range, revenue fields, public signal section |
| `CalendarLegend`                 | `components/calendar/calendar-legend.tsx`                   | Collapsible color legend grouped by category                                              |
| `AvailabilitySignalToggle`       | `components/calendar/availability-signal-toggle.tsx`        | Chef settings toggle for public availability signals                                      |
| `ClientSignalNotificationToggle` | `components/calendar/client-signal-notification-toggle.tsx` | Client opt-out toggle on their profile page                                               |

### Filter System

8 filter categories, all default ON except Leads:

```typescript
type CalendarFilters = {
  showEvents: boolean // confirmed events
  showDraftEvents: boolean // draft/proposed events
  showPrepBlocks: boolean // all prep block types
  showCalls: boolean // scheduled calls
  showPersonal: boolean // vacation, time_off, personal
  showBusiness: boolean // market, festival, class, etc.
  showIntentions: boolean // target_booking, soft_preference
  showLeads: boolean // inquiries, waitlist (default: OFF)
}
```

Stored in `localStorage('chef-calendar-filters-{chefId}')`.

---

## Updated Views

### Month View (`app/(chef)/calendar/`)

- Complete rewrite of `availability-calendar-client.tsx`
- Unified `UnifiedCalendarItem[]` replaces simple blocked/available logic
- Color dots (up to 4 visible per day, overflow count)
- Multi-day entry support (vacations, markets span multiple day cells)
- Filter panel at top; legend collapsible at bottom
- "New Entry" button → `CalendarEntryModal`
- Selected date detail panel shows all items as colored pills

### Week View (`app/(chef)/calendar/week/`)

- Updated `week-planner-client.tsx` to accept `calendarEntries`
- Multi-day entries shown as full-row colored banners above the 7-column grid
- Single-day personal/business entries shown as mini-pills per day column

### Day View (`app/(chef)/calendar/day/`) — NEW

- Full time-slotted grid: 6am–midnight in 30-minute slots
- All-day banner area at top
- Timed items placed in their exact time slots
- Click empty slot → opens `CalendarEntryModal` pre-filled with time
- Prev/next day navigation, "Go to Today" button

---

## Revenue Integration (Financials)

`chef_calendar_entries` with `is_revenue_generating = true` surface in `/financials` under "Other Income — Markets & Classes":

- **Confirmed Income**: sum of `actual_revenue_cents` from completed income entries
- **Expected (Upcoming)**: sum of `expected_revenue_cents` from planned income entries
- **Promotional Appearances**: count of entries where `revenue_type = 'promotional'`
- Per-entry table: date, type, title, expected, actual, status

This is separate from the immutable ledger (which is event-specific). Market income is tracked as its own category for financial visibility.

---

## Public Availability Signals

### How It Works

1. Chef enables "Show availability signals" in Settings → toggle sets `chefs.show_availability_signals = true`
2. Chef creates a `target_booking` calendar entry, marks `is_public = true`, optionally adds a `public_note`
3. Chef calls `notifyClientsOfPublicSignal(entryId)` → inserts rows into `availability_signal_notification_log` for all opted-in clients
4. Public chef profile (`/chef/[slug]`) shows an "Available Dates" section listing all public signals with CTA buttons to inquire

### Client Side

- Clients default to `availability_signal_notifications = true` (opted in)
- Client can opt out via **Notification Preferences** section on their profile page (`/my-profile`)
- `ClientSignalNotificationToggle` component handles the toggle with optimistic UI

---

## Files Changed

| File                                                                 | Change                                            |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| `supabase/migrations/20260304000007_chef_calendar_entries.sql`       | NEW — chef_calendar_entries table                 |
| `supabase/migrations/20260304000008_public_availability_signals.sql` | NEW — signal columns + notification log           |
| `lib/calendar/colors.ts`                                             | NEW — centralized color system                    |
| `lib/calendar/entry-actions.ts`                                      | NEW — CRUD + notify                               |
| `lib/calendar/actions.ts`                                            | NEW — unified aggregator                          |
| `lib/calendar/signal-settings-actions.ts`                            | NEW — chef/client signal settings                 |
| `components/calendar/calendar-filter-panel.tsx`                      | NEW                                               |
| `components/calendar/calendar-entry-modal.tsx`                       | NEW                                               |
| `components/calendar/calendar-legend.tsx`                            | NEW                                               |
| `components/calendar/availability-signal-toggle.tsx`                 | NEW                                               |
| `components/calendar/client-signal-notification-toggle.tsx`          | NEW                                               |
| `app/(chef)/calendar/availability-calendar-client.tsx`               | MAJOR REWRITE                                     |
| `app/(chef)/calendar/page.tsx`                                       | UPDATED — unified data, day view nav button       |
| `app/(chef)/calendar/week/page.tsx`                                  | UPDATED — fetch calendarEntries                   |
| `app/(chef)/calendar/week/week-planner-client.tsx`                   | UPDATED — multi-day banners + entry pills         |
| `app/(chef)/calendar/day/page.tsx`                                   | NEW — day view server page                        |
| `app/(chef)/calendar/day/day-view-client.tsx`                        | NEW — time-slotted grid                           |
| `app/(public)/chef/[slug]/page.tsx`                                  | UPDATED — Available Dates section                 |
| `app/(chef)/settings/page.tsx`                                       | UPDATED — AvailabilitySignalToggle                |
| `app/(chef)/financials/page.tsx`                                     | UPDATED — fetch marketIncome                      |
| `app/(chef)/financials/financials-client.tsx`                        | UPDATED — Other Income section                    |
| `app/(client)/my-profile/page.tsx`                                   | UPDATED — ClientSignalNotificationToggle          |
| `components/navigation/nav-config.tsx`                               | UPDATED — Day/Week/Year view links under Calendar |

---

## Migration Deployment

These migrations need to be applied to the remote Supabase database:

```bash
supabase db push --linked
```

Migrations to apply:

- `20260304000007_chef_calendar_entries.sql`
- `20260304000008_public_availability_signals.sql`

Both are fully additive (CREATE TABLE + ALTER TABLE ADD COLUMN). No existing data is touched.

---

## Future Enhancements

- **Year View tinting**: Add `chef_calendar_entries` to the `getYearSummary()` density count and tint weeks by dominant category (navy for vacation-heavy weeks, teal for market-heavy weeks)
- **Recurring entries**: Schema includes `is_recurring` + `recurrence_rule` columns (V1 UI creates single entries only)
- **ICS export**: Calendar entries can be integrated into the existing `lib/scheduling/generate-ics.ts` export pipeline
- **Email notifications**: `notifyClientsOfPublicSignal()` currently inserts notification log rows; the actual email send (`sendAvailabilitySignalNotification`) is marked TODO
- **Client-specific availability calendar**: Clients could see a filtered version of the chef's public calendar (currently only `target_booking` entries with `is_public = true` are surfaced)

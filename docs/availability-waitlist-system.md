# Availability & Waitlist System

## What Changed

Added a date-level availability management layer with a visual monthly calendar and a structured waitlist for fully-booked dates. Chefs can now block dates manually, see confirmed events on a calendar, and track clients waiting for openings.

## Why

Before this change, availability existed only implicitly in the events list. There was no way to block personal days, see a calendar view of openness, or manage clients waiting for a specific date. Chefs were tracking this in their heads or in personal calendars.

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000006_availability_waitlist.sql`

**`chef_availability_blocks`**

- One row per blocked date
- `block_type`: `full_day` or `partial` (with start/end time)
- `is_event_auto`: if true, created automatically when an event is confirmed
- `event_id`: FK to events — auto-blocks are cascaded when an event is cancelled

**`waitlist_entries`**

- Client + requested date + occasion/guest count
- Status: `waiting → contacted → converted | expired`
- `converted_event_id`: links to the event when a waitlist client books

### Server Actions

**File:** `lib/availability/actions.ts`

| Action                                      | What                                    |
| ------------------------------------------- | --------------------------------------- |
| `blockDate(input)`                          | Manually block a date                   |
| `unblockDate(blockId)`                      | Remove a manual block                   |
| `autoBlockEventDate(eventId, chefId, date)` | Called when event is confirmed          |
| `removeEventAutoBlock(eventId)`             | Called when event is cancelled          |
| `getAvailabilityForMonth(year, month)`      | Returns map of date→status for calendar |
| `isDateAvailable(date)`                     | Boolean check for a specific date       |
| `addToWaitlist(input)`                      | Add a client to the waitlist            |
| `contactWaitlistEntry(id)`                  | Mark as contacted                       |
| `convertWaitlistEntry(id, eventId)`         | Mark converted, link to event           |
| `expireWaitlistEntry(id)`                   | Mark expired                            |
| `getWaitlistEntries(status?)`               | List waitlist entries                   |
| `getWaitlistForDate(date)`                  | Waitlist for a specific date            |

### UI

- **`app/(chef)/calendar/page.tsx`** — Monthly calendar with green/amber/red day coloring, month navigation, and a selected-date panel for blocking and waitlist view.
- **`app/(chef)/calendar/availability-calendar-client.tsx`** — Interactive client component.
- **`app/(chef)/waitlist/page.tsx`** — Full waitlist management: contact, expire, add entries.
- **`app/(chef)/waitlist/waitlist-add-form.tsx`** — Add a client to the waitlist.

## Calendar Color Key

- **White (green)** — Available date
- **Amber** — Confirmed event (auto-blocked)
- **Red** — Manually blocked
- Small **wl** indicator on dates with waiting clients

## Auto-Block Integration Point

`autoBlockEventDate()` should be called from `lib/events/transitions.ts` when an event transitions to `confirmed`. `removeEventAutoBlock()` should be called when an event is `cancelled`. This closes the loop between the event FSM and the availability calendar without any manual chef action.

## Future Considerations

- Public availability display on chef's public profile ("Next available: March 15")
- Client-facing date picker that checks availability before submitting an inquiry
- Integration with Google Calendar sync

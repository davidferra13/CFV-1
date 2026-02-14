# Timeblock Calendar Overview (V1)

This document defines how events are represented as time blocks on the calendar and the rules for scheduling, overlaps, and availability.

---

## Core Concept

**Events are time blocks** defined by:
- `start_ts` (TIMESTAMPTZ): When the event begins
- `end_ts` (TIMESTAMPTZ): When the event ends
- `status` (EventStatus): Current lifecycle state

The calendar is the chef's operational view of scheduled events across time.

---

## Time Block Model

### Schema Fields

```sql
ALTER TABLE events ADD COLUMN start_ts TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN end_ts TIMESTAMPTZ;

-- Constraint: end must be after start
ALTER TABLE events ADD CONSTRAINT check_end_after_start
CHECK (end_ts > start_ts);
```

### TypeScript Type

```typescript
interface EventTimeBlock {
  id: string;
  start_ts: Date;
  end_ts: Date;
  status: EventStatus;
  event_type: string;
  client_name: string;
}
```

---

## Time Block Requirements by Status

### `draft` Status
- **start_ts**: Optional (can be null)
- **end_ts**: Optional (can be null)
- **Calendar Display**: Not shown on calendar (or shown as tentative/grayed out)

### `proposed` Status
- **start_ts**: Required (must be set before transition)
- **end_ts**: Required (must be set before transition)
- **Calendar Display**: Soft reservation (can be overlapped with warning)

### `deposit_pending` and Beyond
- **start_ts**: Required (locked)
- **end_ts**: Required (locked)
- **Calendar Display**: Hard reservation (no overlap allowed)

---

## Validation Rules

### Rule 1: Timestamps Required After Draft

```typescript
async function transitionToPro posed(eventId: string) {
  const event = await db.events.findUnique({ where: { id: eventId } });

  if (!event.start_ts || !event.end_ts) {
    throw new Error('Event must have start and end times before proposing');
  }

  if (event.end_ts <= event.start_ts) {
    throw new Error('Event end time must be after start time');
  }

  // Proceed with transition
}
```

---

### Rule 2: Timezone Handling

All timestamps are stored in UTC (`TIMESTAMPTZ`). Display is converted to chef's timezone.

```typescript
// Storage (always UTC)
await db.events.create({
  data: {
    start_ts: new Date('2026-03-15T18:00:00Z'), // UTC
    end_ts: new Date('2026-03-15T22:00:00Z'),   // UTC
  },
});

// Display (converted to chef's timezone)
const displayStart = event.start_ts.toLocaleString('en-US', {
  timeZone: chef.timezone, // e.g., 'America/Los_Angeles'
});
```

---

### Rule 3: Minimum Duration

Events must have a minimum duration (e.g., 1 hour).

```typescript
const MIN_EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour

function validateDuration(start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();

  if (duration < MIN_EVENT_DURATION_MS) {
    throw new Error('Event must be at least 1 hour long');
  }
}
```

---

## Calendar Views

### Month View
- Shows all events in a given month
- Events displayed as blocks spanning their time range
- Color-coded by status

### Week View
- Shows detailed hourly breakdown
- Events displayed with start/end times
- Better for identifying conflicts

### Day View
- Shows single day with hour-by-hour detail
- Useful for high-volume chefs

---

## V1 Calendar Features

### Included in V1
- Month/week view (pick one primary view)
- Color-coded status indicators
- Click event to view details
- Basic overlap detection and warnings

### Excluded from V1
- Drag-and-drop rescheduling (manual edit only)
- Multi-chef calendar (single tenant view only)
- Integration with external calendars (Google, iCal)
- Recurring events

---

## Calendar Query Pattern

```typescript
// Get all events for a given month
async function getEventsForMonth(tenantId: string, year: number, month: number) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  return await db.events.findMany({
    where: {
      tenant_id: tenantId,
      start_ts: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: {
        notIn: ['canceled'], // Hide canceled events
      },
    },
    select: {
      id: true,
      event_type: true,
      start_ts: true,
      end_ts: true,
      status: true,
      client_profile: {
        select: {
          full_name: true,
        },
      },
    },
    orderBy: {
      start_ts: 'asc',
    },
  });
}
```

---

## UI Display Format

```tsx
<div className="calendar-event" data-status={event.status}>
  <div className="event-time">
    {format(event.start_ts, 'h:mm a')} - {format(event.end_ts, 'h:mm a')}
  </div>
  <div className="event-title">{event.event_type}</div>
  <div className="event-client">{event.client_name}</div>
</div>
```

---

**End of Timeblock Calendar Overview**

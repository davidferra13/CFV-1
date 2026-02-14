# Overlap Detection Rules (V1)

## Overlap Definition

Two events **overlap** if their time ranges intersect. Formally:

```
Event A and Event B overlap if:
  A.start_ts < B.end_ts AND A.end_ts > B.start_ts
```

---

## Overlap Rules by Status

### Draft Events
- **Overlaps Allowed**: Yes (drafts don't reserve time)
- **Warning Shown**: No
- **Calendar Display**: Grayed out or not shown

### Proposed Events
- **Overlaps Allowed**: Yes (soft reservation)
- **Warning Shown**: Yes ("You have another proposed event at this time")
- **Chef Action**: Can proceed anyway or reschedule

### Confirmed Events and Beyond
- **Overlaps Allowed**: No (hard reservation)
- **Warning Shown**: Yes (blocking)
- **Chef Action**: Must reschedule one event before confirming

---

## Detection Function

```typescript
interface TimeBlock {
  start_ts: Date;
  end_ts: Date;
}

export function doEventsOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return a.start_ts < b.end_ts && a.end_ts > b.start_ts;
}

export async function findOverlappingEvents(
  tenantId: string,
  start: Date,
  end: Date,
  excludeEventId?: string
): Promise<Event[]> {
  return await db.events.findMany({
    where: {
      tenant_id: tenantId,
      id: excludeEventId ? { not: excludeEventId } : undefined,
      start_ts: { lt: end },
      end_ts: { gt: start },
      status: {
        notIn: ['draft', 'canceled', 'closed'], // Only active events
      },
      deleted_at: null,
    },
  });
}
```

---

## Validation Before Confirmation

```typescript
async function validateNoOverlaps(eventId: string): Promise<boolean> {
  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  if (!event || !event.start_ts || !event.end_ts) {
    throw new Error('Event has no time range');
  }

  const overlaps = await findOverlappingEvents(
    event.tenant_id,
    event.start_ts,
    event.end_ts,
    eventId // Exclude self
  );

  // Filter to only confirmed/locked events
  const hardConflicts = overlaps.filter((e) =>
    ['confirmed', 'menu_in_progress', 'menu_locked', 'executed'].includes(e.status)
  );

  if (hardConflicts.length > 0) {
    throw new Error('Cannot confirm: event overlaps with confirmed event');
  }

  return true;
}
```

---

## UI Warning Messages

### Soft Conflict (Proposed)

```tsx
{softConflicts.length > 0 && (
  <div className="alert alert-warning">
    <p>Warning: This time overlaps with {softConflicts.length} other proposed event(s).</p>
    <ul>
      {softConflicts.map((e) => (
        <li key={e.id}>
          {e.event_type} on {format(e.start_ts, 'MMM d, h:mm a')}
        </li>
      ))}
    </ul>
    <p>You can still proceed, but consider rescheduling one of them.</p>
  </div>
)}
```

### Hard Conflict (Confirmed)

```tsx
{hardConflicts.length > 0 && (
  <div className="alert alert-error">
    <p>Cannot confirm: This event overlaps with a confirmed event.</p>
    <ul>
      {hardConflicts.map((e) => (
        <li key={e.id}>
          {e.event_type} on {format(e.start_ts, 'MMM d, h:mm a')}
        </li>
      ))}
    </ul>
    <button onClick={() => navigateTo(`/events/${hardConflicts[0].id}`)}>
      View Conflicting Event
    </button>
  </div>
)}
```

---

## Database Constraint (Optional)

For strict enforcement, add exclusion constraint:

```sql
-- Requires btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping confirmed events
CREATE TABLE event_reservations (
  event_id UUID PRIMARY KEY REFERENCES events(id),
  tenant_id UUID NOT NULL,
  time_range TSTZRANGE NOT NULL,
  EXCLUDE USING GIST (
    tenant_id WITH =,
    time_range WITH &&
  )
);

-- Trigger to sync with events table
CREATE OR REPLACE FUNCTION sync_event_reservation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'menu_in_progress', 'menu_locked', 'executed') THEN
    INSERT INTO event_reservations (event_id, tenant_id, time_range)
    VALUES (NEW.id, NEW.tenant_id, tstzrange(NEW.start_ts, NEW.end_ts))
    ON CONFLICT (event_id) DO UPDATE
    SET time_range = tstzrange(NEW.start_ts, NEW.end_ts);
  ELSE
    DELETE FROM event_reservations WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_event_reservations
AFTER INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION sync_event_reservation();
```

**V1 Note**: This is optional. Application-level validation is sufficient for V1.

---

## Test Cases

```typescript
describe('Overlap Detection', () => {
  it('detects overlap when A starts before B ends and A ends after B starts', () => {
    const a = { start_ts: new Date('2026-03-15T18:00:00Z'), end_ts: new Date('2026-03-15T22:00:00Z') };
    const b = { start_ts: new Date('2026-03-15T20:00:00Z'), end_ts: new Date('2026-03-16T00:00:00Z') };
    expect(doEventsOverlap(a, b)).toBe(true);
  });

  it('does not detect overlap when events are sequential', () => {
    const a = { start_ts: new Date('2026-03-15T18:00:00Z'), end_ts: new Date('2026-03-15T22:00:00Z') };
    const b = { start_ts: new Date('2026-03-15T22:00:00Z'), end_ts: new Date('2026-03-16T02:00:00Z') };
    expect(doEventsOverlap(a, b)).toBe(false);
  });

  it('prevents confirmation of overlapping events', async () => {
    const event1 = await createTestEvent({
      start_ts: new Date('2026-03-15T18:00:00Z'),
      end_ts: new Date('2026-03-15T22:00:00Z'),
      status: 'confirmed',
    });

    const event2 = await createTestEvent({
      start_ts: new Date('2026-03-15T20:00:00Z'),
      end_ts: new Date('2026-03-16T00:00:00Z'),
      status: 'proposed',
    });

    await expect(
      transitionEvent({ eventId: event2.id, toStatus: 'confirmed' })
    ).rejects.toThrow('overlaps with confirmed event');
  });
});
```

---

## V1 Scope

### Included
- Overlap detection function
- Application-level validation
- UI warnings for soft and hard conflicts
- Query for finding overlapping events

### Excluded
- Database exclusion constraints (optional)
- Buffer time between events
- Multi-resource scheduling (single chef only)

---

**End of Overlap Detection Rules**

# Event Timestamps Schema (V1)

## Core Timestamp Fields

```sql
ALTER TABLE events ADD COLUMN start_ts TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN end_ts TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE events ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMPTZ; -- Soft delete
```

---

## Field Definitions

### `start_ts` (TIMESTAMPTZ)
- **Purpose**: When the event begins
- **Required**: After `draft` status
- **Nullable**: Yes (null allowed for drafts)
- **Timezone**: Always stored as UTC
- **Example**: `'2026-03-15T18:00:00Z'`

### `end_ts` (TIMESTAMPTZ)
- **Purpose**: When the event ends
- **Required**: After `draft` status
- **Nullable**: Yes (null allowed for drafts)
- **Timezone**: Always stored as UTC
- **Constraint**: Must be after `start_ts`

### `created_at` (TIMESTAMPTZ)
- **Purpose**: When the event record was created
- **Required**: Yes
- **Default**: NOW()
- **Immutable**: Should not change after creation

### `updated_at` (TIMESTAMPTZ)
- **Purpose**: Last modification timestamp
- **Required**: Yes
- **Default**: NOW()
- **Auto-Update**: Updated on every event modification

### `deleted_at` (TIMESTAMPTZ)
- **Purpose**: Soft delete timestamp
- **Required**: No
- **Default**: NULL
- **Soft Delete**: If not null, event is considered deleted

---

## Database Constraints

```sql
-- End must be after start
ALTER TABLE events ADD CONSTRAINT check_end_after_start
CHECK (end_ts IS NULL OR start_ts IS NULL OR end_ts > start_ts);

-- Timestamps required for non-draft events
CREATE OR REPLACE FUNCTION validate_event_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'draft' AND (NEW.start_ts IS NULL OR NEW.end_ts IS NULL) THEN
    RAISE EXCEPTION 'start_ts and end_ts required for non-draft events';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_event_timestamps
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION validate_event_timestamps();
```

---

## Indexes

```sql
CREATE INDEX idx_events_start_ts ON events(start_ts) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_end_ts ON events(end_ts) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_time_range ON events(tenant_id, start_ts, end_ts) WHERE deleted_at IS NULL;
```

---

## TypeScript Types

```typescript
interface EventTimestamps {
  start_ts: Date | null;
  end_ts: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface CreateEventInput {
  start_ts?: Date; // Optional for drafts
  end_ts?: Date;   // Optional for drafts
  // created_at and updated_at auto-set by DB
}

interface UpdateEventInput {
  start_ts?: Date;
  end_ts?: Date;
  // updated_at auto-updated by trigger
}
```

---

## Validation Helpers

```typescript
export function validateEventTimestamps(
  start: Date | null,
  end: Date | null,
  status: EventStatus
): void {
  // Drafts can have null timestamps
  if (status === 'draft') {
    return;
  }

  // Non-drafts require both timestamps
  if (!start || !end) {
    throw new Error('Events must have start and end times after draft status');
  }

  // End must be after start
  if (end <= start) {
    throw new Error('Event end time must be after start time');
  }

  // Minimum duration (1 hour)
  const MIN_DURATION_MS = 60 * 60 * 1000;
  if (end.getTime() - start.getTime() < MIN_DURATION_MS) {
    throw new Error('Event must be at least 1 hour long');
  }
}
```

---

## Query Examples

### Events in Date Range

```sql
SELECT id, event_type, start_ts, end_ts, status
FROM events
WHERE tenant_id = $1
  AND start_ts >= $2
  AND start_ts < $3
  AND deleted_at IS NULL
ORDER BY start_ts ASC;
```

### Events Overlapping a Timeframe

```sql
SELECT id, event_type, start_ts, end_ts
FROM events
WHERE tenant_id = $1
  AND start_ts < $3  -- Starts before range end
  AND end_ts > $2    -- Ends after range start
  AND deleted_at IS NULL;
```

### Update `updated_at` Automatically

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## V1 Scope

### Included
- All timestamp fields defined above
- Database constraints and triggers
- Validation helpers
- Auto-update of `updated_at`

### Excluded
- Timezone storage per event (chef timezone used)
- Duration field (computed from start/end)
- Recurring event timestamps

---

**End of Event Timestamps Schema**

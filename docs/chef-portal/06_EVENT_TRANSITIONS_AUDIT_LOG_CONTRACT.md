# Event Transitions Audit Log Contract (V1)

This document defines the schema and rules for the `event_transitions` table, which provides an immutable audit trail of all event lifecycle changes.

---

## Table Purpose

The `event_transitions` table:
- Records every status change for every event
- Is **append-only** (no updates or deletes allowed)
- Provides complete audit trail for compliance and troubleshooting
- Answers: "Who changed this event's status, when, and why?"

---

## Schema Definition

```sql
CREATE TABLE event_transitions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event linkage
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Transition details
  from_status event_status NOT NULL,
  to_status event_status NOT NULL,

  -- Actor tracking
  triggered_by TEXT NOT NULL, -- user_id UUID or literal 'system'
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context
  notes TEXT, -- Optional human-readable reason (max 500 chars)
  metadata JSONB, -- Optional structured data

  -- Idempotency
  idempotency_key TEXT UNIQUE, -- Optional unique key for duplicate prevention

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_event_transitions_event_id ON event_transitions(event_id);
CREATE INDEX idx_event_transitions_triggered_at ON event_transitions(triggered_at DESC);
CREATE INDEX idx_event_transitions_to_status ON event_transitions(to_status);
CREATE INDEX idx_event_transitions_triggered_by ON event_transitions(triggered_by);

-- Immutability trigger (prevent UPDATE and DELETE)
CREATE TRIGGER prevent_event_transitions_update
  BEFORE UPDATE ON event_transitions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_immutable_update();

CREATE TRIGGER prevent_event_transitions_delete
  BEFORE DELETE ON event_transitions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_immutable_delete();
```

---

## Field Definitions

### `id` (UUID)
- **Purpose**: Unique identifier for this transition record
- **Generated**: Automatically on insert
- **Nullable**: No

### `event_id` (UUID)
- **Purpose**: Links to the event that transitioned
- **Foreign Key**: `events(id)` with CASCADE delete
- **Nullable**: No
- **Indexed**: Yes

### `from_status` (event_status)
- **Purpose**: The status the event was in before transition
- **Type**: Enum (`event_status`)
- **Nullable**: No
- **Validation**: Must be valid enum value

### `to_status` (event_status)
- **Purpose**: The status the event transitioned to
- **Type**: Enum (`event_status`)
- **Nullable**: No
- **Validation**: Must be valid enum value

### `triggered_by` (TEXT)
- **Purpose**: Identifies who/what triggered the transition
- **Format**: Either:
  - UUID string (user_id from auth.users)
  - Literal string `'system'` for automated transitions
- **Nullable**: No

### `triggered_at` (TIMESTAMPTZ)
- **Purpose**: Exact timestamp when transition occurred
- **Default**: Current timestamp
- **Nullable**: No
- **Indexed**: Yes (DESC for recent queries)

### `notes` (TEXT)
- **Purpose**: Human-readable explanation for transition
- **Max Length**: 500 characters (enforced at application layer)
- **Nullable**: Yes
- **Example**: "Client requested cancellation due to schedule conflict"

### `metadata` (JSONB)
- **Purpose**: Structured additional context
- **Format**: Valid JSON object
- **Max Size**: 5KB (enforced at application layer)
- **Nullable**: Yes
- **Example**:
  ```json
  {
    "stripe_event_id": "evt_123abc",
    "payment_intent_id": "pi_456def",
    "refund_amount_cents": 50000
  }
  ```

### `idempotency_key` (TEXT)
- **Purpose**: Prevents duplicate transitions from retries
- **Constraint**: UNIQUE
- **Nullable**: Yes
- **Usage**: Typically Stripe event ID or client-generated UUID

### `created_at` (TIMESTAMPTZ)
- **Purpose**: Record creation timestamp (same as `triggered_at` in practice)
- **Default**: Current timestamp
- **Nullable**: No

---

## Immutability Rules

### Rule 1: No Updates Allowed
Once a transition record is inserted, it **cannot be modified**. Database triggers reject any UPDATE statements.

### Rule 2: No Deletes Allowed
Transition records **cannot be deleted**. Database triggers reject any DELETE statements.

**Exception**: CASCADE delete if parent event is deleted (which should be rare due to soft delete policy).

### Rule 3: Append-Only Corrections
If a transition was logged incorrectly:
- ✅ Insert a new corrective transition record
- ❌ Never modify the incorrect record

---

## Query Patterns

### Get Transition History for Event

```sql
SELECT
  id,
  from_status,
  to_status,
  triggered_by,
  triggered_at,
  notes
FROM event_transitions
WHERE event_id = $1
ORDER BY triggered_at ASC;
```

### Get Most Recent Transition

```sql
SELECT
  id,
  from_status,
  to_status,
  triggered_by,
  triggered_at
FROM event_transitions
WHERE event_id = $1
ORDER BY triggered_at DESC
LIMIT 1;
```

### Get All Transitions by User

```sql
SELECT
  et.id,
  et.event_id,
  e.event_type,
  et.from_status,
  et.to_status,
  et.triggered_at
FROM event_transitions et
JOIN events e ON et.event_id = e.id
WHERE et.triggered_by = $1
  AND e.tenant_id = $2 -- Tenant isolation
ORDER BY et.triggered_at DESC;
```

### Get All System-Triggered Transitions

```sql
SELECT
  et.event_id,
  et.from_status,
  et.to_status,
  et.triggered_at,
  et.metadata
FROM event_transitions et
WHERE et.triggered_by = 'system'
ORDER BY et.triggered_at DESC;
```

### Count Transitions by Status

```sql
SELECT
  to_status,
  COUNT(*) as transition_count
FROM event_transitions
WHERE event_id IN (
  SELECT id FROM events WHERE tenant_id = $1
)
GROUP BY to_status
ORDER BY transition_count DESC;
```

---

## TypeScript Types

```typescript
// types/database.ts

export interface EventTransition {
  id: string;
  event_id: string;
  from_status: EventStatus;
  to_status: EventStatus;
  triggered_by: string; // user_id or 'system'
  triggered_at: Date;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  idempotency_key: string | null;
  created_at: Date;
}

export interface CreateEventTransition {
  event_id: string;
  from_status: EventStatus;
  to_status: EventStatus;
  triggered_by: string;
  triggered_at?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
}
```

---

## RLS Policies

### Chef Read Access

```sql
CREATE POLICY chef_read_transitions ON event_transitions
FOR SELECT
USING (
  event_id IN (
    SELECT id FROM events
    WHERE tenant_id = current_tenant_id()
  )
);
```

### Chef Insert Access

```sql
-- Only server-side via service role
-- Chefs cannot directly insert transitions
-- They must use transitionEvent() server function
```

### No Update/Delete Policies
No policies needed since triggers prevent all updates and deletes.

---

## Audit Requirements

### Every Transition Must Log

| Field | Required | Source |
|-------|----------|--------|
| `event_id` | Yes | Function parameter |
| `from_status` | Yes | Current event status |
| `to_status` | Yes | Function parameter |
| `triggered_by` | Yes | Authenticated user ID or 'system' |
| `triggered_at` | Yes | Current timestamp (auto) |
| `notes` | No | Optional context |
| `metadata` | No | Optional structured data |

### Metadata Recommendations

For specific transitions, include relevant metadata:

**Deposit Pending → Confirmed**:
```json
{
  "stripe_event_id": "evt_123",
  "payment_intent_id": "pi_456",
  "amount_cents": 50000
}
```

**Any → Canceled**:
```json
{
  "cancellation_reason": "client_request",
  "refund_amount_cents": 50000,
  "refund_id": "re_789"
}
```

**Menu Locked → Executed**:
```json
{
  "event_date": "2026-03-15T18:00:00Z",
  "automated": true
}
```

---

## Idempotency Handling

### Using Stripe Event ID

```typescript
await db.event_transitions.create({
  data: {
    event_id: eventId,
    from_status: 'deposit_pending',
    to_status: 'confirmed',
    triggered_by: 'system',
    triggered_at: new Date(),
    metadata: { stripe_event_id: stripeEvent.id },
    idempotency_key: stripeEvent.id, // Unique constraint prevents duplicates
  },
});
```

### Using Client-Generated Key

```typescript
const idempotencyKey = `transition_${eventId}_${Date.now()}_${userId}`;

await db.event_transitions.create({
  data: {
    event_id: eventId,
    from_status: 'draft',
    to_status: 'proposed',
    triggered_by: userId,
    idempotency_key: idempotencyKey,
  },
});
```

---

## Compliance and Reporting

### Audit Trail Completeness

For compliance (SOC 2, GDPR, etc.), this table provides:
- **Who**: `triggered_by` identifies actor
- **What**: `from_status` → `to_status` shows action
- **When**: `triggered_at` provides timestamp
- **Why**: `notes` and `metadata` provide context

### Retention Policy

Transition records should be retained:
- **Minimum**: As long as parent event exists
- **Recommended**: Indefinitely (even after event soft delete)
- **Legal**: Per jurisdiction requirements (typically 7 years for financial records)

---

## Performance Considerations

### Index Strategy

Queries are optimized for:
- Event-specific history (`event_id` index)
- Recent transitions (`triggered_at DESC` index)
- Status-based reporting (`to_status` index)
- User activity (`triggered_by` index)

### Partition Strategy (Future)

For high-volume tenants (100k+ transitions), consider:
- Partitioning by `triggered_at` (monthly or yearly)
- Archiving old transitions to cold storage

**V1 Scope**: No partitioning; standard indexes sufficient.

---

## Testing

### Immutability Test

```sql
-- Verify UPDATE is prevented
INSERT INTO event_transitions (event_id, from_status, to_status, triggered_by)
VALUES ('event-123', 'draft', 'proposed', 'user-456');

-- This should FAIL
UPDATE event_transitions
SET notes = 'Updated note'
WHERE event_id = 'event-123';
-- Expected: Error from trigger

-- This should FAIL
DELETE FROM event_transitions
WHERE event_id = 'event-123';
-- Expected: Error from trigger
```

### Idempotency Test

```typescript
const key = 'test_idempotency_key_123';

// First insert succeeds
await db.event_transitions.create({
  data: {
    event_id: 'event-123',
    from_status: 'draft',
    to_status: 'proposed',
    triggered_by: 'user-456',
    idempotency_key: key,
  },
});

// Second insert with same key should fail (unique constraint)
await expect(
  db.event_transitions.create({
    data: {
      event_id: 'event-123',
      from_status: 'draft',
      to_status: 'proposed',
      triggered_by: 'user-456',
      idempotency_key: key, // Duplicate
    },
  })
).rejects.toThrow();
```

---

## V1 Scope Boundaries

### Included in V1
- Full schema with immutability triggers
- All indexes
- RLS policies for read access
- Idempotency key support
- Basic metadata structure

### Excluded from V1
- Table partitioning
- Automatic archiving/retention policies
- Advanced analytics queries
- Transition visualization UI (may be future)

---

**End of Event Transitions Audit Log Contract**

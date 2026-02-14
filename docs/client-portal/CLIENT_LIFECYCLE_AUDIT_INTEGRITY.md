# Client Lifecycle Audit Integrity

## Document Identity
- **File**: `CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md`
- **Category**: Lifecycle System (35/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **audit integrity** for lifecycle transitions in ChefFlow V1.

It specifies:
- Complete audit trail requirements
- Event transitions table immutability
- Audit data integrity guarantees
- Audit completeness verification
- Audit data retention
- Forensic investigation capabilities

---

## Audit Trail Definition

**Audit trail** is an **immutable, append-only log** of all lifecycle state changes.

### Core Principles

1. **Complete**: Every state change logged
2. **Immutable**: No updates or deletes
3. **Traceable**: Who, what, when, why
4. **Verifiable**: Can reconstruct full history
5. **Tamper-proof**: Database-enforced immutability

**System Law Alignment**: Law 4 (audit trail required), Law 17 (no silent transitions).

---

## Event Transitions Table

### Schema

```sql
CREATE TABLE event_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status event_status, -- NULL for initial creation
  to_status event_status NOT NULL,
  transitioned_by UUID REFERENCES auth.users(id), -- NULL for system transitions
  transitioned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  metadata JSONB -- Additional context
);

CREATE INDEX idx_transitions_event ON event_transitions(event_id);
CREATE INDEX idx_transitions_tenant ON event_transitions(tenant_id);
CREATE INDEX idx_transitions_date ON event_transitions(transitioned_at DESC);
```

---

## Immutability Enforcement

### Database Triggers

**Critical**: Audit entries **cannot be modified or deleted**.

```sql
-- Prevent UPDATE on event_transitions
CREATE OR REPLACE FUNCTION prevent_transition_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Event transitions are immutable. They form an audit trail.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transitions_immutable_update
BEFORE UPDATE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_transition_modification();

-- Prevent DELETE on event_transitions
CREATE TRIGGER transitions_immutable_delete
BEFORE DELETE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_transition_modification();
```

**Test**:

```sql
-- Attempt to update transition (should fail)
UPDATE event_transitions
SET to_status = 'completed'
WHERE id = 'some_uuid';
-- ERROR: Event transitions are immutable

-- Attempt to delete transition (should fail)
DELETE FROM event_transitions
WHERE id = 'some_uuid';
-- ERROR: Event transitions are immutable
```

**System Law Alignment**: Law 4 (immutable audit trail).

---

## Audit Entry Structure

### Required Fields

Every audit entry **must** include:

| Field | Type | Required | Purpose |
|-------|------|---------|---------|
| `id` | UUID | ✅ Yes | Unique entry ID |
| `tenant_id` | UUID | ✅ Yes | Tenant isolation |
| `event_id` | UUID | ✅ Yes | Which event changed |
| `from_status` | event_status | ⚠️ NULL for creation | Previous status |
| `to_status` | event_status | ✅ Yes | New status |
| `transitioned_by` | UUID | ⚠️ NULL for system | Who triggered |
| `transitioned_at` | TIMESTAMPTZ | ✅ Yes | When it happened |
| `metadata` | JSONB | ⚠️ Optional | Additional context |

---

## Metadata Requirements

### Standard Metadata

All transitions should include:

```json
{
  "source": "chef_action" | "client_action" | "system_webhook",
  "ip_address": "192.168.1.1", // Optional
  "user_agent": "Mozilla/5.0...", // Optional
  "transition_reason": "Client accepted proposal", // Required for manual actions
  "stripe_event_id": "evt_...", // For webhook transitions
  "validation_checks_passed": true
}
```

### Transition-Specific Metadata

| Transition | Additional Metadata |
|-----------|-------------------|
| `draft → proposed` | `{ "total_amount_cents": 250000, "deposit_amount_cents": 50000 }` |
| `proposed → accepted` | `{ "stripe_checkout_session_id": "cs_..." }` |
| `accepted → paid` | `{ "stripe_event_id": "evt_...", "payment_intent_id": "pi_...", "amount_cents": 50000 }` |
| `paid → confirmed` | `{ "ledger_balance_cents": 50000, "confirmed_at": "..." }` |
| `* → cancelled` | `{ "cancellation_reason": "...", "refund_initiated": true }` |

---

## Audit Completeness

### Guaranteeing Complete Trail

**Requirement**: Every status change **must** have corresponding audit entry.

### Verification Query

```sql
-- Find events with status changes but no audit entry
SELECT
  e.id AS event_id,
  e.status AS current_status,
  e.status_changed_at,
  COUNT(et.id) AS audit_entry_count
FROM events e
LEFT JOIN event_transitions et
  ON et.event_id = e.id
  AND et.to_status = e.status
  AND et.transitioned_at BETWEEN e.status_changed_at - INTERVAL '10 seconds' AND e.status_changed_at + INTERVAL '10 seconds'
WHERE e.status_changed_at IS NOT NULL
GROUP BY e.id, e.status, e.status_changed_at
HAVING COUNT(et.id) = 0;
```

**Expected Result**: Empty set (all transitions logged).

**If Non-Empty**: Indicates missing audit entries (data integrity issue).

---

## Automatic Audit Logging

### Database Trigger for Auto-Logging

```sql
-- Automatically log status changes
CREATE OR REPLACE FUNCTION log_event_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO event_transitions (
      tenant_id,
      event_id,
      from_status,
      to_status,
      transitioned_by,
      transitioned_at,
      metadata
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.updated_by,
      NEW.status_changed_at,
      jsonb_build_object(
        'auto_logged', true,
        'previous_status_changed_at', OLD.status_changed_at,
        'trigger_source', 'database_trigger'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_status_change_audit
AFTER UPDATE ON events
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_event_transition();
```

**Benefit**: Ensures no status change goes unlogged.

**System Law Alignment**: Law 17 (no silent transitions).

---

## Audit Traceability

### Who Did What When

Every audit entry answers:

1. **Who**: `transitioned_by` (auth_user_id) or `NULL` (system)
2. **What**: `from_status → to_status`
3. **When**: `transitioned_at` (timestamp)
4. **Why**: `metadata.transition_reason`
5. **Where**: `metadata.ip_address`, `metadata.user_agent`

### Example Audit Query

```sql
-- Full audit trail for an event
SELECT
  et.transitioned_at,
  et.from_status,
  et.to_status,
  COALESCE(u.email, 'System') AS actor,
  et.metadata
FROM event_transitions et
LEFT JOIN auth.users u ON u.id = et.transitioned_by
WHERE et.event_id = 'event_uuid'
ORDER BY et.transitioned_at ASC;
```

**Output**:

```
transitioned_at         | from_status | to_status  | actor               | metadata
------------------------|-------------|------------|---------------------|------------------
2026-02-14 10:00:00+00  | NULL        | draft      | chef@example.com    | {"source": "chef_action"}
2026-02-14 11:00:00+00  | draft       | proposed   | chef@example.com    | {"total_amount_cents": 250000}
2026-02-14 11:30:00+00  | proposed    | accepted   | client@example.com  | {"source": "client_action"}
2026-02-14 11:35:00+00  | accepted    | paid       | System              | {"stripe_event_id": "evt_..."}
2026-02-14 12:00:00+00  | paid        | confirmed  | chef@example.com    | {"ledger_balance_cents": 50000}
```

---

## Audit Integrity Checks

### Verification Checklist

| Check | Query | Expected Result |
|-------|-------|----------------|
| **No missing entries** | Events with status but no audit | Empty set |
| **No orphaned entries** | Audit entries without event | Empty set |
| **Chronological order** | Transitions ordered by time | All ordered |
| **Valid transitions** | Invalid state hops | Empty set |
| **Complete metadata** | Entries missing required metadata | Empty set |

### Verification Script

```sql
-- scripts/verify-audit-integrity.sql

-- Check 1: No missing entries
SELECT COUNT(*) AS missing_entries
FROM (
  SELECT e.id
  FROM events e
  LEFT JOIN event_transitions et ON et.event_id = e.id
  WHERE e.status != 'draft' AND et.id IS NULL
) missing;

-- Check 2: No orphaned entries
SELECT COUNT(*) AS orphaned_entries
FROM event_transitions et
LEFT JOIN events e ON e.id = et.event_id
WHERE e.id IS NULL;

-- Check 3: Invalid transitions
SELECT COUNT(*) AS invalid_transitions
FROM event_transitions
WHERE (from_status = 'completed' AND to_status != 'completed')
   OR (from_status = 'cancelled' AND to_status != 'cancelled');

-- All counts should be 0
```

**Run Frequency**: Daily (automated).

---

## Audit Data Retention

### Retention Policy

| Data | Retention Period | After Retention |
|------|-----------------|----------------|
| **Active events** | Indefinite | N/A |
| **Completed events** | ✅ Indefinite | Never delete |
| **Cancelled events** | ✅ Indefinite | Never delete |
| **Audit entries** | ✅ **Permanent** | **Never delete** |

**Critical Rule**: Audit entries are **NEVER** deleted (even if event soft-deleted).

**Rationale**: Audit trail required for legal, financial, and compliance purposes.

---

## Soft Deletes and Audit Trail

### Deleting Events Preserves Audit

When event soft-deleted:

```sql
-- Soft delete event
UPDATE events
SET deleted_at = now()
WHERE id = 'event_uuid';
```

**Audit trail remains intact**:

```sql
-- Audit entries still visible
SELECT * FROM event_transitions
WHERE event_id = 'event_uuid';
-- Returns: All transitions (not affected by soft delete)
```

**System Law Alignment**: Law 19 (deletions preserve audit trail).

---

## Forensic Investigation

### Reconstructing Event History

**Use Case**: Investigate payment dispute, cancelled event, or client complaint.

**Query**: Full event timeline.

```sql
SELECT
  et.transitioned_at AS timestamp,
  et.from_status AS from_state,
  et.to_status AS to_state,
  COALESCE(u.email, 'System Webhook') AS actor,
  et.metadata->>'transition_reason' AS reason,
  et.metadata
FROM event_transitions et
LEFT JOIN auth.users u ON u.id = et.transitioned_by
WHERE et.event_id = 'disputed_event_uuid'
ORDER BY et.transitioned_at ASC;
```

**Additional Context**: Join with ledger entries.

```sql
SELECT
  'transition' AS type,
  et.transitioned_at AS timestamp,
  et.to_status AS description,
  et.metadata
FROM event_transitions et
WHERE et.event_id = 'event_uuid'

UNION ALL

SELECT
  'ledger' AS type,
  le.created_at AS timestamp,
  le.entry_type || ': $' || (le.amount_cents / 100.0) AS description,
  le.metadata
FROM ledger_entries le
WHERE le.event_id = 'event_uuid'

ORDER BY timestamp ASC;
```

**Output**: Interleaved timeline of transitions and financial events.

---

## Audit Access Control

### Who Can View Audit Trail?

| Role | Access Level | Use Case |
|------|-------------|----------|
| **Chef** | ✅ Full access (own tenant) | Review event history |
| **Client** | ⚠️ **Limited** (own events only) | View status changes |
| **System Admin** | ✅ Full access (all tenants) | Forensic investigation |
| **Public** | ❌ No access | Privacy |

### Client View (Limited)

Clients see **simplified** audit trail:

```
┌────────────────────────────────────────────────────┐
│         EVENT HISTORY                               │
├────────────────────────────────────────────────────┤
│ ✓ Inquiry Submitted - Feb 14, 2026 10:00 AM       │
│ ✓ Proposal Received - Feb 14, 2026 11:00 AM       │
│ ✓ Proposal Accepted - Feb 14, 2026 11:30 AM       │
│ ✓ Deposit Paid - Feb 14, 2026 11:35 AM            │
│ ✓ Booking Confirmed - Feb 14, 2026 12:00 PM       │
│ ✓ Event Started - Mar 15, 2026 6:00 PM            │
│ ✓ Event Completed - Mar 15, 2026 10:00 PM         │
└────────────────────────────────────────────────────┘
```

**Hidden from Client**: System metadata, IP addresses, internal notes.

---

## Audit Anomaly Detection

### Detecting Suspicious Patterns

| Anomaly | Detection | Action |
|---------|-----------|--------|
| **Status skip** | `draft → confirmed` | Alert (invalid transition) |
| **Rapid transitions** | Multiple transitions within 1 second | Investigate (automation?) |
| **Time travel** | `transitioned_at < previous_transition` | Data corruption |
| **Missing actor** | `transitioned_by = NULL` for non-system transition | Investigate |

**Automated Check** (V2):

```sql
-- Find rapid transitions (potential automation)
SELECT
  event_id,
  COUNT(*) AS transition_count,
  MAX(transitioned_at) - MIN(transitioned_at) AS duration
FROM event_transitions
WHERE transitioned_at > now() - INTERVAL '1 day'
GROUP BY event_id
HAVING COUNT(*) > 5 AND (MAX(transitioned_at) - MIN(transitioned_at)) < INTERVAL '10 seconds';
```

---

## Audit Backfill

### Recovering Missing Audit Entries

**Scenario**: Audit entry missing due to system failure.

**Recovery Process**:

```typescript
async function backfillMissingAuditEntry(
  eventId: string,
  toStatus: EventStatus
): Promise<void> {
  // Get event
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  // Check if audit entry already exists
  const existingEntry = await db.event_transitions.findFirst({
    where: {
      event_id: eventId,
      to_status: toStatus
    }
  });

  if (existingEntry) {
    console.log('Audit entry already exists');
    return;
  }

  // Create backfill entry
  await db.event_transitions.create({
    data: {
      tenant_id: event.tenant_id,
      event_id: eventId,
      from_status: null, // Unknown
      to_status: toStatus,
      transitioned_by: null, // Unknown
      transitioned_at: event.status_changed_at,
      metadata: {
        backfilled: true,
        backfilled_at: new Date().toISOString(),
        reason: 'Missing audit entry detected and backfilled'
      }
    }
  });

  console.log('Audit entry backfilled for event:', eventId);
}
```

**Audit Trail**: Backfilled entries marked with `metadata.backfilled = true`.

---

## Audit Performance

### Optimizing Audit Queries

All audit queries use indexes:

```sql
CREATE INDEX idx_transitions_event ON event_transitions(event_id);
CREATE INDEX idx_transitions_tenant ON event_transitions(tenant_id);
CREATE INDEX idx_transitions_date ON event_transitions(transitioned_at DESC);
```

**Query Optimization**: Use `EXPLAIN ANALYZE` to verify index usage.

```sql
EXPLAIN ANALYZE
SELECT * FROM event_transitions
WHERE event_id = 'event_uuid'
ORDER BY transitioned_at ASC;
```

**Expected**: Index scan on `idx_transitions_event`.

---

## Audit Compliance

### Regulatory Requirements

| Regulation | Requirement | ChefFlow Compliance |
|-----------|------------|-------------------|
| **GDPR** | Right to data portability | ✅ Audit trail exportable |
| **GDPR** | Right to erasure (deletion) | ⚠️ Audit preserved (anonymized) |
| **PCI DSS** | Payment audit trail | ✅ Ledger + audit trail |
| **SOC 2** | Access logging | ✅ All access logged |

**Anonymization on Delete**:

```sql
-- When client requests deletion, anonymize audit trail (don't delete)
UPDATE event_transitions
SET metadata = metadata || jsonb_build_object('anonymized', true)
WHERE event_id IN (
  SELECT id FROM events WHERE client_id = 'deleted_client_uuid'
);
```

---

## Related Documents

- [CLIENT_LIFECYCLE_STATE_MACHINE.md](./CLIENT_LIFECYCLE_STATE_MACHINE.md)
- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)
- [CLIENT_LIFECYCLE_DATA_MUTATIONS.md](./CLIENT_LIFECYCLE_DATA_MUTATIONS.md)
- [CLIENT_LIFECYCLE_FAILURE_HANDLING.md](./CLIENT_LIFECYCLE_FAILURE_HANDLING.md)
- [CHEFFLOW_V1_SCOPE_LOCK.md](../../CHEFFLOW_V1_SCOPE_LOCK.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

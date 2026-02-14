# Client Lifecycle Data Mutations

## Document Identity
- **File**: `CLIENT_LIFECYCLE_DATA_MUTATIONS.md`
- **Category**: Lifecycle System (34/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **data mutation rules** throughout the lifecycle in ChefFlow V1.

It specifies:
- What data can be mutated at each lifecycle state
- Who can mutate data (client vs chef vs system)
- Mutation validation rules
- Immutability boundaries
- Mutation audit requirements
- Mutation failure handling

---

## Core Mutation Principle

**Progressive Immutability**: Data becomes **less mutable** as lifecycle progresses.

### Mutation Lifecycle

```
draft (fully mutable) → proposed (partially locked) → paid (mostly locked) →
confirmed (locked) → in_progress (immutable) → completed (immutable)
```

**System Law Alignment**: Law 4 (finite lifecycle, server-enforced).

---

## Mutation Rules by Lifecycle State

### State: `draft` (Inquiry/Planning)

| Field | Client Can Mutate? | Chef Can Mutate? | System Can Mutate? |
|-------|-------------------|-----------------|-------------------|
| `title` | ❌ No | ✅ Yes | ❌ No |
| `event_date` | ❌ No | ✅ Yes | ❌ No |
| `guest_count` | ❌ No | ✅ Yes | ❌ No |
| `location` | ❌ No | ✅ Yes | ❌ No |
| `total_amount_cents` | ❌ No | ✅ Yes | ❌ No |
| `deposit_amount_cents` | ❌ No | ✅ Yes | ❌ No |
| `notes` | ❌ No | ✅ Yes | ❌ No |
| `status` | ❌ No | ✅ Yes (via transition) | ❌ No |

**Rationale**: Client submitted inquiry, but cannot edit draft event. Only chef can modify.

**Enforcement**:

```sql
-- Clients CANNOT update draft events
CREATE POLICY events_client_update ON events
  FOR UPDATE USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id() AND
    status != 'draft' -- Cannot update draft
  );
```

---

### State: `proposed` (Awaiting Client Response)

| Field | Client Can Mutate? | Chef Can Mutate? | System Can Mutate? |
|-------|-------------------|-----------------|-------------------|
| `title` | ❌ No | ❌ **No** | ❌ No |
| `event_date` | ❌ No | ❌ **No** | ❌ No |
| `guest_count` | ❌ No | ❌ **No** | ❌ No |
| `location` | ❌ No | ❌ **No** | ❌ No |
| `total_amount_cents` | ❌ No | ❌ **No** | ❌ No |
| `deposit_amount_cents` | ❌ No | ❌ **No** | ❌ No |
| `notes` | ❌ No | ⚠️ **Warning only** | ❌ No |
| `status` | ✅ Yes (accept) | ✅ Yes (cancel) | ❌ No |

**Critical**: Once proposed, event details are **immutable** (client accepted specific terms).

**Exception**: Chef can cancel and create new proposal with different terms.

**Enforcement**:

```typescript
async function preventProposedEventMutation(
  event: Event,
  field: string
): Promise<void> {
  if (event.status === 'proposed') {
    const lockedFields = [
      'title',
      'event_date',
      'guest_count',
      'location',
      'total_amount_cents',
      'deposit_amount_cents'
    ];

    if (lockedFields.includes(field)) {
      throw new Error(
        `Cannot modify ${field} after proposal. Cancel and create new proposal.`
      );
    }
  }
}
```

---

### State: `accepted` (Awaiting Payment)

| Field | Client Can Mutate? | Chef Can Mutate? | System Can Mutate? |
|-------|-------------------|-----------------|-------------------|
| All event fields | ❌ No | ❌ No | ❌ No |
| `status` | ❌ No | ✅ Yes (cancel) | ✅ **Yes** (webhook) |

**Critical**: Event locked during payment processing.

**System Mutation**: Webhook transitions `accepted → paid`.

**Enforcement**:

```sql
-- No updates allowed in accepted status (except status via transition)
CREATE POLICY events_prevent_accepted_mutation ON events
  FOR UPDATE USING (
    status != 'accepted' OR
    (OLD.status = 'accepted' AND NEW.status = 'paid') -- Only system can transition
  );
```

---

### State: `paid` (Deposit Received)

| Field | Client Can Mutate? | Chef Can Mutate? | System Can Mutate? |
|-------|-------------------|-----------------|-------------------|
| All event fields | ❌ No | ❌ No | ❌ No |
| `status` | ❌ No | ✅ Yes (confirm or cancel) | ❌ No |
| `notes` | ❌ No | ⚠️ Warning only | ❌ No |

**Rationale**: Deposit paid = financial commitment. No edits allowed.

---

### State: `confirmed` (Booking Confirmed)

| Field | Client Can Mutate? | Chef Can Mutate? | System Can Mutate? |
|-------|-------------------|-----------------|-------------------|
| `title` | ❌ No | ❌ **No** | ❌ No |
| `event_date` | ❌ No | ❌ **No** | ❌ No |
| `guest_count` | ❌ No | ⚠️ **Warning** | ❌ No |
| `location` | ❌ No | ⚠️ **Warning** | ❌ No |
| `total_amount_cents` | ❌ No | ❌ **No** | ❌ No |
| `deposit_amount_cents` | ❌ No | ❌ **No** | ❌ No |
| `notes` | ❌ No | ✅ Yes | ❌ No |
| `status` | ❌ No | ✅ Yes (start or cancel) | ❌ No |

**Partial Mutability**: Chef can update notes, but core fields locked.

**Warning**: Changing `guest_count` or `location` after confirmation **logs warning** (allowed but discouraged).

---

### State: `in_progress` (Event Happening)

| Field | Client Can Mutate? | Chef Can Mutate? | System Can Mutate? |
|-------|-------------------|-----------------|-------------------|
| All event fields | ❌ No | ❌ **No** | ❌ No |
| `status` | ❌ No | ✅ Yes (complete or cancel) | ❌ No |

**Immutability**: Event details completely locked during execution.

---

### State: `completed` (Event Finished)

| Field | Client Can Mutate? | Chef Can Mutate? | System Can Mutate? |
|-------|-------------------|-----------------|-------------------|
| All event fields | ❌ No | ❌ **No** | ❌ No |
| `status` | ❌ No | ❌ **No** | ❌ No |

**Complete Immutability**: Terminal state = historical record (no mutations).

**Exception**: Soft delete via `deleted_at` (preserves audit trail).

---

### State: `cancelled` (Cancelled)

| Field | Client Can Mutate? | Chef Can Mutate? | System Can Mutate? |
|-------|-------------------|-----------------|-------------------|
| All event fields | ❌ No | ❌ **No** | ❌ No |
| `status` | ❌ No | ❌ **No** | ❌ No |

**Complete Immutability**: Terminal state = frozen for audit.

---

## Special Fields: Always Immutable

### Fields That Never Change After Creation

| Field | Reason |
|-------|--------|
| `id` | Primary key (UUID) |
| `tenant_id` | Tenant binding |
| `client_id` | Client binding |
| `created_at` | Creation timestamp |
| `created_by` | Original creator |

**Enforcement**: Database-level constraints.

```sql
-- Prevent tenant_id change
CREATE TRIGGER prevent_tenant_change
BEFORE UPDATE ON events
FOR EACH ROW
WHEN (OLD.tenant_id IS DISTINCT FROM NEW.tenant_id)
EXECUTE FUNCTION raise_exception('Cannot change tenant_id');
```

---

## Mutation Validation

### Server-Side Validation

All mutations validated before database write:

```typescript
async function validateEventMutation(
  event: Event,
  updates: Partial<Event>,
  actor: User
): Promise<void> {
  // Check if event is in mutable state
  const mutableStatuses = ['draft', 'confirmed'];
  if (!mutableStatuses.includes(event.status)) {
    throw new Error(`Cannot update event in ${event.status} status`);
  }

  // Check actor permissions
  if (actor.role === 'client') {
    throw new Error('Clients cannot directly update event details');
  }

  if (actor.role === 'chef' && actor.tenant_id !== event.tenant_id) {
    throw new Error('Chef does not own this event');
  }

  // Check immutable fields
  const immutableFields = ['id', 'tenant_id', 'client_id', 'created_at', 'created_by'];
  const attemptedImmutableChange = Object.keys(updates).some(field =>
    immutableFields.includes(field)
  );

  if (attemptedImmutableChange) {
    throw new Error('Cannot modify immutable fields');
  }

  // State-specific validation
  if (event.status === 'confirmed') {
    const lockedFields = ['total_amount_cents', 'deposit_amount_cents', 'event_date'];
    const attemptedLockedChange = Object.keys(updates).some(field =>
      lockedFields.includes(field)
    );

    if (attemptedLockedChange) {
      throw new Error('Cannot modify locked fields in confirmed status');
    }
  }

  // All validations passed
}
```

---

## Mutation Audit

### Tracking All Mutations

**V1**: Auto-updated `updated_at` timestamp.

**V2 Enhancement**: Full mutation history.

```sql
-- V2: Event mutation history
CREATE TABLE event_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  mutated_by UUID REFERENCES auth.users(id),
  mutated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  event_status event_status NOT NULL -- Status at time of mutation
);

-- Trigger to log mutations
CREATE OR REPLACE FUNCTION log_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  -- Compare OLD and NEW, insert row for each changed field
  -- (Implementation details omitted for brevity)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_mutation_audit
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION log_event_mutation();
```

---

## Client-Initiated Mutations

### What Clients Can Mutate

**V1**: Clients can **only** mutate their own profile data.

**Client Profile Mutations**:

| Field | Can Mutate? | Validation |
|-------|------------|-----------|
| `full_name` | ✅ Yes | Non-empty |
| `phone` | ✅ Yes | Valid format |
| `dietary_restrictions` | ✅ Yes | Max 500 chars |
| `allergies` | ✅ Yes | Max 500 chars |
| `email` | ⚠️ Via Supabase Auth | Must verify new email |

**Client Cannot Mutate**:
- Event details (any status)
- Pricing
- Event status
- Menus
- Ledger entries

**Enforcement**:

```sql
-- Clients can only update their own profile
CREATE POLICY clients_self_update ON clients
  FOR UPDATE USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );

-- Clients CANNOT update events directly
CREATE POLICY events_client_no_update ON events
  FOR UPDATE USING (false) -- Always deny
  WITH CHECK (false);
```

---

## System-Initiated Mutations

### Webhook Mutations

**System** (webhook) can mutate:

| Field | When | Trigger |
|-------|------|---------|
| `status` | `accepted → paid` | `payment_intent.succeeded` |
| `status_changed_at` | On any status change | Auto-updated |

**Audit Trail**: System mutations have `transitioned_by = NULL`.

```json
{
  "transition": "accepted_to_paid",
  "transitioned_by": null, // System
  "metadata": {
    "trigger": "stripe_webhook",
    "stripe_event_id": "evt_..."
  }
}
```

---

## Menu Mutations

### Event-Menu Relationship

| Action | Client Can? | Chef Can? | Status Allowed |
|--------|------------|-----------|---------------|
| **Attach menu** | ❌ No | ✅ Yes | `draft` only |
| **Detach menu** | ❌ No | ✅ Yes | `draft` only |
| **Edit menu template** | ❌ No | ✅ Yes | Anytime (affects all events) |

**Enforcement**:

```sql
-- Prevent menu mutations after proposal
CREATE POLICY event_menus_mutation_lock ON event_menus
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id
        AND status = 'draft'
        AND get_current_user_role() = 'chef'
    )
  );
```

---

## Ledger Mutations

### Immutable Ledger

**Critical Rule**: Ledger entries are **append-only** (no UPDATE, no DELETE).

**Enforcement**: Database triggers.

```sql
CREATE TRIGGER ledger_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER ledger_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

**Correction Mechanism**: Create new `adjustment` entry.

**System Law Alignment**: Law 3 (ledger immutability).

---

## Mutation Failures

### Common Mutation Failures

| Failure | Cause | User Message |
|---------|-------|--------------|
| **Locked field** | Editing `total_amount_cents` in `confirmed` | "Pricing locked after confirmation" |
| **Wrong status** | Editing event in `completed` | "Cannot edit completed events" |
| **Permission denied** | Client editing event | "You don't have permission" |
| **Immutable field** | Changing `tenant_id` | "Cannot change tenant" |

**Error Response**:

```json
{
  "error": {
    "code": "MUTATION_BLOCKED",
    "message": "Cannot modify this field in current state",
    "details": {
      "field": "total_amount_cents",
      "current_status": "confirmed",
      "allowed_statuses": ["draft"]
    }
  }
}
```

---

## Mutation Testing

### Test Cases

| Test | Setup | Action | Expected Result |
|------|-------|--------|----------------|
| **Draft edit allowed** | Event in `draft` | Chef edits pricing | ✅ Success |
| **Proposed edit blocked** | Event in `proposed` | Chef edits pricing | ❌ Error |
| **Client edit blocked** | Any status | Client edits event | ❌ Error |
| **System webhook success** | Event in `accepted` | Webhook transitions | ✅ Success |
| **Completed edit blocked** | Event in `completed` | Any mutation | ❌ Error |

**Verification Script**: See `scripts/verify-immutability.sql`.

---

## Soft Deletes

### Deletion as Mutation

**V1**: Events use `deleted_at` timestamp (soft delete).

```sql
-- Soft delete (mutation allowed)
UPDATE events
SET deleted_at = now()
WHERE id = 'event_uuid';

-- RLS excludes soft-deleted events
CREATE POLICY events_exclude_deleted ON events
  FOR SELECT USING (deleted_at IS NULL);
```

**Audit Trail**: Soft deletes preserve history.

**Hard Delete**: Only for `draft` events with no payments (rare).

---

## Related Documents

- [CLIENT_LIFECYCLE_STATE_MACHINE.md](./CLIENT_LIFECYCLE_STATE_MACHINE.md)
- [CLIENT_LIFECYCLE_VISIBILITY_RULES.md](./CLIENT_LIFECYCLE_VISIBILITY_RULES.md)
- [CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md](./CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md)
- [CLIENT_AUTHORIZATION_INVARIANTS.md](./CLIENT_AUTHORIZATION_INVARIANTS.md)
- [CHEFFLOW_V1_SCOPE_LOCK.md](../../CHEFFLOW_V1_SCOPE_LOCK.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

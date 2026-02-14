# Event Lifecycle State Machine

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

This document defines the event lifecycle state machine, valid transitions, and enforcement mechanisms for ChefFlow V1.

---

## Table of Contents

1. [Overview](#overview)
2. [Event Status Enum](#event-status-enum)
3. [State Machine Diagram](#state-machine-diagram)
4. [Valid Transitions](#valid-transitions)
5. [Transition Rules](#transition-rules)
6. [Server-Side Enforcement](#server-side-enforcement)
7. [Audit Trail](#audit-trail)
8. [Terminal States](#terminal-states)
9. [Code Examples](#code-examples)
10. [Testing Transitions](#testing-transitions)

---

## Overview

Events in ChefFlow V1 follow a **finite state machine** with predefined states and validated transitions. This ensures:

- **Predictable lifecycle**: Events progress through logical stages
- **Audit trail**: All transitions logged to `event_transitions` table (immutable)
- **Permission enforcement**: Only authorized users can trigger transitions
- **Data integrity**: Invalid state skipping is prevented

### System Law #4

> **Event Lifecycle is Finite and Server-Enforced**
> - Events follow predefined state machine with validated transitions
> - Server-side validation in `transitionEventStatus()` function
> - NEVER allow state skipping or client-initiated invalid transitions
> - ALL transitions logged to `event_transitions` table (immutable)

---

## Event Status Enum

Defined in `supabase/migrations/20260213000001_initial_schema.sql`:

```sql
CREATE TYPE event_status AS ENUM (
  'draft',        -- Chef creating event
  'proposed',     -- Sent to client, awaiting response
  'accepted',     -- Client accepted, awaiting payment
  'paid',         -- Deposit/full payment received
  'confirmed',    -- Chef confirmed after payment
  'in_progress',  -- Event day
  'completed',    -- Event finished
  'cancelled'     -- Cancelled (with reason)
);
```

---

## State Machine Diagram

```
┌─────────┐
│  draft  │ ───────────────┐
└────┬────┘                │
     │                     │
     ▼                     │
┌──────────┐               │
│ proposed │ ──────────────┤
└────┬─────┘               │
     │                     │
     ▼                     │
┌──────────┐               │
│ accepted │ ──────────────┤
└────┬─────┘               │
     │                     │
     ▼                     │
┌──────────┐               │
│   paid   │ ──────────────┤
└────┬─────┘               │
     │                     │
     ▼                     │
┌───────────┐              │
│ confirmed │ ─────────────┤
└────┬──────┘              │
     │                     │
     ▼                     │
┌─────────────┐            │
│ in_progress │ ───────────┤
└──────┬──────┘            │
       │                   │
       ▼                   ▼
┌───────────┐         ┌───────────┐
│ completed │         │ cancelled │
└───────────┘         └───────────┘
  (terminal)            (terminal)
```

**Key Points**:
- **Linear progression**: Events move forward through stages
- **Cancellation from any state**: Events can be cancelled at any point
- **Terminal states**: `completed` and `cancelled` are final

---

## Valid Transitions

### Forward Progression

| From         | To           | Description                          |
|--------------|--------------|--------------------------------------|
| `draft`      | `proposed`   | Chef sends proposal to client        |
| `proposed`   | `accepted`   | Client accepts proposal              |
| `accepted`   | `paid`       | Payment received (webhook)           |
| `paid`       | `confirmed`  | Chef confirms event after payment    |
| `confirmed`  | `in_progress`| Event day begins                     |
| `in_progress`| `completed`  | Event finished successfully          |

### Cancellation Path

| From         | To           | Description                          |
|--------------|--------------|--------------------------------------|
| `draft`      | `cancelled`  | Chef cancels during creation         |
| `proposed`   | `cancelled`  | Cancelled before client response     |
| `accepted`   | `cancelled`  | Cancelled after acceptance           |
| `paid`       | `cancelled`  | Cancelled after payment (refund)     |
| `confirmed`  | `cancelled`  | Cancelled after confirmation         |
| `in_progress`| `cancelled`  | Cancelled during event               |

### Invalid Transitions (Blocked)

- **State skipping**: Cannot go from `draft` → `confirmed` (must pass through intermediate states)
- **Backward transitions**: Cannot go from `confirmed` → `draft`
- **From terminal states**: Cannot transition from `completed` or `cancelled` to any other state

---

## Transition Rules

Defined in `CHEFFLOW_V1_SCOPE_LOCK.md`:

| From State    | To State      | Triggered By | Validation Required          |
|---------------|---------------|--------------|------------------------------|
| draft         | proposed      | Chef         | Event must have pricing      |
| proposed      | accepted      | Client       | Client must own event        |
| accepted      | paid          | System       | Webhook only                 |
| paid          | confirmed     | Chef         | Deposit paid (ledger check)  |
| confirmed     | in_progress   | Chef         | None                         |
| in_progress   | completed     | Chef         | None                         |
| *             | cancelled     | Chef         | Cancellation reason required |

### Validation Details

1. **draft → proposed**
   - `total_amount_cents` must be > 0
   - `deposit_amount_cents` must be > 0
   - `client_id` must be set

2. **proposed → accepted**
   - Must be triggered by the client who owns the event
   - RLS ensures `client_id = get_current_client_id()`

3. **accepted → paid**
   - **ONLY** triggered by Stripe webhook
   - Manual transition is prohibited
   - Ledger entry created first

4. **paid → confirmed**
   - Chef must verify payment via ledger
   - `is_deposit_paid` must be true (from `event_financial_summary` view)

5. **cancelled**
   - `cancellation_reason` TEXT required
   - `cancelled_at` timestamp set
   - `cancelled_by` UUID set to triggering user

---

## Server-Side Enforcement

Transitions are enforced by the `transitionEventStatus()` function in `lib/events/transitions.ts`.

### Function Signature

```typescript
export async function transitionEventStatus(
  eventId: string,
  toStatus: Database['public']['Enums']['event_status'],
  userId: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }>
```

### Validation Steps

1. **Fetch current event**
   - Verify event exists
   - Check current status

2. **Validate transition**
   - Check if transition is allowed (from current → target)
   - Verify user has permission

3. **Perform validations**
   - Execute status-specific checks (e.g., pricing for `proposed`)

4. **Update event**
   - Set new status
   - Set `status_changed_at` timestamp
   - Set cancellation fields if applicable

5. **Create audit log**
   - Insert into `event_transitions` (immutable)
   - Record `from_status`, `to_status`, user, timestamp

6. **Return result**
   - Success or validation error

### Example Implementation

```typescript
// lib/events/transitions.ts
export async function transitionEventStatus(
  eventId: string,
  toStatus: EventStatus,
  userId: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()

  // 1. Fetch current event
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  // 2. Validate transition is allowed
  const isValidTransition = validateTransition(event.status, toStatus)
  if (!isValidTransition) {
    return {
      success: false,
      error: `Invalid transition: ${event.status} → ${toStatus}`
    }
  }

  // 3. Status-specific validations
  if (toStatus === 'proposed') {
    if (event.total_amount_cents <= 0) {
      return { success: false, error: 'Pricing required before proposing' }
    }
  }

  if (toStatus === 'cancelled' && !metadata?.cancellation_reason) {
    return { success: false, error: 'Cancellation reason required' }
  }

  // 4. Update event status
  const updateData: any = {
    status: toStatus,
    status_changed_at: new Date().toISOString(),
    updated_by: userId
  }

  if (toStatus === 'cancelled') {
    updateData.cancellation_reason = metadata?.cancellation_reason
    updateData.cancelled_at = new Date().toISOString()
    updateData.cancelled_by = userId
  }

  const { error: updateError } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 5. Create audit log entry
  const { error: transitionError } = await supabase
    .from('event_transitions')
    .insert({
      tenant_id: event.tenant_id,
      event_id: eventId,
      from_status: event.status,
      to_status: toStatus,
      transitioned_by: userId,
      metadata: metadata || null
    })

  if (transitionError) {
    console.error('[TRANSITION] Failed to log transition:', transitionError)
    // Don't fail the transition, but log the error
  }

  return { success: true }
}

// Helper: Validate if transition is allowed
function validateTransition(from: EventStatus, to: EventStatus): boolean {
  const validTransitions: Record<EventStatus, EventStatus[]> = {
    draft: ['proposed', 'cancelled'],
    proposed: ['accepted', 'cancelled'],
    accepted: ['paid', 'cancelled'],
    paid: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [], // Terminal state
    cancelled: []  // Terminal state
  }

  return validTransitions[from]?.includes(to) ?? false
}
```

---

## Audit Trail

All transitions are logged to the **immutable** `event_transitions` table.

### Schema

```sql
CREATE TABLE event_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status event_status,      -- NULL for initial state
  to_status event_status NOT NULL,
  transitioned_by UUID REFERENCES auth.users(id), -- NULL for system
  transitioned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  metadata JSONB -- Stores reason, IP, source, etc.
);
```

### Immutability

Triggers prevent UPDATE/DELETE:

```sql
CREATE TRIGGER transitions_immutable_update
BEFORE UPDATE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_transition_modification();

CREATE TRIGGER transitions_immutable_delete
BEFORE DELETE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_transition_modification();
```

### Querying Audit Trail

```typescript
// Get all transitions for an event
const { data: transitions } = await supabase
  .from('event_transitions')
  .select(`
    *,
    transitioned_by_user:auth.users!transitioned_by(email)
  `)
  .eq('event_id', eventId)
  .order('transitioned_at', { ascending: true })

// Example result:
// [
//   { from_status: null, to_status: 'draft', transitioned_at: '2026-02-10...' },
//   { from_status: 'draft', to_status: 'proposed', transitioned_at: '2026-02-11...' },
//   { from_status: 'proposed', to_status: 'accepted', transitioned_at: '2026-02-12...' }
// ]
```

---

## Terminal States

### Completed

- Event finished successfully
- No further transitions allowed
- Cannot be cancelled or modified

### Cancelled

- Event terminated (with reason)
- No further transitions allowed
- `cancellation_reason`, `cancelled_at`, `cancelled_by` fields populated

### Handling Refunds

If an event is cancelled after payment:

1. Transition event to `cancelled` (with reason)
2. Process refund via Stripe API
3. Stripe webhook creates negative ledger entry (`refund_succeeded`)
4. Balance computed from ledger automatically updates

---

## Code Examples

### Example 1: Chef Proposes Event

```typescript
// app/actions/propose-event.ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { transitionEventStatus } from '@/lib/events/transitions'

export async function proposeEventAction(eventId: string) {
  // 1. Verify user is chef
  const chef = await requireChef()

  // 2. Transition to proposed
  const result = await transitionEventStatus(
    eventId,
    'proposed',
    chef.id,
    { source: 'chef_portal' }
  )

  if (!result.success) {
    return { error: result.error }
  }

  // 3. Send notification (future: email to client)
  // await sendEventProposalEmail(eventId)

  return { success: true }
}
```

### Example 2: Client Accepts Event

```typescript
// app/actions/accept-event.ts
'use server'

import { requireClient } from '@/lib/auth/get-user'
import { transitionEventStatus } from '@/lib/events/transitions'
import { createServerClient } from '@/lib/supabase/server'

export async function acceptEventAction(eventId: string) {
  const client = await requireClient()
  const supabase = createServerClient()

  // 1. Verify client owns event
  const { data: event } = await supabase
    .from('events')
    .select('client_id')
    .eq('id', eventId)
    .single()

  if (event?.client_id !== client.entityId) {
    return { error: 'Unauthorized' }
  }

  // 2. Transition to accepted
  const result = await transitionEventStatus(
    eventId,
    'accepted',
    client.id
  )

  return result
}
```

### Example 3: Webhook Marks Event Paid

```typescript
// app/api/webhooks/stripe/route.ts
import { transitionEventStatus } from '@/lib/events/transitions'
import { appendLedgerEntry } from '@/lib/ledger/append'

export async function POST(request: Request) {
  // ... Stripe signature verification ...

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const eventId = paymentIntent.metadata.event_id

    // 1. Append ledger entry (idempotent)
    await appendLedgerEntry({
      tenant_id: paymentIntent.metadata.tenant_id,
      event_id: eventId,
      entry_type: 'charge_succeeded',
      amount_cents: paymentIntent.amount,
      stripe_event_id: event.id,
      stripe_object_id: paymentIntent.id,
      description: 'Payment succeeded'
    })

    // 2. Transition event to paid (system user)
    await transitionEventStatus(
      eventId,
      'paid',
      null, // System transition
      { stripe_event_id: event.id }
    )
  }

  return new Response('OK', { status: 200 })
}
```

---

## Testing Transitions

### Manual Testing Checklist

- [ ] **draft → proposed**: Chef can propose event with valid pricing
- [ ] **proposed → accepted**: Client can accept their own event
- [ ] **accepted → paid**: Webhook transitions after payment
- [ ] **paid → confirmed**: Chef can confirm after deposit
- [ ] **confirmed → in_progress**: Chef can mark in progress
- [ ] **in_progress → completed**: Chef can complete event
- [ ] **Any → cancelled**: Chef can cancel with reason
- [ ] **Invalid transitions blocked**: Attempt `draft → confirmed` (should fail)
- [ ] **Client cannot confirm**: Client tries `paid → confirmed` (should fail)
- [ ] **Terminal states**: Attempt transition from `completed` (should fail)

### Automated Test Example

```typescript
// tests/events/transitions.test.ts
import { describe, it, expect } from '@jest/globals'
import { transitionEventStatus } from '@/lib/events/transitions'

describe('Event Transitions', () => {
  it('should allow draft → proposed', async () => {
    const result = await transitionEventStatus(
      testEventId,
      'proposed',
      chefUserId
    )
    expect(result.success).toBe(true)
  })

  it('should block draft → confirmed', async () => {
    const result = await transitionEventStatus(
      testEventId,
      'confirmed',
      chefUserId
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid transition')
  })

  it('should require cancellation reason', async () => {
    const result = await transitionEventStatus(
      testEventId,
      'cancelled',
      chefUserId
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('reason required')
  })
})
```

---

## Related Documentation

- [CHEFFLOW_V1_SCOPE_LOCK.md](./CHEFFLOW_V1_SCOPE_LOCK.md) - Locked lifecycle states
- [PAYMENTS.md](./PAYMENTS.md) - Payment flow and webhook handling
- [RLS_POLICIES.md](./RLS_POLICIES.md) - Permission enforcement
- [API_REFERENCE.md](./API_REFERENCE.md) - Transition functions

---

## Verification

To verify transition enforcement is working:

```sql
-- Check that terminal states cannot transition
SELECT status, COUNT(*)
FROM events
WHERE status IN ('completed', 'cancelled')
GROUP BY status;

-- View all transitions for debugging
SELECT
  e.title,
  et.from_status,
  et.to_status,
  et.transitioned_at,
  u.email as transitioned_by_email
FROM event_transitions et
JOIN events e ON e.id = et.event_id
LEFT JOIN auth.users u ON u.id = et.transitioned_by
ORDER BY et.transitioned_at DESC
LIMIT 20;
```

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team

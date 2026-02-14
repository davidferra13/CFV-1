# Event Transition Server Function Contract (V1)

This document defines the **exact contract** for the server-side event transition function. This is the single authoritative function for changing event status. All status changes MUST go through this function.

---

## Function Signature

```typescript
// lib/events/transition-event.ts

export async function transitionEvent(params: TransitionEventParams): Promise<TransitionEventResult>;
```

---

## Input Contract

```typescript
interface TransitionEventParams {
  // Required
  eventId: string;           // UUID of event to transition
  toStatus: EventStatus;     // Target status (validated against map)
  triggeredBy: string;       // user_id or 'system'

  // Optional
  notes?: string;            // Human-readable reason (max 500 chars)
  metadata?: Record<string, unknown>; // Additional context (JSON)

  // Idempotency
  idempotencyKey?: string;   // Optional idempotency key for retries
}
```

### Parameter Validation Rules

| Parameter | Required | Type | Validation |
|-----------|----------|------|------------|
| `eventId` | Yes | UUID string | Must exist in database |
| `toStatus` | Yes | EventStatus enum | Must be valid enum value |
| `triggeredBy` | Yes | UUID string or 'system' | Must be valid user_id or literal 'system' |
| `notes` | No | string | Max 500 characters |
| `metadata` | No | JSON object | Max 5KB serialized |
| `idempotencyKey` | No | string | Unique constraint check |

---

## Output Contract

```typescript
interface TransitionEventResult {
  success: boolean;
  event: {
    id: string;
    status: EventStatus;
    previousStatus: EventStatus;
  };
  transition: {
    id: string;              // Transition log entry ID
    triggeredAt: Date;
  };
  error?: {
    code: TransitionErrorCode;
    message: string;
  };
}

type TransitionErrorCode =
  | 'EVENT_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'ALREADY_IN_STATUS'
  | 'PERMISSION_DENIED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'VALIDATION_FAILED';
```

---

## Implementation Reference

```typescript
// lib/events/transition-event.ts

import { db } from '@/lib/db';
import { isValidTransition } from './transition-map';
import type { EventStatus, TransitionEventParams, TransitionEventResult } from '@/types';

export async function transitionEvent(
  params: TransitionEventParams
): Promise<TransitionEventResult> {
  const { eventId, toStatus, triggeredBy, notes, metadata, idempotencyKey } = params;

  // 1. Validate input parameters
  if (!eventId || !toStatus || !triggeredBy) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Missing required parameters',
      },
    };
  }

  // 2. Fetch current event (with tenant isolation via RLS)
  const event = await db.events.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      tenant_id: true,
    },
  });

  if (!event) {
    return {
      success: false,
      error: {
        code: 'EVENT_NOT_FOUND',
        message: `Event ${eventId} not found or access denied`,
      },
    };
  }

  const fromStatus = event.status;

  // 3. Check idempotency: already in target status?
  if (fromStatus === toStatus) {
    // Fetch most recent transition
    const recentTransition = await db.event_transitions.findFirst({
      where: {
        event_id: eventId,
        to_status: toStatus,
      },
      orderBy: { triggered_at: 'desc' },
    });

    return {
      success: true,
      event: {
        id: event.id,
        status: toStatus,
        previousStatus: fromStatus,
      },
      transition: {
        id: recentTransition?.id || '',
        triggeredAt: recentTransition?.triggered_at || new Date(),
      },
    };
  }

  // 4. Validate transition against map
  if (!isValidTransition(fromStatus, toStatus)) {
    return {
      success: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `Cannot transition from ${fromStatus} to ${toStatus}`,
      },
    };
  }

  // 5. Check idempotency key (if provided)
  if (idempotencyKey) {
    const existing = await db.event_transitions.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    if (existing) {
      return {
        success: false,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Transition already processed with this idempotency key',
        },
      };
    }
  }

  // 6. Perform transition in atomic transaction
  try {
    const result = await db.$transaction(async (tx) => {
      // Create transition log entry (immutable)
      const transition = await tx.event_transitions.create({
        data: {
          event_id: eventId,
          from_status: fromStatus,
          to_status: toStatus,
          triggered_by: triggeredBy,
          triggered_at: new Date(),
          notes: notes || null,
          metadata: metadata || null,
          idempotency_key: idempotencyKey || null,
        },
      });

      // Update event status
      await tx.events.update({
        where: { id: eventId },
        data: {
          status: toStatus,
          updated_at: new Date(),
        },
      });

      return transition;
    });

    return {
      success: true,
      event: {
        id: event.id,
        status: toStatus,
        previousStatus: fromStatus,
      },
      transition: {
        id: result.id,
        triggeredAt: result.triggered_at,
      },
    };
  } catch (error) {
    console.error('Transition failed:', error);
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
```

---

## Usage Examples

### Example 1: Chef Proposes Event

```typescript
// Server action
'use server';

import { transitionEvent } from '@/lib/events/transition-event';
import { getUser } from '@/lib/auth/get-user';

export async function proposeEvent(eventId: string) {
  const user = await getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const result = await transitionEvent({
    eventId,
    toStatus: 'proposed',
    triggeredBy: user.id,
    notes: 'Chef marked proposal ready for client review',
  });

  if (!result.success) {
    throw new Error(result.error?.message || 'Transition failed');
  }

  return result;
}
```

### Example 2: Stripe Webhook Confirms Deposit

```typescript
// API route: /api/webhooks/stripe
import { transitionEvent } from '@/lib/events/transition-event';

async function handlePaymentSucceeded(stripeEvent: Stripe.Event) {
  const eventId = stripeEvent.metadata.event_id;

  const result = await transitionEvent({
    eventId,
    toStatus: 'confirmed',
    triggeredBy: 'system',
    notes: 'Deposit confirmed via Stripe webhook',
    metadata: {
      stripe_event_id: stripeEvent.id,
      stripe_payment_intent: stripeEvent.data.object.id,
    },
    idempotencyKey: stripeEvent.id, // Use Stripe event ID for idempotency
  });

  if (!result.success) {
    console.error('Failed to confirm event:', result.error);
    // Webhook will retry automatically
  }
}
```

### Example 3: Chef Cancels Event

```typescript
'use server';

import { transitionEvent } from '@/lib/events/transition-event';
import { getUser } from '@/lib/auth/get-user';

export async function cancelEvent(eventId: string, reason: string) {
  const user = await getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Note: Actual implementation would also handle refunds
  const result = await transitionEvent({
    eventId,
    toStatus: 'canceled',
    triggeredBy: user.id,
    notes: `Canceled by chef: ${reason}`,
  });

  if (!result.success) {
    throw new Error(result.error?.message || 'Cancellation failed');
  }

  // TODO: Process refund if post-deposit
  return result;
}
```

---

## Error Handling

### Client-Side Error Handling

```typescript
// In a server action
try {
  const result = await transitionEvent({
    eventId: '123',
    toStatus: 'proposed',
    triggeredBy: userId,
  });

  if (!result.success) {
    // Handle specific error codes
    switch (result.error?.code) {
      case 'EVENT_NOT_FOUND':
        return { error: 'Event not found' };
      case 'INVALID_TRANSITION':
        return { error: 'This action is not available for this event' };
      case 'ALREADY_IN_STATUS':
        return { success: true }; // Idempotent success
      case 'PERMISSION_DENIED':
        return { error: 'You do not have permission to perform this action' };
      default:
        return { error: 'An unexpected error occurred' };
    }
  }

  return { success: true, event: result.event };
} catch (error) {
  console.error('Transition error:', error);
  return { error: 'Failed to update event status' };
}
```

---

## Constraints and Rules

### Rule 1: Single Point of Entry
ALL status changes must use `transitionEvent()`. Direct database updates to `events.status` are forbidden.

### Rule 2: Atomic Transaction Required
Transition log and status update must occur in the same transaction (both succeed or both fail).

### Rule 3: Immutable Transition Log
`event_transitions` records are never updated or deleted. They are append-only.

### Rule 4: Idempotency Enforcement
- If already in target status, return success (no-op)
- If `idempotencyKey` provided, prevent duplicate transitions

### Rule 5: Audit Trail Completeness
Every transition MUST create a log entry with:
- `event_id`
- `from_status`
- `to_status`
- `triggered_by`
- `triggered_at`

### Rule 6: RLS Enforcement
Even with correct parameters, transition fails if:
- User lacks access to event (RLS denies read)
- Event belongs to different tenant

---

## Performance Considerations

### Database Indexes Required

```sql
-- Events table
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_tenant_status ON events(tenant_id, status);

-- Transitions table
CREATE INDEX idx_transitions_event_id ON event_transitions(event_id);
CREATE INDEX idx_transitions_idempotency ON event_transitions(idempotency_key);
CREATE INDEX idx_transitions_triggered_at ON event_transitions(triggered_at DESC);
```

### Query Optimization
- Fetch only required event fields for validation
- Use RLS to enforce tenant filtering (no manual WHERE clauses needed)
- Cache transition map in memory (static data)

---

## Testing Contract

```typescript
// __tests__/transition-event.test.ts

describe('transitionEvent', () => {
  it('successfully transitions from draft to proposed', async () => {
    const event = await createTestEvent({ status: 'draft' });

    const result = await transitionEvent({
      eventId: event.id,
      toStatus: 'proposed',
      triggeredBy: 'user-123',
    });

    expect(result.success).toBe(true);
    expect(result.event.status).toBe('proposed');
    expect(result.event.previousStatus).toBe('draft');
  });

  it('rejects invalid transitions', async () => {
    const event = await createTestEvent({ status: 'draft' });

    const result = await transitionEvent({
      eventId: event.id,
      toStatus: 'confirmed', // Invalid: skips states
      triggeredBy: 'user-123',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_TRANSITION');
  });

  it('is idempotent when already in target status', async () => {
    const event = await createTestEvent({ status: 'proposed' });

    const result = await transitionEvent({
      eventId: event.id,
      toStatus: 'proposed', // Already in this status
      triggeredBy: 'user-123',
    });

    expect(result.success).toBe(true); // Idempotent success
  });

  it('enforces tenant isolation', async () => {
    const event = await createTestEvent({
      status: 'draft',
      tenant_id: 'tenant-A',
    });

    // Attempt to transition as user from tenant-B
    const result = await transitionEvent({
      eventId: event.id,
      toStatus: 'proposed',
      triggeredBy: 'user-from-tenant-B',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('EVENT_NOT_FOUND'); // RLS denies access
  });
});
```

---

## V1 Scope Boundaries

### Included in V1
- Full implementation of `transitionEvent()` function
- All error codes and handling
- Idempotency support
- Atomic transaction guarantees
- Audit logging

### Excluded from V1
- Conditional transitions (e.g., "only if menu exists")
- Side effects (email notifications handled separately)
- Rollback/undo functionality
- Batch transitions (one event at a time)

---

**End of Event Transition Server Function Contract**

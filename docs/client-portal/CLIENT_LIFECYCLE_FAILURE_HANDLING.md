# Client Lifecycle Failure Handling

## Document Identity
- **File**: `CLIENT_LIFECYCLE_FAILURE_HANDLING.md`
- **Category**: Lifecycle System (32/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **failure handling** for lifecycle transitions in ChefFlow V1.

It specifies:
- How lifecycle failures are detected
- System behavior when failures occur
- Recovery mechanisms for failed transitions
- Inconsistency detection and resolution
- Webhook failure handling
- Error states and client communication

---

## Failure Categories

### Types of Lifecycle Failures

| Failure Type | Cause | Impact | Recovery |
|-------------|-------|--------|----------|
| **Validation Failure** | Invalid transition attempt | Transition blocked | User fixes input |
| **Permission Failure** | Unauthorized actor | Transition blocked | User logs in correctly |
| **Financial Failure** | Ledger inconsistency | Transition blocked | Reconcile ledger |
| **Webhook Failure** | Stripe webhook delayed/failed | Event stuck in `accepted` | Retry webhook |
| **Database Failure** | Connection/constraint error | Transaction rolled back | Retry operation |
| **System Failure** | Server crash, timeout | Partial state | Idempotent retry |

---

## Validation Failures

### Definition

**Validation failure** occurs when transition violates business rules.

### Common Validation Failures

| Scenario | Error | User-Facing Message |
|----------|-------|-------------------|
| Propose without pricing | `total_amount_cents = 0` | "Please set pricing before proposing event" |
| Accept wrong event | `client_id mismatch` | "You cannot accept this event" |
| Confirm without deposit | Ledger shows $0 | "Deposit not verified in ledger" |
| Skip state | `draft → confirmed` | "Invalid transition: must propose first" |

### Handling Validation Failures

```typescript
async function handleValidationFailure(
  error: ValidationError,
  context: TransitionContext
): Promise<ErrorResponse> {
  // Log validation failure
  console.error('Validation failure:', {
    event_id: context.event_id,
    from_status: context.from_status,
    to_status: context.to_status,
    errors: error.errors
  });

  // Return user-friendly error
  return {
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Cannot complete transition',
      details: error.errors,
      resolution: 'Please fix the errors and try again'
    },
    status: 400
  };
}
```

**Client Experience**: Error message displayed inline, user can fix and retry.

---

## Permission Failures

### Definition

**Permission failure** occurs when actor lacks authorization.

### Common Permission Failures

| Scenario | Error | User-Facing Message |
|----------|-------|-------------------|
| Client tries to confirm | `role !== 'chef'` | "Only chef can confirm events" |
| Chef from wrong tenant | `tenant_id mismatch` | "You don't have access to this event" |
| Client tries to start event | `role !== 'chef'` | "Only chef can start events" |

### Handling Permission Failures

```typescript
async function handlePermissionFailure(
  error: PermissionError,
  context: TransitionContext
): Promise<ErrorResponse> {
  // Log permission failure (potential security issue)
  console.error('Permission failure:', {
    event_id: context.event_id,
    attempted_by: context.actor_id,
    actor_role: context.actor_role,
    required_role: error.required_role
  });

  // Return 403 Forbidden
  return {
    error: {
      code: 'PERMISSION_DENIED',
      message: 'You are not authorized to perform this action',
      resolution: 'Contact support if you believe this is an error'
    },
    status: 403
  };
}
```

**System Law Alignment**: Law 2 (authoritative role resolution).

---

## Financial Failures

### Definition

**Financial failure** occurs when ledger state doesn't support transition.

### Common Financial Failures

| Scenario | Ledger State | Expected State | Resolution |
|----------|--------------|---------------|-----------|
| Confirm without deposit | `collected_cents = 0` | `>= deposit_amount_cents` | Wait for webhook |
| Complete with negative balance | `collected_cents < 0` | `>= 0` | Investigate refund |
| Deposit mismatch | Ledger shows $100 | Event expects $500 | Reconcile with Stripe |

### Handling Financial Failures

```typescript
async function handleFinancialFailure(
  error: FinancialError,
  context: TransitionContext
): Promise<ErrorResponse> {
  // Log financial failure (critical)
  console.error('Financial failure:', {
    event_id: context.event_id,
    ledger_balance_cents: error.actual_balance,
    required_balance_cents: error.required_balance,
    difference_cents: error.difference
  });

  // Alert admin (V2: send Slack notification)
  await alertAdmin('Financial inconsistency detected', {
    event_id: context.event_id,
    error: error.message
  });

  // Return user-friendly error
  return {
    error: {
      code: 'FINANCIAL_INCONSISTENCY',
      message: 'Payment verification failed',
      details: {
        expected: `$${error.required_balance / 100}`,
        actual: `$${error.actual_balance / 100}`
      },
      resolution: 'Contact support to resolve payment issue'
    },
    status: 402 // Payment Required
  };
}
```

**System Law Alignment**: Law 3 (ledger-first financial truth).

---

## Webhook Failures

### Webhook Delay

**Scenario**: Client pays deposit, but webhook delayed (Stripe congestion, network issue).

**System Behavior**:
- Event remains in `accepted` status
- Client sees "Payment processing..." message
- No automatic transition

**Resolution**:

```typescript
async function detectDelayedWebhook(eventId: string): Promise<void> {
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  if (event.status !== 'accepted') {
    return; // Not waiting for payment
  }

  // Check if payment succeeded in Stripe but webhook not received
  const stripePaymentIntents = await stripe.paymentIntents.list({
    limit: 10,
    customer: event.client.stripe_customer_id
  });

  const matchingPayment = stripePaymentIntents.data.find(pi =>
    pi.metadata.event_id === eventId && pi.status === 'succeeded'
  );

  if (matchingPayment) {
    // Webhook missed, manually process
    console.warn('Missed webhook detected, manually processing');
    await processPaymentIntentSucceeded(matchingPayment);
  }
}
```

**V1**: Manual detection (chef checks Stripe dashboard).

**V2 Enhancement**: Automated webhook retry + manual fallback.

---

### Webhook Failure

**Scenario**: Webhook endpoint returns 500 error (server crash during processing).

**Stripe Behavior**: Stripe retries webhook with exponential backoff.

**System Behavior**:
- First attempt fails → event remains `accepted`
- Stripe retries (up to 3 days)
- Idempotency key prevents duplicate ledger entries on retry

**Recovery**:

```typescript
async function handleWebhookRetry(
  stripeEvent: Stripe.Event
): Promise<{ success: boolean }> {
  try {
    // Check if already processed (idempotency)
    const existingEntry = await db.ledger_entries.findUnique({
      where: { stripe_event_id: stripeEvent.id }
    });

    if (existingEntry) {
      console.log('Webhook already processed (idempotent)');
      return { success: true }; // Return 200 to Stripe
    }

    // Process webhook
    await processWebhookEvent(stripeEvent);
    return { success: true };
  } catch (error) {
    console.error('Webhook processing failed:', error);
    // Return 500 to Stripe (triggers retry)
    throw error;
  }
}
```

**System Law Alignment**: Law 11 (idempotency required).

---

## Database Failures

### Transaction Rollback

**Scenario**: Database constraint violation during transition.

**Example**: Unique constraint on `event_transitions` fails (duplicate entry).

**System Behavior**:
- Transaction rolled back
- No partial state change
- Error returned to client

**Recovery**:

```typescript
async function handleDatabaseFailure(
  error: DatabaseError,
  context: TransitionContext
): Promise<ErrorResponse> {
  // Check if retryable
  const isRetryable = error.code === 'CONNECTION_ERROR' || error.code === 'TIMEOUT';

  if (isRetryable) {
    console.warn('Database failure (retryable):', error.message);
    return {
      error: {
        code: 'TEMPORARY_ERROR',
        message: 'Temporary system error',
        resolution: 'Please try again in a moment'
      },
      status: 503 // Service Unavailable
    };
  }

  // Non-retryable error
  console.error('Database failure (non-retryable):', error);
  return {
    error: {
      code: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      resolution: 'Contact support if this persists'
    },
    status: 500
  };
}
```

---

## System Failures

### Partial State Scenarios

**Scenario**: Server crashes mid-transition (rare).

**Example Timeline**:
1. Event status updated to `paid`
2. **Server crashes**
3. Audit entry **not created**

**Result**: Event in `paid` status, but no audit trail.

**Detection**:

```sql
-- Find events with status change but no audit entry
SELECT e.id, e.status, e.status_changed_at
FROM events e
LEFT JOIN event_transitions et
  ON et.event_id = e.id
  AND et.to_status = e.status
  AND et.transitioned_at BETWEEN e.status_changed_at - INTERVAL '1 second' AND e.status_changed_at + INTERVAL '1 second'
WHERE et.id IS NULL
  AND e.status_changed_at > now() - INTERVAL '1 day';
```

**Recovery**:

```typescript
async function backfillMissingAuditEntries(): Promise<void> {
  const eventsWithoutAudit = await findEventsWithoutAuditEntry();

  for (const event of eventsWithoutAudit) {
    console.warn('Backfilling missing audit entry for event:', event.id);

    await db.event_transitions.create({
      data: {
        tenant_id: event.tenant_id,
        event_id: event.id,
        from_status: null, // Unknown previous status
        to_status: event.status,
        transitioned_by: null, // Unknown actor
        transitioned_at: event.status_changed_at,
        metadata: {
          backfilled: true,
          backfilled_at: new Date().toISOString(),
          reason: 'Missing audit entry detected'
        }
      }
    });
  }
}
```

**System Law Alignment**: Law 17 (no silent transitions).

---

## Inconsistency Detection

### Ledger vs Status Inconsistency

**Scenario**: Event status = `paid`, but ledger shows no payments.

**Detection**:

```typescript
async function detectLedgerStatusInconsistency(): Promise<Event[]> {
  const events = await db.events.findMany({
    where: {
      status: {
        in: ['paid', 'confirmed', 'in_progress', 'completed']
      }
    },
    include: { ledger_entries: true }
  });

  const inconsistentEvents = events.filter(event => {
    const collectedCents = event.ledger_entries
      .filter(le => le.entry_type === 'charge_succeeded')
      .reduce((sum, le) => sum + le.amount_cents, 0);

    return collectedCents < event.deposit_amount_cents;
  });

  return inconsistentEvents;
}
```

**Resolution**:
1. Check Stripe for missed webhooks
2. Manually reconcile ledger
3. Update event status if necessary

---

## Error States

### Frozen State

**Definition**: Event cannot progress due to unresolved failure.

**Example**: Event stuck in `accepted` for > 7 days.

**Detection**:

```sql
-- Find events stuck in accepted status
SELECT id, client_id, status_changed_at
FROM events
WHERE status = 'accepted'
  AND status_changed_at < now() - INTERVAL '7 days';
```

**Chef Action**: Manual investigation required.

---

## Client Communication During Failures

### User-Facing Error Messages

**Principles**:
1. **Clear**: Explain what went wrong
2. **Actionable**: Tell user what to do
3. **Reassuring**: Don't alarm unnecessarily

**Examples**:

| Internal Error | User-Facing Message |
|---------------|-------------------|
| `Ledger balance mismatch` | "We're verifying your payment. This usually takes a few minutes." |
| `Webhook timeout` | "Payment processing is taking longer than usual. Please check back shortly." |
| `Database constraint violation` | "This action couldn't be completed. Please try again." |
| `Permission denied` | "You don't have permission to perform this action." |

---

## Recovery Mechanisms

### Automatic Recovery

| Failure Type | Auto-Recovery | Mechanism |
|-------------|--------------|-----------|
| **Webhook delay** | ✅ Yes | Stripe retries for 3 days |
| **Database timeout** | ✅ Yes | Connection pool retry |
| **Validation failure** | ❌ No | User must fix input |
| **Permission failure** | ❌ No | User must log in correctly |
| **Financial inconsistency** | ⚠️ Partial | Automated reconciliation (V2) |

### Manual Recovery

**Chef Actions**:
1. Check Stripe dashboard for payment status
2. Manually reconcile ledger if needed
3. Contact client to verify payment
4. Cancel and recreate event if necessary

**Admin Actions** (V2):
1. Access admin panel
2. View failed transitions
3. Manually process stuck webhooks
4. Override status (with audit trail)

---

## Failure Monitoring

### V1: Console Logging

**V1 Behavior**: Failures logged to console.

```typescript
console.error('Lifecycle transition failed:', {
  event_id: eventId,
  from_status: fromStatus,
  to_status: toStatus,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

### V2 Enhancement: Error Tracking

```typescript
// V2: Send to Sentry/DataDog
import * as Sentry from '@sentry/node';

Sentry.captureException(error, {
  tags: {
    event_id: eventId,
    transition: `${fromStatus} -> ${toStatus}`,
    tenant_id: tenantId
  },
  contexts: {
    event: {
      id: eventId,
      status: fromStatus,
      client_id: clientId
    }
  }
});
```

---

## Failure Metrics

### Tracking Failure Rates

| Metric | Definition | V1 Support |
|--------|-----------|-----------|
| **Transition Failure Rate** | % of failed transitions | ⚠️ Manual (console logs) |
| **Webhook Failure Rate** | % of failed webhook deliveries | ❌ No (V2: Stripe webhook logs) |
| **Recovery Time** | Time from failure to resolution | ❌ No (V2: tracking) |
| **Stuck Events** | Events in same status > 7 days | ✅ Manual query |

---

## Idempotency and Retry Safety

### Safe Retry Behavior

All lifecycle transitions are **idempotent**:

```typescript
async function transitionEventStatus(
  eventId: string,
  toStatus: EventStatus,
  actorId: string
): Promise<Event> {
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  // If already in target status, return success (idempotent)
  if (event.status === toStatus) {
    return event;
  }

  // Proceed with transition...
}
```

**Benefit**: Client can safely retry failed transitions without side effects.

**System Law Alignment**: Law 11 (idempotency required).

---

## Related Documents

- [CLIENT_LIFECYCLE_STATE_MACHINE.md](./CLIENT_LIFECYCLE_STATE_MACHINE.md)
- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)
- [CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md](./CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md)
- [CLIENT_DEPOSIT_STATE_RULES.md](./CLIENT_DEPOSIT_STATE_RULES.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

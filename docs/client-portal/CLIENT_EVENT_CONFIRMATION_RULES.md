# Client Event Confirmation Rules

## Document Identity
- **File**: `CLIENT_EVENT_CONFIRMATION_RULES.md`
- **Category**: Lifecycle System (27/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **event confirmation rules** for ChefFlow V1.

It specifies:
- When and how events are confirmed
- Confirmation validation requirements
- Chef vs client roles in confirmation
- Confirmation notifications
- Post-confirmation state management
- Confirmation reversal rules

---

## Confirmation Definition

**Event confirmation** is the chef's **explicit acknowledgment** that a booking is locked in and will be fulfilled.

### Confirmation Timing

```
Proposal → Client Accepts → Deposit Paid → CHEF CONFIRMS → Event Locked
```

**Critical**: Confirmation happens **after** deposit payment, **before** event execution.

---

## Confirmation Transition

### Transition: `paid → confirmed`

**Triggered By**: Chef (manual action)

**Status Change**:
- Before: `status = 'paid'`
- After: `status = 'confirmed'`

**Rationale**: Even though deposit is paid, chef must **verify** and **commit** to fulfilling the event.

---

## Confirmation Requirements

### Pre-Confirmation Checklist

Before chef can confirm, these conditions **must** be met:

| Requirement | Validation | Blocking? |
|------------|-----------|----------|
| **Deposit verified in ledger** | `SUM(ledger.charge_succeeded) >= deposit_amount_cents` | ✅ Yes |
| **Event status = `paid`** | Current status check | ✅ Yes |
| **Event date is future** | `event_date > now()` | ⚠️ Warning only |
| **Chef owns event** | `tenant_id = chef.id` | ✅ Yes |
| **Menu attached (optional)** | Check `event_menus` table | ❌ No |

### Validation Function

```typescript
async function validateConfirmation(
  eventId: string,
  chefUserId: string
): Promise<void> {
  const errors: string[] = [];

  // Load event
  const event = await db.events.findUnique({
    where: { id: eventId },
    include: { ledger_entries: true }
  });

  // Check status
  if (event.status !== 'paid') {
    errors.push('Event must be in "paid" status to confirm');
  }

  // Check chef ownership
  const chef = await getCurrentChef(chefUserId);
  if (event.tenant_id !== chef.id) {
    errors.push('Chef does not own this event');
  }

  // Check deposit paid via ledger
  const depositVerified = await verifyDepositPaid(eventId);
  if (!depositVerified) {
    errors.push('Deposit not verified in ledger');
  }

  // Warning: Event date in past
  if (new Date(event.event_date) < new Date()) {
    console.warn('Confirming event with past date');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
```

**System Law Alignment**: Law 3 (ledger verification), Law 4 (server-enforced transitions).

---

## Confirmation Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────┐
│                CONFIRMATION FLOW                             │
└─────────────────────────────────────────────────────────────┘

1. Deposit payment succeeds (webhook)
        ↓
2. Event transitions to 'paid' status
        ↓
3. Chef receives notification (V1: manual check)
        ↓
4. Chef reviews event details
        ↓
5. Chef clicks "Confirm Booking" button
        ↓
6. Server validates confirmation requirements
        ↓
7. Event transitions to 'confirmed' status
        ↓
8. Audit entry created in event_transitions
        ↓
9. Client receives confirmation notification (V1: manual)
        ↓
10. Event is locked and ready for execution
```

---

## Confirmation API

### Endpoint: Confirm Event

```typescript
POST /api/events/:eventId/confirm

// Request body (optional)
{
  "confirmation_notes": "Excited to cater this event!"
}

// Response
{
  "event": {
    "id": "event_uuid",
    "status": "confirmed",
    "status_changed_at": "2026-02-14T12:00:00Z"
  }
}
```

### Server Implementation

```typescript
async function confirmEvent(
  eventId: string,
  chefUserId: string,
  notes?: string
): Promise<Event> {
  // Validate confirmation requirements
  await validateConfirmation(eventId, chefUserId);

  // Transition to confirmed
  const event = await db.events.update({
    where: { id: eventId },
    data: {
      status: 'confirmed',
      status_changed_at: new Date(),
      updated_by: chefUserId
    }
  });

  // Create audit entry
  await db.event_transitions.create({
    data: {
      tenant_id: event.tenant_id,
      event_id: eventId,
      from_status: 'paid',
      to_status: 'confirmed',
      transitioned_by: chefUserId,
      metadata: {
        confirmed_at: new Date().toISOString(),
        confirmation_notes: notes,
        ledger_balance_cents: await getLedgerBalance(eventId)
      }
    }
  });

  return event;
}
```

---

## Client Role in Confirmation

### Client Cannot Confirm

**Critical Rule**: Clients **cannot** confirm events. Only chefs can.

**Rationale**:
- Confirmation is chef's commitment to fulfill
- Client already committed by accepting proposal and paying deposit
- Chef may need to verify schedule, supplies, staff availability

### Client View After Deposit

Client sees:

```
┌────────────────────────────────────────────────────┐
│         AWAITING CHEF CONFIRMATION                  │
├────────────────────────────────────────────────────┤
│ ✓ Deposit Received: $500.00                        │
│                                                     │
│ Your booking is pending chef confirmation.          │
│ You'll be notified once confirmed.                  │
│                                                     │
│ Status: Payment Received                            │
└────────────────────────────────────────────────────┘
```

---

## Confirmation Notifications

### V1: Manual Notification

**V1 Behavior**: No automated email/SMS when event confirmed.

**Chef Responsibility**: Manually notify client (phone, email, or in-app message).

### V2 Enhancement: Automated Notification

```typescript
// V2: Send email when confirmed
async function sendConfirmationNotification(event: Event) {
  const client = await db.clients.findUnique({
    where: { id: event.client_id }
  });

  await sendEmail({
    to: client.email,
    subject: `Booking Confirmed: ${event.title}`,
    body: `
      Great news! Your event has been confirmed.

      Event: ${event.title}
      Date: ${event.event_date.toLocaleDateString()}
      Location: ${event.location}

      We're looking forward to catering your event!

      View details: ${process.env.APP_URL}/my-events/${event.id}
    `
  });
}
```

---

## Post-Confirmation State

### What Happens After Confirmation

| Aspect | Before Confirmation | After Confirmation |
|--------|-------------------|-------------------|
| **Event Status** | `paid` | `confirmed` |
| **Mutability** | ⚠️ Limited edits | ❌ Locked (minimal edits) |
| **Client View** | "Awaiting Confirmation" | "Booking Confirmed" |
| **Chef Actions** | Confirm or cancel | Start event or cancel |
| **Cancellation Penalty** | Lower refund penalty | Higher refund penalty |

---

## Confirmation Immutability

### Fields Locked After Confirmation

Once confirmed, these fields **cannot** be changed:

| Field | Editable Before | Editable After |
|-------|----------------|---------------|
| `event_date` | ✅ Yes | ❌ No (reschedule = cancel + recreate) |
| `total_amount_cents` | ✅ Yes | ❌ No (price locked) |
| `deposit_amount_cents` | ✅ Yes | ❌ No (deposit locked) |
| `guest_count` | ✅ Yes | ⚠️ Warning only (affects prep) |
| `location` | ✅ Yes | ⚠️ Warning only (affects logistics) |
| `client_id` | ✅ Yes | ❌ No (client binding locked) |

**Enforcement**:

```typescript
async function preventConfirmedEventMutation(
  event: Event,
  field: string
): Promise<void> {
  if (event.status === 'confirmed' || event.status === 'in_progress') {
    const lockedFields = [
      'event_date',
      'total_amount_cents',
      'deposit_amount_cents',
      'client_id'
    ];

    if (lockedFields.includes(field)) {
      throw new Error(`Cannot modify ${field} after confirmation`);
    }
  }
}
```

---

## Confirmation Delay

### Why Delay Confirmation?

Chefs may delay confirmation to:
- Verify schedule availability
- Confirm ingredient sourcing
- Check staff availability
- Negotiate final menu details

**Acceptable Delay**: 24-48 hours after deposit payment.

**Auto-Reminder** (V2): If event still `paid` after 48 hours, remind chef.

---

## Confirmation Reversal

### Can Confirmation Be Reversed?

**V1**: No reversal. Once confirmed, event stays confirmed until:
- Chef starts event (`confirmed → in_progress`)
- Chef cancels event (`confirmed → cancelled`)

**No "Unconfirm" Transition**: `confirmed → paid` is **not allowed**.

**Rationale**: Confirmation is a commitment. Reversing would confuse client.

---

## Confirmation Without Full Payment

### Deposit vs Full Payment

**Scenario**: Client pays deposit ($500) but total is $2,500.

**Confirmation Behavior**:
- Chef confirms booking based on deposit
- Balance ($2,000) remains due
- Client can pay balance before/after event

**Ledger State**:
```
collected_cents = 500 (deposit)
total_amount_cents = 2500
balance_due = 2000
```

**Chef Visibility**: Chef sees balance due, can request payment before event.

---

## Confirmation and Menu Finalization

### Relationship

**Confirmation** ≠ **Menu Finalization**

| Milestone | Timing | Purpose |
|-----------|--------|---------|
| **Confirmation** | After deposit paid | Commit to fulfill event |
| **Menu Finalization** | Before event (optional) | Lock menu version |

**V1**: Menu finalization is **separate** from confirmation.

**Flow**:
```
confirmed → [menu finalized] → in_progress
```

Menu can be finalized **during** `confirmed` state (no status change).

---

## Confirmation Metrics

### Tracking Confirmation Performance

| Metric | Definition | V1 Support |
|--------|-----------|-----------|
| **Time to Confirm** | `confirmed_at - paid_at` | ✅ Manual query |
| **Confirmation Rate** | `(Confirmed / Paid) * 100` | ✅ Manual query |
| **Auto-Confirm Events** | Events where deposit = total | ✅ Manual query |

**Query Example**:

```sql
-- Average time to confirm (in hours)
SELECT
  AVG(EXTRACT(EPOCH FROM (confirmed.transitioned_at - paid.transitioned_at)) / 3600) AS avg_hours_to_confirm
FROM event_transitions confirmed
JOIN event_transitions paid ON paid.event_id = confirmed.event_id
WHERE confirmed.to_status = 'confirmed'
  AND paid.to_status = 'paid'
  AND confirmed.tenant_id = 'tenant_uuid';
```

---

## Confirmation Display

### Chef Portal View

```
┌────────────────────────────────────────────────────┐
│         EVENT READY FOR CONFIRMATION                │
├────────────────────────────────────────────────────┤
│ Event: Birthday Party                               │
│ Client: Sarah Johnson                               │
│ Date: March 15, 2026                                │
│                                                     │
│ ✓ Deposit Paid: $500.00 (Feb 14, 2026)             │
│ Balance Due: $2,000.00                              │
│                                                     │
│ [Confirm Booking]  [Cancel Event]                   │
└────────────────────────────────────────────────────┘
```

### Client Portal View (After Confirmation)

```
┌────────────────────────────────────────────────────┐
│         BOOKING CONFIRMED                           │
├────────────────────────────────────────────────────┤
│ ✓ Booking Confirmed (Feb 14, 2026)                 │
│                                                     │
│ Event: Birthday Party                               │
│ Date: March 15, 2026 at 6:00 PM                    │
│ Location: 123 Main St                               │
│ Guests: 25 people                                   │
│                                                     │
│ Payment Summary:                                    │
│ Deposit Paid: $500.00                               │
│ Balance Due: $2,000.00                              │
│                                                     │
│ [View Menu]  [Message Chef]                         │
└────────────────────────────────────────────────────┘
```

---

## Confirmation Audit

### Audit Requirements

All confirmations logged to `event_transitions`:

```json
{
  "transition": "paid_to_confirmed",
  "event_id": "event_uuid",
  "tenant_id": "tenant_uuid",
  "from_status": "paid",
  "to_status": "confirmed",
  "transitioned_by": "chef_auth_user_id",
  "transitioned_at": "2026-02-14T12:00:00Z",
  "metadata": {
    "confirmed_at": "2026-02-14T12:00:00Z",
    "ledger_balance_cents": 50000,
    "deposit_verified": true,
    "confirmation_notes": "Ready to go!"
  }
}
```

**Immutability**: Enforced by database triggers (no UPDATE/DELETE).

---

## Confirmation Edge Cases

### Edge Case 1: Deposit Paid, Ledger Missing

**Scenario**: Event shows `status = 'paid'`, but ledger has no `charge_succeeded` entry.

**Cause**: Database inconsistency (webhook failed but status changed).

**Resolution**:
1. Block confirmation (validation fails)
2. Chef investigates Stripe dashboard
3. Manually reconcile ledger
4. Retry confirmation

**System Law Alignment**: Law 3 (ledger is source of truth).

---

### Edge Case 2: Client Refund Before Confirmation

**Scenario**: Deposit paid, client requests refund before chef confirms.

**Flow**:
1. Chef issues refund in Stripe
2. Webhook creates ledger entry (`refund_succeeded`)
3. Ledger balance = 0
4. Confirmation validation **fails** (no deposit verified)
5. Chef cancels event (`paid → cancelled`)

---

### Edge Case 3: Confirmation After Event Date

**Scenario**: Chef tries to confirm event that already passed.

**Behavior**: Allowed with warning.

**Rationale**: Chef may have completed event without confirming first.

**Best Practice**: Confirm before event date.

---

## Related Documents

- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)
- [CLIENT_DEPOSIT_STATE_RULES.md](./CLIENT_DEPOSIT_STATE_RULES.md)
- [CLIENT_MENU_FINALIZATION_STATE.md](./CLIENT_MENU_FINALIZATION_STATE.md)
- [CLIENT_EVENT_EXECUTION_STATE.md](./CLIENT_EVENT_EXECUTION_STATE.md)
- [CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md](./CLIENT_LIFECYCLE_AUDIT_INTEGRITY.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

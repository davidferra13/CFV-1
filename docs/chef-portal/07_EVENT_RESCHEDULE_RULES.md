# Event Reschedule Rules (V1)

## Reschedule Definition

**Rescheduling** is changing the `start_ts` and/or `end_ts` of an existing event without changing its fundamental details (client, type, menu, pricing).

---

## Reschedule Permissions by Status

| Status | Can Reschedule? | Restrictions |
|--------|-----------------|--------------|
| `draft` | Yes | No restrictions |
| `proposed` | Yes | Client must be re-notified |
| `deposit_pending` | Yes | Client must approve; may require new payment intent |
| `confirmed` | Yes | Requires client consent; logged in audit |
| `menu_in_progress` | Yes | Requires client consent; logged in audit |
| `menu_locked` | Limited | Only if >72 hours before event; requires consent |
| `executed` | No | Cannot reschedule past events |
| `closed` | No | Terminal state |
| `canceled` | No | Terminal state |

---

## Reschedule Validation Rules

### Rule 1: Overlap Check

Before rescheduling, check for conflicts with other confirmed events.

```typescript
async function rescheduleEvent(
  eventId: string,
  newStart: Date,
  newEnd: Date
): Promise<void> {
  const event = await db.events.findUnique({ where: { id: eventId } });

  // Check for overlaps
  const overlaps = await findOverlappingEvents(
    event.tenant_id,
    newStart,
    newEnd,
    eventId
  );

  const hardConflicts = overlaps.filter((e) =>
    ['confirmed', 'menu_in_progress', 'menu_locked', 'executed'].includes(e.status)
  );

  if (hardConflicts.length > 0) {
    throw new Error('New time conflicts with existing event');
  }

  // Proceed with reschedule
  await db.events.update({
    where: { id: eventId },
    data: {
      start_ts: newStart,
      end_ts: newEnd,
      updated_at: new Date(),
    },
  });

  // Log reschedule in audit
  await db.event_audit_log.create({
    data: {
      event_id: eventId,
      action: 'reschedule',
      actor_id: userId,
      old_value: { start_ts: event.start_ts, end_ts: event.end_ts },
      new_value: { start_ts: newStart, end_ts: newEnd },
    },
  });
}
```

---

### Rule 2: Minimum Notice Period

Rescheduling close to event date may be restricted.

```typescript
const MINIMUM_NOTICE_HOURS = 72; // 3 days

function validateRescheduleNotice(
  currentStart: Date,
  newStart: Date,
  status: EventStatus
): void {
  if (status !== 'menu_locked') {
    return; // No restriction for earlier statuses
  }

  const hoursUntilEvent = (currentStart.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilEvent < MINIMUM_NOTICE_HOURS) {
    throw new Error('Cannot reschedule events less than 72 hours away');
  }
}
```

---

### Rule 3: Client Notification Required

Any reschedule after `proposed` status requires client notification.

```typescript
async function notifyClientOfReschedule(
  eventId: string,
  oldStart: Date,
  newStart: Date
): Promise<void> {
  const event = await db.events.findUnique({
    where: { id: eventId },
    include: { client_profile: true },
  });

  // Send notification (email/in-app)
  await sendEmail({
    to: event.client_profile.email,
    subject: 'Event Rescheduled',
    body: `Your event has been rescheduled from ${format(oldStart, 'PPpp')} to ${format(newStart, 'PPpp')}.`,
  });

  // Log notification
  await db.event_audit_log.create({
    data: {
      event_id: eventId,
      action: 'client_notified',
      notes: 'Reschedule notification sent',
    },
  });
}
```

---

## Reschedule UI Flow

### Step 1: Select New Time

```tsx
<DateTimePicker
  label="New Event Start"
  value={newStartTime}
  onChange={setNewStartTime}
  minDate={new Date()} // Cannot reschedule to past
/>

<DateTimePicker
  label="New Event End"
  value={newEndTime}
  onChange={setNewEndTime}
  minDate={newStartTime} // End after start
/>
```

---

### Step 2: Validate and Show Warnings

```tsx
{conflicts.length > 0 && (
  <div className="alert alert-error">
    Cannot reschedule: new time conflicts with existing events.
  </div>
)}

{needsClientConsent && (
  <div className="alert alert-warning">
    Client will be notified and must approve this reschedule.
  </div>
)}
```

---

### Step 3: Confirm Reschedule

```tsx
<button
  onClick={handleReschedule}
  disabled={conflicts.length > 0 || isProcessing}
>
  {isProcessing ? 'Rescheduling...' : 'Confirm Reschedule'}
</button>
```

---

## Audit Trail

Every reschedule must be logged:

```typescript
interface RescheduleAuditLog {
  event_id: string;
  action: 'reschedule';
  actor_id: string;
  timestamp: Date;
  old_value: {
    start_ts: Date;
    end_ts: Date;
  };
  new_value: {
    start_ts: Date;
    end_ts: Date;
  };
  reason?: string;
}
```

---

## Payment Implications

### Deposit Already Paid

If event is `confirmed` or later:
- Existing deposit remains valid
- No new payment required
- Payment intent remains linked

### Deposit Pending

If status is `deposit_pending`:
- May need to cancel old payment intent
- Create new payment intent with updated metadata
- Client must complete new payment flow

```typescript
async function rescheduleDepositPendingEvent(
  eventId: string,
  newStart: Date,
  newEnd: Date
): Promise<void> {
  const event = await db.events.findUnique({ where: { id: eventId } });

  // Cancel old payment intent
  if (event.payment_intent_id) {
    await stripe.paymentIntents.cancel(event.payment_intent_id);
  }

  // Create new payment intent
  const newPaymentIntent = await createPaymentIntent(eventId);

  // Update event with new times and payment intent
  await db.events.update({
    where: { id: eventId },
    data: {
      start_ts: newStart,
      end_ts: newEnd,
      payment_intent_id: newPaymentIntent.id,
    },
  });
}
```

---

## V1 Scope

### Included
- Reschedule validation (overlap, notice period)
- Audit logging
- Client notification trigger
- UI flow for rescheduling

### Excluded
- Client approval workflow (client can only view, not approve in V1)
- Automated rebooking suggestions
- Calendar sync updates (Google Calendar, etc.)
- Batch rescheduling

---

**End of Event Reschedule Rules**

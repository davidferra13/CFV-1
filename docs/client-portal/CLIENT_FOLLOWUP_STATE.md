# Client Follow-Up State

## Document Identity
- **File**: `CLIENT_FOLLOWUP_STATE.md`
- **Category**: Lifecycle System (30/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **follow-up state** for ChefFlow V1.

It specifies:
- What happens after event completion
- Follow-up timing and triggers
- Client feedback collection
- Rebooking flow initiation
- Follow-up notifications
- Follow-up state management

---

## Follow-Up Definition

**Follow-up** is the post-event engagement phase where:
- Chef solicits client feedback
- Client can leave reviews/testimonials
- Client is encouraged to rebook
- Loyalty points are displayed
- Historical event data is preserved

### Follow-Up vs Completed

| State | Event Status | Client Actions |
|-------|--------------|---------------|
| **Completed** | `completed` | View event, pay balance |
| **Follow-Up** | `completed` | Same as completed + feedback + rebook |

**Key Point**: Follow-up is **not a separate status**. It's a **time-based phase** after completion.

---

## Follow-Up Timing

### When Does Follow-Up Begin?

**V1 Trigger**: Follow-up begins **24 hours after** event completion.

**V2 Enhancement**: Configurable delay per chef (e.g., immediate, 24h, 48h).

### Implementation

```typescript
// V1: Follow-up is time-based (no status change)
function isInFollowUpPhase(event: Event): boolean {
  if (event.status !== 'completed') {
    return false;
  }

  const completedAt = new Date(event.status_changed_at);
  const followUpStartTime = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

  return new Date() >= followUpStartTime;
}
```

**No Status Change**: Event remains `completed`, follow-up is **derived state**.

---

## Follow-Up Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  FOLLOW-UP FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. Event completed (status = 'completed')
        ↓
2. Wait 24 hours
        ↓
3. Follow-up phase begins (derived state)
        ↓
4. Client sees follow-up prompts in portal
        ↓
5. Client optionally:
   - Submits feedback
   - Books another event
   - Views loyalty points
        ↓
6. Follow-up phase persists indefinitely
```

**V1 Limitation**: No automated follow-up emails. Client must visit portal.

---

## Client Portal Follow-Up View

### Follow-Up Display

```
┌────────────────────────────────────────────────────┐
│         EVENT COMPLETED                             │
├────────────────────────────────────────────────────┤
│ ✓ Event Completed: March 15, 2026                  │
│                                                     │
│ Birthday Party for Sarah                            │
│ Chef: Chef Mario                                    │
│                                                     │
│ 🎁 You earned 250 loyalty points!                  │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                     │
│ HOW WAS YOUR EXPERIENCE?                            │
│                                                     │
│ [Leave Feedback]                                    │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                     │
│ BOOK ANOTHER EVENT                                  │
│                                                     │
│ [Book Again with Chef Mario]                        │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                     │
│ [View Event Details]  [View Menu]                   │
└────────────────────────────────────────────────────┘
```

---

## Client Feedback Collection

### V1: Feedback Model

**V1 Limitation**: No dedicated feedback table.

**Workaround**: Feedback collected as **messages** in event thread.

**V2 Enhancement**: Dedicated `event_feedback` table.

### V1 Feedback Flow

1. Client clicks "Leave Feedback" button
2. Redirected to messaging thread
3. Client writes message tagged as "feedback"
4. Chef sees feedback in messages

---

## V2 Feedback Schema

### Future Enhancement

```sql
-- V2: Dedicated feedback table
CREATE TABLE event_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  would_recommend BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, client_id) -- One feedback per event per client
);
```

### V2 Feedback Form

```
┌────────────────────────────────────────────────────┐
│         LEAVE FEEDBACK                              │
├────────────────────────────────────────────────────┤
│ How was your experience with Chef Mario?            │
│                                                     │
│ Rating: ⭐ ⭐ ⭐ ⭐ ⭐ (5/5)                            │
│                                                     │
│ Comments:                                           │
│ ┌────────────────────────────────────────────┐     │
│ │ The food was amazing! Everyone loved it.   │     │
│ │ Chef Mario was professional and friendly.  │     │
│ └────────────────────────────────────────────┘     │
│                                                     │
│ Would you recommend Chef Mario? ✓ Yes  ○ No        │
│                                                     │
│ [Submit Feedback]                                   │
└────────────────────────────────────────────────────┘
```

---

## Rebooking Flow

### Initiating Repeat Booking

**Flow**: Client clicks "Book Again" → new inquiry created.

### API Endpoint

```typescript
POST /api/events/:eventId/rebook

// Request body (optional)
{
  "prefill_from_previous": true, // Use previous event details
  "new_event_date": "2026-06-15T18:00:00Z",
  "new_guest_count": 30
}

// Response
{
  "new_event": {
    "id": "new_event_uuid",
    "status": "draft",
    "title": "Birthday Party (Repeat Booking)",
    "event_date": "2026-06-15T18:00:00Z",
    "guest_count": 30,
    "client_id": "client_uuid",
    "tenant_id": "tenant_uuid",
    "prefilled_from": "previous_event_uuid"
  }
}
```

### Server Implementation

```typescript
async function createRepeatBooking(
  originalEventId: string,
  clientUserId: string,
  options?: {
    prefill_from_previous?: boolean;
    new_event_date?: string;
    new_guest_count?: number;
  }
): Promise<Event> {
  // Load original event
  const originalEvent = await db.events.findUnique({
    where: { id: originalEventId },
    include: { event_menus: true }
  });

  // Validate client owns original event
  const client = await getCurrentClient(clientUserId);
  if (originalEvent.client_id !== client.id) {
    throw new Error('Client does not own original event');
  }

  // Create new draft event
  const newEvent = await db.events.create({
    data: {
      tenant_id: originalEvent.tenant_id,
      client_id: originalEvent.client_id,
      status: 'draft',
      title: `${originalEvent.title} (Repeat Booking)`,
      event_date: options?.new_event_date || new Date(),
      guest_count: options?.new_guest_count || originalEvent.guest_count,
      location: options?.prefill_from_previous ? originalEvent.location : '',
      notes: `Repeat booking from event on ${originalEvent.event_date}`,
      total_amount_cents: 0, // Chef sets pricing
      deposit_amount_cents: 0,
      created_by: clientUserId
    }
  });

  // Optionally copy menus
  if (options?.prefill_from_previous && originalEvent.event_menus.length > 0) {
    await db.event_menus.createMany({
      data: originalEvent.event_menus.map(em => ({
        event_id: newEvent.id,
        menu_id: em.menu_id
      }))
    });
  }

  // Create audit entry
  await db.event_transitions.create({
    data: {
      tenant_id: newEvent.tenant_id,
      event_id: newEvent.id,
      from_status: null,
      to_status: 'draft',
      transitioned_by: clientUserId,
      metadata: {
        source: 'repeat_booking',
        original_event_id: originalEventId
      }
    }
  });

  return newEvent;
}
```

**Critical**: Each booking is a **new event** (new `event_id`).

---

## Loyalty Points Display

### Showing Points Earned

After event completion, client sees loyalty points earned:

```
┌────────────────────────────────────────────────────┐
│         LOYALTY POINTS EARNED                       │
├────────────────────────────────────────────────────┤
│ 🎁 You earned 250 points from this event!          │
│                                                     │
│ Your Total Balance: 750 points                     │
│                                                     │
│ Points are based on the amount you paid.           │
│ ($2,500 paid = 250 points at 10 points/$100)       │
│                                                     │
│ [View Loyalty Balance]                              │
└────────────────────────────────────────────────────┘
```

### Loyalty Points Calculation

**Formula** (V1):

```typescript
function calculateLoyaltyPoints(eventId: string): number {
  // Get total paid from ledger
  const ledgerSummary = await getEventFinancialSummary(eventId);

  if (!ledgerSummary.is_fully_paid) {
    return 0; // No points until fully paid
  }

  const totalPaidCents = ledgerSummary.collected_cents;

  // V1: 10 points per $100 spent
  const pointsPerDollar = 0.1;
  const points = Math.floor((totalPaidCents / 100) * pointsPerDollar);

  return points;
}
```

**System Law Alignment**: Law 3 (loyalty derived from ledger).

---

## Follow-Up Notifications

### V1: No Automated Notifications

**V1 Behavior**: No automated follow-up emails.

**Client Responsibility**: Client must visit portal to see follow-up prompts.

### V2 Enhancement: Automated Follow-Up Email

```typescript
// V2: Send follow-up email 24h after completion
async function sendFollowUpEmail(event: Event) {
  const client = await db.clients.findUnique({
    where: { id: event.client_id }
  });

  const loyaltyPoints = await calculateLoyaltyPoints(event.id);

  await sendEmail({
    to: client.email,
    subject: `Thanks for choosing ${event.chef.business_name}!`,
    body: `
      Hi ${client.full_name},

      Thank you for letting us cater your event!

      You earned ${loyaltyPoints} loyalty points from this event.

      We'd love to hear about your experience:
      ${process.env.APP_URL}/my-events/${event.id}/feedback

      Book again: ${process.env.APP_URL}/my-events/${event.id}/rebook

      Cheers,
      ${event.chef.business_name}
    `
  });
}
```

---

## Follow-Up Metrics

### Tracking Follow-Up Engagement

| Metric | Definition | V1 Support |
|--------|-----------|-----------|
| **Feedback Rate** | % of completed events with feedback | V2 only |
| **Rebook Rate** | % of clients who book again | ✅ Manual query |
| **Time to Rebook** | Days between completed event and next booking | ✅ Manual query |

**Query Example**:

```sql
-- Rebook rate per tenant
SELECT
  COUNT(DISTINCT et1.event_id) AS completed_events,
  COUNT(DISTINCT et2.event_id) AS rebooked_events,
  ROUND(COUNT(DISTINCT et2.event_id)::NUMERIC / COUNT(DISTINCT et1.event_id) * 100, 2) AS rebook_rate_percent
FROM event_transitions et1
LEFT JOIN event_transitions et2
  ON et2.metadata->>'original_event_id' = et1.event_id::TEXT
  AND et2.to_status = 'draft'
WHERE et1.to_status = 'completed'
  AND et1.tenant_id = 'tenant_uuid';
```

---

## Follow-Up State Management

### Derived State

Follow-up is **not** a database status. It's **derived**:

```typescript
interface EventWithFollowUpState extends Event {
  is_in_followup_phase: boolean;
  followup_started_at: Date | null;
}

async function enrichEventWithFollowUp(event: Event): Promise<EventWithFollowUpState> {
  const isInFollowUp = isInFollowUpPhase(event);

  let followUpStartedAt = null;
  if (isInFollowUp && event.status_changed_at) {
    followUpStartedAt = new Date(
      new Date(event.status_changed_at).getTime() + 24 * 60 * 60 * 1000
    );
  }

  return {
    ...event,
    is_in_followup_phase: isInFollowUp,
    followup_started_at: followUpStartedAt
  };
}
```

---

## Follow-Up Edge Cases

### Edge Case 1: Event Completed But Not Fully Paid

**Scenario**: Event completed with outstanding balance.

**Follow-Up Behavior**:
- Loyalty points **not awarded** yet
- Follow-up prompts still shown
- "Pay Balance" button prominently displayed

---

### Edge Case 2: Client Rebooks Before 24h

**Scenario**: Client wants to rebook immediately after event.

**Behavior**: Allowed (follow-up timing is just a UI suggestion).

---

### Edge Case 3: Client Rebooks Multiple Times

**Scenario**: Client books 3 events in a row.

**Behavior**: Each is a separate event, all show follow-up prompts after completion.

---

## Follow-Up Best Practices

### For Chefs

1. **Respond to feedback quickly**: Show clients you value their input
2. **Offer rebook incentives**: Discount codes, loyalty point bonuses (V2)
3. **Personalize follow-up**: Reference specific dishes/moments from event

### For Clients

1. **Leave feedback**: Helps chef improve and attracts new clients
2. **Rebook early**: Secure preferred dates
3. **Use loyalty points**: Redeem for discounts (V2 feature)

---

## Related Documents

- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_EVENT_EXECUTION_STATE.md](./CLIENT_EVENT_EXECUTION_STATE.md)
- [CLIENT_REPEAT_BOOKING_FLOW.md](./CLIENT_REPEAT_BOOKING_FLOW.md)
- [CLIENT_FINANCIAL_OVERVIEW.md](./CLIENT_FINANCIAL_OVERVIEW.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

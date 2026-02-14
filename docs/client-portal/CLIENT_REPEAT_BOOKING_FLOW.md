# Client Repeat Booking Flow

## Document Identity
- **File**: `CLIENT_REPEAT_BOOKING_FLOW.md`
- **Category**: Lifecycle System (31/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **repeat booking flow** for ChefFlow V1.

It specifies:
- How clients rebook with the same chef
- Data pre-filling from previous events
- Repeat booking lifecycle
- Repeat customer identification
- Repeat booking incentives
- Repeat booking metrics

---

## Repeat Booking Definition

A **repeat booking** is when a client creates a **new event** with the same chef after completing a previous event.

### Characteristics

| Aspect | Behavior |
|--------|----------|
| **New Event ID** | ✅ Yes (each booking is unique) |
| **Same Client** | ✅ Yes (same `client_id`) |
| **Same Chef** | ✅ Yes (same `tenant_id`) |
| **Same Pricing** | ❌ No (chef sets new pricing) |
| **Same Menu** | ⚠️ Optional (can prefill) |
| **Independent Lifecycle** | ✅ Yes (separate status tracking) |

**Critical**: Repeat bookings are **new events**, not modifications of old events.

---

## Repeat Booking Flow

```
┌─────────────────────────────────────────────────────────────┐
│              REPEAT BOOKING FLOW                             │
└─────────────────────────────────────────────────────────────┘

1. Client views completed event
        ↓
2. Client clicks "Book Again" button
        ↓
3. System creates new draft event
        ↓
4. System optionally prefills data from previous event
        ↓
5. Client reviews and optionally edits prefilled data
        ↓
6. Client submits inquiry (draft event created)
        ↓
7. Lifecycle begins at 'draft' status
        ↓
8. Chef reviews inquiry (sees "Repeat Customer" badge)
        ↓
9. Chef proposes event
        ↓
10. [Standard lifecycle continues...]
```

---

## Triggering Repeat Booking

### Entry Points

Client can initiate repeat booking from:

1. **Completed event view** → "Book Again" button
2. **My Events list** → "Rebook" action on completed event
3. **Follow-up prompt** → "Book Another Event" button

### UI Button

```
┌────────────────────────────────────────────────────┐
│ Event: Birthday Party (Completed)                  │
│                                                     │
│ [Book Again with Chef Mario]                        │
└────────────────────────────────────────────────────┘
```

---

## Repeat Booking API

### Endpoint: Create Repeat Booking

```typescript
POST /api/events/:eventId/rebook

// Request body
{
  "prefill_from_previous": true,
  "new_event_date": "2026-06-15T18:00:00Z",
  "new_guest_count": 30,
  "additional_notes": "Same setup as last time, but more guests"
}

// Response
{
  "new_event": {
    "id": "new_event_uuid",
    "status": "draft",
    "title": "Birthday Party (Repeat Booking)",
    "event_date": "2026-06-15T18:00:00Z",
    "guest_count": 30,
    "location": "123 Main St (same as previous)",
    "notes": "Repeat booking from March 15, 2026 event\n\nSame setup as last time, but more guests",
    "client_id": "client_uuid",
    "tenant_id": "tenant_uuid",
    "total_amount_cents": 0, // Chef will set
    "deposit_amount_cents": 0, // Chef will set
    "created_by": "client_auth_user_id"
  },
  "prefilled_from": "original_event_uuid"
}
```

---

## Data Pre-Filling

### What Data Is Pre-Filled?

| Field | Pre-Filled? | Source | Editable? |
|-------|------------|--------|----------|
| `event_date` | ⚠️ Optional | Client provides new date | ✅ Yes |
| `guest_count` | ⚠️ Optional | Previous event or client input | ✅ Yes |
| `location` | ✅ Yes | Previous event location | ✅ Yes |
| `title` | ✅ Yes | Previous event title + "(Repeat)" | ✅ Yes |
| `notes` | ✅ Yes | Reference to previous event | ✅ Yes |
| `menus` | ✅ Yes | Previous event menus | ⚠️ Chef edits |
| `pricing` | ❌ No | Chef sets fresh pricing | ❌ No (chef-only) |

### Pre-Fill Logic

```typescript
async function prefillRepeatBooking(
  originalEventId: string,
  newEventData: Partial<Event>
): Promise<Partial<Event>> {
  const originalEvent = await db.events.findUnique({
    where: { id: originalEventId },
    include: {
      event_menus: { include: { menu: true } }
    }
  });

  return {
    title: `${originalEvent.title} (Repeat Booking)`,
    event_date: newEventData.event_date || new Date(),
    guest_count: newEventData.guest_count || originalEvent.guest_count,
    location: originalEvent.location,
    notes: [
      `Repeat booking from event on ${originalEvent.event_date.toLocaleDateString()}`,
      newEventData.additional_notes
    ]
      .filter(Boolean)
      .join('\n\n'),
    // Pricing NOT prefilled (chef must set)
    total_amount_cents: 0,
    deposit_amount_cents: 0
  };
}
```

---

## Menu Pre-Filling

### Copying Menus from Previous Event

If `prefill_from_previous = true`, attach same menus:

```typescript
async function copyMenusFromPreviousEvent(
  originalEventId: string,
  newEventId: string
): Promise<void> {
  const originalMenus = await db.event_menus.findMany({
    where: { event_id: originalEventId }
  });

  if (originalMenus.length > 0) {
    await db.event_menus.createMany({
      data: originalMenus.map(em => ({
        event_id: newEventId,
        menu_id: em.menu_id
      }))
    });
  }
}
```

**Important**: Menus are **references**, not copies. If chef edited menu template, new event sees updated version.

---

## Repeat Customer Identification

### Marking Repeat Customers

**V1 Detection**: Count completed events for client + tenant.

```typescript
async function isRepeatCustomer(
  clientId: string,
  tenantId: string
): Promise<boolean> {
  const completedEventsCount = await db.events.count({
    where: {
      client_id: clientId,
      tenant_id: tenantId,
      status: 'completed'
    }
  });

  return completedEventsCount > 0;
}
```

### Repeat Customer Badge

Chef sees badge when viewing repeat customer inquiries:

```
┌────────────────────────────────────────────────────┐
│ NEW INQUIRY                                         │
├────────────────────────────────────────────────────┤
│ Client: Sarah Johnson                               │
│ 🔁 REPEAT CUSTOMER (3 previous events)             │
│                                                     │
│ Event Date: June 15, 2026                           │
│ Guests: 30                                          │
│ Location: 123 Main St (same as before)              │
│                                                     │
│ Previous Event: Birthday Party (March 15, 2026)     │
│ [View Previous Event]                               │
│                                                     │
│ [Create Proposal]                                   │
└────────────────────────────────────────────────────┘
```

---

## Repeat Booking Lifecycle

### Same as New Booking

Repeat bookings follow **identical lifecycle** as first-time bookings:

```
draft → proposed → accepted → paid → confirmed → in_progress → completed
```

**No Shortcuts**: Repeat customers still go through full flow (no auto-confirm).

**Rationale**: Each event has unique pricing, date, menu.

---

## Repeat Booking Incentives

### V1: No Automated Incentives

**V1 Behavior**: No automated discounts or loyalty redemption.

**Chef Discretion**: Chef can manually offer repeat customer discount.

### V2 Enhancement: Loyalty Discounts

```typescript
// V2: Apply loyalty points to new booking
interface LoyaltyDiscount {
  points_redeemed: number;
  discount_cents: number; // e.g., 100 points = $10
}

async function applyLoyaltyDiscount(
  clientId: string,
  tenantId: string,
  pointsToRedeem: number
): Promise<LoyaltyDiscount> {
  const clientBalance = await getLoyaltyBalance(clientId, tenantId);

  if (pointsToRedeem > clientBalance) {
    throw new Error('Insufficient loyalty points');
  }

  // V2: 100 points = $10 discount
  const discountCents = pointsToRedeem * 10;

  return {
    points_redeemed: pointsToRedeem,
    discount_cents: discountCents
  };
}
```

---

## Repeat Booking Audit Trail

### Linking to Original Event

Repeat bookings reference original event in audit trail:

```json
{
  "transition": "null_to_draft",
  "event_id": "new_event_uuid",
  "to_status": "draft",
  "transitioned_by": "client_auth_user_id",
  "transitioned_at": "2026-02-14T10:00:00Z",
  "metadata": {
    "source": "repeat_booking",
    "original_event_id": "original_event_uuid",
    "prefilled": true,
    "client_is_repeat_customer": true,
    "previous_completed_events_count": 3
  }
}
```

**Purpose**: Track repeat booking behavior for analytics.

---

## Repeat Booking Form

### Client Portal UI

```
┌────────────────────────────────────────────────────┐
│         BOOK AGAIN WITH CHEF MARIO                  │
├────────────────────────────────────────────────────┤
│ You previously booked:                              │
│ "Birthday Party" on March 15, 2026                  │
│                                                     │
│ Let's create your next event!                       │
│                                                     │
│ Event Date:                                         │
│ [June 15, 2026 at 6:00 PM]                         │
│                                                     │
│ Number of Guests:                                   │
│ [30] (previous: 25)                                 │
│                                                     │
│ Location:                                           │
│ [123 Main St, San Francisco, CA] (same as before)   │
│                                                     │
│ Additional Notes:                                   │
│ ┌────────────────────────────────────────────┐     │
│ │ Same setup as last time, but outdoor       │     │
│ │ seating this time.                         │     │
│ └────────────────────────────────────────────┘     │
│                                                     │
│ ✓ Use same menus as last time                      │
│                                                     │
│ [Submit Booking Request]                            │
└────────────────────────────────────────────────────┘
```

---

## Repeat Booking Metrics

### Tracking Repeat Business

| Metric | Definition | V1 Support |
|--------|-----------|-----------|
| **Repeat Customer Rate** | % of clients with > 1 completed event | ✅ Manual query |
| **Avg Events per Client** | Total events / unique clients | ✅ Manual query |
| **Time to Rebook** | Days between completions | ✅ Manual query |
| **Repeat Booking Conversion** | % of repeat inquiries → completed | ✅ Manual query |

**Query Example**:

```sql
-- Repeat customer rate per tenant
SELECT
  COUNT(DISTINCT client_id) AS total_clients,
  COUNT(DISTINCT CASE WHEN event_count > 1 THEN client_id END) AS repeat_clients,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_count > 1 THEN client_id END)::NUMERIC /
    COUNT(DISTINCT client_id) * 100, 2
  ) AS repeat_rate_percent
FROM (
  SELECT
    client_id,
    COUNT(*) AS event_count
  FROM events
  WHERE tenant_id = 'tenant_uuid'
    AND status = 'completed'
  GROUP BY client_id
) client_event_counts;
```

---

## Repeat Booking Edge Cases

### Edge Case 1: Rebooking Cancelled Event

**Scenario**: Client tries to rebook from cancelled event.

**Behavior**: Allowed (creates new draft event).

**Rationale**: Client may have cancelled due to scheduling, wants to try again.

---

### Edge Case 2: Rebooking Before Previous Event Completes

**Scenario**: Client books event for June while March event still `confirmed`.

**Behavior**: Allowed (each event is independent).

**Use Case**: Planning multiple events in advance.

---

### Edge Case 3: Rebooking with Different Guest Count

**Scenario**: Previous event was 25 guests, new booking is 100 guests.

**Behavior**: Allowed (chef will adjust pricing).

**Impact**: Chef may need different menus, pricing significantly higher.

---

## Repeat Booking Best Practices

### For Clients

1. **Reference previous event**: "Same menu as last time" helps chef
2. **Book early**: Secure preferred dates
3. **Mention what worked**: "Loved the salmon dish, please include again"

### For Chefs

1. **Review previous notes**: Understand client preferences
2. **Offer continuity**: Suggest same menus if they worked well
3. **Acknowledge loyalty**: "Welcome back! Great to work with you again"
4. **Adjust pricing**: Scale pricing based on new guest count

---

## Repeat Booking Notifications

### V1: No Automated Notifications

**V1 Behavior**: No email when repeat booking submitted.

**Chef Visibility**: Repeat inquiry appears in chef's draft events list.

### V2 Enhancement: Priority Notifications

```typescript
// V2: Notify chef of repeat customer inquiry
async function notifyChefOfRepeatBooking(newEventId: string) {
  const event = await db.events.findUnique({
    where: { id: newEventId },
    include: { client: true, chef: true }
  });

  const previousEventsCount = await db.events.count({
    where: {
      client_id: event.client_id,
      tenant_id: event.tenant_id,
      status: 'completed'
    }
  });

  await sendEmail({
    to: event.chef.email,
    subject: `🔁 Repeat Customer Inquiry from ${event.client.full_name}`,
    priority: 'high',
    body: `
      Great news! You have a repeat booking request.

      Client: ${event.client.full_name}
      Previous Events: ${previousEventsCount}
      New Event Date: ${event.event_date.toLocaleDateString()}
      Guests: ${event.guest_count}

      View inquiry: ${process.env.APP_URL}/chef/events/${newEventId}
    `
  });
}
```

---

## Repeat Booking Conversion Optimization

### V2 Features to Improve Repeat Rate

1. **Saved preferences**: Remember dietary restrictions, favorite dishes
2. **Quick rebook**: One-click rebook with same details
3. **Loyalty discounts**: Incentivize repeat business
4. **Anniversary reminders**: "Book again for next birthday"
5. **Subscription packages**: Monthly/quarterly catering plans

**V1 Limitation**: None of these features in V1.

---

## Related Documents

- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_FOLLOWUP_STATE.md](./CLIENT_FOLLOWUP_STATE.md)
- [CLIENT_INQUIRY_MODEL.md](./CLIENT_INQUIRY_MODEL.md)
- [CLIENT_FINANCIAL_OVERVIEW.md](./CLIENT_FINANCIAL_OVERVIEW.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

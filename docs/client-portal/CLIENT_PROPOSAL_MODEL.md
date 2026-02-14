# Client Proposal Model

## Document Identity
- **File**: `CLIENT_PROPOSAL_MODEL.md`
- **Category**: Lifecycle System (25/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **proposal model** for ChefFlow V1.

It specifies:
- How chefs create and send proposals to clients
- Proposal structure and required data
- Client proposal review and acceptance flow
- Proposal immutability rules
- Proposal expiration and versioning

---

## Proposal Definition

A **proposal** is a chef-prepared offer for catering services sent to a client after reviewing their inquiry.

### Proposal vs Event

| Aspect | Proposal | Event (Before Proposal) |
|--------|----------|------------------------|
| **Status** | `proposed` | `draft` |
| **Created By** | Chef (transitions from draft) | Client (inquiry) or Chef (direct) |
| **Mutability** | ❌ Immutable (once sent) | ✅ Mutable (chef can edit) |
| **Client Visibility** | ✅ Yes (client can review) | ❌ No (draft not visible to client) |
| **Client Action** | Accept or decline | None (awaiting proposal) |

**Key Point**: Proposals are **events in `proposed` status**. No separate proposals table.

---

## Proposal Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PROPOSAL FLOW                             │
└─────────────────────────────────────────────────────────────┘

1. Chef receives inquiry (event in 'draft')
        ↓
2. Chef edits event details (pricing, menus, title)
        ↓
3. Chef validates proposal requirements
        ↓
4. Chef sends proposal (draft → proposed)
        ↓
5. Client receives notification (V1: manual)
        ↓
6. Client reviews proposal
        ↓
7. Client accepts proposal (proposed → accepted)
        ↓
8. Payment flow initiated
```

---

## Proposal Structure

### Required Fields

To send a proposal, the event **must have**:

| Field | Requirement | Validation |
|-------|------------|-----------|
| `title` | ✅ Required | Non-empty string, max 200 chars |
| `event_date` | ✅ Required | Future date |
| `guest_count` | ✅ Required | Integer, 1-500 |
| `location` | ✅ Required | Non-empty string, min 10 chars |
| `total_amount_cents` | ✅ Required | Integer > 0 |
| `deposit_amount_cents` | ✅ Required | Integer > 0, ≤ total_amount_cents |
| `deposit_required` | ✅ Required | Boolean (default: true) |
| `client_id` | ✅ Required | Valid client UUID |

### Optional Fields

| Field | Optional | Purpose |
|-------|---------|---------|
| `notes` | ✅ Yes | Chef's internal notes (client-visible in V1) |
| `menus` | ✅ Yes | Attached menu templates (via `event_menus` table) |

---

## Proposal Validation

### Pre-Proposal Checklist

Before transitioning `draft → proposed`, server validates:

```typescript
interface ProposalValidation {
  event_has_title: boolean;
  event_has_future_date: boolean;
  event_has_guest_count: boolean;
  event_has_location: boolean;
  event_has_pricing: boolean;
  deposit_within_total: boolean;
  client_exists: boolean;
  chef_owns_event: boolean;
}

async function validateProposal(event: Event, chefUserId: string): Promise<void> {
  const errors: string[] = [];

  // Check title
  if (!event.title || event.title.trim().length === 0) {
    errors.push('Event title is required');
  }

  // Check event date is future
  if (new Date(event.event_date) <= new Date()) {
    errors.push('Event date must be in the future');
  }

  // Check guest count
  if (!event.guest_count || event.guest_count < 1 || event.guest_count > 500) {
    errors.push('Guest count must be between 1 and 500');
  }

  // Check location
  if (!event.location || event.location.trim().length < 10) {
    errors.push('Location must be at least 10 characters');
  }

  // Check pricing
  if (event.total_amount_cents <= 0) {
    errors.push('Total amount must be greater than 0');
  }

  if (event.deposit_amount_cents <= 0) {
    errors.push('Deposit amount must be greater than 0');
  }

  if (event.deposit_amount_cents > event.total_amount_cents) {
    errors.push('Deposit cannot exceed total amount');
  }

  // Check client exists
  const client = await db.clients.findUnique({
    where: { id: event.client_id }
  });
  if (!client) {
    errors.push('Client does not exist');
  }

  // Check chef owns this event (tenant match)
  const chef = await getCurrentChef(chefUserId);
  if (event.tenant_id !== chef.id) {
    errors.push('Chef does not own this event');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
```

**System Law Alignment**: Law 4 (server-enforced transitions).

---

## Sending a Proposal

### Transition: `draft → proposed`

Chef initiates proposal by calling:

```typescript
POST /api/events/:eventId/propose

// No request body needed (all data already on event)
```

**Server-Side Processing**:

```typescript
async function proposeEvent(eventId: string, chefUserId: string): Promise<Event> {
  // Load event
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  // Validate current status
  if (event.status !== 'draft') {
    throw new Error('Only draft events can be proposed');
  }

  // Validate proposal requirements
  await validateProposal(event, chefUserId);

  // Transition to proposed
  const updatedEvent = await db.events.update({
    where: { id: eventId },
    data: {
      status: 'proposed',
      status_changed_at: new Date(),
      updated_by: chefUserId
    }
  });

  // Create audit entry
  await db.event_transitions.create({
    data: {
      tenant_id: event.tenant_id,
      event_id: eventId,
      from_status: 'draft',
      to_status: 'proposed',
      transitioned_by: chefUserId,
      metadata: {
        proposed_at: new Date().toISOString(),
        total_amount_cents: event.total_amount_cents,
        deposit_amount_cents: event.deposit_amount_cents
      }
    }
  });

  return updatedEvent;
}
```

---

## Proposal Immutability

### Rule: Once Proposed, Cannot Edit

**Critical**: After `draft → proposed` transition, event details become **immutable** (from client's perspective).

**Rationale**: Client acceptance is based on specific proposal terms. Changing terms after sending would be deceptive.

### What Happens If Chef Needs to Edit?

**V1 Flow**:

1. Chef cancels proposal (`proposed → cancelled`)
2. Chef creates new event with updated details
3. Chef sends new proposal

**V2 Enhancement**: Proposal versioning (track amendments).

### Enforcement

```typescript
// Middleware: Prevent mutations on proposed events
async function preventProposedEventMutation(
  eventId: string,
  userId: string
): Promise<void> {
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  if (event.status === 'proposed') {
    throw new Error('Cannot edit proposed event. Cancel and create new proposal.');
  }
}
```

**Exception**: Chef can cancel proposal (see below).

---

## Client Proposal Review

### What Client Sees

When viewing a proposal, client sees:

| Field | Display | Editable? |
|-------|---------|----------|
| Event Title | ✅ Show | ❌ No |
| Event Date | ✅ Show | ❌ No |
| Guest Count | ✅ Show | ❌ No |
| Location | ✅ Show | ❌ No |
| Total Amount | ✅ Show (formatted as USD) | ❌ No |
| Deposit Amount | ✅ Show (formatted as USD) | ❌ No |
| Attached Menus | ✅ Show (list with view links) | ❌ No |
| Chef Notes | ✅ Show | ❌ No |

**Client Actions**:
- ✅ Accept Proposal
- ✅ Decline Proposal (sends message to chef)
- ✅ Send Message (ask questions)

---

## Client Acceptance

### Transition: `proposed → accepted`

Client accepts proposal by clicking "Accept Proposal" button.

**Request**:

```typescript
POST /api/events/:eventId/accept

{
  "acceptance_notes": "Looking forward to this!" // Optional
}
```

**Server-Side Processing**:

```typescript
async function acceptProposal(
  eventId: string,
  clientUserId: string,
  notes?: string
): Promise<Event> {
  // Load event
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  // Validate status
  if (event.status !== 'proposed') {
    throw new Error('Only proposed events can be accepted');
  }

  // Validate client owns this event
  const client = await getCurrentClient(clientUserId);
  if (event.client_id !== client.id) {
    throw new Error('Client does not own this event');
  }

  // Transition to accepted
  const updatedEvent = await db.events.update({
    where: { id: eventId },
    data: {
      status: 'accepted',
      status_changed_at: new Date(),
      updated_by: clientUserId
    }
  });

  // Create audit entry
  await db.event_transitions.create({
    data: {
      tenant_id: event.tenant_id,
      event_id: eventId,
      from_status: 'proposed',
      to_status: 'accepted',
      transitioned_by: clientUserId,
      metadata: {
        accepted_at: new Date().toISOString(),
        acceptance_notes: notes
      }
    }
  });

  // Create Stripe checkout session
  const checkoutSession = await createStripeCheckoutSession(event);

  return {
    ...updatedEvent,
    checkout_url: checkoutSession.url
  };
}
```

**Post-Acceptance**: Client is redirected to Stripe checkout to pay deposit.

---

## Client Declination

### V1 Behavior: No Direct Decline

**V1**: Clients **cannot** directly decline proposals. Instead, they:
- Send message to chef explaining why they're declining
- Chef cancels proposal (`proposed → cancelled`)

**V2 Enhancement**: "Decline Proposal" button that auto-cancels with reason.

---

## Proposal Expiration

### V1: No Auto-Expiration

**V1**: Proposals remain active indefinitely (no expiration date).

**Chef Action**: Chef can manually cancel stale proposals.

### V2 Enhancement: Expiration Dates

```typescript
// V2: Add expiration field
interface ProposalV2 {
  proposal_expires_at: Date; // e.g., 7 days from now
}

// V2: Auto-cancel expired proposals
// Background job runs daily
async function expireStaleProposals() {
  const expiredProposals = await db.events.findMany({
    where: {
      status: 'proposed',
      proposal_expires_at: {
        lt: new Date()
      }
    }
  });

  for (const event of expiredProposals) {
    await transitionEventStatus(event.id, 'cancelled', null, {
      cancellation_reason: 'Proposal expired (not accepted within timeframe)'
    });
  }
}
```

---

## Proposal Versioning

### V1: No Versioning

**V1**: If chef needs to change proposal terms, they **cancel and recreate**.

**No proposal history tracking** in V1.

### V2 Enhancement: Amendment Tracking

```typescript
// V2: Proposal versions table
CREATE TABLE proposal_versions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  version INTEGER NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  deposit_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);
```

---

## Proposal Notifications

### V1: Manual Notification

**V1 Behavior**: No automated email when proposal sent.

**Chef Responsibility**: Chef must manually notify client (via phone, email, or in-app message).

### V2 Enhancement: Automated Email

```typescript
// V2: Send email when proposal sent
async function sendProposalNotification(event: Event) {
  const client = await db.clients.findUnique({
    where: { id: event.client_id }
  });

  await sendEmail({
    to: client.email,
    subject: `New Proposal from ${event.chef.business_name}`,
    body: `
      You have a new proposal for your event on ${event.event_date}.

      View proposal: ${process.env.APP_URL}/my-events/${event.id}
    `
  });
}
```

---

## Proposal Display in Client Portal

### Proposal List View

Client sees proposals in `/my-events` with status badge:

| Event | Status | Date | Amount | Action |
|-------|--------|------|--------|--------|
| Birthday Party | **Awaiting Response** | Mar 15, 2026 | $2,500 | **Review Proposal** |

### Proposal Detail View

```
┌────────────────────────────────────────────────────┐
│              PROPOSAL DETAILS                       │
├────────────────────────────────────────────────────┤
│ Event: Birthday Party for Sarah                    │
│ Date: March 15, 2026 at 6:00 PM                    │
│ Location: 123 Main St, San Francisco, CA           │
│ Guests: 25 people                                   │
│                                                     │
│ PRICING                                             │
│ Total: $2,500.00                                    │
│ Deposit: $500.00 (due upon acceptance)              │
│ Balance: $2,000.00 (due after event)                │
│                                                     │
│ MENUS                                               │
│ - Italian Family Style Dinner                       │
│ - Dessert Platter                                   │
│                                                     │
│ CHEF'S NOTES                                        │
│ "Looking forward to creating a memorable            │
│  experience for Sarah's birthday!"                  │
│                                                     │
│ [Accept Proposal]  [Send Message to Chef]           │
└────────────────────────────────────────────────────┘
```

---

## Proposal Cancellation

### Chef Cancels Proposal

Chef can cancel proposal if client hasn't accepted yet:

```typescript
// Transition: proposed → cancelled
await transitionEventStatus(eventId, 'cancelled', chefUserId, {
  cancellation_reason: 'Client requested different menu options'
});
```

**Post-Cancellation**: Chef can create new proposal with updated terms.

---

## Proposal Idempotency

### Accepting Same Proposal Twice

**Protection**: Server checks current status before transitioning.

```typescript
// If already accepted, return existing checkout URL
if (event.status === 'accepted') {
  const existingCheckoutSession = await getStripeCheckoutSession(event.id);
  return {
    ...event,
    checkout_url: existingCheckoutSession.url
  };
}
```

**System Law Alignment**: Law 11 (idempotency required).

---

## Proposal Pricing Display

### Format for Client

All pricing displayed in **USD with 2 decimal places**:

```typescript
function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

// Example:
// 250000 cents → "$2,500.00"
// 50000 cents → "$500.00"
```

**Storage**: Always stored as **integer cents** in database (see System Law #3).

---

## Proposal Metrics

### Tracking Proposal Performance

| Metric | Definition | V1 Support |
|--------|-----------|-----------|
| **Proposals Sent** | Count of `draft → proposed` transitions | ✅ Manual query |
| **Acceptance Rate** | `(Accepted / Sent) * 100` | ✅ Manual query |
| **Avg Time to Accept** | Time between `proposed` and `accepted` | ✅ Manual query |
| **Avg Proposal Value** | Average `total_amount_cents` | ✅ Manual query |

**Query Example**:

```sql
-- Acceptance rate for tenant
SELECT
  COUNT(*) FILTER (WHERE status IN ('accepted', 'paid', 'confirmed', 'completed')) AS accepted,
  COUNT(*) FILTER (WHERE status = 'proposed') AS pending,
  COUNT(*) FILTER (WHERE status = 'cancelled' AND from_status = 'proposed') AS declined,
  COUNT(*) AS total_proposals
FROM event_transitions
WHERE tenant_id = 'tenant_uuid'
  AND to_status = 'proposed';
```

---

## Related Documents

- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)
- [CLIENT_INQUIRY_MODEL.md](./CLIENT_INQUIRY_MODEL.md)
- [CLIENT_DEPOSIT_STATE_RULES.md](./CLIENT_DEPOSIT_STATE_RULES.md)
- [CLIENT_EVENT_CONFIRMATION_RULES.md](./CLIENT_EVENT_CONFIRMATION_RULES.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

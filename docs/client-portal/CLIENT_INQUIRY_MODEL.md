# Client Inquiry Model

## Document Identity
- **File**: `CLIENT_INQUIRY_MODEL.md`
- **Category**: Lifecycle System (24/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **client inquiry model** for ChefFlow V1.

It specifies:
- How clients initiate event inquiries
- Inquiry form structure and validation
- Inquiry-to-event conversion process
- Duplicate inquiry prevention
- Inquiry state management

---

## Inquiry Definition

An **inquiry** is a client-initiated request for catering services that creates a new event in `draft` status.

### Inquiry vs Event

| Aspect | Inquiry | Event |
|--------|---------|-------|
| **Created By** | Client | Chef (converts inquiry) |
| **Initial Status** | N/A (becomes `draft` immediately) | `draft` |
| **Data Source** | Client form submission | Chef-edited event details |
| **Database Record** | Stored as `events` row | Same row |

**Key Point**: In ChefFlow V1, there is **no separate inquiries table**. Inquiries are events in `draft` status created by client submission.

---

## Inquiry Flow

### V1 Simplified Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INQUIRY FLOW (V1)                         │
└─────────────────────────────────────────────────────────────┘

1. Client fills inquiry form
        ↓
2. System validates input
        ↓
3. Event created with status = 'draft'
        ↓
4. Chef receives notification (manual in V1)
        ↓
5. Chef edits event details
        ↓
6. Chef proposes event (draft → proposed)
```

**V1 Limitation**: No dedicated inquiry inbox. Inquiries appear as draft events in chef's event list.

---

## Inquiry Form Schema

### Client Input Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|-----------|-------|
| `event_date` | Date | ✅ Yes | Must be future date | Client's desired date |
| `guest_count` | Integer | ✅ Yes | `1 ≤ guest_count ≤ 500` | Number of guests |
| `location` | Text | ✅ Yes | Min 10 chars | Event address/venue |
| `event_type` | Enum | ❌ No | `['wedding', 'corporate', 'birthday', 'other']` | V1: Optional |
| `dietary_restrictions` | Text | ❌ No | Max 500 chars | Allergies, preferences |
| `additional_notes` | Text | ❌ No | Max 1000 chars | Special requests |
| `budget_range` | Text | ❌ No | Informational only | Not binding |

### Form Validation Rules

```typescript
interface InquiryFormData {
  event_date: string; // ISO8601 date
  guest_count: number;
  location: string;
  event_type?: 'wedding' | 'corporate' | 'birthday' | 'other';
  dietary_restrictions?: string;
  additional_notes?: string;
  budget_range?: string;
}

function validateInquiryForm(data: InquiryFormData): ValidationResult {
  const errors: string[] = [];

  // Validate event date
  const eventDate = new Date(data.event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (eventDate <= today) {
    errors.push('Event date must be in the future');
  }

  // Validate guest count
  if (data.guest_count < 1 || data.guest_count > 500) {
    errors.push('Guest count must be between 1 and 500');
  }

  // Validate location
  if (!data.location || data.location.trim().length < 10) {
    errors.push('Location must be at least 10 characters');
  }

  // Validate optional fields
  if (data.dietary_restrictions && data.dietary_restrictions.length > 500) {
    errors.push('Dietary restrictions must be less than 500 characters');
  }

  if (data.additional_notes && data.additional_notes.length > 1000) {
    errors.push('Additional notes must be less than 1000 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Inquiry Submission Process

### Step 1: Client Submits Form

Client submits inquiry form via client portal (`/my-events/new-inquiry`).

**Request**:

```typescript
POST /api/inquiries/submit

{
  "event_date": "2026-03-15T18:00:00Z",
  "guest_count": 25,
  "location": "123 Main St, San Francisco, CA",
  "event_type": "birthday",
  "dietary_restrictions": "2 vegetarian, 1 vegan",
  "additional_notes": "Looking for Italian cuisine",
  "budget_range": "$2000-$3000"
}
```

---

### Step 2: Server Validates and Creates Event

Server-side processing:

```typescript
async function submitInquiry(
  formData: InquiryFormData,
  clientId: string,
  tenantId: string
): Promise<Event> {
  // Validate form
  const validation = validateInquiryForm(formData);
  if (!validation.valid) {
    throw new ValidationError(validation.errors);
  }

  // Check for duplicate inquiries (same date + client + tenant)
  const duplicateCheck = await checkDuplicateInquiry(
    clientId,
    tenantId,
    formData.event_date
  );
  if (duplicateCheck.exists) {
    throw new DuplicateInquiryError('Inquiry already exists for this date');
  }

  // Create event in draft status
  const event = await db.events.create({
    data: {
      tenant_id: tenantId,
      client_id: clientId,
      status: 'draft',
      event_date: formData.event_date,
      guest_count: formData.guest_count,
      location: formData.location,
      title: `Inquiry for ${formData.event_type || 'Event'}`, // Placeholder
      notes: [
        formData.dietary_restrictions && `Dietary: ${formData.dietary_restrictions}`,
        formData.additional_notes && `Notes: ${formData.additional_notes}`,
        formData.budget_range && `Budget: ${formData.budget_range}`
      ]
        .filter(Boolean)
        .join('\n'),
      // Pricing placeholder (chef fills later)
      total_amount_cents: 0,
      deposit_amount_cents: 0,
      created_by: clientId
    }
  });

  // Create audit entry
  await db.event_transitions.create({
    data: {
      tenant_id: tenantId,
      event_id: event.id,
      from_status: null,
      to_status: 'draft',
      transitioned_by: clientId,
      metadata: {
        source: 'client_inquiry',
        inquiry_data: formData
      }
    }
  });

  return event;
}
```

**System Law Alignment**: Law 4 (server-enforced lifecycle).

---

### Step 3: Chef Notification

**V1 Behavior**: No automated notification. Chef sees inquiry in draft events list.

**V2 Enhancement**: Email notification to chef with inquiry details.

---

### Step 4: Chef Edits and Proposes

Chef reviews inquiry and:

1. Edits event details (title, pricing, deposit)
2. Optionally attaches menu templates
3. Proposes event to client (`draft → proposed`)

**Critical**: Chef **must** set `total_amount_cents` and `deposit_amount_cents` before proposing.

---

## Duplicate Inquiry Prevention

### Duplicate Detection

**Rule**: Prevent duplicate inquiries for the same **date + client + tenant** within **7 days**.

```typescript
async function checkDuplicateInquiry(
  clientId: string,
  tenantId: string,
  eventDate: Date
): Promise<{ exists: boolean; existing_event_id?: string }> {
  const startOfDay = new Date(eventDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(eventDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingEvent = await db.events.findFirst({
    where: {
      client_id: clientId,
      tenant_id: tenantId,
      event_date: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: {
        in: ['draft', 'proposed', 'accepted', 'paid', 'confirmed']
      },
      created_at: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Within 7 days
      }
    }
  });

  return {
    exists: !!existingEvent,
    existing_event_id: existingEvent?.id
  };
}
```

**User Experience**: If duplicate detected, show client the existing inquiry and offer to edit it.

---

## Inquiry State Management

### Inquiry Lifecycle States

| State | Meaning | Client Actions | Chef Actions |
|-------|---------|---------------|--------------|
| **Draft** | Inquiry submitted, chef reviewing | View status | Edit, propose, or cancel |
| **Proposed** | Chef sent proposal | Accept or decline | Edit proposal or cancel |
| **Accepted** | Client accepted proposal | Proceed to payment | Await payment |

**Transition**: Once client accepts proposal, it's no longer an "inquiry" — it's a booking.

---

## Inquiry Visibility

### Client Visibility

Clients can view **only their own inquiries**:

```sql
-- RLS policy
SELECT * FROM events
WHERE client_id = get_current_client_id()
  AND tenant_id = get_current_tenant_id()
  AND status IN ('draft', 'proposed', 'accepted');
```

### Chef Visibility

Chefs can view **all inquiries in their tenant**:

```sql
-- RLS policy
SELECT * FROM events
WHERE tenant_id = get_current_tenant_id()
  AND get_current_user_role() = 'chef'
  AND status = 'draft';
```

---

## Inquiry Metadata

### Tracking Inquiry Source

All inquiries include metadata in `event_transitions`:

```json
{
  "source": "client_inquiry",
  "inquiry_data": {
    "event_date": "2026-03-15T18:00:00Z",
    "guest_count": 25,
    "location": "123 Main St, San Francisco, CA",
    "event_type": "birthday",
    "dietary_restrictions": "2 vegetarian, 1 vegan",
    "additional_notes": "Looking for Italian cuisine",
    "budget_range": "$2000-$3000"
  },
  "submitted_at": "2026-02-14T10:00:00Z",
  "client_ip": "192.168.1.1"
}
```

**Purpose**: Audit trail for inquiry origin.

---

## Inquiry Conversion Rate

### Tracking Metrics

Inquiries can be tracked for conversion:

| Metric | Definition | Query |
|--------|-----------|-------|
| **Total Inquiries** | Events created in `draft` status | `COUNT(*) WHERE status = 'draft'` |
| **Proposals Sent** | `draft → proposed` transitions | `COUNT(*) WHERE status = 'proposed'` |
| **Accepted Proposals** | `proposed → accepted` transitions | `COUNT(*) WHERE status = 'accepted'` |
| **Paid Bookings** | `accepted → paid` transitions | `COUNT(*) WHERE status = 'paid'` |
| **Conversion Rate** | `(Paid / Inquiries) * 100` | Calculated metric |

**V1**: No automated tracking. V2: Analytics dashboard.

---

## Inquiry Form UI/UX

### Client Portal Flow

1. **Navigation**: Client clicks "Request New Event" button
2. **Form Display**: Inquiry form rendered at `/my-events/new-inquiry`
3. **Input Validation**: Real-time validation on blur
4. **Submission**: POST to `/api/inquiries/submit`
5. **Success**: Redirect to `/my-events` with success message
6. **Error**: Display validation errors inline

### Form Component

```typescript
// app/(client)/my-events/new-inquiry/page.tsx
export default function NewInquiryPage() {
  const [formData, setFormData] = useState<InquiryFormData>({
    event_date: '',
    guest_count: 0,
    location: '',
    dietary_restrictions: '',
    additional_notes: ''
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const response = await fetch('/api/inquiries/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      router.push('/my-events?inquiry=submitted');
    } else {
      const error = await response.json();
      setErrors(error.errors);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

## Inquiry Idempotency

### Preventing Double Submission

**Strategy**: Use client-side debouncing + server-side duplicate check.

```typescript
// Client-side: Disable submit button after click
const [submitting, setSubmitting] = useState(false);

async function handleSubmit(e: FormEvent) {
  if (submitting) return; // Prevent double-click
  setSubmitting(true);

  try {
    await submitInquiry(formData);
  } finally {
    setSubmitting(false);
  }
}
```

**Server-side**: Check for duplicate inquiries within 1 minute:

```typescript
// If inquiry with same data submitted within 1 minute, return existing event
const recentInquiry = await db.events.findFirst({
  where: {
    client_id: clientId,
    tenant_id: tenantId,
    event_date: formData.event_date,
    created_at: {
      gte: new Date(Date.now() - 60 * 1000) // Within 1 minute
    }
  }
});

if (recentInquiry) {
  return recentInquiry; // Idempotent response
}
```

**System Law Alignment**: Law 11 (idempotency required).

---

## Inquiry Cancellation

### Client-Initiated Cancellation

**V1 Behavior**: Clients **cannot** cancel inquiries. Only chef can cancel.

**Rationale**: Inquiries are in `draft` status, which is chef-managed.

**Alternative**: Client can message chef to request cancellation.

---

### Chef-Initiated Cancellation

Chef can cancel inquiry:

```typescript
// Transition: draft → cancelled
await transitionEventStatus(eventId, 'cancelled', chefUserId, {
  cancellation_reason: 'Client requested cancellation via message'
});
```

---

## Inquiry Expiration

### Auto-Expiration Rule

**V1**: No automatic expiration.

**V2 Enhancement**: Inquiries in `draft` status for >30 days marked as stale.

```sql
-- V2 Query: Find stale inquiries
SELECT * FROM events
WHERE status = 'draft'
  AND created_at < now() - INTERVAL '30 days';
```

---

## Related Documents

- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)
- [CLIENT_PROPOSAL_MODEL.md](./CLIENT_PROPOSAL_MODEL.md)
- [CLIENT_PORTAL_DATA_OWNERSHIP.md](./CLIENT_PORTAL_DATA_OWNERSHIP.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

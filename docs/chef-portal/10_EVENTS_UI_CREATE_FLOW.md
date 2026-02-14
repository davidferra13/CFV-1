# Events UI - Create Flow (V1)

## Multi-Step Form

### Step 1: Client Selection
- Select existing client or create new
- Client info preview

### Step 2: Event Details
- Event type
- Date/time
- Guest count
- Special requests

### Step 3: Pricing
- Total amount
- Deposit amount
- Payment terms

### Step 4: Review & Create
- Summary of all details
- Create button

---

## Server Action

```typescript
'use server';

export async function createEvent(data: CreateEventInput) {
  const user = await getUser();

  if (!user || user.role !== 'chef') {
    throw new Error('Unauthorized');
  }

  return await db.events.create({
    data: {
      tenant_id: user.tenantId,
      client_profile_id: data.clientId,
      event_type: data.eventType,
      start_ts: data.startTime,
      end_ts: data.endTime,
      guest_count: data.guestCount,
      total_amount_cents: data.totalAmountCents,
      deposit_amount_cents: data.depositAmountCents,
      status: 'draft',
    },
  });
}
```

---

## Validation

```typescript
function validateEventCreate(data: CreateEventInput): void {
  if (!data.clientId) {
    throw new Error('Client is required');
  }

  if (!data.eventType || data.eventType.trim().length === 0) {
    throw new Error('Event type is required');
  }

  if (data.endTime && data.startTime && data.endTime <= data.startTime) {
    throw new Error('End time must be after start time');
  }

  if (data.depositAmountCents > data.totalAmountCents) {
    throw new Error('Deposit cannot exceed total amount');
  }
}
```

---

**End of Events UI - Create Flow**

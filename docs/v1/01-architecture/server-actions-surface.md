# Server Actions Surface

**Document ID**: 010
**Version**: 1.0
**STATUS**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines all server actions in ChefFlow V1, their signatures, validation rules, and authorization requirements.

## Server Actions Overview

**Total Actions**: 12

**Categories**:
1. Event Actions (5)
2. Client Actions (3)
3. Menu Actions (3)
4. Payment Actions (1)

**Location**: `/actions/` directory

---

## Event Actions

**File**: `actions/event-actions.ts`

### createEvent

**Purpose**: Create new event (chef only)

**Signature**:
```typescript
'use server';

export async function createEvent(formData: FormData): Promise<Event>
```

**Input Schema** (Zod):
```typescript
const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  event_date: z.string().datetime(),
  location: z.string().min(1).max(500),
  guest_count: z.number().int().positive(),
  price_per_person_cents: z.number().int().positive(),
  client_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});
```

**Authorization**:
- Role MUST be `chef`
- Client MUST belong to chef's tenant

**Side Effects**:
- INSERT into `events` table
- INSERT into `event_transitions` table (draft status)
- Revalidate `/events` path

**Returns**: Created event object

**Errors**:
- Unauthorized (if not chef)
- Validation error (if schema fails)
- Database error (if insert fails)

---

### updateEvent

**Purpose**: Update event (chef only, draft/proposed status only)

**Signature**:
```typescript
export async function updateEvent(
  eventId: string,
  formData: FormData
): Promise<Event>
```

**Input Schema**:
```typescript
const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  event_date: z.string().datetime().optional(),
  location: z.string().min(1).max(500).optional(),
  guest_count: z.number().int().positive().optional(),
  price_per_person_cents: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
});
```

**Authorization**:
- Role MUST be `chef`
- Event MUST belong to chef's tenant
- Event status MUST be `draft` or `proposed`

**Side Effects**:
- UPDATE `events` table
- Revalidate `/events/[id]` path

**Returns**: Updated event object

**Errors**:
- Unauthorized (if not chef or wrong tenant)
- Invalid state (if event not in draft/proposed)
- Not found (if event doesn't exist)

---

### deleteEvent

**Purpose**: Soft-delete event (chef only, draft status only)

**Signature**:
```typescript
export async function deleteEvent(eventId: string): Promise<void>
```

**Authorization**:
- Role MUST be `chef`
- Event MUST belong to chef's tenant
- Event status MUST be `draft`
- Event MUST NOT have any payments

**Side Effects**:
- UPDATE `events` SET `deleted_at = NOW()`
- Revalidate `/events` path

**Returns**: void

**Errors**:
- Unauthorized (if not chef)
- Invalid state (if event not draft or has payments)

---

### transitionEventStatus

**Purpose**: Change event status (chef or system)

**Signature**:
```typescript
export async function transitionEventStatus(
  eventId: string,
  toStatus: EventStatus,
  reason?: string
): Promise<Event>
```

**Input Schema**:
```typescript
const transitionSchema = z.object({
  eventId: z.string().uuid(),
  toStatus: z.enum([
    'draft',
    'proposed',
    'accepted',
    'paid',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ]),
  reason: z.string().max(500).optional(),
});
```

**Authorization**:
- **Chef**: Can transition from any state (except terminal states)
- **Client**: Can ONLY transition from `proposed` to `accepted`
- **System** (webhook): Can transition to `paid`

**Validation**:
- Transition MUST be valid (see state machine diagram)
- Cannot transition FROM terminal states (`completed`, `cancelled`)

**Valid Transitions**:
```
draft → proposed
proposed → accepted (client) or cancelled (chef)
accepted → paid (system webhook)
paid → confirmed (chef)
confirmed → in_progress (chef)
in_progress → completed (chef)
* → cancelled (chef only)
```

**Side Effects**:
- UPDATE `events` SET `status = toStatus`
- INSERT into `event_transitions` (audit log)
- Revalidate `/events/[id]` path

**Returns**: Updated event object

**Errors**:
- Unauthorized (if client tries invalid transition)
- Invalid transition (if state machine rules violated)
- Not found (if event doesn't exist)

---

### acceptEvent

**Purpose**: Client accepts proposed event

**Signature**:
```typescript
export async function acceptEvent(eventId: string): Promise<Event>
```

**Authorization**:
- Role MUST be `client`
- Event MUST belong to this client (`client_id = user.clientId`)
- Event status MUST be `proposed`

**Side Effects**:
- Calls `transitionEventStatus(eventId, 'accepted', 'Client accepted proposal')`

**Returns**: Updated event object

**Errors**:
- Unauthorized (if not client or wrong event)
- Invalid state (if event not proposed)

---

## Client Actions

**File**: `actions/client-actions.ts`

### inviteClient

**Purpose**: Send invitation email to client (chef only)

**Signature**:
```typescript
export async function inviteClient(formData: FormData): Promise<Client>
```

**Input Schema**:
```typescript
const inviteClientSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});
```

**Authorization**:
- Role MUST be `chef`

**Side Effects**:
- INSERT into `clients` table (status = `invited`)
- Generate invitation token (UUID)
- Send invitation email via Supabase Auth (basic template)
- Revalidate `/clients` path

**Returns**: Created client object (with invitation token)

**Errors**:
- Unauthorized (if not chef)
- Duplicate email (if client already exists in tenant)

---

### updateClient

**Purpose**: Update client details (chef only)

**Signature**:
```typescript
export async function updateClient(
  clientId: string,
  formData: FormData
): Promise<Client>
```

**Input Schema**:
```typescript
const updateClientSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
});
```

**Authorization**:
- Role MUST be `chef`
- Client MUST belong to chef's tenant

**Side Effects**:
- UPDATE `clients` table
- Revalidate `/clients/[id]` path

**Returns**: Updated client object

**Errors**:
- Unauthorized (if not chef or wrong tenant)
- Not found (if client doesn't exist)

---

### completeClientSignup

**Purpose**: Complete client signup from invitation

**Signature**:
```typescript
export async function completeClientSignup(
  invitationToken: string,
  password: string
): Promise<void>
```

**Input Schema**:
```typescript
const signupSchema = z.object({
  invitationToken: z.string().uuid(),
  password: z.string().min(8).max(100),
});
```

**Authorization**:
- Public (no auth required, invitation token provides access)

**Validation**:
- Invitation token MUST exist
- Invitation MUST NOT be used (`used_at IS NULL`)
- Invitation MUST NOT be expired (7 days)

**Side Effects**:
- Create Supabase Auth user (email from invitation, password provided)
- INSERT into `user_roles` table (role = `client`)
- UPDATE `clients` SET `used_at = NOW()`, `status = 'active'`

**Returns**: void (user redirected to login)

**Errors**:
- Invalid token (if not found or expired or used)
- Password too weak (if Supabase rejects)

---

## Menu Actions

**File**: `actions/menu-actions.ts`

### createMenu

**Purpose**: Create menu template (chef only)

**Signature**:
```typescript
export async function createMenu(formData: FormData): Promise<Menu>
```

**Input Schema**:
```typescript
const createMenuSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price_per_person_cents: z.number().int().positive(),
});
```

**Authorization**:
- Role MUST be `chef`

**Side Effects**:
- INSERT into `menus` table
- Revalidate `/menus` path

**Returns**: Created menu object

**Errors**:
- Unauthorized (if not chef)
- Validation error (if schema fails)

---

### updateMenu

**Purpose**: Update menu template (chef only)

**Signature**:
```typescript
export async function updateMenu(
  menuId: string,
  formData: FormData
): Promise<Menu>
```

**Input Schema**: Same as `createMenuSchema` (all fields optional)

**Authorization**:
- Role MUST be `chef`
- Menu MUST belong to chef's tenant

**Side Effects**:
- UPDATE `menus` table
- Revalidate `/menus/[id]` path

**Returns**: Updated menu object

**Errors**:
- Unauthorized (if not chef or wrong tenant)
- Not found (if menu doesn't exist)

---

### attachMenuToEvent

**Purpose**: Attach menu to event (chef only)

**Signature**:
```typescript
export async function attachMenuToEvent(
  eventId: string,
  menuId: string
): Promise<void>
```

**Authorization**:
- Role MUST be `chef`
- Event MUST belong to chef's tenant
- Menu MUST belong to chef's tenant

**Side Effects**:
- INSERT into `event_menus` table (many-to-many)
- Revalidate `/events/[id]` path

**Returns**: void

**Errors**:
- Unauthorized (if not chef or wrong tenant)
- Already attached (if menu already attached to event)

---

## Payment Actions

**File**: `actions/payment-actions.ts`

### createPaymentIntent

**Purpose**: Create Stripe PaymentIntent for event (client only)

**Signature**:
```typescript
export async function createPaymentIntent(
  eventId: string
): Promise<{ clientSecret: string; amount: number }>
```

**Authorization**:
- Role MUST be `client`
- Event MUST belong to this client (`client_id = user.clientId`)
- Event status MUST be `accepted`

**Calculation**:
- Amount = `event.price_per_person_cents * event.guest_count`
- Deposit (if applicable) = 50% of total

**Side Effects**:
- Call Stripe API: `stripe.paymentIntents.create()`
- Attach metadata: `event_id`, `tenant_id`, `client_id`
- Return `client_secret` (for Stripe Elements)

**Returns**: Object with `clientSecret` and `amount`

**Errors**:
- Unauthorized (if not client or wrong event)
- Invalid state (if event not accepted)
- Stripe error (if API call fails)

---

## Common Patterns

### Authorization Pattern

**Every server action MUST**:
1. Call `getCurrentUser()` to get authenticated user
2. Check `user.role` matches required role
3. Verify resource belongs to user's tenant (chef) or user (client)

**Example**:
```typescript
'use server';

export async function exampleAction(resourceId: string) {
  // 1. Get current user
  const user = await getCurrentUser();

  // 2. Check role
  if (user.role !== 'chef') {
    throw new Error('Unauthorized: chef role required');
  }

  // 3. Verify tenant ownership
  const resource = await getResource(resourceId);
  if (resource.tenant_id !== user.tenantId) {
    throw new Error('Unauthorized: resource not in your tenant');
  }

  // 4. Perform action
  // ...
}
```

### Validation Pattern

**Every server action MUST**:
1. Define Zod schema
2. Parse input with schema
3. Handle validation errors

**Example**:
```typescript
'use server';

import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(200),
  email: z.string().email(),
});

export async function exampleAction(formData: FormData) {
  try {
    const data = schema.parse({
      title: formData.get('title'),
      email: formData.get('email'),
    });

    // Use validated data
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(`Validation error: ${err.errors.map((e) => e.message).join(', ')}`);
    }
    throw err;
  }
}
```

### Revalidation Pattern

**Server actions that mutate data MUST**:
1. Call `revalidatePath()` to refresh affected pages

**Example**:
```typescript
'use server';

import { revalidatePath } from 'next/cache';

export async function createEvent(formData: FormData) {
  // ... create event

  // Revalidate event list page
  revalidatePath('/events');

  // Optionally revalidate event detail page
  revalidatePath(`/events/${event.id}`);

  return event;
}
```

---

## Error Handling

### Error Types

**AuthorizationError**:
```typescript
throw new Error('Unauthorized: chef role required');
```

**ValidationError**:
```typescript
throw new Error('Validation error: title is required');
```

**NotFoundError**:
```typescript
throw new Error('Event not found');
```

**InvalidStateError**:
```typescript
throw new Error('Invalid state: event must be in draft status');
```

**DatabaseError**:
```typescript
throw new Error('Database error: ' + error.message);
```

### Client Handling

**Pattern**:
```typescript
'use client';

import { createEvent } from '@/actions/event-actions';

export function CreateEventForm() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createEvent(formData);
      // Success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      {/* Form fields */}
    </form>
  );
}
```

---

**Authority**: This server actions surface is complete for V1. No additional actions may be added without scope unlock.

# API Surface Documentation

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

This document provides a comprehensive reference for all server-side functions, server actions, and API routes in ChefFlow V1.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Functions](#authentication-functions)
3. [Event Functions](#event-functions)
4. [Payment Functions](#payment-functions)
5. [Ledger Functions](#ledger-functions)
6. [Client Functions](#client-functions)
7. [Menu Functions](#menu-functions)
8. [Webhook Routes](#webhook-routes)
9. [TypeScript Types](#typescript-types)

---

## Overview

ChefFlow V1 uses **Server Actions** and **Server Functions** for all backend logic. There are no client-side mutations.

### Conventions

- **Server Functions**: Located in `lib/*/` (e.g., `lib/auth/get-user.ts`)
- **Server Actions**: Located in `app/actions/` or `lib/*/actions.ts`
- **Route Handlers**: Located in `app/api/*/route.ts`
- All functions use `'use server'` directive
- All functions validate permissions before mutations

---

## Authentication Functions

### `getCurrentUser()`

**Location**: `lib/auth/get-user.ts`

Gets the currently authenticated user with authoritative role resolution.

**Signature**:
```typescript
export const getCurrentUser = cache(
  async (): Promise<AuthUser | null>
)
```

**Returns**:
```typescript
type AuthUser = {
  id: string            // auth.users.id
  email: string         // User's email
  role: 'chef' | 'client'
  entityId: string      // chefs.id or clients.id
  tenantId: string | null // chef.id (if chef) or client's tenant_id
}
```

**Example**:
```typescript
const user = await getCurrentUser()
if (user) {
  console.log(`User ${user.email} is a ${user.role}`)
}
```

**Notes**:
- Cached per request (React Server Components)
- Returns `null` if not authenticated
- Queries `user_roles` table (authoritative)

---

### `requireChef()`

**Location**: `lib/auth/get-user.ts`

Requires chef role. Throws if not chef.

**Signature**:
```typescript
export async function requireChef(): Promise<AuthUser>
```

**Throws**: `Error` if user is not a chef

**Example**:
```typescript
const chef = await requireChef() // Throws if not chef
console.log(`Chef tenant: ${chef.tenantId}`)
```

---

### `requireClient()`

**Location**: `lib/auth/get-user.ts`

Requires client role. Throws if not client.

**Signature**:
```typescript
export async function requireClient(): Promise<AuthUser>
```

**Throws**: `Error` if user is not a client

**Example**:
```typescript
const client = await requireClient() // Throws if not client
console.log(`Client entity: ${client.entityId}`)
```

---

### `requireAuth()`

**Location**: `lib/auth/get-user.ts`

Requires any authenticated user.

**Signature**:
```typescript
export async function requireAuth(): Promise<AuthUser>
```

**Throws**: `Error` if not authenticated

---

## Event Functions

### `createEvent()`

**Location**: `lib/events/actions.ts`

Creates a new event (draft status).

**Signature**:
```typescript
export async function createEvent(data: {
  client_id: string
  title: string
  event_date: string // ISO 8601
  guest_count: number
  location: string
  notes?: string
  total_amount_cents: number
  deposit_amount_cents: number
  deposit_required?: boolean
}): Promise<{ success: boolean; data?: Event; error?: string }>
```

**Permissions**: Chef only

**Validation**:
- `guest_count` must be > 0
- `total_amount_cents` must be >= 0
- `deposit_amount_cents` must be >= 0
- `client_id` must belong to chef's tenant

**Example**:
```typescript
const result = await createEvent({
  client_id: 'client-uuid',
  title: 'Wedding Reception',
  event_date: '2026-06-15T18:00:00Z',
  guest_count: 50,
  location: '123 Main St',
  total_amount_cents: 500000, // $5,000
  deposit_amount_cents: 250000 // $2,500
})

if (result.success) {
  console.log('Event created:', result.data.id)
}
```

---

### `updateEvent()`

**Location**: `lib/events/actions.ts`

Updates an existing event.

**Signature**:
```typescript
export async function updateEvent(
  eventId: string,
  updates: Partial<EventUpdateData>
): Promise<{ success: boolean; data?: Event; error?: string }>
```

**Permissions**: Chef only, own tenant only

**Restrictions**:
- Can only update events in `draft` status
- Cannot modify `tenant_id`, `client_id`
- Cannot modify financial fields if payments exist

**Example**:
```typescript
const result = await updateEvent(eventId, {
  guest_count: 60,
  notes: 'Updated guest count'
})
```

---

### `transitionEventStatus()`

**Location**: `lib/events/transitions.ts`

Transitions event to new status (enforces state machine).

**Signature**:
```typescript
export async function transitionEventStatus(
  eventId: string,
  toStatus: EventStatus,
  userId: string | null,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }>
```

**Parameters**:
- `eventId`: Event UUID
- `toStatus`: Target status
- `userId`: User triggering transition (`null` for system)
- `metadata`: Optional metadata (e.g., `cancellation_reason`)

**Validation**:
- Checks valid transition
- Enforces permissions
- Validates status-specific requirements

**Example**:
```typescript
// Chef proposes event
const result = await transitionEventStatus(
  eventId,
  'proposed',
  chef.id
)

// Webhook marks paid (system user)
await transitionEventStatus(
  eventId,
  'paid',
  null,
  { stripe_event_id: 'evt_xxx' }
)

// Chef cancels with reason
await transitionEventStatus(
  eventId,
  'cancelled',
  chef.id,
  { cancellation_reason: 'Client requested' }
)
```

See [EVENTS.md](./EVENTS.md) for transition rules.

---

### `getEvent()`

**Location**: `lib/events/actions.ts`

Fetches single event with financial summary.

**Signature**:
```typescript
export async function getEvent(eventId: string): Promise<EventWithFinancials | null>
```

**Returns**:
```typescript
type EventWithFinancials = Event & {
  client: Client
  financial_summary: {
    expected_total_cents: number
    collected_cents: number
    is_fully_paid: boolean
    is_deposit_paid: boolean
  }
}
```

**Permissions**: RLS enforced (chef sees own tenant, client sees own events)

**Example**:
```typescript
const event = await getEvent(eventId)
if (event) {
  console.log(`Collected: $${event.financial_summary.collected_cents / 100}`)
}
```

---

### `listEvents()`

**Location**: `lib/events/actions.ts`

Lists events for current user.

**Signature**:
```typescript
export async function listEvents(filters?: {
  status?: EventStatus
  clientId?: string
  fromDate?: string
  toDate?: string
}): Promise<Event[]>
```

**Permissions**:
- Chef sees all tenant events
- Client sees only their events

**Example**:
```typescript
// List all proposed events
const events = await listEvents({ status: 'proposed' })

// List events for specific client
const clientEvents = await listEvents({ clientId: 'client-uuid' })
```

---

## Payment Functions

### `createPaymentIntent()`

**Location**: `lib/payments/create-payment-intent.ts`

Creates Stripe PaymentIntent for event.

**Signature**:
```typescript
export async function createPaymentIntent(
  eventId: string
): Promise<{
  clientSecret: string
  amount: number
}>
```

**Permissions**: Client only, own events only

**Validation**:
- Event must be in `accepted` status
- Client must own event

**Side Effects**:
- Creates Stripe customer if needed
- Updates `clients.stripe_customer_id`

**Example**:
```typescript
const { clientSecret, amount } = await createPaymentIntent(eventId)

// Use clientSecret in Stripe Elements
<Elements stripe={stripe} options={{ clientSecret }}>
  <PaymentElement />
</Elements>
```

---

### `processRefund()`

**Location**: `lib/payments/refund.ts`

Processes refund for event.

**Signature**:
```typescript
export async function processRefund(
  eventId: string,
  reason: string
): Promise<{ success: boolean; error?: string }>
```

**Permissions**: Chef only

**Process**:
1. Finds successful charges in ledger
2. Creates Stripe refund
3. Webhook creates negative ledger entry
4. Balance recomputed automatically

**Example**:
```typescript
const result = await processRefund(eventId, 'Client requested cancellation')
if (result.success) {
  console.log('Refund processed')
}
```

---

## Ledger Functions

### `appendLedgerEntry()`

**Location**: `lib/ledger/append.ts`

Appends entry to ledger (idempotent).

**Signature**:
```typescript
export async function appendLedgerEntry(entry: {
  tenant_id: string
  event_id?: string
  client_id?: string
  entry_type: LedgerEntryType
  amount_cents: number
  currency?: string
  stripe_event_id?: string
  stripe_object_id?: string
  stripe_event_type?: string
  description: string
  metadata?: Record<string, any>
}): Promise<{ success: boolean; data?: LedgerEntry; error?: string }>
```

**Idempotency**: Uses `stripe_event_id` as unique key

**Example**:
```typescript
const result = await appendLedgerEntry({
  tenant_id: chef.tenantId,
  event_id: eventId,
  entry_type: 'charge_succeeded',
  amount_cents: 50000,
  stripe_event_id: 'evt_xxx', // Idempotency key
  description: 'Deposit payment'
})

if (!result.success && result.error === 'duplicate') {
  console.log('Already processed')
}
```

---

### `getEventFinancials()`

**Location**: `lib/ledger/compute.ts`

Computes financial summary for event.

**Signature**:
```typescript
export async function getEventFinancials(
  eventId: string
): Promise<FinancialSummary | null>
```

**Returns**:
```typescript
type FinancialSummary = {
  event_id: string
  tenant_id: string
  expected_total_cents: number
  expected_deposit_cents: number
  collected_cents: number
  is_fully_paid: boolean
  is_deposit_paid: boolean
}
```

**Note**: Queries `event_financial_summary` view (computed from ledger)

**Example**:
```typescript
const summary = await getEventFinancials(eventId)
if (summary?.is_deposit_paid) {
  console.log('Deposit received')
}
```

---

### `getTenantLedger()`

**Location**: `lib/ledger/compute.ts`

Gets all ledger entries for tenant.

**Signature**:
```typescript
export async function getTenantLedger(
  tenantId: string,
  filters?: {
    eventId?: string
    entryType?: LedgerEntryType
    fromDate?: string
    toDate?: string
  }
): Promise<LedgerEntry[]>
```

**Permissions**: Chef only, own tenant only

**Example**:
```typescript
const entries = await getTenantLedger(chef.tenantId, {
  entryType: 'charge_succeeded'
})

const total = entries.reduce((sum, e) => sum + e.amount_cents, 0)
console.log(`Total collected: $${total / 100}`)
```

---

## Client Functions

### `createClientInvitation()`

**Location**: `lib/clients/invitations.ts`

Sends invitation to client.

**Signature**:
```typescript
export async function createClientInvitation(data: {
  email: string
  full_name?: string
}): Promise<{
  success: boolean
  data?: { token: string; expires_at: string }
  error?: string
}>
```

**Permissions**: Chef only

**Process**:
1. Generates cryptographic token
2. Sets expiry (7 days default)
3. Creates invitation record
4. Returns signup URL

**Example**:
```typescript
const result = await createClientInvitation({
  email: 'client@example.com',
  full_name: 'John Doe'
})

if (result.success) {
  const signupUrl = `${appUrl}/auth/signup?token=${result.data.token}`
  // Send email with signupUrl
}
```

---

### `getClient()`

**Location**: `lib/clients/actions.ts`

Fetches client details.

**Signature**:
```typescript
export async function getClient(clientId: string): Promise<Client | null>
```

**Permissions**: Chef sees own tenant clients, clients see self

---

### `listClients()`

**Location**: `lib/clients/actions.ts`

Lists all clients for chef's tenant.

**Signature**:
```typescript
export async function listClients(): Promise<Client[]>
```

**Permissions**: Chef only

**Example**:
```typescript
const clients = await listClients()
console.log(`${clients.length} clients`)
```

---

## Menu Functions

### `createMenu()`

**Location**: `lib/menus/actions.ts`

Creates menu template.

**Signature**:
```typescript
export async function createMenu(data: {
  name: string
  description?: string
  price_per_person_cents?: number
}): Promise<{ success: boolean; data?: Menu; error?: string }>
```

**Permissions**: Chef only

**Example**:
```typescript
const result = await createMenu({
  name: 'Summer BBQ Menu',
  description: 'Grilled favorites',
  price_per_person_cents: 7500 // $75/person
})
```

---

### `attachMenuToEvent()`

**Location**: `lib/menus/actions.ts`

Attaches menu to event (many-to-many).

**Signature**:
```typescript
export async function attachMenuToEvent(
  eventId: string,
  menuId: string
): Promise<{ success: boolean; error?: string }>
```

**Permissions**: Chef only, own tenant only

**Example**:
```typescript
await attachMenuToEvent(eventId, menuId)
```

---

## Webhook Routes

### `POST /api/webhooks/stripe`

**Location**: `app/api/webhooks/stripe/route.ts`

Handles Stripe webhook events.

**Headers**:
- `stripe-signature`: Webhook signature (verified)

**Handled Events**:
- `payment_intent.succeeded` → Create ledger entry, transition to `paid`
- `payment_intent.payment_failed` → Log failure
- `charge.refunded` → Create negative ledger entry

**Response**:
- `200 OK`: Event processed
- `400 Bad Request`: Invalid signature
- `500 Internal Server Error`: Handler error (Stripe retries)

**Idempotency**: Uses `stripe_event_id`

**Example Request** (from Stripe):
```bash
POST /api/webhooks/stripe
stripe-signature: t=xxx,v1=yyy

{
  "id": "evt_xxx",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 50000,
      "metadata": {
        "event_id": "event-uuid",
        "tenant_id": "tenant-uuid"
      }
    }
  }
}
```

---

## TypeScript Types

### Database Types

Located in `types/database.ts` (generated from schema):

```typescript
import { Database } from '@/types/database'

// Table row types
type Event = Database['public']['Tables']['events']['Row']
type Client = Database['public']['Tables']['clients']['Row']
type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row']

// Insert types (for creating records)
type EventInsert = Database['public']['Tables']['events']['Insert']

// Update types (for updating records)
type EventUpdate = Database['public']['Tables']['events']['Update']

// Enum types
type EventStatus = Database['public']['Enums']['event_status']
type LedgerEntryType = Database['public']['Enums']['ledger_entry_type']
```

### Custom Types

```typescript
// Auth user with role
export type AuthUser = {
  id: string
  email: string
  role: 'chef' | 'client'
  entityId: string
  tenantId: string | null
}

// Event with relations
export type EventWithClient = Event & {
  client: Client
}

// Event with financials
export type EventWithFinancials = Event & {
  client: Client
  financial_summary: {
    expected_total_cents: number
    collected_cents: number
    is_fully_paid: boolean
    is_deposit_paid: boolean
  }
}
```

---

## Error Handling

All functions return structured errors:

```typescript
type Result<T> = {
  success: boolean
  data?: T
  error?: string
}

// Usage
const result = await createEvent(data)
if (!result.success) {
  console.error(result.error)
  return
}
console.log(result.data)
```

Exceptions for auth functions (throw on unauthorized):

```typescript
try {
  const chef = await requireChef()
} catch (error) {
  // User is not a chef
  console.error(error.message)
}
```

---

## Related Documentation

- [EVENTS.md](./EVENTS.md) - Event lifecycle
- [PAYMENTS.md](./PAYMENTS.md) - Payment flow
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Auth functions
- [TYPE_GENERATION.md](./TYPE_GENERATION.md) - TypeScript types

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team

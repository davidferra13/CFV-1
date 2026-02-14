# Server-Only Enforcement Rules (V1)

This document defines what logic **must** be executed server-side and what is **never** trusted on the client. This is a critical security boundary.

---

## 1) Core Principle: Server is Authoritative

**Rule:** All critical business logic, authorization checks, data mutations, and financial operations **must** be executed server-side.

**Why:** Client code can be inspected, modified, or bypassed. Only server-side logic is trustworthy.

---

## 2) Server-Only Operations (Mandatory)

### 2.1 Authentication and Authorization

**MUST be server-side:**

- ✅ Verifying user session
- ✅ Resolving user role from `user_roles` table
- ✅ Checking if user has permission for an action
- ✅ Deriving tenant_id from authenticated user

**NEVER client-side:**

- ❌ Storing role in localStorage or React state as source of truth
- ❌ Trusting client-provided tenant_id or role
- ❌ Checking permissions in client components only

**Example (Correct):**

```typescript
// ✅ Server action
'use server';

export async function deleteEvent(eventId: string) {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  if (roleData.role !== 'chef') {
    throw new Error('Only chefs can delete events');
  }

  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  if (event.tenant_id !== roleData.tenant_id) {
    throw new Error('Cannot delete events from other tenants');
  }

  await db.events.update({
    where: { id: eventId },
    data: { deleted_at: new Date() },
  });
}
```

**Example (WRONG):**

```typescript
// ❌ Client component (NEVER do this)
'use client';

export function DeleteButton({ eventId, userRole }) {
  const handleDelete = async () => {
    if (userRole !== 'chef') return; // CLIENT-SIDE CHECK IS NOT ENOUGH

    await fetch('/api/events/delete', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

**Why wrong:** Client can modify `userRole` prop or call fetch directly.

---

### 2.2 Data Mutations (Create, Update, Delete)

**MUST be server-side:**

- ✅ Creating events, clients, menus
- ✅ Updating event status, client profiles, menu content
- ✅ Soft deleting records
- ✅ Appending ledger entries

**NEVER client-side:**

- ❌ Direct database writes from client components
- ❌ Mutations via client-side Supabase client (bypasses server logic)

**Example (Correct):**

```typescript
// ✅ Server action
'use server';

export async function createEvent(input: CreateEventInput) {
  const user = await getUser();
  const tenantId = await getTenantIdForUser(user.id);

  const validated = createEventSchema.parse(input);

  const event = await db.events.create({
    data: {
      ...validated,
      tenant_id: tenantId,
      status: 'draft',
      created_by: user.id,
    },
  });

  return event;
}
```

**Example (WRONG):**

```typescript
// ❌ Client component (NEVER do this)
'use client';

export function CreateEventForm() {
  const handleSubmit = async (data) => {
    // Direct mutation from client—FORBIDDEN
    const event = await supabaseClient.from('events').insert({
      ...data,
      tenant_id: 'user-provided-id', // NEVER trust this
    });
  };
}
```

---

### 2.3 Financial Operations

**MUST be server-side:**

- ✅ Creating payment intents (Stripe)
- ✅ Appending ledger entries
- ✅ Processing webhooks
- ✅ Calculating payment state from ledger

**NEVER client-side:**

- ❌ Creating Stripe charges from client
- ❌ Modifying ledger entries
- ❌ Calculating balances (client can display server-computed values only)

**Example (Correct):**

```typescript
// ✅ Server action
'use server';

export async function requestDeposit(eventId: string) {
  const user = await getUser();
  const tenantId = await getTenantIdForUser(user.id);

  const event = await db.events.findUnique({
    where: { id: eventId },
    include: { chef: true },
  });

  if (event.tenant_id !== tenantId) {
    throw new Error('Cannot create payment for other tenants');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: event.deposit_amount_cents,
    currency: 'usd',
    metadata: { event_id: eventId },
  }, {
    stripeAccount: event.chef.stripe_account_id,
  });

  return { clientSecret: paymentIntent.client_secret };
}
```

**Example (WRONG):**

```typescript
// ❌ Client component (NEVER do this)
'use client';

export function PaymentButton({ event }) {
  const handlePay = async () => {
    // Creating payment intent from client—FORBIDDEN
    const intent = await stripe.paymentIntents.create({
      amount: event.deposit_amount_cents,
      // This exposes Stripe secret key to client—CRITICAL VULNERABILITY
    });
  };
}
```

---

### 2.4 Event Lifecycle Transitions

**MUST be server-side:**

- ✅ Transitioning event status
- ✅ Validating allowed transitions
- ✅ Logging transitions to `event_transitions`

**NEVER client-side:**

- ❌ Directly updating `events.status`
- ❌ Skipping transition validation

**Example (Correct):**

```typescript
// ✅ Server action
'use server';

export async function transitionEvent(
  eventId: string,
  toStatus: EventStatus
) {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  if (roleData.role !== 'chef') {
    throw new Error('Only chefs can transition events');
  }

  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  if (event.tenant_id !== roleData.tenant_id) {
    throw new Error('Cannot transition events from other tenants');
  }

  // Check if transition is valid
  const isValid = isValidTransition(event.status, toStatus);
  if (!isValid) {
    throw new Error(`Cannot transition from ${event.status} to ${toStatus}`);
  }

  // Log transition
  await db.event_transitions.create({
    data: {
      event_id: eventId,
      from_status: event.status,
      to_status: toStatus,
      triggered_by: user.id,
      triggered_at: new Date(),
    },
  });

  // Update event
  await db.events.update({
    where: { id: eventId },
    data: { status: toStatus },
  });
}
```

---

### 2.5 Menu Locking

**MUST be server-side:**

- ✅ Locking menu (setting `locked` flag)
- ✅ Creating immutable version snapshot
- ✅ Validating menu has content before locking

**NEVER client-side:**

- ❌ Setting `locked = true` from client
- ❌ Allowing edits to locked menus

**Example (Correct):**

```typescript
// ✅ Server action
'use server';

export async function lockMenu(menuId: string) {
  const user = await getUser();
  const tenantId = await getTenantIdForUser(user.id);

  const menu = await db.event_menus.findUnique({
    where: { id: menuId },
    include: { sections: { include: { items: true } } },
  });

  if (menu.tenant_id !== tenantId) {
    throw new Error('Cannot lock menus from other tenants');
  }

  if (menu.locked) {
    throw new Error('Menu is already locked');
  }

  // Validate menu has content
  const hasContent = menu.sections.some(s => s.items.length > 0);
  if (!hasContent) {
    throw new Error('Cannot lock empty menu');
  }

  // Lock menu
  await db.event_menus.update({
    where: { id: menuId },
    data: {
      locked: true,
      locked_at: new Date(),
      locked_by: user.id,
    },
  });
}
```

---

### 2.6 Invite Creation and Acceptance

**MUST be server-side:**

- ✅ Generating invite token
- ✅ Validating invite token
- ✅ Linking user to client profile
- ✅ Creating `user_roles` entry

**NEVER client-side:**

- ❌ Generating invite tokens (must be cryptographically secure)
- ❌ Self-linking users to arbitrary client profiles

**Example (Correct):**

```typescript
// ✅ Server action
'use server';

export async function createInvite(clientProfileId: string) {
  const user = await getUser();
  const tenantId = await getTenantIdForUser(user.id);

  const clientProfile = await db.client_profiles.findUnique({
    where: { id: clientProfileId },
  });

  if (clientProfile.tenant_id !== tenantId) {
    throw new Error('Cannot create invite for other tenants');
  }

  const token = generateSecureToken(); // Cryptographically secure
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.client_invites.create({
    data: {
      token,
      client_profile_id: clientProfileId,
      tenant_id: tenantId,
      expires_at: expiresAt,
      created_by: user.id,
    },
  });

  return { token };
}
```

---

## 3) Client-Side Operations (Allowed)

### 3.1 What Clients CAN Do

**Clients handle presentation and user interaction:**

- ✅ Rendering UI
- ✅ Capturing user input
- ✅ Form validation (UX only, not authoritative)
- ✅ Optimistic UI updates (reverted on error)
- ✅ Displaying server-computed data

**Example (Correct):**

```typescript
// ✅ Client component (presentation only)
'use client';

export function EventCard({ event, onTransition }) {
  const [loading, setLoading] = useState(false);

  const handleTransition = async () => {
    setLoading(true);
    try {
      await onTransition(event.id, 'confirmed'); // Server action
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>{event.name}</h3>
      <p>Status: {event.status}</p>
      <button onClick={handleTransition} disabled={loading}>
        Transition to Confirmed
      </button>
    </div>
  );
}
```

### 3.2 Client-Side Validation (UX Only)

**Client validation improves user experience but is NEVER authoritative.**

**Example:**

```typescript
// ✅ Client component (UX validation)
'use client';

export function CreateEventForm({ onSubmit }) {
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    // Client-side validation (UX only)
    const clientErrors = {};
    if (!data.get('name')) clientErrors.name = 'Name is required';
    if (!data.get('start_ts')) clientErrors.start_ts = 'Date is required';

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    // Server action will validate again (authoritative)
    try {
      await onSubmit(Object.fromEntries(data));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## 4) Forbidden Client Operations

### 4.1 Direct Database Access

**NEVER allowed:**

```typescript
// ❌ FORBIDDEN
'use client';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function ClientComponent() {
  const handleCreate = async () => {
    // Direct database write from client—FORBIDDEN
    await supabase.from('events').insert({ name: 'New Event' });
  };
}
```

**Why forbidden:**
- Bypasses server validation
- Exposes database schema to client
- Allows crafted queries (even with RLS, still bad practice)

**Correct approach:**

```typescript
// ✅ CORRECT
'use server';

export async function createEvent(input: CreateEventInput) {
  // Server action handles all logic
  const validated = createEventSchema.parse(input);
  return await db.events.create({ data: validated });
}
```

### 4.2 Storing Secrets or Keys

**NEVER allowed:**

```typescript
// ❌ FORBIDDEN
'use client';

const STRIPE_SECRET_KEY = 'sk_live_...'; // NEVER in client code

export function PaymentComponent() {
  // Using secret key in client—CRITICAL VULNERABILITY
  const stripe = Stripe(STRIPE_SECRET_KEY);
}
```

**Correct approach:**

```typescript
// ✅ CORRECT
// Server-side only
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

### 4.3 Authorization Logic

**NEVER allowed:**

```typescript
// ❌ FORBIDDEN
'use client';

export function EventActions({ event, userRole }) {
  const canDelete = userRole === 'chef'; // Client logic is not authoritative

  const handleDelete = async () => {
    if (!canDelete) return; // Attacker can bypass this

    await fetch('/api/events/delete', {
      method: 'POST',
      body: JSON.stringify({ eventId: event.id }),
    });
  };
}
```

**Correct approach:**

```typescript
// ✅ CORRECT
'use server';

export async function deleteEvent(eventId: string) {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  // Server-authoritative check
  if (roleData.role !== 'chef') {
    throw new Error('Unauthorized');
  }

  await db.events.update({
    where: { id: eventId },
    data: { deleted_at: new Date() },
  });
}
```

---

## 5) Server Action Patterns

### 5.1 Anatomy of a Secure Server Action

```typescript
'use server';

export async function secureAction(input: unknown) {
  // 1. Authenticate
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  // 2. Authorize (resolve role and tenant)
  const roleData = await getUserRole(user.id);
  if (!roleData) throw new Error('No role assigned');

  // 3. Validate input
  const validated = inputSchema.parse(input);

  // 4. Check permissions
  if (roleData.role !== 'chef') {
    throw new Error('Only chefs can perform this action');
  }

  // 5. Verify tenant ownership
  const resource = await db.resource.findUnique({
    where: { id: validated.resourceId },
  });

  if (resource.tenant_id !== roleData.tenant_id) {
    throw new Error('Cannot access resources from other tenants');
  }

  // 6. Execute business logic
  const result = await performOperation(validated);

  // 7. Audit log (if critical)
  await db.audit_logs.create({
    data: {
      user_id: user.id,
      action: 'action_name',
      entity_type: 'resource',
      entity_id: resource.id,
      metadata: validated,
    },
  });

  // 8. Return result
  return result;
}
```

### 5.2 Server Action Checklist

**Every server action must:**

- ✅ Authenticate user
- ✅ Resolve role and tenant
- ✅ Validate input with Zod schema
- ✅ Check permissions
- ✅ Verify tenant ownership
- ✅ Execute business logic
- ✅ Audit critical operations
- ✅ Handle errors gracefully

---

## 6) API Route Patterns

### 6.1 Secure API Route Example

```typescript
// app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserRole } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorize
    const roleData = await getUserRole(user.id);
    if (!roleData || roleData.role !== 'chef') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Validate input
    const body = await req.json();
    const validated = createEventSchema.parse(body);

    // 4. Execute logic
    const event = await db.events.create({
      data: {
        ...validated,
        tenant_id: roleData.tenant_id,
      },
    });

    // 5. Return response
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 7) Summary: Server vs Client Responsibilities

| Operation | Server | Client |
|-----------|--------|--------|
| **Authentication** | ✅ Verify session | ❌ Never |
| **Authorization** | ✅ Check role and permissions | ❌ Never (UX hints only) |
| **Data mutations** | ✅ All writes | ❌ Never |
| **Financial operations** | ✅ All payments, ledger | ❌ Never |
| **Lifecycle transitions** | ✅ State machine enforcement | ❌ Never |
| **Input validation** | ✅ Authoritative | ⚠️ UX only |
| **Rendering UI** | ⚠️ Server components OK | ✅ Primary responsibility |
| **User interaction** | ❌ Not applicable | ✅ Capture and submit |
| **Optimistic updates** | ❌ Not applicable | ⚠️ Rare, reverted on error |

---

## 8) One-Sentence Summary

**The Chef Portal enforces server-only execution of all critical operations (authentication, authorization, mutations, financial transactions, lifecycle transitions) while allowing client components only to render UI, capture input, and provide non-authoritative UX validation, ensuring that client code cannot bypass security controls or corrupt data.**

---

**End of Server-Only Enforcement Rules**

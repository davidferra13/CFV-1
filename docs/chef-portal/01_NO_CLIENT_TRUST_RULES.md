# No Client Trust Rules (V1)

This document codifies the principle that **client-side code is never trusted** for any security-critical decision, authorization check, or data validation.

**Golden Rule:** If it matters for security, correctness, or money—it must be server-side.

---

## 1) Core Principle: Zero Trust in Client Code

### 1.1 Why Client Code Cannot Be Trusted

**Client code is fundamentally insecure because:**

- ✅ **Inspectable:** Anyone can view client-side JavaScript (DevTools, View Source)
- ✅ **Modifiable:** Users can modify client code via browser extensions or proxies
- ✅ **Bypassable:** API endpoints can be called directly, skipping client logic
- ✅ **Fakeable:** Requests can be crafted to send any data, bypassing client validation

**Conclusion:** Client code is for **user experience only**, never for enforcement.

### 1.2 Server is the Only Source of Truth

**Server-side code is trustworthy because:**

- ✅ **Inaccessible:** Users cannot view or modify server code
- ✅ **Authoritative:** Server controls database, external APIs, and secrets
- ✅ **Enforceable:** Server can deny requests, even if client logic is bypassed

**Conclusion:** All enforcement happens server-side.

---

## 2) What Client Code CANNOT Be Trusted For

### 2.1 Authorization Decisions

**Client code CANNOT decide if a user has permission to perform an action.**

**Example (WRONG):**

```typescript
// ❌ Client component making authorization decision
'use client';

export function DeleteButton({ event, userRole }) {
  const canDelete = userRole === 'chef' && event.status === 'draft';

  const handleDelete = async () => {
    if (!canDelete) return; // This check is UX only, not security

    await deleteEvent(event.id);
  };

  return (
    <button onClick={handleDelete} disabled={!canDelete}>
      Delete
    </button>
  );
}
```

**Why wrong:** Attacker can:
1. Modify `userRole` prop in DevTools
2. Remove the `disabled` attribute
3. Call `deleteEvent()` directly

**Example (CORRECT):**

```typescript
// ✅ Server action making authorization decision
'use server';

export async function deleteEvent(eventId: string) {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  // Server-authoritative check
  if (roleData.role !== 'chef') {
    throw new Error('Only chefs can delete events');
  }

  const event = await db.events.findUnique({ where: { id: eventId } });

  if (event.status !== 'draft') {
    throw new Error('Can only delete draft events');
  }

  if (event.tenant_id !== roleData.tenant_id) {
    throw new Error('Cannot delete events from other tenants');
  }

  await db.events.update({
    where: { id: eventId },
    data: { deleted_at: new Date() },
  });
}
```

**Key Point:** Client can show/hide the button for UX, but server must enforce.

---

### 2.2 Input Validation (Authoritative)

**Client validation improves UX but is NEVER authoritative.**

**Example (WRONG):**

```typescript
// ❌ Relying on client validation only
'use client';

export function CreateEventForm() {
  const [errors, setErrors] = useState({});

  const handleSubmit = async (data) => {
    // Client validation
    if (!data.name) {
      setErrors({ name: 'Name is required' });
      return;
    }

    // Submitting to server without server validation—DANGEROUS
    await fetch('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };
}
```

**Why wrong:** Attacker can bypass client validation by calling `/api/events` directly with invalid data.

**Example (CORRECT):**

```typescript
// ✅ Client validation (UX) + Server validation (authoritative)

// Client component
'use client';

export function CreateEventForm({ onSubmit }) {
  const handleSubmit = async (data) => {
    // Client validation (UX only)
    const clientErrors = validateClientSide(data);
    if (clientErrors) {
      setErrors(clientErrors);
      return;
    }

    // Server action will validate again (authoritative)
    await onSubmit(data);
  };
}

// Server action
'use server';

export async function createEvent(input: unknown) {
  // Server validation (authoritative)
  const validated = createEventSchema.parse(input); // Zod validation

  const user = await getUser();
  const tenantId = await getTenantIdForUser(user.id);

  const event = await db.events.create({
    data: {
      ...validated,
      tenant_id: tenantId,
    },
  });

  return event;
}
```

**Key Point:** Client validation provides instant feedback. Server validation prevents corruption.

---

### 2.3 Tenant Scoping

**Client code CANNOT be trusted to provide tenant_id.**

**Example (WRONG):**

```typescript
// ❌ Client providing tenant_id
'use client';

export function EventsList({ tenantId }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Client provides tenant_id in request—NEVER trust this
    fetch(`/api/events?tenant_id=${tenantId}`).then(...)
  }, [tenantId]);
}
```

**Why wrong:** Attacker can change `tenantId` query param to access other tenants' data.

**Example (CORRECT):**

```typescript
// ✅ Server derives tenant_id from session

// Client component
'use client';

export function EventsList() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // No tenant_id in request; server derives it
    fetch('/api/events').then(...)
  }, []);
}

// Server route
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  const tenantId = await getTenantIdForUser(user.id); // Server derives

  const events = await db.events.findMany({
    where: { tenant_id: tenantId }, // Server-controlled
  });

  return NextResponse.json(events);
}
```

**Key Point:** Tenant is derived from authenticated session, never from client input.

---

### 2.4 Financial Calculations

**Client code CANNOT be trusted to calculate amounts, balances, or payment state.**

**Example (WRONG):**

```typescript
// ❌ Client calculating payment state
'use client';

export function PaymentStatus({ ledgerEntries }) {
  // Client computes payment state—NOT AUTHORITATIVE
  const totalPaid = ledgerEntries
    .filter(e => e.type === 'charge_succeeded')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  const isPaid = totalPaid >= event.deposit_amount_cents;

  return <div>Status: {isPaid ? 'Paid' : 'Pending'}</div>;
}
```

**Why wrong:** Attacker can modify `ledgerEntries` prop or calculation logic.

**Example (CORRECT):**

```typescript
// ✅ Server computes payment state

// Server component
export default async function EventDetail({ eventId }) {
  const paymentState = await getPaymentState(eventId); // Server computes

  return (
    <div>
      <PaymentStatus state={paymentState} />
    </div>
  );
}

// Server function
async function getPaymentState(eventId: string) {
  const entries = await db.ledger_entries.findMany({
    where: { event_id: eventId },
  });

  const totalPaid = entries
    .filter(e => e.entry_type === 'charge_succeeded')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  return {
    totalPaid,
    isPaid: totalPaid >= event.deposit_amount_cents,
  };
}
```

**Key Point:** Financial calculations are server-authoritative and derived from immutable ledger.

---

### 2.5 State Transitions

**Client code CANNOT be trusted to enforce lifecycle rules.**

**Example (WRONG):**

```typescript
// ❌ Client enforcing transition rules
'use client';

export function TransitionButton({ event, toStatus }) {
  const allowedTransitions = {
    draft: ['proposed'],
    proposed: ['deposit_pending', 'canceled'],
    // ... transition map in client code
  };

  const isAllowed = allowedTransitions[event.status]?.includes(toStatus);

  const handleTransition = async () => {
    if (!isAllowed) return; // Client check is not authoritative

    await transitionEvent(event.id, toStatus);
  };

  return <button disabled={!isAllowed}>Transition</button>;
}
```

**Why wrong:** Attacker can bypass client check and call `transitionEvent()` with invalid transitions.

**Example (CORRECT):**

```typescript
// ✅ Server enforcing transition rules

'use server';

export async function transitionEvent(eventId: string, toStatus: string) {
  const event = await db.events.findUnique({ where: { id: eventId } });

  // Server-authoritative transition map
  const allowedTransitions = {
    draft: ['proposed'],
    proposed: ['deposit_pending', 'canceled'],
    // ...
  };

  const isAllowed = allowedTransitions[event.status]?.includes(toStatus);

  if (!isAllowed) {
    throw new Error(`Cannot transition from ${event.status} to ${toStatus}`);
  }

  // Log transition
  await db.event_transitions.create({
    data: {
      event_id: eventId,
      from_status: event.status,
      to_status: toStatus,
      triggered_by: user.id,
    },
  });

  // Update event
  await db.events.update({
    where: { id: eventId },
    data: { status: toStatus },
  });
}
```

**Key Point:** Client can show/hide buttons based on state, but server enforces valid transitions.

---

## 3) What Client Code CAN Do (Safely)

### 3.1 Rendering UI

**Client code is excellent for rendering:**

```typescript
// ✅ Client rendering server-provided data
'use client';

export function EventCard({ event }) {
  return (
    <div>
      <h3>{event.name}</h3>
      <p>Status: {event.status}</p>
      <p>Date: {formatDate(event.start_ts)}</p>
    </div>
  );
}
```

**Safe because:** Client receives data from server and displays it. No security decisions.

---

### 3.2 User Interaction

**Client code captures user input and submits to server:**

```typescript
// ✅ Client capturing input, server processing
'use client';

export function CreateEventForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit({ name, date }); // Server action handles logic
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
      <button type="submit">Create</button>
    </form>
  );
}
```

**Safe because:** Client just collects input and passes to server. Server validates and processes.

---

### 3.3 UX Enhancements

**Client code can provide UX hints (not enforcement):**

```typescript
// ✅ Client showing UX hint (not enforcement)
'use client';

export function DeleteButton({ event, userRole }) {
  // UX hint: hide button if user shouldn't see it
  if (userRole !== 'chef') return null;
  if (event.status !== 'draft') return null;

  const handleDelete = async () => {
    // Server enforces permissions (client hint is just UX)
    await deleteEvent(event.id);
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

**Safe because:** Client logic improves UX (hides irrelevant buttons), but server still enforces permissions.

---

### 3.4 Optimistic Updates (Reverted on Error)

**Client code can optimistically update UI (if reverted on failure):**

```typescript
// ✅ Optimistic update (reverted on error)
'use client';

export function LikeButton({ eventId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);
  const [optimistic, setOptimistic] = useState(false);

  const handleLike = async () => {
    // Optimistic update (UX only)
    setLikes(likes + 1);
    setOptimistic(true);

    try {
      const result = await likeEvent(eventId); // Server action
      setLikes(result.likes); // Update with server truth
    } catch (error) {
      // Revert on error
      setLikes(likes);
      toast.error('Failed to like event');
    } finally {
      setOptimistic(false);
    }
  };

  return (
    <button onClick={handleLike}>
      👍 {likes} {optimistic && '(saving...)'}
    </button>
  );
}
```

**Safe because:** Optimistic update is UX only. Server truth is applied after response.

**Not safe for:** Financial operations, state transitions, or critical actions (use pessimistic UI instead).

---

## 4) Common Client Trust Violations (Anti-Patterns)

### 4.1 Anti-Pattern: Hiding Elements = Security

**WRONG:**

```typescript
// ❌ Hiding element as security
'use client';

export function AdminPanel({ userRole }) {
  if (userRole !== 'admin') return null; // Hiding is NOT security

  return (
    <div>
      <button onClick={deleteAllData}>Delete All</button>
    </div>
  );
}
```

**Why wrong:** Attacker can call `deleteAllData()` directly, bypassing the check.

**CORRECT:**

```typescript
// ✅ Server enforces permissions
'use server';

export async function deleteAllData() {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  if (roleData.role !== 'admin') {
    throw new Error('Forbidden');
  }

  // ... proceed with deletion
}
```

---

### 4.2 Anti-Pattern: Client-Side Feature Flags

**WRONG:**

```typescript
// ❌ Client checking feature flag for security
'use client';

export function PremiumFeature({ featureFlags }) {
  if (!featureFlags.premium) return null; // Not security

  return <button onClick={accessPremiumData}>Access Premium</button>;
}
```

**Why wrong:** Attacker can call `accessPremiumData()` directly.

**CORRECT:**

```typescript
// ✅ Server enforces feature access
'use server';

export async function accessPremiumData() {
  const user = await getUser();
  const hasAccess = await checkPremiumAccess(user.id);

  if (!hasAccess) {
    throw new Error('Premium feature not available');
  }

  // ... return premium data
}
```

---

### 4.3 Anti-Pattern: Client-Provided IDs

**WRONG:**

```typescript
// ❌ Client providing sensitive IDs
'use client';

export function UpdateProfile({ userId }) {
  const handleUpdate = async (data) => {
    // Client provides user_id—NEVER trust this
    await fetch('/api/users/update', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  };
}
```

**Why wrong:** Attacker can change `userId` to update another user's profile.

**CORRECT:**

```typescript
// ✅ Server derives user_id from session
'use server';

export async function updateProfile(data: ProfileInput) {
  const user = await getUser(); // Server derives user_id

  await db.users.update({
    where: { id: user.id }, // Server-controlled
    data,
  });
}
```

---

## 5) Testing Client Trust Violations

### 5.1 Test: Bypass Client Validation

**Scenario:** Client validates required field, but server doesn't.

**Test:**

```typescript
it('rejects invalid input even if client validation is bypassed', async () => {
  // Bypass client validation by calling server action directly
  await expect(
    createEvent({ name: '' }) // Invalid: name is required
  ).rejects.toThrow('Name is required');
});
```

**Expected:** Server validation catches the error.

---

### 5.2 Test: Bypass Client Authorization

**Scenario:** Client hides button based on role, but server doesn't check.

**Test:**

```typescript
it('rejects unauthorized action even if client check is bypassed', async () => {
  mockUserRole({ role: 'client' }); // Not a chef

  // Bypass client check by calling server action directly
  await expect(
    deleteEvent('event-123')
  ).rejects.toThrow('Only chefs can delete events');
});
```

**Expected:** Server rejects the action.

---

### 5.3 Test: Client-Provided Tenant ID

**Scenario:** Client provides tenant_id in request.

**Test:**

```typescript
it('ignores client-provided tenant_id and uses session-derived tenant', async () => {
  mockUserRole({ role: 'chef', tenant_id: 'tenant-a' });

  // Attacker tries to query tenant-b events
  const response = await fetch('/api/events?tenant_id=tenant-b');
  const events = await response.json();

  // Should return only tenant-a events (ignores query param)
  expect(events.every(e => e.tenant_id === 'tenant-a')).toBe(true);
});
```

**Expected:** Server ignores client-provided tenant_id.

---

## 6) Enforcement Checklist

Before deploying any feature, verify:

- ✅ **No authorization logic in client components** (server only)
- ✅ **No validation logic that isn't duplicated server-side** (server is authoritative)
- ✅ **No tenant_id, user_id, or role accepted from client input** (server derives from session)
- ✅ **No financial calculations in client code** (server computes, client displays)
- ✅ **No state transition logic in client code** (server enforces)
- ✅ **All sensitive operations use server actions or API routes** (never client-side fetch to database)

---

## 7) Summary: Client Trust Rules

### 7.1 Never Trust Client For

1. Authorization decisions
2. Authoritative input validation
3. Tenant scoping
4. Financial calculations
5. State transitions
6. Sensitive IDs (user_id, tenant_id, role)

### 7.2 Client Can Be Trusted For

1. Rendering UI
2. Capturing user input
3. UX validation (instant feedback)
4. UX hints (show/hide elements)
5. Optimistic updates (reverted on error)

### 7.3 One-Sentence Summary

**The Chef Portal treats all client-side code as untrusted and exclusively uses server-side execution for authentication, authorization, validation, financial operations, and state transitions, allowing client code only to render UI, capture input, and provide non-authoritative UX enhancements.**

---

**End of No Client Trust Rules**

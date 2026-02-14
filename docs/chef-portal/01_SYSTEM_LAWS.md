# Chef Portal System Laws (V1)

These are **inviolable laws** that govern the entire Chef Portal system. They are not guidelines or recommendations—they are hard requirements that must be enforced at every layer of the stack.

Violating any of these laws creates security vulnerabilities, data corruption, or operational failures.

---

## Law 1: Server Authority is Absolute

**Statement:** All critical business logic, state transitions, and data mutations must be executed and enforced server-side. Client-side logic is for UX only and is never trusted.

**Enforcement:**
- ✅ Event transitions executed via server actions
- ✅ Financial calculations performed server-side
- ✅ Role checks performed in middleware and server components
- ❌ NEVER trust client-provided tenant_id, role, or permissions
- ❌ NEVER execute business logic in client components

**Why:** Clients can be compromised, manipulated, or bypassed. Only server-side enforcement is trustworthy.

**Violation Example:**
```tsx
// ❌ VIOLATION
function EventCard({ event }) {
  const canEdit = event.status === 'draft'; // client-side logic
  return <button disabled={!canEdit}>Edit</button>;
}
```

**Correct Example:**
```tsx
// ✅ CORRECT
async function getEventWithPermissions(eventId: string) {
  // Server-side check
  const event = await db.events.findUnique({ where: { id: eventId } });
  const canEdit = await checkPermission(user, event, 'edit');
  return { event, canEdit };
}
```

---

## Law 2: Tenant Isolation is Inviolable

**Statement:** Every query, mutation, and access control check must enforce tenant isolation. A user belonging to tenant A can NEVER access tenant B's data, even through crafted requests or SQL injection.

**Enforcement:**
- ✅ RLS policies on all tables enforce `tenant_id` matching
- ✅ Queries never accept `tenant_id` from user input
- ✅ Tenant is derived from authenticated session, not request parameters
- ❌ NEVER allow cross-tenant queries, even for "admin" users in V1
- ❌ NEVER expose tenant_id as a query parameter or route parameter

**Why:** Multi-tenant data leaks are catastrophic. Tenant isolation must be unbreakable.

**Violation Example:**
```typescript
// ❌ VIOLATION
app.get('/api/events', async (req, res) => {
  const { tenant_id } = req.query; // NEVER accept tenant from query
  const events = await db.events.findMany({ where: { tenant_id } });
  res.json(events);
});
```

**Correct Example:**
```typescript
// ✅ CORRECT
async function getEvents(userId: string) {
  const tenantId = await getTenantIdForUser(userId); // derive from session
  const events = await db.events.findMany({
    where: { tenant_id: tenantId }, // RLS also enforces this
  });
  return events;
}
```

---

## Law 3: Immutability is Sacred

**Statement:** Certain tables and records are immutable and must NEVER be modified or deleted after creation. This includes `ledger_entries`, `event_transitions`, and other audit logs.

**Enforcement:**
- ✅ Database triggers prevent UPDATE/DELETE on immutable tables
- ✅ Application layer never attempts to update immutable records
- ✅ Corrections are made via new append-only entries, not edits
- ❌ NEVER soft delete immutable records
- ❌ NEVER provide an "admin override" to edit immutable data

**Why:** Immutability ensures financial and audit integrity. Editing history enables fraud and destroys accountability.

**Violation Example:**
```sql
-- ❌ VIOLATION
UPDATE ledger_entries
SET amount_cents = 150000
WHERE id = 'abc123';
```

**Correct Example:**
```sql
-- ✅ CORRECT
INSERT INTO ledger_entries (event_id, entry_type, amount_cents, notes)
VALUES ('event-123', 'adjustment', -50000, 'Correction for overcharge');
```

---

## Law 4: Financial Truth Lives in the Ledger

**Statement:** The ledger is the single source of truth for all financial data. Payment state, balances, and totals are ALWAYS derived from ledger entries, never stored separately or editable.

**Enforcement:**
- ✅ Ledger entries are append-only
- ✅ Payment state is computed from ledger entries at read time
- ✅ Stripe is an input source to the ledger, not the source of truth
- ❌ NEVER store payment state in a separate `payment_status` column
- ❌ NEVER allow manual editing of financial totals

**Why:** Dual sources of truth create inconsistencies. The ledger is append-only and auditable, making it the only trustworthy source.

**Violation Example:**
```typescript
// ❌ VIOLATION
await db.events.update({
  where: { id: eventId },
  data: { payment_status: 'paid' }, // separate truth source
});
```

**Correct Example:**
```typescript
// ✅ CORRECT
async function getPaymentState(eventId: string) {
  const entries = await db.ledger_entries.findMany({
    where: { event_id: eventId },
  });
  return computePaymentState(entries); // derived, not stored
}
```

---

## Law 5: State Transitions are Finite and Deterministic

**Statement:** Event lifecycle states are defined by a finite state machine. Transitions are explicit, logged, and only allowed if defined in the transition map. No undefined or "creative" transitions.

**Enforcement:**
- ✅ Event status is an enum (not a freeform string)
- ✅ Transitions are server-enforced via `transitionEvent()` function
- ✅ Every transition is logged to `event_transitions` table
- ✅ Invalid transitions are rejected with clear error messages
- ❌ NEVER allow direct UPDATE to `events.status`
- ❌ NEVER allow skipping states or undefined transitions

**Why:** Deterministic lifecycle prevents race conditions, invalid states, and audit gaps.

**Violation Example:**
```sql
-- ❌ VIOLATION
UPDATE events
SET status = 'executed' -- skips states, no audit
WHERE id = 'abc123';
```

**Correct Example:**
```typescript
// ✅ CORRECT
await transitionEvent({
  eventId: 'abc123',
  fromStatus: 'menu_locked',
  toStatus: 'executed',
  triggeredBy: userId,
}); // Server function checks validity and logs transition
```

---

## Law 6: Auditability is Non-Negotiable

**Statement:** Every critical action (status transitions, financial writes, role changes, invites) must be auditable. The system must answer: "Who did what, when, and why?"

**Enforcement:**
- ✅ Audit logs capture actor (user_id or 'system'), timestamp, action, and context
- ✅ Immutable tables serve as implicit audit logs (ledger, transitions)
- ✅ Explicit audit logs exist for user actions (client create, invite send, etc.)
- ❌ NEVER allow anonymous or untraceable actions
- ❌ NEVER delete audit logs

**Why:** Auditability enables troubleshooting, compliance, and accountability.

**Violation Example:**
```typescript
// ❌ VIOLATION (no audit trail)
await db.events.update({
  where: { id: eventId },
  data: { status: 'canceled' },
});
```

**Correct Example:**
```typescript
// ✅ CORRECT
await db.event_transitions.create({
  data: {
    event_id: eventId,
    from_status: 'confirmed',
    to_status: 'canceled',
    triggered_by: userId,
    triggered_at: new Date(),
    notes: 'Canceled by chef request',
  },
});
await db.events.update({
  where: { id: eventId },
  data: { status: 'canceled' },
});
```

---

## Law 7: Fail Closed, Never Open

**Statement:** When in doubt, the system must fail safely: deny access, freeze state, show "processing" status. Never assume success or allow proceeding with uncertain state.

**Enforcement:**
- ✅ If role is unknown, deny access (don't default to 'client')
- ✅ If webhook is delayed, show "processing" (don't assume success)
- ✅ If transition is invalid, reject (don't silently skip)
- ❌ NEVER use optimistic UI for financial or state-changing operations
- ❌ NEVER default to permissive behavior when uncertain

**Why:** Failing open creates security holes, data corruption, and false expectations.

**Violation Example:**
```tsx
// ❌ VIOLATION (optimistic update on payment)
function PayButton({ eventId }) {
  const [paid, setPaid] = useState(false);

  const handlePay = async () => {
    setPaid(true); // optimistic—WRONG for payments
    await createPaymentIntent(eventId);
  };

  return <button disabled={paid}>Pay</button>;
}
```

**Correct Example:**
```tsx
// ✅ CORRECT (wait for confirmation)
function PayButton({ eventId }) {
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    await createPaymentIntent(eventId);
    // Wait for webhook to confirm, then refetch state
  };

  return <button disabled={processing}>
    {processing ? 'Processing...' : 'Pay'}
  </button>;
}
```

---

## Law 8: Idempotency is Required for Critical Operations

**Statement:** Operations that write financial data, send emails, or trigger external side effects must be idempotent. Retries and duplicate requests must not create duplicate effects.

**Enforcement:**
- ✅ Stripe webhook processing uses Stripe event ID as idempotency key
- ✅ Payment intents include unique idempotency keys
- ✅ Ledger writes check for existing entries before inserting
- ✅ Invite creation checks for existing active invites
- ❌ NEVER allow duplicate ledger entries for the same Stripe event
- ❌ NEVER send duplicate invite emails for the same request

**Why:** Retries are inevitable (network failures, user double-clicks). Idempotency prevents corruption.

**Violation Example:**
```typescript
// ❌ VIOLATION (no idempotency check)
async function processStripeWebhook(event) {
  await db.ledger_entries.create({
    data: {
      event_id: event.metadata.event_id,
      entry_type: 'charge_succeeded',
      amount_cents: event.amount,
    },
  });
}
```

**Correct Example:**
```typescript
// ✅ CORRECT (idempotency check)
async function processStripeWebhook(event) {
  const existing = await db.ledger_entries.findUnique({
    where: { stripe_event_id: event.id },
  });

  if (existing) {
    return; // already processed, skip
  }

  await db.ledger_entries.create({
    data: {
      stripe_event_id: event.id, // unique constraint
      event_id: event.metadata.event_id,
      entry_type: 'charge_succeeded',
      amount_cents: event.amount,
    },
  });
}
```

---

## Law 9: No SELECT * (Explicit Projection Required)

**Statement:** Queries must explicitly select only the fields needed. Never use `SELECT *` or return entire rows without projection, especially when data crosses the server/client boundary.

**Enforcement:**
- ✅ Server components project only necessary fields
- ✅ Client-facing APIs use explicit whitelists for allowed fields
- ✅ Chef-private fields are excluded from client queries
- ❌ NEVER return entire rows with `SELECT *`
- ❌ NEVER expose internal fields (e.g., `chef_private_notes`) to client

**Why:** `SELECT *` leaks internal data, degrades performance, and violates separation of concerns.

**Violation Example:**
```typescript
// ❌ VIOLATION
async function getEventForClient(eventId: string) {
  return await db.events.findUnique({ where: { id: eventId } }); // returns all fields
}
```

**Correct Example:**
```typescript
// ✅ CORRECT
async function getEventForClient(eventId: string) {
  return await db.events.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      event_type: true,
      start_ts: true,
      end_ts: true,
      status: true,
      // chef_private_notes: false (excluded)
    },
  });
}
```

---

## Law 10: RLS is the Last Line of Defense

**Statement:** Row-level security (RLS) must be enabled and enforced on all tables. Even if application logic fails, RLS must prevent cross-tenant access.

**Enforcement:**
- ✅ RLS deny-by-default on all tables
- ✅ RLS policies check `auth.uid()` and match `tenant_id`
- ✅ RLS is tested with SQL-only verification (no app layer)
- ✅ Service role bypasses RLS only in controlled contexts (webhooks)
- ❌ NEVER disable RLS for convenience
- ❌ NEVER assume app layer is sufficient without RLS

**Why:** Application logic can be bypassed. RLS is the database-level guarantee of isolation.

**Violation Example:**
```sql
-- ❌ VIOLATION (RLS disabled)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
```

**Correct Example:**
```sql
-- ✅ CORRECT (RLS enforced)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_access ON events
FOR ALL
USING (
  tenant_id = (
    SELECT tenant_id FROM user_roles
    WHERE user_id = auth.uid() AND role = 'chef'
  )
);
```

---

## Summary: The 10 System Laws

1. **Server Authority is Absolute** — Server decides, client obeys
2. **Tenant Isolation is Inviolable** — No cross-tenant access, ever
3. **Immutability is Sacred** — Audit logs and ledger are append-only
4. **Financial Truth Lives in the Ledger** — Ledger is the source of truth
5. **State Transitions are Finite and Deterministic** — Explicit lifecycle, no shortcuts
6. **Auditability is Non-Negotiable** — Who, what, when, why
7. **Fail Closed, Never Open** — Deny by default, safe freezes
8. **Idempotency is Required** — Retries don't duplicate effects
9. **No SELECT * (Explicit Projection Required)** — Whitelist fields, protect secrets
10. **RLS is the Last Line of Defense** — Database enforces isolation

---

## Enforcement Mechanisms

| Law | Enforced By | Verification Method |
|-----|-------------|---------------------|
| Server Authority | Code review, architecture tests | Grep for client-side mutations |
| Tenant Isolation | RLS, middleware, code review | RLS SQL tests, penetration tests |
| Immutability | DB triggers, code review | `verify-immutability.sql` |
| Ledger Truth | Code architecture, code review | Financial reconciliation tests |
| Finite Transitions | Server function, DB constraints | Lifecycle transition tests |
| Auditability | DB schema, server actions | Audit log coverage tests |
| Fail Closed | Code review, security policy | Error handling tests |
| Idempotency | Unique constraints, keys | Duplicate submission tests |
| No SELECT * | Code review, linting | Automated grep for `SELECT *` |
| RLS | DB policies, tests | `verify-rls.sql` |

---

## Violation Consequences

**If any of these laws are violated:**

1. **Security:** Data leaks, unauthorized access, fraud
2. **Integrity:** Financial corruption, audit trail gaps
3. **Reliability:** Race conditions, duplicate operations, inconsistent state
4. **Compliance:** Regulatory violations, audit failures

**These laws are not optional. They are the foundation of the Chef Portal's trustworthiness.**

---

**End of System Laws**

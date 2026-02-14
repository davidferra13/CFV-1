# Chef Portal Data-Logic-Actions Map (V1)

This document maps **where data lives**, **where logic executes**, and **what actions are permitted** in the Chef Portal V1. It is the authoritative reference for understanding the separation of concerns and enforcement boundaries.

---

## 1) Core Architecture Layers

The Chef Portal follows a strict layered architecture:

```
┌─────────────────────────────────────────────────────┐
│  UI Layer (Client Components)                       │
│  - Read-only rendering                              │
│  - User input capture                               │
│  - Optimistic UI updates (rare, reverted on error)  │
└─────────────────────────────────────────────────────┘
                      ↓ (actions, form submissions)
┌─────────────────────────────────────────────────────┐
│  Server Components / Server Actions (Next.js)       │
│  - Role verification                                │
│  - Input validation (Zod schemas)                   │
│  - Business logic delegation to services            │
│  - Data fetching (RLS-enforced queries)             │
└─────────────────────────────────────────────────────┘
                      ↓ (validated requests)
┌─────────────────────────────────────────────────────┐
│  Database Layer (Supabase + RLS)                    │
│  - Row-level security (tenant isolation)            │
│  - Immutability triggers                            │
│  - Constraints and foreign keys                     │
│  - Audit log writers                                │
└─────────────────────────────────────────────────────┘
                      ↓ (external events)
┌─────────────────────────────────────────────────────┐
│  External Integrations (Stripe, etc.)               │
│  - Webhook receivers (service role only)            │
│  - Idempotency enforcement                          │
│  - Ledger append operations                         │
└─────────────────────────────────────────────────────┘
```

---

## 2) Data Storage Map

### 2.1 Where Data Lives

| Entity | Table(s) | Tenant Scoped? | Immutable? | Soft Delete? |
|--------|----------|----------------|------------|--------------|
| **Chef (Tenant)** | `chefs` | N/A (is the tenant) | No | No |
| **User Roles** | `user_roles` | No (cross-tenant mapping) | No | No |
| **Client Profile** | `client_profiles` | Yes (`tenant_id`) | No | Yes (`deleted_at`) |
| **Event** | `events` | Yes (`tenant_id`) | No (metadata) | Yes (`deleted_at`) |
| **Event Transitions** | `event_transitions` | Inherited from event | **Yes** | No |
| **Menu Template** | `menu_templates` | Yes (`tenant_id`) | No | Yes (`deleted_at`) |
| **Event Menu** | `event_menus` | Inherited from event | No (draft); Yes (locked versions) | No |
| **Menu Sections** | `menu_sections` | Inherited from menu | No (draft); Yes (locked) | No |
| **Menu Items** | `menu_items` | Inherited from menu | No (draft); Yes (locked) | No |
| **Ledger Entries** | `ledger_entries` | Inherited from event | **Yes** | No |
| **Client Invites** | `client_invites` | Yes (`tenant_id`) | No | No (expired invites stay) |
| **Audit Logs** | `audit_logs` | Yes (`tenant_id`) | **Yes** | No |

---

### 2.2 Derived Data (Not Stored)

The following data is **computed at read time**, not stored:

- **Payment State** — Derived from `ledger_entries` for an event
- **Event Financial Summary** — Sum of ledger entries by type
- **Client Event History** — Count and list of events per client
- **Dashboard Metrics** — Aggregations of events, payments, and states

**Why derived, not stored?**
- Prevents stale data
- Ensures single source of truth (ledger)
- Allows retroactive corrections without historical data corruption

---

## 3) Logic Execution Map

### 3.1 Where Logic Executes

| Operation | Client Component | Server Component | Server Action | Database Trigger | External Service |
|-----------|------------------|------------------|---------------|------------------|------------------|
| **Render UI** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Capture Input** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Validate Input** | ⚠️ (UX only) | ✅ (authoritative) | ✅ | ⚠️ (constraints only) | ❌ |
| **Check Role** | ❌ | ✅ | ✅ | ⚠️ (RLS only) | ❌ |
| **Check Tenant** | ❌ | ❌ | ❌ | ✅ (RLS) | ❌ |
| **Write Data** | ❌ | ❌ | ✅ | ✅ (via action) | ⚠️ (webhooks only) |
| **Transition Event** | ❌ | ❌ | ✅ | ⚠️ (audit trigger) | ❌ |
| **Append Ledger** | ❌ | ❌ | ✅ | ✅ (immutability trigger) | ⚠️ (Stripe webhook) |
| **Lock Menu** | ❌ | ❌ | ✅ | ⚠️ (versioning trigger) | ❌ |
| **Send Invite** | ❌ | ❌ | ✅ | ❌ | ⚠️ (email service) |

**Legend:**
- ✅ Primary responsibility
- ⚠️ Secondary enforcement or support
- ❌ Not permitted

---

### 3.2 Business Logic Ownership

| Business Rule | Owned By | Enforced By |
|---------------|----------|-------------|
| **Event lifecycle transitions** | Server action | Transition map + DB transaction |
| **Financial calculations** | Server action | Ledger append + RLS |
| **Menu versioning** | Server action | Version table + lock flag |
| **Client invite linking** | Server action | Token verification + RLS |
| **Tenant isolation** | Database | RLS policies |
| **Immutability** | Database | Triggers (prevent UPDATE/DELETE) |
| **Duplicate prevention** | Server action + Database | Idempotency keys + unique constraints |

---

## 4) Action Permissions Map

### 4.1 Event Actions

| Action | Allowed Roles | Prerequisites | Server Function | Audit Logged? |
|--------|---------------|---------------|-----------------|---------------|
| **Create Event** | `chef`, `chef_subaccount` (if permitted) | Client profile exists | `createEvent()` | Yes |
| **Edit Event (draft)** | `chef`, `chef_subaccount` | Status = `draft` | `updateEvent()` | Yes |
| **Transition Status** | `chef` only | Valid transition per map | `transitionEvent()` | Yes (to `event_transitions`) |
| **Cancel Event** | `chef` only | Event not in terminal state | `cancelEvent()` | Yes |
| **Delete Event** | `chef` only (soft delete) | No payments received | `softDeleteEvent()` | Yes |
| **View Event** | `chef`, `chef_subaccount` | Same tenant | RLS query | No |

---

### 4.2 Client Actions

| Action | Allowed Roles | Prerequisites | Server Function | Audit Logged? |
|--------|---------------|---------------|-----------------|---------------|
| **Create Client** | `chef`, `chef_subaccount` | None | `createClientProfile()` | Yes |
| **Edit Client** | `chef`, `chef_subaccount` | Same tenant | `updateClientProfile()` | Yes |
| **Add Private Note** | `chef`, `chef_subaccount` | Same tenant | `addClientNote()` | Yes |
| **Send Invite** | `chef` only | Client profile exists | `createInvite()` | Yes |
| **View Client** | `chef`, `chef_subaccount` | Same tenant | RLS query | No |
| **Delete Client** | `chef` only (soft delete) | No active events | `softDeleteClient()` | Yes |

---

### 4.3 Menu Actions

| Action | Allowed Roles | Prerequisites | Server Function | Audit Logged? |
|--------|---------------|---------------|-----------------|---------------|
| **Create Menu Template** | `chef`, `chef_subaccount` | None | `createMenuTemplate()` | Yes |
| **Edit Menu (draft)** | `chef`, `chef_subaccount` | Menu not locked | `updateMenu()` | Yes |
| **Lock Menu** | `chef` only | Menu has content | `lockMenu()` | Yes |
| **Duplicate Menu** | `chef`, `chef_subaccount` | None (creates new draft) | `duplicateMenu()` | Yes |
| **Link Menu to Event** | `chef` only | Event exists, same tenant | `linkMenuToEvent()` | Yes |
| **View Menu** | `chef`, `chef_subaccount`, `client` (if linked) | Appropriate tenant/event | RLS query | No |

---

### 4.4 Financial Actions

| Action | Allowed Roles | Prerequisites | Server Function | Audit Logged? |
|--------|---------------|---------------|-----------------|---------------|
| **View Ledger** | `chef` only | Same tenant | RLS query | No |
| **Append Ledger Entry** | `chef` (manual adjustment), `system` (Stripe) | Event exists | `appendLedgerEntry()` | Yes (entry is the log) |
| **Request Payment** | `chef` only | Event in valid state | `createPaymentIntent()` | Yes |
| **Refund Payment** | `chef` only | Payment succeeded | `createRefund()` | Yes |
| **Export Financial Data** | `chef` only | Same tenant | `exportLedger()` | Yes |

**No edit or delete actions exist for ledger entries. Ledger is append-only.**

---

### 4.5 Invite Actions

| Action | Allowed Roles | Prerequisites | Server Function | Audit Logged? |
|--------|---------------|---------------|-----------------|---------------|
| **Create Invite** | `chef` only | Client profile exists | `createInvite()` | Yes |
| **Accept Invite** | `client` (unauthenticated or new user) | Valid token, not expired | `acceptInvite()` | Yes |
| **View Invite Status** | `chef` only | Same tenant | RLS query | No |
| **Revoke Invite** | `chef` only | Invite not accepted | `revokeInvite()` | Yes |

---

## 5) Data Flow Patterns

### 5.1 Read Flow (Query)

```
User requests page
   ↓
Middleware checks role and tenant
   ↓
Server component fetches data via RLS query
   ↓
RLS enforces tenant_id match
   ↓
Data returned to server component
   ↓
Server component renders or passes to client component
   ↓
User sees data
```

**Key Points:**
- Client components never query database directly
- All queries are scoped by RLS
- Tenant is implicit from authenticated user, never from user input

---

### 5.2 Write Flow (Action)

```
User submits form in client component
   ↓
Form calls server action
   ↓
Server action validates input (Zod schema)
   ↓
Server action checks role and permissions
   ↓
Server action executes business logic
   ↓
Business logic writes to database (RLS enforced)
   ↓
Database triggers (if applicable) enforce immutability/audit
   ↓
Server action returns success or error
   ↓
Client component shows feedback (toast, redirect, etc.)
```

**Key Points:**
- No direct database writes from client
- Validation happens server-side (client validation is UX only)
- Errors are caught and returned to client gracefully

---

### 5.3 Webhook Flow (External Event)

```
Stripe sends webhook to /api/webhooks/stripe
   ↓
Webhook handler verifies signature
   ↓
Webhook handler checks idempotency key
   ↓
Webhook handler extracts event data
   ↓
Webhook handler appends ledger entry (via service role)
   ↓
Ledger entry triggers any downstream logic (e.g., status transition)
   ↓
Webhook handler returns 200 OK
```

**Key Points:**
- Webhooks use service role (bypass RLS)
- Idempotency prevents duplicate processing
- Ledger append is the single write operation
- No UI interaction; webhook is background process

---

## 6) State Management Map

### 6.1 Where State Lives

| State Type | Storage Location | Scope | Persistence |
|------------|------------------|-------|-------------|
| **User Session** | Supabase Auth cookie | Per-user | Session duration |
| **Role / Tenant** | Derived from `user_roles` table | Per-user | Persistent (DB) |
| **Event Status** | `events.status` column | Per-event | Persistent (DB) |
| **Payment State** | Derived from `ledger_entries` | Per-event | Persistent (DB, append-only) |
| **Menu Lock State** | `event_menus.locked` flag | Per-menu | Persistent (DB) |
| **UI Form State** | React state (client component) | Per-component | Ephemeral (lost on refresh) |
| **Loading State** | React state (client component) | Per-component | Ephemeral |
| **Toast/Notification State** | React state (client component) | Per-component | Ephemeral |

**Key Principle:** **Server state is truth. Client state is ephemeral and subordinate.**

---

### 6.2 State Synchronization

| State Change | How Client Learns About It |
|--------------|----------------------------|
| **Event status changed** | Refetch event data after server action completes |
| **Payment received** | Webhook updates ledger → UI polls or user refreshes |
| **Menu locked** | Server action returns updated menu → UI re-renders |
| **Client invited** | Server action returns new invite → UI shows updated status |

**No real-time sync in V1.** Users refresh or navigate to see updated state.

---

## 7) Validation Map

### 7.1 Where Validation Happens

| Validation Type | Client | Server | Database |
|-----------------|--------|--------|----------|
| **Input format** (email, phone, etc.) | ✅ (UX) | ✅ (authoritative) | ⚠️ (constraints) |
| **Required fields** | ✅ (UX) | ✅ (authoritative) | ✅ (NOT NULL) |
| **Business rules** (e.g., valid transition) | ❌ | ✅ | ⚠️ (triggers) |
| **Uniqueness** (e.g., no duplicate email) | ❌ | ✅ | ✅ (UNIQUE constraint) |
| **Authorization** (role/tenant check) | ❌ | ✅ | ✅ (RLS) |

---

### 7.2 Validation Schemas (Zod)

All server actions use **Zod schemas** for input validation.

**Example: Create Event Schema**

```typescript
const createEventSchema = z.object({
  client_id: z.string().uuid(),
  event_type: z.string().min(1),
  start_ts: z.string().datetime(),
  end_ts: z.string().datetime(),
  total_amount_cents: z.number().int().min(0),
  deposit_amount_cents: z.number().int().min(0),
  notes: z.string().optional(),
});
```

**Usage:**

```typescript
export async function createEvent(rawInput: unknown) {
  const input = createEventSchema.parse(rawInput); // throws if invalid
  // ... proceed with validated input
}
```

---

## 8) Error Handling Map

### 8.1 Error Types and Responses

| Error Type | HTTP Status | User Message | Logged? | Retry? |
|------------|-------------|--------------|---------|--------|
| **Validation Error** | 400 | "Invalid input: [field] is required" | No | No (user fixes input) |
| **Authorization Error** | 403 | "You don't have permission to perform this action" | Yes | No |
| **Not Found Error** | 404 | "Event not found" | No | No |
| **Conflict Error** | 409 | "Cannot transition: event is not in valid state" | Yes | No (user changes approach) |
| **Server Error** | 500 | "Something went wrong. Please try again." | Yes | Yes (user retries) |
| **Database Error** | 500 | "Something went wrong. Please try again." | Yes | Yes (user retries) |

---

### 8.2 Error Propagation

```
Database error
   ↓
Server action catches error
   ↓
Server action logs error (if unexpected)
   ↓
Server action returns user-friendly error message
   ↓
Client component displays error (toast, inline, modal)
   ↓
User takes corrective action or retries
```

**Key Principle:** **Never expose raw database errors or stack traces to users.**

---

## 9) Caching and Performance Map

### 9.1 What Gets Cached (V1 Minimal)

| Data | Cached? | Cache Duration | Invalidation Strategy |
|------|---------|----------------|------------------------|
| **User role** | Yes (session storage) | Session duration | On role change (rare) |
| **Event list** | No (always fresh) | N/A | N/A |
| **Event detail** | No (always fresh) | N/A | N/A |
| **Menu templates** | ⚠️ (optional, Next.js static) | Until revalidate | On template update |
| **Ledger entries** | No (always fresh) | N/A | N/A |

**V1 prioritizes correctness over caching.** Aggressive caching is deferred to V2.

---

### 9.2 Query Optimization

| Query Type | Optimization Strategy |
|------------|----------------------|
| **List views** | Paginated (20-50 rows per page) |
| **Detail views** | Single-row query with joins |
| **Aggregations** (e.g., financial summary) | Indexed columns, computed at read time |
| **Audit logs** | Paginated, indexed by timestamp |

---

## 10) Summary: Data-Logic-Actions Hierarchy

| Layer | Responsibility | Trust Level |
|-------|----------------|-------------|
| **Client Components** | Render UI, capture input | Zero trust |
| **Server Components** | Fetch data, enforce role | Trusted (internal) |
| **Server Actions** | Execute business logic, validate input, write data | Trusted (internal) |
| **Database (RLS)** | Enforce tenant isolation, immutability | Absolute truth |
| **External Services** (Stripe) | Provide external events | Verified (via webhook signature) |

**Data flows from client → server → database, with enforcement at every boundary.**

**Logic executes server-side only (never client-side for critical operations).**

**Actions are permissioned by role, validated by schema, and audited in the database.**

---

## One-Sentence Summary

*In the Chef Portal, data lives in the database (tenant-scoped by RLS), logic executes server-side (via server actions), and actions are permissioned by role and validated by schemas, with client components serving only as read-only renderers and input capturers that never execute critical business logic.*

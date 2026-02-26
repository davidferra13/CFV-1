# ChefFlow V1 - Core System Architecture Master Specification

**Version**: 1.0
**Date**: 2026-02-14
**Status**: AUTHORITATIVE
**Authority**: This document is the definitive architectural reference for ChefFlow V1. All implementation must conform to these specifications.

---

## Document Purpose

This document defines the complete end-to-end architecture of ChefFlow V1, from frontend routing through backend logic to database enforcement and external integrations. It is an **enforcement reference**, not a design proposal.

**If this document conflicts with implementation, implementation is wrong.**

---

## 1. System Overview (V1 Only)

### 1.1 What ChefFlow V1 Is

ChefFlow V1 is a **multi-tenant chef booking platform** with three distinct layers:

1. **Chef Portal** - Private chef businesses manage events, clients, and financials
2. **Client Portal** - Customers view events, accept proposals, and make payments
3. **Public Layer** - Marketing landing pages (no authentication)

**Core Capability**: Chef creates event → invites client → client accepts → client pays → chef confirms → event lifecycle completes.

**Financial Model**: Stripe payments → append-only ledger → derived financial state.

**Isolation Model**: Each chef is a tenant. RLS enforces absolute isolation. No cross-tenant data access under any condition.

### 1.2 What ChefFlow V1 Explicitly Is NOT

EXCLUDED (V1) - Per `CHEFFLOW_V1_SCOPE_LOCK.md`:

- Email/SMS notifications
- Calendar integration (iCal, Google Calendar)
- File uploads (photos, contracts, documents)
- Advanced menu builder (drag-and-drop, multi-course)
- Inventory/shopping list management
- Client reviews/ratings
- In-app messaging/chat
- Multi-chef collaboration (team members, assistants)
- Admin panel (super-admin across tenants)
- Reporting/analytics dashboards
- Automated reminders
- Tax calculations
- Invoice PDF generation
- Payment plans/installments
- Discount codes/coupons
- Referral system
- Dark mode
- Mobile apps (iOS/Android)
- Multi-language support

**If it's not listed in the "V1 Feature List" in the scope lock, it does not exist.**

### 1.3 Three-Layer Responsibility Model

| Layer             | Routes                      | Authentication         | Data Scope            | Enforcement               |
| ----------------- | --------------------------- | ---------------------- | --------------------- | ------------------------- |
| **Public**        | `/`, `/pricing`, `/contact` | None                   | Public static content | None                      |
| **Chef Portal**   | `/chef/*`                   | Required (role=chef)   | `tenant_id` scoped    | Middleware + Layout + RLS |
| **Client Portal** | `/client/*`                 | Required (role=client) | `client_id` scoped    | Middleware + Layout + RLS |

**Defense Depth**: All three portals are isolated via:

1. Middleware (network-level redirect)
2. Layout guards (server-side throw before render)
3. RLS policies (database-level deny)

---

## 2. Canonical Identities & Ownership

### 2.1 Identity Primitives

| Identity          | Source             | Type                    | Purpose                             |
| ----------------- | ------------------ | ----------------------- | ----------------------------------- |
| `auth.users.id`   | Supabase Auth      | UUID                    | Canonical user identity             |
| `user_roles.role` | `user_roles` table | ENUM ('chef', 'client') | Authoritative role (NEVER inferred) |
| `chefs.id`        | `chefs` table      | UUID                    | Tenant ID (if role=chef)            |
| `clients.id`      | `clients` table    | UUID                    | Client profile ID (if role=client)  |

### 2.2 Ownership Mapping Rules

**Rule 1**: One `auth.users.id` → exactly **one primary role** in V1.

**Rule 2**: Role determines entity reference:

- If `role = 'chef'`: `user_roles.entity_id` → `chefs.id`
- If `role = 'client'`: `user_roles.entity_id` → `clients.id`

**Rule 3**: Tenant scoping:

- Chefs: `tenant_id = chefs.id` (self-owned)
- Clients: `tenant_id` from `clients.tenant_id` (inherited from inviting chef)

**Rule 4**: Created-by attribution:

- `created_by` / `updated_by` → `auth.users.id`
- Used for audit trails, not access control
- Access control ONLY via RLS policies

### 2.3 Tenant ID Scoping

**All tenant-scoped tables MUST include `tenant_id UUID REFERENCES chefs(id)`:**

- `events.tenant_id`
- `event_transitions.tenant_id`
- `ledger_entries.tenant_id`
- `menus.tenant_id`
- `client_invitations.tenant_id`
- `clients.tenant_id`

**Exceptions (no tenant_id):**

- `chefs` - IS the tenant
- `user_roles` - global identity mapping

**Enforcement**: RLS policies MUST filter by `tenant_id = get_current_tenant_id()`.

### 2.4 Cross-Tenant Prevention

**Constraint Example** (from schema):

```sql
CONSTRAINT fk_client_tenant CHECK (
  (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
)
```

**Invariant**: Events can only reference clients within the same tenant. Cross-tenant foreign keys are structurally impossible.

---

## 3. Role Resolution & Routing (Defense in Depth)

### 3.1 Three-Layer Defense Model

**Layer 1 - Middleware** (`middleware.ts`):

- Executes on **every request** before any code runs
- Queries `user_roles` table for authoritative role
- Redirects wrong-portal access at network level
- **NO HTML sent to client if wrong portal**

**Layer 2 - Layout Guards** (`requireChef()`, `requireClient()`, `requireAuth()`):

- Server-side functions in layout components
- Throw error if role doesn't match
- Executes before page components render
- **Prevents flash of wrong content**

**Layer 3 - Database RLS**:

- Deny-by-default policies
- Enforced even if middleware/layout bypassed
- **Final enforcement layer**
- Service role required for admin operations

**Why All Three?**

- **Middleware**: Fast rejection, no wasted compute
- **Layout**: Prevents partial renders, guarantees type safety
- **RLS**: Guarantees isolation even on direct DB access

### 3.2 Role Resolution Source-of-Truth

**File**: `lib/auth/get-user.ts`

**Query Pattern**:

```typescript
// Step 1: Get Supabase auth user
const { user } = await supabase.auth.getUser()

// Step 2: Query authoritative role table
const { role, entity_id } = await supabase
  .from('user_roles')
  .select('role, entity_id')
  .eq('auth_user_id', user.id)
  .single()

// Step 3: Derive tenant_id based on role
if (role === 'chef') {
  tenantId = entity_id // Chef's own ID
} else if (role === 'client') {
  const { tenant_id } = await supabase
    .from('clients')
    .select('tenant_id')
    .eq('id', entity_id)
    .single()
}
```

**NEVER**:

- Infer role from URL path (`/chef/*` does NOT mean user is chef)
- Trust client-provided role in request body
- Cache role in client state (localStorage, cookies)
- Use JWT claims for role (auth.users has no role field)

**ALWAYS**:

- Query `user_roles` table on server
- Cache result per request using React `cache()`
- Validate role matches route requirement

### 3.3 Redirect Rules (Middleware)

| User Role               | Attempts to Access          | Action                                         |
| ----------------------- | --------------------------- | ---------------------------------------------- |
| Not authenticated       | `/chef/*` or `/client/*`    | Redirect to `/auth/signin?redirect={pathname}` |
| Chef                    | `/client/*`                 | Redirect to `/chef/dashboard`                  |
| Client                  | `/chef/*`                   | Redirect to `/client/my-events`                |
| No role in `user_roles` | Any protected route         | Redirect to `/auth/error`                      |
| Any                     | `/`, `/pricing`, `/contact` | Allow (public)                                 |
| Any                     | `/api/webhooks/*`           | Allow (signature verification instead)         |

**Invariant**: No user sees HTML for a portal they don't have access to.

### 3.4 Prevention of Wrong-Portal Flash

**Problem**: User might briefly see wrong portal content before redirect.

**Solution**:

1. Middleware runs **before** page code executes
2. `NextResponse.redirect()` returns HTTP 307 redirect
3. Browser never receives page HTML
4. No client-side JavaScript executes
5. No flash occurs

**Verification**:

- Open DevTools Network tab
- Attempt to access wrong portal
- Should see 307 redirect response
- Should NOT see page HTML in response

---

## 4. Event Lifecycle State Machine (Operational Only)

### 4.1 Locked Event States (FROZEN - ENUM)

**Source**: `CHEFFLOW_V1_SCOPE_LOCK.md` Section "Locked Lifecycle States"

```sql
CREATE TYPE event_status AS ENUM (
  'draft',        -- Chef creating event
  'proposed',     -- Sent to client, awaiting response
  'accepted',     -- Client accepted, awaiting payment
  'paid',         -- Deposit/full payment received
  'confirmed',    -- Chef confirmed after payment
  'in_progress',  -- Event day
  'completed',    -- Event finished
  'cancelled'     -- Cancelled (with reason)
);
```

**Count**: Exactly 8 states. No additions allowed in V1.

### 4.2 Allowed Transitions Map

**Linear Happy Path**:

```
draft → proposed → accepted → paid → confirmed → in_progress → completed
```

**Cancellation (from any state)**:

```
any_state → cancelled
```

**Terminal States** (no further transitions allowed):

- `completed`
- `cancelled`

### 4.3 Transition Validation Rules

| From State    | To State      | Triggered By     | Validation Required                        |
| ------------- | ------------- | ---------------- | ------------------------------------------ |
| `draft`       | `proposed`    | Chef             | Event must have `total_amount_cents > 0`   |
| `proposed`    | `accepted`    | Client           | `client_id = current_client_id()`          |
| `accepted`    | `paid`        | System (webhook) | Webhook verification only                  |
| `paid`        | `confirmed`   | Chef             | Ledger check: `is_deposit_paid = true`     |
| `confirmed`   | `in_progress` | Chef             | None                                       |
| `in_progress` | `completed`   | Chef             | None                                       |
| `*`           | `cancelled`   | Chef             | `cancellation_reason` required (non-empty) |

**Forbidden Transitions** (must be blocked):

- Skip states (e.g., `draft` → `confirmed`)
- Reverse transitions (e.g., `confirmed` → `accepted`)
- Transitions from terminal states (`completed` → anything)
- Client-initiated transitions (except `proposed` → `accepted`)

### 4.4 Transition Function Contract

**Function Signature** (conceptual):

```typescript
async function transitionEventStatus(
  eventId: UUID,
  toStatus: EventStatus,
  metadata?: { reason?: string }
): Promise<{ success: boolean; error?: string }>
```

**Implementation Requirements**:

1. **Validate current state**:
   - Query `events.status` (SELECT FOR UPDATE to prevent race)
   - Check if transition is allowed per table above
   - Return error if invalid

2. **Perform validation checks**:
   - If `proposed`: check pricing is set
   - If `accepted`: check caller is client who owns event
   - If `confirmed`: check ledger for deposit payment
   - If `cancelled`: check reason is provided

3. **Atomically update**:

   ```sql
   BEGIN;

   -- Insert transition record (immutable audit)
   INSERT INTO event_transitions (
     tenant_id, event_id, from_status, to_status,
     transitioned_by, metadata
   ) VALUES (...);

   -- Update event status
   UPDATE events SET
     status = to_status,
     status_changed_at = now(),
     updated_at = now(),
     updated_by = caller_id
   WHERE id = event_id;

   COMMIT;
   ```

4. **Idempotency**:
   - If `events.status = to_status` already, return success (no-op)
   - Do NOT error on duplicate transition (safe retry)

5. **Return result**:
   - `{ success: true }` on valid transition
   - `{ success: false, error: "reason" }` on invalid

**NEVER**:

- Allow direct UPDATE to `events.status` from client code
- Skip audit logging in `event_transitions`
- Allow state skipping
- Trust client-provided `from_status` (always query DB)

### 4.5 Webhook-Triggered Transitions

**Special Case**: `accepted` → `paid`

**Trigger**: Stripe webhook `payment_intent.succeeded`

**Flow**:

1. Webhook handler verifies signature
2. Creates ledger entry (idempotent via `stripe_event_id`)
3. Calls `transitionEventStatus(eventId, 'paid')`
4. Returns 200 OK to Stripe

**Concurrency**: Multiple webhooks may arrive. Ledger insert uses `UNIQUE(stripe_event_id)` to prevent duplicates. Transition is idempotent (no error if already `paid`).

---

## 5. Financial Truth Model (Ledger-First)

### 5.1 Canonical Rules

**Rule 1**: **Ledger is append-only**.

- NO `UPDATE` or `DELETE` on `ledger_entries`
- Enforced by database triggers (`prevent_ledger_modification()`)
- Corrections via new `adjustment` entry

**Rule 2**: **Amounts are integer cents**.

- Type: `INTEGER` (NEVER `DECIMAL` or `FLOAT`)
- Currency: `usd` (hardcoded in V1)
- Example: $100.00 = `10000` cents

**Rule 3**: **Payment state is derived**.

- NO `balance` or `is_paid` columns on `events` table
- All financial state computed from `event_financial_summary` VIEW
- View recomputes on every query (no caching)

**Rule 4**: **Stripe is source of truth**.

- Money enters ONLY via Stripe webhooks
- Manual entries allowed ONLY for adjustments (chef-initiated, logged)
- NEVER create `charge_succeeded` manually

**Rule 5**: **Idempotency via event ID**.

- `ledger_entries.stripe_event_id` has `UNIQUE` constraint
- Duplicate webhooks detected and return 200 (no error)
- Prevents double-charging

### 5.2 Ledger Entry Types (FROZEN ENUM)

```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_created',      -- Stripe PaymentIntent created
  'charge_succeeded',    -- Payment succeeded
  'charge_failed',       -- Payment failed
  'refund_created',      -- Refund initiated
  'refund_succeeded',    -- Refund completed
  'payout_created',      -- Payout to chef initiated (FUTURE)
  'payout_paid',         -- Payout completed (FUTURE)
  'adjustment'           -- Manual adjustment (requires approval)
);
```

**Used in V1**:

- `charge_created`, `charge_succeeded`, `charge_failed`
- `refund_created`, `refund_succeeded`
- `adjustment`

**Stubbed (not implemented)**:

- `payout_created`, `payout_paid` (manual in V1)

### 5.3 Ledger Entry Structure

**Table**: `ledger_entries`

**Key Fields**:

- `entry_type`: Type of financial event
- `amount_cents`: INTEGER (positive = credit, negative = debit)
- `event_id`: Which event (nullable for tenant-level entries)
- `client_id`: Which client (nullable)
- `tenant_id`: Which chef (required, NEVER null)
- `stripe_event_id`: Unique webhook event ID (idempotency key)
- `stripe_object_id`: `payment_intent_xxx`, `charge_xxx`, `refund_xxx`
- `stripe_event_type`: `payment_intent.succeeded`, etc.
- `description`: Human-readable description
- `metadata`: JSONB for additional context

**Immutability**:

- `UPDATE` trigger raises exception
- `DELETE` trigger raises exception
- Only `INSERT` allowed

### 5.4 Invoice Locking Rules

**V1 Rule**: Events can be updated while in `draft` status only.

**After Proposal** (`status != 'draft'`):

- `total_amount_cents`: **IMMUTABLE** (prevents bait-and-switch)
- `deposit_amount_cents`: **IMMUTABLE**
- Title, date, location: **MUTABLE** (operational changes allowed)

**Enforcement**: Server-side validation in update handlers.

**Why**: Client accepted pricing based on specific amounts. Changing pricing after acceptance is prohibited.

### 5.5 Refunds and Adjustments (Append-Only)

**Refund Flow**:

1. Chef initiates refund via Stripe dashboard (V1 - no in-app refunds)
2. Stripe webhook `charge.refunded` fires
3. Webhook handler creates ledger entry:
   - `entry_type = 'refund_succeeded'`
   - `amount_cents = -(refund amount)` (negative value)
   - `event_id`, `client_id`, `tenant_id` from original charge
   - `stripe_event_id` for idempotency

**Adjustment Flow** (manual correction):

1. Chef discovers ledger discrepancy
2. Chef creates adjustment entry via admin interface (FUTURE - V1 uses DB console)
3. Entry created:
   - `entry_type = 'adjustment'`
   - `amount_cents = correction amount` (positive or negative)
   - `description` explaining reason
   - `metadata` with approval details

**Never Delete Financial History**:

- If wrong entry created, create offsetting `adjustment`
- Never DELETE from ledger (trigger prevents it)
- Audit trail must be complete and immutable

### 5.6 Financial Summary View

**View**: `event_financial_summary`

**Computation**:

```sql
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.total_amount_cents AS expected_total_cents,
  e.deposit_amount_cents AS expected_deposit_cents,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents
    ELSE 0
  END), 0) AS collected_cents,
  [...] >= e.total_amount_cents AS is_fully_paid,
  [...] >= e.deposit_amount_cents AS is_deposit_paid
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
GROUP BY e.id, ...
```

**Usage**:

- Query this view to check payment status
- Never store computed balances in events table
- View is scoped by RLS (tenant_id filtering applies)

---

## 6. Time-Block Calendar Model (start_ts / end_ts)

### 6.1 Canonical Fields

**V1 Implementation**: Events have **single timestamp** only.

**Table: `events`**:

- `event_date TIMESTAMPTZ NOT NULL` - When event occurs

**EXCLUDED (V1)**:

- `start_ts` / `end_ts` - Not implemented
- Time range blocking - Not implemented
- Overlap detection - Not implemented
- Soft-hold behavior - Not implemented

**Rationale**: V1 scope lock excludes calendar blocking. Event date is informational only. Chef manually manages availability.

**FUTURE (Post-V1)**:

- Add `start_ts`, `end_ts` to events
- Implement overlap detection function
- Block confirmed events from overlapping
- Add soft-hold for proposed events

**Current Behavior**: Multiple events can have same `event_date`. No enforcement.

---

## 7. Preparable Engine Contract (V1 Minimal)

### 7.1 What "Preparable" Means in V1

**EXCLUDED (V1)**: Preparable intelligence is NOT implemented.

**Scope Lock** lists these as excluded:

- Shopping list generation
- Ingredient management
- Inventory tracking
- Recipe intelligence

**If Mentioned in Code**: It's a stub for future. Do not expand.

**V1 Behavior**: Menus are simple text templates.

### 7.2 Menu Model (V1 Minimal)

**Table**: `menus`

**Fields**:

- `name TEXT` - Menu name (e.g., "Italian 5-Course")
- `description TEXT` - Free text description
- `price_per_person_cents INTEGER` - Price per guest

**Relationship**:

- Many-to-many with events via `event_menus` junction table
- One event can have multiple menus attached
- Read-only for clients (via RLS)

**What Menus DO NOT Do in V1**:

- Generate shopping lists
- Track ingredients
- Calculate quantities based on guest count
- Provide cooking instructions
- Link to recipes

**What Menus DO in V1**:

- Display name and description to client
- Contribute to event pricing (informational only - actual pricing on event)
- Show which menus are attached to event

### 7.3 No Intelligence Expansion

**Contract**: If code exists for "preparable" logic, it must:

- Be a stub
- Not execute complex logic
- Not call external services
- Not generate derived data

**Allowed**: Displaying menu text to user.

**Prohibited**: Any computation, generation, or intelligence.

---

## 8. Data Model Summary (V1 Tables Only)

### 8.1 Identity & Tenancy Tables

#### **Table: `chefs`**

- **Purpose**: Tenant owners (private chef businesses)
- **Key Fields**: `id`, `auth_user_id`, `business_name`, `email`, `stripe_account_id`
- **Foreign Keys**: `auth_user_id` → `auth.users(id)`
- **Immutability**: Mutable (chef can update profile)
- **Chef Access**: SELECT/UPDATE own record only
- **Client Access**: None (clients cannot see chef profiles)

#### **Table: `clients`**

- **Purpose**: Customers (scoped to tenant)
- **Key Fields**: `id`, `auth_user_id`, `tenant_id`, `full_name`, `email`, `stripe_customer_id`
- **Foreign Keys**: `auth_user_id` → `auth.users(id)`, `tenant_id` → `chefs(id)`
- **Immutability**: Mutable (chef and client can update)
- **Chef Access**: SELECT/INSERT/UPDATE where `tenant_id = current_tenant_id`
- **Client Access**: SELECT/UPDATE own record only

#### **Table: `user_roles`**

- **Purpose**: Authoritative role assignment (NEVER infer from client)
- **Key Fields**: `auth_user_id`, `role`, `entity_id`
- **Foreign Keys**: `auth_user_id` → `auth.users(id)`
- **Immutability**: IMMUTABLE after signup (no user-facing UPDATE)
- **Chef Access**: SELECT own role only
- **Client Access**: SELECT own role only

#### **Table: `client_invitations`**

- **Purpose**: Invitation-based client signup
- **Key Fields**: `tenant_id`, `email`, `token`, `expires_at`, `used_at`
- **Foreign Keys**: `tenant_id` → `chefs(id)`, `created_by` → `auth.users(id)`
- **Immutability**: `used_at` set once (prevents reuse)
- **Chef Access**: Full CRUD for own tenant
- **Client Access**: None (public reads by token for signup)

### 8.2 Event & Lifecycle Tables

#### **Table: `events`**

- **Purpose**: Service bookings (events)
- **Key Fields**: `id`, `tenant_id`, `client_id`, `title`, `event_date`, `guest_count`, `location`, `total_amount_cents`, `deposit_amount_cents`, `status`
- **Foreign Keys**: `tenant_id` → `chefs(id)`, `client_id` → `clients(id)`, `created_by` → `auth.users(id)`
- **Immutability**: Pricing immutable after `draft`. Soft delete via `deleted_at`.
- **Chef Access**: Full CRUD where `tenant_id = current_tenant_id`
- **Client Access**: SELECT/UPDATE (limited fields) where `client_id = current_client_id`

#### **Table: `event_transitions`**

- **Purpose**: Immutable audit log of all event status changes
- **Key Fields**: `event_id`, `from_status`, `to_status`, `transitioned_by`, `transitioned_at`, `metadata`
- **Foreign Keys**: `tenant_id` → `chefs(id)`, `event_id` → `events(id)`, `transitioned_by` → `auth.users(id)`
- **Immutability**: IMMUTABLE (triggers prevent UPDATE/DELETE)
- **Chef Access**: SELECT where `tenant_id = current_tenant_id`
- **Client Access**: SELECT where `event_id IN (client's events)`

### 8.3 Financial Tables

#### **Table: `ledger_entries`**

- **Purpose**: Append-only financial truth source
- **Key Fields**: `entry_type`, `amount_cents`, `currency`, `event_id`, `client_id`, `tenant_id`, `stripe_event_id`, `stripe_object_id`
- **Foreign Keys**: `tenant_id` → `chefs(id)`, `event_id` → `events(id)`, `client_id` → `clients(id)`
- **Immutability**: IMMUTABLE (triggers prevent UPDATE/DELETE)
- **Chef Access**: SELECT where `tenant_id = current_tenant_id`, INSERT (adjustments only)
- **Client Access**: SELECT where `client_id = current_client_id`

### 8.4 Menu Tables

#### **Table: `menus`**

- **Purpose**: Menu templates (multi-tenant scoped)
- **Key Fields**: `id`, `tenant_id`, `name`, `description`, `price_per_person_cents`, `is_active`
- **Foreign Keys**: `tenant_id` → `chefs(id)`
- **Immutability**: Mutable (chef can edit)
- **Chef Access**: Full CRUD where `tenant_id = current_tenant_id`
- **Client Access**: SELECT (active only) where `tenant_id = (client's chef)`

#### **Table: `event_menus`**

- **Purpose**: Many-to-many relationship: events ↔ menus
- **Key Fields**: `event_id`, `menu_id` (composite primary key)
- **Foreign Keys**: `event_id` → `events(id)`, `menu_id` → `menus(id)`
- **Immutability**: Mutable (chef can attach/detach)
- **Chef Access**: Full CRUD for own events
- **Client Access**: SELECT for own events

---

## 9. RLS Model (Deny-by-Default)

### 9.1 Helper Functions (Authoritative)

**Function**: `get_current_user_role()`

```sql
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

- Returns: `'chef'` or `'client'`
- Used in: ALL RLS policies
- NEVER infer from client state

**Function**: `get_current_tenant_id()`

```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

- Returns: `chef.id` if user is chef, NULL otherwise
- Used in: Chef-scoped RLS policies

**Function**: `get_current_client_id()`

```sql
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

- Returns: `client.id` if user is client, NULL otherwise
- Used in: Client-scoped RLS policies

### 9.2 Policy Philosophy

**Default**: **DENY ALL**

- RLS enabled on ALL tables
- No policy = no access
- Explicit policies required for every operation

**Pattern**:

1. Enable RLS: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
2. Create policies for specific roles and operations
3. Default deny applies to any operation without policy

**Service Role Bypass**:

- Service role key bypasses RLS
- Used ONLY in backend (webhook handlers, migrations)
- NEVER exposed to client
- Required for system operations (inserting ledger entries from webhooks)

### 9.3 Example Policies

**Chef SELECT on Events**:

```sql
CREATE POLICY events_chef_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

- Chef can SELECT only events where `tenant_id` matches their own
- Cross-tenant reads impossible

**Client SELECT on Events**:

```sql
CREATE POLICY events_client_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

- Client can SELECT only events where they are the client
- Cannot see other clients' events even within same tenant

**Ledger INSERT (Multi-source)**:

```sql
CREATE POLICY ledger_insert ON ledger_entries
  FOR INSERT
  WITH CHECK (
    -- Chef adjustments
    (auth.uid() IS NOT NULL AND
     get_current_user_role() = 'chef' AND
     tenant_id = get_current_tenant_id()) OR
    -- Webhook (service role, auth.uid() = NULL)
    (auth.uid() IS NULL)
  );
```

- Allows both authenticated chef (adjustments) and service role (webhooks)
- Client CANNOT insert ledger entries

### 9.4 Storage Isolation Assumptions

**V1 Status**: File uploads EXCLUDED (per scope lock).

**FUTURE (Post-V1)**: If file uploads implemented:

- Bucket path pattern: `{tenant_id}/{event_id}/{file_id}.ext`
- RLS on storage buckets (tenant_id scoping)
- Signed URLs with expiration
- No public buckets

**Current**: No storage enforcement needed (no file uploads in V1).

---

## 10. Idempotency & Webhook Safety (Stripe V1)

### 10.1 Stripe Webhook Flow

**Endpoint**: `/api/webhooks/stripe`

**Flow**:

1. Stripe sends POST request with event payload
2. Handler verifies signature using `STRIPE_WEBHOOK_SECRET`
3. If signature invalid, return 400 (reject)
4. If signature valid, proceed

5. Extract `stripe_event_id` (e.g., `evt_xxx`)
6. Check if `ledger_entries.stripe_event_id` already exists
7. If exists, return 200 OK (already processed, no error)
8. If not exists, proceed

9. Parse event type and data
10. Create ledger entry (atomic INSERT)
11. If relevant, trigger event status transition
12. Return 200 OK to Stripe

**Signature Verification**:

```typescript
const signature = request.headers.get('stripe-signature')
const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
```

**Reject if**:

- Missing signature header
- Invalid signature
- Replay attack (old timestamp)

### 10.2 Idempotency Key Strategy

**Key**: `stripe_event_id` (unique per webhook event)

**Database Constraint**:

```sql
ALTER TABLE ledger_entries
ADD CONSTRAINT unique_stripe_event UNIQUE(stripe_event_id);
```

**Behavior**:

- First webhook: INSERT succeeds
- Duplicate webhook: INSERT fails with unique constraint violation
- Catch constraint error, return 200 OK (success, already processed)

**Why UNIQUE and not manual check?**

- Race condition prevention (two webhooks arrive simultaneously)
- Database enforces atomicity
- No need for distributed locks

### 10.3 Exactly-Once Ledger Appends

**Invariant**: One Stripe event → exactly one ledger entry.

**Implementation**:

```typescript
try {
  await supabase.from('ledger_entries').insert({
    tenant_id,
    entry_type: 'charge_succeeded',
    amount_cents,
    stripe_event_id: event.id, // Unique constraint
    stripe_object_id: paymentIntent.id,
    ...
  })
} catch (error) {
  if (error.code === '23505') { // Unique violation
    console.log('Event already processed:', event.id)
    return new Response('OK', { status: 200 })
  }
  throw error // Re-throw other errors
}
```

**Result**: Even if Stripe retries webhook 10 times, only one ledger entry created.

### 10.4 Retry Strategy

**Stripe Retry Behavior**:

- If webhook returns 500, Stripe retries with exponential backoff
- If webhook returns 200, Stripe stops

**Our Strategy**:

- Return 200 if event already processed (idempotent)
- Return 200 if event processed successfully
- Return 500 ONLY on unexpected errors (DB down, network failure)

**Failures We Handle**:

- Duplicate events → 200 (idempotency)
- Invalid event type → 200 (ignore, log warning)
- Event already exists → 200

**Failures We Propagate**:

- Database unreachable → 500 (Stripe will retry)
- Network timeout → 500 (Stripe will retry)

### 10.5 Client Experience During Pending States

**Timeline**:

1. Client completes Stripe payment (card charged immediately)
2. Stripe webhook fires (may take 1-30 seconds)
3. Webhook handler processes (< 1 second)
4. Event transitions to `paid` status
5. Client sees updated status

**Pending State** (between steps 1-4):

- Event status: `accepted` (not yet `paid`)
- Ledger: No entry yet
- Client UI: Shows "Payment processing..." or "Payment pending"

**Delay Handling**:

- Webhooks usually arrive within seconds
- Client UI polls event status (or uses Stripe redirect confirmation)
- Do NOT show "payment failed" during pending (webhook may be delayed)
- Only show failure if webhook fires with `payment_intent.payment_failed`

**Manual Override** (if webhook never arrives):

- Chef can check Stripe dashboard
- If payment succeeded in Stripe but webhook failed, manually create ledger entry
- Use service role to bypass RLS
- Requires manual intervention (not automated in V1)

---

## 11. Failure Containment (V1)

### 11.1 Safe Freeze Rule

**Principle**: When uncertain, block and show pending state.

**Examples**:

- Payment webhook delayed → show "Processing payment..."
- Ledger conflict detected → freeze event, show error to chef
- Invalid state transition attempted → reject, log error

**DO NOT**:

- Assume payment succeeded without ledger entry
- Allow state transitions when validation fails
- Auto-resolve conflicts by overwriting data

**DO**:

- Show pending state to user
- Log error with full context
- Require manual review if ambiguous

### 11.2 Retry Strategy (Webhooks)

**Stripe Webhooks**:

- Stripe retries on 500 response
- Our handler is idempotent (safe to retry)
- Return 200 if already processed

**Other External Calls** (none in V1):

- Email delivery: Stubbed (no retry in V1)
- File uploads: Not implemented

### 11.3 Logging Requirements

**What to Log**:

- All webhook events received (success and failure)
- All ledger entries created
- All event transitions
- All authentication failures
- All RLS policy denials (if detectable)

**Where to Log**:

- V1: `console.error()` and `console.log()`
- FUTURE: External service (Sentry, Datadog)

**Format**:

```typescript
console.log('[WEBHOOK]', event.type, event.id, { eventId, tenantId })
console.error('[LEDGER_ERROR]', error.message, { context })
```

**No Sensitive Data in Logs**:

- Do NOT log full card numbers (Stripe handles this)
- Do NOT log passwords or tokens
- Do log: event IDs, user IDs, amounts, statuses

### 11.4 Recovery Procedures

**Scenario**: Webhook succeeded in Stripe, failed to write ledger entry.

**Detection**:

- Chef reports payment not showing
- Chef checks Stripe dashboard, sees successful payment
- Event status still `accepted`, not `paid`

**Manual Recovery**:

1. Admin runs SQL to manually insert ledger entry (using service role)
2. Manually trigger event status transition
3. Verify event now shows `paid`

**V1 Limitation**: No automated reconciliation. Manual intervention required.

**FUTURE**: Automated reconciliation job (daily) to compare Stripe data with ledger.

---

## 12. Performance Principles (V1 Minimal)

### 12.1 Required Indexes

**Tenant Scoping** (critical for performance):

```sql
CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_menus_tenant ON menus(tenant_id);
```

**Event Queries**:

```sql
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_client ON events(client_id);
```

**Ledger Queries**:

```sql
CREATE INDEX idx_ledger_event ON ledger_entries(event_id);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_stripe_event ON ledger_entries(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;
```

**Why These Indexes**:

- Chef dashboard queries filter by `tenant_id`
- Event lists sort by `event_date`
- Payment checks query ledger by `event_id`
- Webhook idempotency checks `stripe_event_id`

### 12.2 Pagination Defaults

**All List Queries**:

- Default limit: 50 items
- Max limit: 100 items
- Offset-based pagination (simple, no cursor in V1)

**Implementation**:

```typescript
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('tenant_id', tenantId)
  .order('event_date', { ascending: false })
  .range(offset, offset + limit - 1)
```

**Why Pagination**:

- Prevents loading 1000s of events at once
- Improves initial page load time
- Reduces memory usage

### 12.3 No N+1 Queries Rule

**Problem**: Loading events, then querying ledger for each event individually.

**Solution**: Use JOINs or aggregate queries.

**Example (BAD)**:

```typescript
const events = await getEvents() // Query 1
for (const event of events) {
  const ledger = await getLedgerForEvent(event.id) // N queries
}
```

**Example (GOOD)**:

```typescript
const eventsWithFinancials = await supabase.from('events').select(`
    *,
    event_financial_summary!inner(*)
  `)
```

**OR use the view**:

```typescript
const summary = await supabase.from('event_financial_summary').select('*').in('event_id', eventIds)
```

### 12.4 Tenant Scoping in All Queries

**Principle**: ALWAYS filter by `tenant_id` in chef queries.

**Why**:

- Index on `tenant_id` makes query fast
- Prevents full table scans
- RLS enforces this anyway (defense in depth)

**Example**:

```typescript
// GOOD
.select('*')
.eq('tenant_id', currentUser.tenantId)

// BAD (relies on RLS, slower)
.select('*') // RLS filters, but no index hint
```

**Result**: Queries scan only tenant's data, not entire table.

---

## 13. Implementation Checklist

This checklist MUST pass before Phase 2 (production deployment) proceeds.

### 13.1 Database Enforcement

- [ ] All migrations applied to production database
- [ ] RLS enabled on ALL tables (verify with SQL query)
- [ ] Immutability triggers on `ledger_entries` verified (attempt UPDATE, must fail)
- [ ] Immutability triggers on `event_transitions` verified (attempt UPDATE, must fail)
- [ ] RLS harness passes:
  - [ ] Anonymous user (no auth) sees 0 rows on all tables
  - [ ] Service role sees all rows (bypass RLS)
  - [ ] Chef A cannot see Chef B's data (verified via direct query)
  - [ ] Client A1 cannot see Client A2's data (verified via direct query)

### 13.2 Authentication & Routing

- [ ] Middleware blocks unauthenticated users from protected routes
- [ ] Middleware redirects chef attempting client portal access
- [ ] Middleware redirects client attempting chef portal access
- [ ] No "flash of wrong portal" (verified via Network tab - 307 redirect before HTML)
- [ ] Layout guards throw error if role mismatch (verified via logging)
- [ ] Role resolution queries `user_roles` table (verified via query logs)

### 13.3 Financial System

- [ ] Webhook signature verification works (verified with Stripe CLI)
- [ ] Idempotency works (duplicate webhook returns 200, no second ledger entry)
- [ ] Amounts stored as INTEGER cents (no DECIMAL types in schema)
- [ ] `event_financial_summary` view returns correct balances
- [ ] Event status transitions to `paid` after successful webhook
- [ ] Ledger totals match Stripe dashboard (manual reconciliation)

### 13.4 Event Lifecycle

- [ ] Invalid state transitions blocked (e.g., `draft` → `confirmed`)
- [ ] Client cannot transition events to `confirmed` (RLS blocks)
- [ ] All transitions logged to `event_transitions` (verified via query)
- [ ] Terminal states prevent further transitions
- [ ] Cancellation requires `cancellation_reason` (enforced server-side)

### 13.5 Multi-Tenant Isolation

- [ ] Chef A creates event → Chef B cannot see it (verified via queries)
- [ ] Client A1 accepts event → Client A2 cannot see it (verified via queries)
- [ ] Cross-tenant foreign keys impossible (constraint verified)
- [ ] Service role key only used server-side (grep codebase for anon key usage)

### 13.6 End-to-End Flow

- [ ] Full happy path works:
  1. Chef signs up
  2. Chef invites client (invitation email sent)
  3. Client signs up via invitation link
  4. Chef creates event and proposes to client
  5. Client accepts proposal
  6. Client pays via Stripe (test card)
  7. Webhook fires, ledger updated, event transitions to `paid`
  8. Chef confirms event
  9. Chef marks event `in_progress`
  10. Chef marks event `completed`
- [ ] Payment flow works with test Stripe keys
- [ ] Invitation flow creates client with correct `tenant_id`

---

## APPENDIX A: Key File References

| Concern         | Files                                                   |
| --------------- | ------------------------------------------------------- |
| Scope Lock      | `CHEFFLOW_V1_SCOPE_LOCK.md`                             |
| Schema          | `supabase/migrations/20260213000001_initial_schema.sql` |
| RLS Policies    | `supabase/migrations/20260213000002_rls_policies.sql`   |
| Middleware      | `middleware.ts`                                         |
| Role Resolution | `lib/auth/get-user.ts`                                  |
| Database Types  | `types/database.ts`                                     |

---

## APPENDIX B: Invariants Summary

1. **Ledger is immutable** - No UPDATE/DELETE on `ledger_entries`
2. **Event transitions are immutable** - No UPDATE/DELETE on `event_transitions`
3. **Role is authoritative** - NEVER infer from client state
4. **Tenant isolation is absolute** - No cross-tenant reads under any condition
5. **Amounts are integer cents** - No DECIMAL or FLOAT for money
6. **Payment state is derived** - Computed from ledger, not stored on events
7. **Service role is backend-only** - Never exposed to client
8. **RLS is mandatory** - Enabled on all tables, deny-by-default

---

**END OF DOCUMENT**

This specification is AUTHORITATIVE. Implementation that contradicts this document is incorrect.

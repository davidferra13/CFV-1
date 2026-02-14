# Chef Portal Tenant Model (V1)

This document defines the multi-tenant architecture for the Chef Portal. It explains how tenants are identified, isolated, and managed throughout the system.

---

## 1) What is a Tenant?

**Definition:** In ChefFlow V1, a **tenant** is a single chef's business entity. Each chef operates as an independent tenant with complete data isolation from other chefs.

**Key Characteristics:**
- One tenant = one chef business
- Complete data isolation (no cross-tenant access)
- Independent Stripe account (if using Stripe Connect)
- Separate client base, events, menus, and financial records

---

## 2) Tenant Identifier

### 2.1 Canonical Identifier

**Primary Key:** `tenant_id` (UUID)

**Alternative naming:** Some tables may use `chef_id` as the tenant identifier, but the concept is the same.

**Storage:**
- In `chefs` table: `id` column is the tenant_id
- In all tenant-scoped tables: `tenant_id` foreign key references `chefs.id`

### 2.2 Tenant ID Source of Truth

**The tenant_id is ALWAYS derived from the authenticated user's role mapping, NEVER from:**
- ❌ Query parameters (`?tenant_id=abc`)
- ❌ Request body (`{ tenant_id: 'abc' }`)
- ❌ URL path parameters (`/tenants/:tenant_id/events`)
- ❌ Headers or cookies set by the client

**The ONLY source of truth:**
```typescript
// Server-side resolution
const user = await getAuthenticatedUser();
const tenantId = await getTenantIdForUser(user.id);
// tenantId is now authoritative for all subsequent queries
```

---

## 3) Tenant-Scoped Tables

### 3.1 Tables with Direct Tenant Scoping

These tables include a `tenant_id` column:

| Table | Tenant Column | Purpose |
|-------|---------------|---------|
| `client_profiles` | `tenant_id` | Clients belong to one chef |
| `events` | `tenant_id` | Events belong to one chef |
| `menu_templates` | `tenant_id` | Templates belong to one chef |
| `client_invites` | `tenant_id` | Invites created by one chef |
| `audit_logs` | `tenant_id` | Logs scoped to tenant |

### 3.2 Tables with Inherited Tenant Scoping

These tables inherit tenant scope through foreign keys:

| Table | Inherits From | Relationship |
|-------|---------------|--------------|
| `event_transitions` | `events.tenant_id` | Via `event_id` FK |
| `ledger_entries` | `events.tenant_id` | Via `event_id` FK |
| `event_menus` | `events.tenant_id` | Via `event_id` FK |
| `menu_sections` | `menu_templates.tenant_id` or `event_menus` | Via menu FK |
| `menu_items` | `menu_sections` | Via section FK |

### 3.3 Tables Without Tenant Scoping

These tables are global or non-tenant-specific:

| Table | Why Not Scoped |
|-------|----------------|
| `chefs` | This IS the tenant table |
| `user_roles` | Maps users to tenants (cross-tenant by design) |
| `auth.users` | Supabase auth table (managed by Supabase) |

---

## 4) Tenant Isolation Enforcement

### 4.1 Database Layer (RLS)

**Every tenant-scoped table MUST have RLS enabled.**

**Example RLS Policy:**

```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Chef access policy
CREATE POLICY chef_access ON events
FOR ALL
USING (
  tenant_id = (
    SELECT tenant_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('chef', 'chef_subaccount')
  )
);
```

**Key Points:**
- `auth.uid()` returns the authenticated user's ID from Supabase
- Tenant ID is looked up from `user_roles` table
- Only rows matching the user's tenant are visible/modifiable

### 4.2 Application Layer

**Even with RLS, application layer should explicitly scope queries:**

```typescript
// ✅ CORRECT: Explicit tenant scoping
async function getEvents(userId: string) {
  const tenantId = await getTenantIdForUser(userId);
  return await db.events.findMany({
    where: { tenant_id: tenantId }
  });
}
```

**Why double-enforce?**
- Defense in depth
- Clearer code intent
- Easier testing (can test app logic without full RLS setup)

### 4.3 Middleware Layer

**Middleware resolves tenant early in request cycle:**

```typescript
export async function middleware(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return redirectToLogin();

  const roleData = await getUserRole(user.id);
  if (!roleData) return denyAccess();

  // Store tenant_id in request context
  req.tenantId = roleData.tenant_id;
  req.role = roleData.role;

  return next();
}
```

---

## 5) Tenant Creation Flow

### 5.1 When is a Tenant Created?

**Trigger:** New chef signs up

**Steps:**

1. Chef creates account via Supabase Auth
   - Email/password provided
   - `auth.users` record created (user_id generated)

2. Chef onboarding form captures business details
   - Business name
   - Contact info
   - Timezone

3. System creates `chefs` record
   - `id` (UUID) = tenant_id
   - `business_name`, `email`, `timezone`, etc.

4. System creates `user_roles` mapping
   - `user_id` = auth user ID
   - `role` = 'chef'
   - `tenant_id` = chefs.id

5. Chef is redirected to Chef Portal dashboard

**Result:** User is now a tenant owner with role='chef'

### 5.2 Chef Record Schema

```typescript
type Chef = {
  id: string; // UUID, also used as tenant_id
  business_name: string;
  email: string;
  phone?: string;
  timezone: string; // e.g., 'America/Los_Angeles'
  stripe_account_id?: string; // if using Stripe Connect
  created_at: Date;
  updated_at: Date;
};
```

---

## 6) Multi-User Tenancy (Subaccounts)

### 6.1 Subaccount Model (If Implemented in V1)

**Concept:** A chef can invite additional users (e.g., sous chefs, assistants) to access their tenant with limited permissions.

**Implementation:**

1. Chef creates subaccount invite
2. Invited user signs up (creates `auth.users` record)
3. System creates `user_roles` entry:
   - `user_id` = new user's auth ID
   - `role` = 'chef_subaccount'
   - `tenant_id` = chef's tenant_id (same as primary chef)

**Key Constraint:**
- A subaccount user can belong to ONLY ONE tenant
- No cross-tenant access, ever

### 6.2 Subaccount Permissions

**V1 permissions (if implemented):**
- ✅ View events, clients, menus
- ✅ Create/edit events (within allowed statuses)
- ✅ Create/edit menus (drafts only)
- ❌ Cannot access Finance section
- ❌ Cannot manage Stripe connection
- ❌ Cannot delete events or clients
- ❌ Cannot invite additional subaccounts (chef only)

**Permissions are enforced server-side and via RLS.**

---

## 7) Tenant Context Propagation

### 7.1 How Tenant Context Flows Through the Stack

```
1. User authenticates
   ↓
2. Middleware resolves user_id → role + tenant_id
   ↓
3. Middleware stores tenant_id in request context
   ↓
4. Server components read tenant_id from context
   ↓
5. Queries include tenant_id filter (+ RLS enforces)
   ↓
6. Data returned is tenant-scoped
```

### 7.2 Example: Server Component

```typescript
// app/(chef)/events/page.tsx
export default async function EventsPage() {
  const user = await getUser(); // from session
  const tenantId = await getTenantIdForUser(user.id);

  const events = await db.events.findMany({
    where: { tenant_id: tenantId },
    orderBy: { start_ts: 'desc' },
  });

  return <EventsList events={events} />;
}
```

### 7.3 Example: Server Action

```typescript
'use server';

export async function createEvent(input: CreateEventInput) {
  const user = await getUser();
  const tenantId = await getTenantIdForUser(user.id);

  // Validate input
  const validated = createEventSchema.parse(input);

  // Create event with tenant_id
  const event = await db.events.create({
    data: {
      ...validated,
      tenant_id: tenantId, // Explicit tenant scoping
    },
  });

  return event;
}
```

---

## 8) Tenant Isolation Testing

### 8.1 Test Scenarios

| Test | Expected Behavior |
|------|-------------------|
| **User A queries events** | Only sees events where tenant_id = A |
| **User A queries with tenant_id = B in request** | Ignored; still only sees tenant A events |
| **User A tries to UPDATE event owned by B** | RLS blocks; zero rows affected |
| **User A tries to INSERT event with tenant_id = B** | RLS blocks; insert fails |
| **Service role queries events** | Sees all events (RLS bypassed) |

### 8.2 Verification SQL

**Test: User cannot access other tenant's data**

```sql
-- Simulate user A (tenant_id = 'tenant-a')
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-a-id';

-- This should return only tenant A's events
SELECT * FROM events;

-- This should return zero rows (even if tenant-b event exists)
SELECT * FROM events WHERE tenant_id = 'tenant-b';
```

**Expected:** Zero rows for tenant-b query

---

## 9) Tenant Deletion and Data Retention

### 9.1 Soft Delete vs Hard Delete

**V1 Policy:**
- **Chefs** are soft deleted (`deleted_at` timestamp)
- **Events, Clients, Menus** are soft deleted
- **Ledger entries and audit logs** are NEVER deleted

**Rationale:** Financial and audit data must be retained for compliance and accountability.

### 9.2 Soft Delete Implementation

```typescript
async function softDeleteChef(tenantId: string) {
  await db.chefs.update({
    where: { id: tenantId },
    data: { deleted_at: new Date() },
  });

  // RLS policies should check `deleted_at IS NULL`
  // Deleted tenants' data becomes inaccessible via normal queries
}
```

### 9.3 Data Retention After Deletion

**After soft delete:**
- ✅ Data remains in database (for auditing, compliance)
- ✅ Ledger entries remain immutable
- ❌ Tenant cannot log in or access Chef Portal
- ❌ Clients cannot access Client Portal for this tenant

**Hard delete (out of V1 scope):**
- Requires compliance review
- May require data export first
- Cascade deletes or data anonymization

---

## 10) Tenant Storage Isolation (Supabase Storage)

### 10.1 Storage Bucket Structure

**If Supabase Storage is used for file uploads (e.g., menu images, invoices):**

**Option 1: Tenant-scoped paths**
```
/uploads/{tenant_id}/menus/{menu_id}/image.jpg
/uploads/{tenant_id}/invoices/{event_id}/invoice.pdf
```

**Option 2: Tenant-specific buckets**
```
Bucket: tenant-{tenant_id}
```

### 10.2 Storage RLS Policies

**Example Storage Policy:**

```sql
-- Allow chefs to upload to their tenant folder
CREATE POLICY chef_upload ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM user_roles
    WHERE user_id = auth.uid() AND role = 'chef'
  )
);
```

**Key Point:** File paths include tenant_id, and RLS enforces access control.

---

## 11) Tenant-Scoped Stripe Accounts

### 11.1 Stripe Connect Model (If Used)

**Each tenant has their own Stripe Connect account:**

- `chefs.stripe_account_id` stores the connected account ID
- Payment intents are created on the tenant's connected account
- Webhooks include `account` parameter to identify tenant

### 11.2 Tenant-Stripe Mapping

```typescript
async function createPaymentIntent(eventId: string) {
  const event = await db.events.findUnique({
    where: { id: eventId },
    include: { chef: true },
  });

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: event.deposit_amount_cents,
      currency: 'usd',
      metadata: { event_id: eventId },
    },
    {
      stripeAccount: event.chef.stripe_account_id, // Tenant-specific
    }
  );

  return paymentIntent;
}
```

### 11.3 Webhook Routing

**Webhook includes account ID:**

```typescript
export async function POST(req: Request) {
  const event = stripe.webhooks.constructEvent(/* ... */);

  // Identify tenant from Stripe account
  const chef = await db.chefs.findUnique({
    where: { stripe_account_id: event.account },
  });

  // Process webhook in tenant context
  await processWebhookForTenant(event, chef.id);
}
```

---

## 12) Tenant Configuration and Settings

### 12.1 Tenant-Level Settings

**Stored in `chefs` table or separate `tenant_settings` table:**

| Setting | Type | Default | Purpose |
|---------|------|---------|---------|
| `timezone` | string | 'America/Los_Angeles' | Display times in chef's timezone |
| `currency` | string | 'USD' | Display currency (V1: USD only) |
| `business_name` | string | Required | Display in UI, invoices |
| `contact_email` | string | Required | Communication, notifications |
| `contact_phone` | string | Optional | Client contact |

### 12.2 Accessing Tenant Settings

```typescript
async function getTenantSettings(tenantId: string) {
  return await db.chefs.findUnique({
    where: { id: tenantId },
    select: {
      timezone: true,
      currency: true,
      business_name: true,
      contact_email: true,
    },
  });
}
```

---

## 13) Cross-Tenant Operations (Forbidden in V1)

### 13.1 What is NOT Allowed

❌ **No cross-tenant queries**
```typescript
// FORBIDDEN
const allEvents = await db.events.findMany(); // returns all tenants' events
```

❌ **No tenant aggregation**
```typescript
// FORBIDDEN
const platformStats = await db.events.groupBy({
  by: ['tenant_id'],
  _count: true,
});
```

❌ **No shared clients**
```typescript
// FORBIDDEN
const sharedClient = await db.client_profiles.findFirst({
  where: { email: 'shared@example.com' }, // could match multiple tenants
});
```

### 13.2 Why No Cross-Tenant Operations?

- **Security:** Prevents accidental data leaks
- **Performance:** Tenant-scoped queries are faster (indexed by tenant_id)
- **Compliance:** Simplifies data isolation audits

---

## 14) Tenant Model Summary

### 14.1 Key Tenets

1. **One tenant = one chef business**
2. **Tenant ID is derived from user session, never from input**
3. **RLS enforces isolation at database layer**
4. **Application layer explicitly scopes queries**
5. **Middleware resolves tenant early**
6. **No cross-tenant access, ever**

### 14.2 Enforcement Stack

| Layer | Mechanism |
|-------|-----------|
| **Database** | RLS policies, foreign keys |
| **Application** | Explicit tenant_id in queries |
| **Middleware** | Tenant resolution, context storage |
| **API** | Reject requests with tenant_id in input |

### 14.3 One-Sentence Summary

**The Chef Portal tenant model ensures complete data isolation by deriving tenant_id from authenticated user sessions, enforcing tenant scoping via RLS policies and explicit query filters, and forbidding all cross-tenant operations to guarantee that each chef's data remains private and secure.**

---

**End of Tenant Model**

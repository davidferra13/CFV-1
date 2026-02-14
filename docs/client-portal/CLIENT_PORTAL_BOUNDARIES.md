# Client Portal Boundaries

## Document Identity
- **File**: `CLIENT_PORTAL_BOUNDARIES.md`
- **Category**: Core Identity & Portal Definition (4/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **hard boundaries** of the Client Portal.

Boundaries specify:
- What the Client Portal **CAN** access
- What the Client Portal **CANNOT** access
- What the Client Portal **CAN** mutate
- What the Client Portal **CANNOT** mutate
- What the Client Portal **CAN** trigger
- What the Client Portal **CANNOT** trigger

These boundaries are **enforced at multiple layers**:
- Database (RLS policies)
- Server (middleware, server actions)
- Application (route protection)

---

## Data Access Boundaries

### ✅ Client Portal CAN Access

| Resource | Scope | Enforcement |
|----------|-------|-------------|
| **Client Profile** | Own profile only (`client_id = session.client_id`) | RLS on `clients` table |
| **Events** | Events where `client_id = session.client_id` | RLS on `events` table |
| **Ledger Entries** | Entries for owned events | RLS on `ledger_entries` table |
| **Menus** | Finalized menus for owned events | RLS + `event_menus` JOIN |
| **Messages** | Threads for owned events | RLS on `messages` table |
| **Loyalty Balance** | Own loyalty computed from ledger | View filtered by `client_id` |
| **Event Transitions** | Transitions for owned events | RLS on `event_transitions` table |
| **Attachments** | Attachments for owned events/messages | Signed URL + tenant path validation |

### ❌ Client Portal CANNOT Access

| Resource | Reason | Enforcement |
|----------|--------|-------------|
| **Other clients' profiles** | Cross-client isolation | RLS denies other `client_id` |
| **Other clients' events** | Cross-client isolation | RLS denies other `client_id` |
| **Chef internal notes** | Chef-private data | Column excluded from client projections |
| **Chef pricing formulas** | Chef-private logic | Column excluded from client projections |
| **Service role operations** | Privilege escalation | Middleware blocks service role key |
| **Other tenants' data** | Cross-tenant isolation | RLS filters by `tenant_id` |
| **Raw Stripe data** | Financial truth is ledger-only | No Stripe API access from client code |
| **Database admin functions** | Security | RLS + Postgres role permissions |
| **Loyalty manual adjustments** | Loyalty is derived-only | No manual loyalty mutation endpoint |

---

## Mutation Boundaries

### ✅ Client Portal CAN Mutate

| Resource | Mutation Type | Validation |
|----------|--------------|------------|
| **Client Profile** | Update own preferences, allergies, dietary restrictions | Server action validates `client_id` match |
| **Event Inquiry** | Submit new inquiry | Server action validates tenant + client |
| **Proposal Response** | Accept or decline proposal | Server action validates lifecycle state + ownership |
| **Messages** | Send message in owned event thread | Server action validates event ownership |
| **Attachments** | Upload attachment to owned thread | Server action validates event ownership + tenant path |

### ❌ Client Portal CANNOT Mutate

| Resource | Reason | Enforcement |
|----------|--------|-------------|
| **Lifecycle state** | Chef portal owns transitions | No direct `UPDATE events SET lifecycle_state` |
| **Ledger entries** | Append-only, triggered by webhooks | Immutability trigger blocks updates/deletes |
| **Event pricing** | Chef sets pricing | No client mutation of `deposit_amount`, `balance_amount` |
| **Menu content** | Chef drafts menus | No client mutation of menu items |
| **Loyalty balance** | Derived from ledger | No direct loyalty mutation |
| **Other clients' data** | Cross-client isolation | RLS blocks mutation |
| **Event creation** | Chef initiates events | Client submits inquiry, chef creates event |
| **Refunds** | Stripe webhook triggers | No client-initiated refund mutation |

---

## Lifecycle Transition Boundaries

### ✅ Client Portal CAN Trigger

| Transition | Trigger Mechanism | Validation |
|-----------|------------------|------------|
| **Inquiry → Proposal** | Indirect (chef creates proposal after inquiry) | N/A (chef action) |
| **Proposal → Accepted** | Client accepts proposal via server action | Validates state = `proposal`, ownership |
| **Proposal → Declined** | Client declines proposal via server action | Validates state = `proposal`, ownership |
| **Deposit Paid (via webhook)** | Stripe webhook → ledger → state update | Idempotency key, ledger-derived |
| **Event Execution → Follow-Up** | Indirect (chef marks executed) | N/A (chef action) |

### ❌ Client Portal CANNOT Trigger

| Transition | Reason | Alternative |
|-----------|--------|-------------|
| **Inquiry → Confirmed** | Requires deposit + chef approval | Payment triggers state change |
| **Confirmed → Cancelled** | Chef-only action | Client requests via message |
| **Menu Draft → Finalized** | Chef-only action | Client views finalized only |
| **Event Execution** | Chef marks event as executed | Client views post-execution state |
| **Loyalty Award** | Automated after execution + ledger settlement | Derived, not triggered |

---

## Financial Boundaries

### ✅ Client Portal CAN

| Action | Mechanism | Validation |
|--------|----------|------------|
| **View balance due** | Query ledger-derived view | Filtered by owned events |
| **Pay deposit** | Redirect to Stripe Checkout | Validates event ownership + state |
| **Pay balance** | Redirect to Stripe Checkout | Validates event ownership + state |
| **View payment history** | Query `ledger_entries` | Filtered by owned events |
| **View refunds** | Query `ledger_entries` with type = `refund` | Filtered by owned events |

### ❌ Client Portal CANNOT

| Action | Reason | Enforcement |
|--------|--------|-------------|
| **Manually adjust balance** | Ledger is append-only | No mutation endpoint |
| **Issue refunds** | Stripe webhook handles refunds | No client-initiated refund |
| **Alter ledger entries** | Immutable | Trigger blocks updates/deletes |
| **Override pricing** | Chef sets pricing | No client mutation of amounts |
| **View raw Stripe data** | Ledger is canonical | No Stripe API access |

---

## Menu Boundaries

### ✅ Client Portal CAN

| Action | Scope | Validation |
|--------|-------|------------|
| **View finalized menus** | For owned events only | RLS + `event_menus.is_finalized = true` |
| **Download menu PDF** | Signed URL, owned events | Signed URL expiration + path validation |
| **View allergen info** | For finalized menus | Included in menu projection |

### ❌ Client Portal CANNOT

| Action | Reason | Enforcement |
|--------|--------|-------------|
| **View draft menus** | Chef-only visibility | RLS + `is_finalized = false` excluded |
| **Edit menu items** | Chef-only mutation | No client menu mutation endpoint |
| **View chef notes** | Chef-private data | Column excluded from projection |
| **Access menus for other clients' events** | Cross-client isolation | RLS filters by event ownership |

---

## Messaging Boundaries

### ✅ Client Portal CAN

| Action | Scope | Validation |
|--------|-------|------------|
| **View threads for owned events** | Own events only | RLS filters by event ownership |
| **Send messages** | In owned event threads | Server action validates ownership |
| **Upload attachments** | To owned event threads | Server action validates ownership + tenant path |
| **Download attachments** | From owned event threads | Signed URL with expiration |

### ❌ Client Portal CANNOT

| Action | Reason | Enforcement |
|--------|--------|-------------|
| **View threads for other clients' events** | Cross-client isolation | RLS denies other `client_id` |
| **Delete chef messages** | Message integrity | No delete endpoint for chef messages |
| **Edit sent messages** | Message integrity | No edit endpoint (soft delete only) |
| **Access attachments from other threads** | Cross-thread isolation | Signed URL + path validation |

---

## Loyalty Boundaries

### ✅ Client Portal CAN

| Action | Scope | Validation |
|--------|-------|------------|
| **View loyalty balance** | Own balance only | Computed view filtered by `client_id` |
| **View loyalty per event** | For owned events | Computed from owned events' ledger entries |
| **View loyalty tier** | Own tier only | Derived from total balance |

### ❌ Client Portal CANNOT

| Action | Reason | Enforcement |
|--------|--------|-------------|
| **Manually adjust loyalty** | Loyalty is derived-only | No mutation endpoint |
| **Redeem loyalty (V1)** | Out of scope for V1 | No redemption endpoint in V1 |
| **Transfer loyalty** | Not supported in V1 | No transfer endpoint |
| **View other clients' loyalty** | Cross-client isolation | RLS filters by `client_id` |

---

## Security Boundaries

### ✅ Client Portal CAN

| Action | Scope | Validation |
|--------|-------|------------|
| **Login via Supabase Auth** | Own account | Email/password or magic link |
| **View own session info** | Own session only | Middleware resolves session |
| **Update own profile** | Own profile only | Server action validates `client_id` |

### ❌ Client Portal CANNOT

| Action | Reason | Enforcement |
|--------|--------|-------------|
| **Access service role key** | Privilege escalation | Environment variable server-only |
| **Bypass RLS** | Security violation | RLS enforced at database level |
| **Impersonate other clients** | Security violation | Session tied to `auth_user_id` |
| **Access other tenants** | Cross-tenant isolation | RLS filters by `tenant_id` |
| **Override role** | Role is database-derived | Middleware resolves role from `user_roles` |

---

## Tenant Isolation Boundaries

### ✅ Within Same Tenant

| Access | Allowed | Enforcement |
|--------|---------|-------------|
| **Own events** | ✅ Yes | RLS filters by `client_id` within tenant |
| **Own ledger entries** | ✅ Yes | RLS filters by owned events |
| **Own messages** | ✅ Yes | RLS filters by owned events |

### ❌ Across Tenants

| Access | Blocked | Enforcement |
|--------|---------|-------------|
| **Other tenants' events** | ❌ Always | RLS filters by `tenant_id` |
| **Other tenants' clients** | ❌ Always | RLS filters by `tenant_id` |
| **Other tenants' ledger** | ❌ Always | RLS filters by `tenant_id` |

---

## Route Protection Boundaries

### ✅ Accessible Routes

| Route | Requires | Validation |
|-------|----------|------------|
| `/my-events` | Authenticated client | Middleware + layout |
| `/my-events/[eventId]` | Authenticated client + owned event | Server component validates ownership |
| `/dashboard` | Authenticated client | Middleware + layout |
| `/profile` | Authenticated client | Middleware + layout |
| `/inquiry` | Authenticated client | Middleware + layout |

### ❌ Inaccessible Routes

| Route | Reason | Enforcement |
|-------|--------|-------------|
| `/chef/*` | Chef-only routes | Middleware redirects clients |
| `/admin/*` | Admin-only routes | Middleware redirects clients |
| `/api/service-role/*` | Service role operations | Middleware blocks non-service requests |

---

## Integration Boundaries

### ✅ Client Portal CAN Integrate

| Service | Purpose | Access Method |
|---------|---------|---------------|
| **Stripe Checkout** | Payment processing | Redirect to Stripe-hosted page |
| **Supabase Auth** | Authentication | Supabase client SDK |
| **Supabase Storage** | Attachment storage | Signed URL generation |
| **Email provider** | Notifications | Server-side email sending |

### ❌ Client Portal CANNOT Integrate

| Service | Reason | Alternative |
|---------|--------|-------------|
| **Direct Stripe API** | Financial truth is ledger | Webhooks update ledger |
| **Database direct connection** | RLS bypass risk | All access via Supabase client |
| **Other tenants' Stripe accounts** | Cross-tenant isolation | Tenant-scoped Stripe keys |

---

## Summary Table

| Boundary Type | Enforcement Layer | Primary Mechanism |
|--------------|------------------|-------------------|
| **Data Access** | Database | RLS policies |
| **Mutation** | Server + Database | Server actions + RLS + triggers |
| **Lifecycle Transitions** | Server | Server actions + state validation |
| **Financial** | Database + Server | Ledger immutability + RLS |
| **Menu** | Database | RLS + projection whitelisting |
| **Messaging** | Database + Storage | RLS + signed URLs |
| **Loyalty** | Database | Computed view + RLS |
| **Security** | Middleware + Database | Session validation + RLS |
| **Tenant Isolation** | Database | RLS `tenant_id` filtering |
| **Route Protection** | Middleware | Role validation + redirects |
| **Integration** | Server | API keys server-only |

---

## Related Documents

- [CLIENT_PORTAL_OVERVIEW.md](./CLIENT_PORTAL_OVERVIEW.md)
- [CLIENT_PORTAL_CONSTITUTION.md](./CLIENT_PORTAL_CONSTITUTION.md)
- [CLIENT_PORTAL_SCOPE_LOCK.md](./CLIENT_PORTAL_SCOPE_LOCK.md)
- [CLIENT_SECURITY_OVERVIEW.md](./CLIENT_SECURITY_OVERVIEW.md)
- [CLIENT_RLS_STRATEGY.md](./CLIENT_RLS_STRATEGY.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13

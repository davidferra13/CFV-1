# Client Portal Overview

## Document Identity
- **File**: `CLIENT_PORTAL_OVERVIEW.md`
- **Category**: Core Identity & Portal Definition (1/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## What the Client Portal Is

The **Client Portal** is a tenant-scoped, lifecycle-aware, financially truthful interface that allows a single authenticated client to interact with their personal booking relationship with a chef.

### Core Purpose

The Client Portal enables clients to:

1. **View and manage their own bookings** within a single tenant
2. **Submit event inquiries** for new catering requests
3. **Review proposals** submitted by the chef
4. **Pay deposits and balances** via Stripe integration
5. **View menu versions** tied to confirmed events
6. **Track loyalty points** derived strictly from settled ledger entries
7. **Communicate** within event-scoped message threads
8. **Manage personal preferences** (allergies, dietary restrictions, favorite dishes)
9. **Access historical financial truth** via ledger-derived views

---

## Definitive System Characteristics

The Client Portal is:

| Characteristic | Definition |
|---------------|------------|
| **Deterministic** | All state transitions are finite, server-enforced, and predictable |
| **Tenant-isolated** | No cross-tenant data visibility or leakage |
| **Ledger-derived** | All financial truth comes from append-only ledger entries |
| **Idempotent** | All external writes (webhooks, payments) use idempotency keys |
| **RLS-enforced** | Row-level security enforces isolation at database level |
| **Fail-closed** | System freezes safely rather than proceeding unsafely |

---

## What the Client Portal Is NOT

The Client Portal is **not**:

- ❌ A marketing surface
- ❌ A marketplace for discovering chefs
- ❌ An exploratory browsing interface
- ❌ A multi-chef comparison tool
- ❌ A public-facing landing page
- ❌ A trust-optional system
- ❌ A frontend-enforced authorization system

**It is a controlled transactional relationship interface.**

---

## Relationship to Other Systems

### Chef Portal
- **Chef Portal owns**: lifecycle transitions, menu drafting, pricing decisions, event creation authority
- **Client Portal consumes**: chef-defined state, proposals, menus, pricing
- **Client Portal cannot**: directly mutate lifecycle states, override chef decisions, access internal chef notes

### Supabase
- **Provides**: Auth (JWT), Postgres database, RLS enforcement, Storage (tenant-scoped), Migrations, Triggers (immutability)
- **Enforces**: All isolation at database level
- **No frontend trust**: Authorization resolved server-side only

### Stripe
- **Processes**: Payments and refunds
- **Emits**: Webhooks for payment events
- **Does NOT define**: Financial truth
- **Flow**: Stripe → Webhook → Idempotent ledger append → Financial state derived from ledger

---

## Boundaries & Constraints

The Client Portal:

### Can Access
✅ Data owned by `client_profile_id`
✅ Data within a single `tenant_id`
✅ Event details for events where client is participant
✅ Menu versions finalized for client's events
✅ Financial summaries derived from ledger
✅ Loyalty balance computed from settled charges

### Cannot Access
❌ Chef-only internal notes
❌ Pricing calculation formulas
❌ Cross-client data
❌ Other tenants' data
❌ Service role operations
❌ Ledger entry mutation
❌ Lifecycle state override

---

## Data Visibility Enforcement Layers

All client data visibility is enforced at:

1. **Middleware** → Validates session, resolves role
2. **Layout (server component)** → Confirms client identity before render
3. **RLS (Row-Level Security)** → Database-level isolation per row
4. **Deny-by-default** → Tables without explicit GRANT are inaccessible

**No frontend logic determines access.**

---

## Lifecycle Integration

The Client Portal participates in the lifecycle:

```
Inquiry → Proposal → Deposit Paid → Confirmed → Menu Finalized →
Event Executed → Loyalty Awarded → Follow-Up → Repeat Inquiry
```

### Client Portal Actions per State

| State | Client Actions Available |
|-------|-------------------------|
| **Inquiry** | Submit inquiry form |
| **Proposal** | Review proposal, accept/decline |
| **Deposit Paid** | View confirmation, track payment |
| **Confirmed** | View event details, communicate with chef |
| **Menu Finalized** | View finalized menu PDF |
| **Event Executed** | View summary, pay balance if due |
| **Loyalty Awarded** | View loyalty points earned |
| **Follow-Up** | Submit feedback, rebook |

---

## Financial Truth Model

### Canonical Source
`ledger_entries` table is the **only source of financial truth**.

### Immutability
- Append-only (no updates, no deletes)
- Idempotency key required for webhook-triggered entries
- Unique constraints prevent duplicate Stripe event processing

### Derived State
- Balance due = SUM(ledger entries for event)
- Loyalty points = SUM(charge_succeeded entries after event execution)
- Payment history = ledger entries filtered by client + event

**Never trust Stripe API directly for financial state.**

---

## Messaging & Communication

### Thread Model
- Threads scoped to `event_id` + `tenant_id`
- Client can only access threads for events they own
- Messages are idempotent (retry-safe)

### Attachments
- Stored in tenant-scoped paths (`{tenant_id}/messages/{message_id}/...`)
- Signed URLs with time-limited expiration
- No cross-thread attachment access

---

## Loyalty Determinism

Loyalty points are:
- **Derived-only** (never manually set)
- **Calculated from** `charge_succeeded` ledger entries
- **Awarded after** event execution state transition
- **Idempotent** (replay-safe)
- **Rollback-safe** (refunds adjust correctly)

### Formula
```
loyalty_points = floor(settled_amount_cents / 100) * points_per_dollar
```

Where `settled_amount_cents` comes from ledger entries with type `charge_succeeded`.

---

## Failure Containment

The system always prefers:
- **Safe freeze** over unsafe continuation
- **Idempotent writes** for external events
- **Append-only financial changes**
- **Deterministic state resolution**
- **Explicit recovery path**

### Examples
- Webhook delayed → event remains pending
- Webhook duplicated → idempotency key blocks double ledger write
- Deposit succeeds but UI fails → ledger still correct, state can be reconciled
- Network drop during inquiry → idempotency key prevents duplicate submission

**No silent corruption allowed.**

---

## Performance & Isolation

### Indexing Strategy
- All queries indexed by `tenant_id`
- Client queries indexed by `client_id`
- Ledger queries indexed by `event_id` + `client_id`
- Pagination enforced on all list views

### Tenant Isolation
- One tenant cannot degrade another
- RLS impact mitigated via indexed filters
- Dashboard cache scoped per tenant

---

## Security Model

### Default Deny
- All tables default to no access
- Explicit RLS policies grant access
- No `SELECT *` in client projections

### Role Resolution
- Role resolved at middleware before render
- `user_roles` table binds `auth_user_id` → `role` → `entity_id`
- Client portal validates `role = 'client'`

### No Frontend Authorization
- Frontend only displays based on server state
- All mutations validated server-side
- All queries RLS-enforced at database

---

## Constitution Alignment

The Client Portal adheres to all **ChefFlow V1 System Laws**:

1. ✅ Deny-by-default at database level
2. ✅ All financial truth is ledger-derived
3. ✅ Ledger is append-only
4. ✅ Lifecycle transitions are finite and server-enforced
5. ✅ Loyalty derived only from settled ledger entries
6. ✅ No cross-tenant data leakage
7. ✅ No cross-client data leakage
8. ✅ No `SELECT *` in client projections
9. ✅ Role resolved before render
10. ✅ No frontend-only authorization
11. ✅ Idempotency required for all external writes
12. ✅ Webhooks must be replay-safe
13. ✅ Signed URLs must expire
14. ✅ All environment secrets server-only
15. ✅ No mutation of immutable tables
16. ✅ No hidden lifecycle states
17. ✅ No silent state transitions
18. ✅ Client-visible state must match ledger truth
19. ✅ Deletions must preserve audit trail
20. ✅ Failure defaults to freeze, not commit

---

## Implementation Readiness

This document is part of a **closed, deterministic, implementation-ready** specification.

- **No unresolved structural gaps** within V1 scope
- **No hidden dependencies**
- **No ambiguous state transitions**
- **No inferred authorization**
- **No frontend-only logic**

---

## Related Documents

- [CLIENT_PORTAL_CONSTITUTION.md](./CLIENT_PORTAL_CONSTITUTION.md)
- [CLIENT_PORTAL_SCOPE_LOCK.md](./CLIENT_PORTAL_SCOPE_LOCK.md)
- [CLIENT_PORTAL_BOUNDARIES.md](./CLIENT_PORTAL_BOUNDARIES.md)
- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_FINANCIAL_OVERVIEW.md](./CLIENT_FINANCIAL_OVERVIEW.md)
- [CLIENT_SECURITY_OVERVIEW.md](./CLIENT_SECURITY_OVERVIEW.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13

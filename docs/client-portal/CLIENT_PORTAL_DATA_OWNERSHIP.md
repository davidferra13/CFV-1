# Client Portal Data Ownership

## Document Identity
- **File**: `CLIENT_PORTAL_DATA_OWNERSHIP.md`
- **Category**: Core Identity & Portal Definition (8/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **data ownership model** for the Client Portal.

It specifies:
- What data the client owns
- What data the client can view but not own
- What data the chef owns
- What data is shared
- How ownership affects access and mutation rights

---

## Ownership Hierarchy

```
Tenant (Chef)
├── Owns: Chef profile, pricing formulas, internal notes
├── Owns: Menu drafts, event creation, lifecycle transitions
└── Shares with Client:
    ├── Client Profile (client-owned, tenant-scoped)
    ├── Events (chef-created, client-participated)
    ├── Menus (chef-created, client-viewable when finalized)
    ├── Ledger Entries (system-created, both viewable)
    ├── Messages (both created, both viewable)
    └── Loyalty Balance (system-derived, client-viewable)
```

---

## Client-Owned Data

### Definition
Data that the client **creates and controls**.

| Data Type | Table | Ownership | Mutation Rights |
|-----------|-------|-----------|----------------|
| **Client Profile** | `clients` | Client | Client can update own profile |
| **Dietary Preferences** | `clients.dietary_restrictions` | Client | Client can update |
| **Allergy Information** | `clients.allergies` | Client | Client can update |
| **Favorite Dishes** | `clients.favorite_dishes` | Client | Client can update |
| **Special Dates** | `clients.special_dates` | Client | Client can update |
| **Client Messages** | `messages` (where `sender_role = 'client'`) | Client | Client can create, soft-delete own |

### Access Rules
- Client can **read** own profile
- Client can **update** own profile fields (name, contact info, preferences)
- Client **cannot** update `client_id`, `tenant_id`, `created_at`
- Client **cannot** view other clients' profiles

### Visibility
- ✅ Visible to client
- ✅ Visible to chef (within same tenant)
- ❌ Not visible to other clients
- ❌ Not visible to other tenants

---

## Chef-Owned Data

### Definition
Data that the chef **creates and controls**.

| Data Type | Table | Ownership | Client Visibility |
|-----------|-------|-----------|------------------|
| **Chef Profile** | `chefs` | Chef | Client can view business name, contact (not internal settings) |
| **Menu Drafts** | `menus` (where `is_finalized = false`) | Chef | ❌ Not visible to client |
| **Finalized Menus** | `menus` (where `is_finalized = true`) | Chef | ✅ Visible to client (read-only) |
| **Pricing Formulas** | `menus.chef_pricing_formula` | Chef | ❌ Not visible to client |
| **Internal Notes** | `events.internal_notes` | Chef | ❌ Not visible to client |
| **Event Creation** | `events` | Chef | Client can view events they participate in |
| **Lifecycle Transitions** | Chef initiates | Chef | Client can view state changes |

### Access Rules
- Client **cannot** mutate chef-owned data
- Client can **view** finalized menus only
- Client can **view** event details (excluding internal notes)
- Client **cannot** view other chefs' data (cross-tenant)

---

## System-Owned Data

### Definition
Data created by **automated system processes** (not directly by user action).

| Data Type | Table | Created By | Ownership | Mutation Rights |
|-----------|-------|------------|-----------|----------------|
| **Ledger Entries** | `ledger_entries` | Stripe webhook | System | Append-only (no updates/deletes) |
| **Event Transitions** | `event_transitions` | Lifecycle engine | System | Append-only (no updates/deletes) |
| **Loyalty Balance** | Computed view | Ledger derivation | System | Derived-only (no direct mutation) |
| **Financial Summaries** | `event_financial_summary` view | Ledger derivation | System | Derived-only (no direct mutation) |

### Access Rules
- Client can **view** ledger entries for owned events
- Client can **view** event transitions for owned events
- Client can **view** loyalty balance
- Client **cannot** mutate any system-owned data

---

## Shared Data

### Definition
Data created by **either client or chef**, visible to both.

| Data Type | Table | Created By | Visibility | Mutation Rights |
|-----------|-------|------------|-----------|----------------|
| **Messages** | `messages` | Client or Chef | Both (within event thread) | Creator can soft-delete own |
| **Attachments** | `attachments` | Client or Chef | Both (within event thread) | Creator can delete own |

### Access Rules
- Client can **create** messages in owned event threads
- Client can **view** all messages in owned event threads (both client and chef messages)
- Client can **soft-delete** own messages
- Client **cannot** delete or edit chef messages

---

## Event Ownership Model

### Who Owns an Event?

Events are **co-owned**:
- **Chef** creates and controls lifecycle
- **Client** participates and triggers certain transitions

| Aspect | Owner | Client Rights |
|--------|-------|--------------|
| **Event Creation** | Chef | Client submits inquiry, chef creates event |
| **Lifecycle State** | Chef | Client can trigger: accept/decline proposal |
| **Pricing** | Chef | Client can view, cannot edit |
| **Menu** | Chef | Client can view finalized menu, cannot edit |
| **Execution** | Chef | Client cannot mark as executed |
| **Cancellation** | Chef | Client can request via message, cannot cancel directly |

### Client's Event Rights

| Right | Allowed | Enforcement |
|-------|---------|-------------|
| **View event details** | ✅ Yes (excluding internal notes) | RLS filters by `client_id` |
| **Update event details** | ❌ No | No client mutation endpoint |
| **Accept proposal** | ✅ Yes | Server action validates state |
| **Decline proposal** | ✅ Yes | Server action validates state |
| **Pay deposit** | ✅ Yes | Stripe Checkout redirect |
| **Cancel event** | ❌ No (can request via message) | No client cancellation endpoint in V1 |

---

## Ledger Ownership Model

### Who Owns Ledger Entries?

Ledger entries are **system-owned**.

| Trigger | Creator | Visibility |
|---------|---------|-----------|
| **Stripe webhook (charge)** | System (webhook handler) | Client can view entries for owned events |
| **Stripe webhook (refund)** | System (webhook handler) | Client can view refund entries |
| **Manual adjustment (chef)** | System (via chef portal) | Client can view adjustment entries |

### Client's Ledger Rights

| Right | Allowed | Enforcement |
|-------|---------|-------------|
| **View ledger entries** | ✅ Yes (for owned events) | RLS filters by event ownership |
| **Create ledger entries** | ❌ No (webhooks only) | No client mutation endpoint |
| **Update ledger entries** | ❌ No (append-only) | Immutability trigger |
| **Delete ledger entries** | ❌ No (append-only) | Immutability trigger |

---

## Menu Ownership Model

### Who Owns Menus?

Menus are **chef-owned**.

| Aspect | Owner | Client Rights |
|--------|-------|--------------|
| **Menu Drafting** | Chef | Client cannot view drafts |
| **Menu Finalization** | Chef | Client can view finalized menus |
| **Menu Items** | Chef | Client cannot edit items |
| **Allergen Info** | Chef | Client can view |
| **Pricing** | Chef | Client can view public pricing, not formulas |

### Client's Menu Rights

| Right | Allowed | Enforcement |
|-------|---------|-------------|
| **View draft menus** | ❌ No | RLS excludes `is_finalized = false` |
| **View finalized menus** | ✅ Yes (for owned events) | RLS + `event_menus` JOIN |
| **Download menu PDF** | ✅ Yes (signed URL) | Signed URL with expiration |
| **Edit menu items** | ❌ No | No client mutation endpoint |
| **Request customization** | ✅ Yes (via messages) | Messaging system |

---

## Loyalty Ownership Model

### Who Owns Loyalty Points?

Loyalty points are **client-owned but system-derived**.

| Aspect | Owner | Mutation Rights |
|--------|-------|----------------|
| **Balance Calculation** | System (derived from ledger) | No manual mutation |
| **Point Accrual** | System (after event execution) | Automatic, deterministic |
| **Balance Viewing** | Client | Client can view own balance |
| **Redemption (V2)** | Client | Out of scope for V1 |

### Client's Loyalty Rights

| Right | Allowed | Enforcement |
|-------|---------|-------------|
| **View loyalty balance** | ✅ Yes (own balance only) | View filtered by `client_id` |
| **View loyalty per event** | ✅ Yes (for owned events) | Computed from owned events |
| **Manually adjust balance** | ❌ No | No mutation endpoint |
| **Redeem loyalty (V1)** | ❌ No (V2 feature) | No redemption endpoint |

---

## Attachment Ownership Model

### Who Owns Attachments?

Attachments are **creator-owned**.

| Creator | Owner | Other Party's Rights |
|---------|-------|---------------------|
| **Client uploads** | Client | Chef can view (within event thread) |
| **Chef uploads** | Chef | Client can view (within event thread) |

### Client's Attachment Rights

| Right | Allowed | Enforcement |
|-------|---------|-------------|
| **Upload attachment** | ✅ Yes (to owned event threads) | Server action validates ownership |
| **View own attachments** | ✅ Yes | Signed URL with expiration |
| **View chef attachments** | ✅ Yes (within event thread) | Signed URL with expiration |
| **Delete own attachments** | ✅ Yes | Server action validates creator |
| **Delete chef attachments** | ❌ No | Server action blocks non-creator deletion |

---

## Preference Ownership Model

### Who Owns Preferences?

Preferences are **client-owned**.

| Preference Type | Owner | Chef Visibility |
|----------------|-------|----------------|
| **Dietary Restrictions** | Client | ✅ Chef can view (to inform menu planning) |
| **Allergies** | Client | ✅ Chef can view (critical for safety) |
| **Favorite Dishes** | Client | ✅ Chef can view (to personalize menus) |
| **Special Dates** | Client | ✅ Chef can view (to personalize service) |

### Client's Preference Rights

| Right | Allowed | Enforcement |
|-------|---------|-------------|
| **Create preferences** | ✅ Yes | Server action validates `client_id` |
| **Update preferences** | ✅ Yes | Server action validates ownership |
| **Delete preferences** | ✅ Yes | Server action validates ownership |
| **View own preferences** | ✅ Yes | RLS filters by `client_id` |

---

## Ownership and RLS Alignment

### RLS Enforces Ownership

| Data Type | Ownership | RLS Policy |
|-----------|-----------|-----------|
| **Client Profile** | Client | Filters by `client_id = session.client_id` |
| **Events** | Chef creates, client participates | Filters by `client_id = session.client_id` AND `tenant_id` |
| **Ledger Entries** | System | Filters by event ownership (indirect via `event_id`) |
| **Messages** | Creator | Filters by event ownership |
| **Menus** | Chef | Filters by event ownership + `is_finalized = true` |

---

## Data Deletion and Ownership

### Soft Delete Rules

| Data Type | Deletion Method | Audit Preservation |
|-----------|----------------|-------------------|
| **Events** | Soft delete (`is_deleted = true`) | ✅ Preserved (queryable for audit) |
| **Messages** | Soft delete (`deleted_at` timestamp) | ✅ Preserved (queryable for audit) |
| **Ledger Entries** | No deletion allowed | ✅ Always preserved |
| **Client Profile** | Soft delete (`is_deleted = true`) | ✅ Preserved (queryable for compliance) |

### Client Deletion Rights

| Data Type | Client Can Delete? | Method |
|-----------|------------------|--------|
| **Own profile** | ❌ No (soft delete via support) | Chef or admin initiates |
| **Own messages** | ✅ Yes (soft delete) | Server action sets `deleted_at` |
| **Own attachments** | ✅ Yes | Server action deletes from storage |
| **Events** | ❌ No | Chef archives event |
| **Ledger entries** | ❌ Never | Immutable |

---

## Ownership Transfer

### Can Ownership Transfer?

In V1:
- ❌ Event ownership **cannot** transfer to another client
- ❌ Client profile **cannot** transfer to another tenant
- ❌ Ledger entries **cannot** transfer between events

**Ownership is permanent within V1 scope.**

---

## Cross-Tenant Ownership

### Client Profile in Multiple Tenants

If `client@example.com` books with Chef A and Chef B:
- **Two separate client profiles** (one per tenant)
- Each profile is **independently owned**
- No cross-tenant ownership or linking in V1

---

## Summary: Ownership Matrix

| Data Type | Owner | Client View | Client Mutate | Chef View | Chef Mutate |
|-----------|-------|------------|--------------|-----------|-------------|
| **Client Profile** | Client | ✅ Own only | ✅ Own only | ✅ Within tenant | ❌ No |
| **Events** | Chef creates | ✅ Participated | ❌ No (except proposal response) | ✅ All | ✅ All |
| **Ledger Entries** | System | ✅ Owned events | ❌ Never | ✅ All events | ❌ Never (append via webhook) |
| **Menus (finalized)** | Chef | ✅ Owned events | ❌ No | ✅ All | ✅ All |
| **Menus (draft)** | Chef | ❌ No | ❌ No | ✅ All | ✅ All |
| **Messages** | Creator | ✅ Owned events | ✅ Own messages (soft delete) | ✅ All | ✅ Own messages (soft delete) |
| **Loyalty Balance** | System-derived | ✅ Own only | ❌ Never | ✅ Client's balance | ❌ Never |

---

## Related Documents

- [CLIENT_PORTAL_OVERVIEW.md](./CLIENT_PORTAL_OVERVIEW.md)
- [CLIENT_PORTAL_BOUNDARIES.md](./CLIENT_PORTAL_BOUNDARIES.md)
- [CLIENT_PORTAL_TENANT_MODEL.md](./CLIENT_PORTAL_TENANT_MODEL.md)
- [CLIENT_RLS_STRATEGY.md](./CLIENT_RLS_STRATEGY.md)
- [CLIENT_TABLE_CLIENTS.md](./CLIENT_TABLE_CLIENTS.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13

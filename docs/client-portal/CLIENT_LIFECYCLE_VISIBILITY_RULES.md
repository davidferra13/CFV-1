# Client Lifecycle Visibility Rules

## Document Identity
- **File**: `CLIENT_LIFECYCLE_VISIBILITY_RULES.md`
- **Category**: Lifecycle System (33/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **visibility rules** for lifecycle states in ChefFlow V1.

It specifies:
- What clients can see at each lifecycle state
- What clients cannot see (hidden data)
- When visibility changes occur
- RLS policy alignment with visibility rules
- Client vs chef visibility differences
- Visibility audit requirements

---

## Core Visibility Principle

**Default Deny**: Clients can **only** see data explicitly granted to them.

### System Law Alignment

- ✅ **Law 1**: Multi-tenant isolation (database-enforced)
- ✅ **Law 2**: Role-based visibility (authoritative)
- ✅ **Law 7**: Defense in depth (middleware + layout + RLS)

---

## Visibility by Lifecycle State

### State: `draft` (Inquiry Submitted)

| Data | Client Visibility | Chef Visibility | Notes |
|------|------------------|----------------|-------|
| Event exists | ❌ **No** | ✅ Yes | Client cannot see draft |
| Event details | ❌ No | ✅ Yes | Pricing not set yet |
| Client's own inquiry data | ⚠️ Via form submission only | ✅ Yes | No event view yet |

**Rationale**: Draft is **chef-managed**. Client submitted inquiry but cannot view event until proposed.

**RLS Policy**:

```sql
-- Clients CANNOT see draft events
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id() AND
    status != 'draft' -- Exclude draft
  );
```

---

### State: `proposed` (Awaiting Client Response)

| Data | Client Visibility | Chef Visibility | Notes |
|------|------------------|----------------|-------|
| Event exists | ✅ **Yes** | ✅ Yes | Event now visible |
| Event title | ✅ Yes | ✅ Yes | Full proposal visible |
| Event date | ✅ Yes | ✅ Yes | |
| Guest count | ✅ Yes | ✅ Yes | |
| Location | ✅ Yes | ✅ Yes | |
| Total amount | ✅ Yes | ✅ Yes | Pricing revealed |
| Deposit amount | ✅ Yes | ✅ Yes | |
| Attached menus | ✅ Yes (read-only) | ✅ Yes | Menu templates visible |
| Chef's internal notes | ⚠️ **Partial** | ✅ Yes | Client sees proposal notes only |
| Ledger entries | ❌ No | ✅ Yes | No payments yet |

**Visibility Change**: Event becomes **visible** when proposed.

**RLS Policy**:

```sql
-- Clients CAN see proposed events
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id() AND
    status IN ('proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed')
  );
```

---

### State: `accepted` (Awaiting Payment)

| Data | Client Visibility | Chef Visibility | Notes |
|------|------------------|----------------|-------|
| Event details | ✅ Yes | ✅ Yes | Same as proposed |
| Payment button | ✅ **Yes** | ❌ No | Client can pay deposit |
| Payment status | ✅ Yes ("Pending") | ✅ Yes | Awaiting webhook |
| Stripe checkout URL | ✅ Yes | ❌ No | Client-only |

**Visibility Change**: Payment flow becomes **visible**.

---

### State: `paid` (Deposit Received)

| Data | Client Visibility | Chef Visibility | Notes |
|------|------------------|----------------|-------|
| Payment receipt | ✅ **Yes** | ✅ Yes | Ledger summary visible |
| Ledger entries | ✅ **Yes** (filtered) | ✅ Yes (all entries) | Client sees own payments only |
| Payment amount | ✅ Yes | ✅ Yes | Deposit confirmed |
| Balance due | ✅ Yes | ✅ Yes | Calculated from ledger |

**Visibility Change**: Ledger entries become **visible** (filtered to client's payments).

**RLS Policy**:

```sql
-- Clients can see their own ledger entries
CREATE POLICY ledger_client_select ON ledger_entries
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

---

### State: `confirmed` (Booking Confirmed)

| Data | Client Visibility | Chef Visibility | Notes |
|------|------------------|----------------|-------|
| Confirmation status | ✅ **Yes** | ✅ Yes | "Booking Confirmed" badge |
| Event details | ✅ Yes (locked) | ✅ Yes | No edits allowed |
| Messaging thread | ✅ **Yes** | ✅ Yes | Can communicate with chef |
| Menu versions | ✅ Yes (read-only) | ✅ Yes (editable) | Menu finalization visible |

**Visibility Change**: Messaging thread becomes **active**.

**RLS Policy**:

```sql
-- Clients can see messages in their events
CREATE POLICY messages_client_select ON messages
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    event_id IN (
      SELECT id FROM events WHERE client_id = get_current_client_id()
    )
  );
```

---

### State: `in_progress` (Event Happening)

| Data | Client Visibility | Chef Visibility | Notes |
|------|------------------|----------------|-------|
| Event status | ✅ Yes ("In Progress") | ✅ Yes | Real-time status |
| Menu (finalized) | ✅ **Yes** | ✅ Yes | Menus locked |
| Balance payment | ✅ **Yes** | ✅ Yes | Can pay balance if due |
| Event updates | ⚠️ Limited | ✅ Yes | Chef can update notes |

**Visibility Change**: Finalized menus become **locked** (read-only).

---

### State: `completed` (Event Finished)

| Data | Client Visibility | Chef Visibility | Notes |
|------|------------------|----------------|-------|
| Event summary | ✅ **Yes** | ✅ Yes | Historical record |
| Full ledger | ✅ **Yes** | ✅ Yes | All payments visible |
| Loyalty points | ✅ **Yes** | ✅ Yes | Points earned |
| Event notes | ✅ Yes | ✅ Yes | Final notes visible |
| Rebook option | ✅ **Yes** | ✅ Yes | "Book Again" button |

**Visibility Change**: Full event history becomes **visible**.

---

### State: `cancelled` (Event Cancelled)

| Data | Client Visibility | Chef Visibility | Notes |
|------|------------------|----------------|-------|
| Cancellation reason | ✅ **Yes** | ✅ Yes | Transparency required |
| Cancellation date | ✅ Yes | ✅ Yes | When cancelled |
| Refund status | ✅ **Yes** | ✅ Yes | Refund ledger entries visible |
| Historical data | ✅ Yes (read-only) | ✅ Yes | Preserved for audit |

**Visibility Change**: Cancellation details become **visible**.

---

## Hidden Data

### What Clients Can NEVER See

| Data Type | Hidden From Client | Visible to Chef | Rationale |
|-----------|-------------------|----------------|-----------|
| **Chef's Internal Notes** | ✅ Hidden | ✅ Visible | Private chef planning |
| **Pricing Calculations** | ✅ Hidden | ✅ Visible | Business confidential |
| **Other Clients' Data** | ✅ Hidden | ✅ Visible | Privacy |
| **Cross-Tenant Data** | ✅ Hidden | ✅ Visible (own tenant) | Tenant isolation |
| **Service Role Operations** | ✅ Hidden | ✅ Hidden | System-only |
| **Raw Stripe Webhooks** | ✅ Hidden | ✅ Hidden | System-only |
| **RLS Policy Definitions** | ✅ Hidden | ✅ Hidden | Security |

**Enforcement**: RLS policies + middleware + server-side filtering.

---

## Visibility Transitions

### When Visibility Changes

| Transition | Visibility Change |
|-----------|------------------|
| `null → draft` | Event created (invisible to client) |
| `draft → proposed` | **Event becomes visible** to client |
| `proposed → accepted` | Payment flow visible |
| `accepted → paid` | Ledger entries visible |
| `paid → confirmed` | Messaging thread active |
| `confirmed → in_progress` | Menus locked (read-only) |
| `in_progress → completed` | Full history visible |
| `* → cancelled` | Cancellation details visible |

**System Law Alignment**: Law 17 (no silent transitions).

---

## RLS Policy Enforcement

### Client Event Visibility

```sql
-- Clients can only see their own events (excluding draft)
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id() AND
    tenant_id = get_current_tenant_id() AND
    status IN ('proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed', 'cancelled')
  );
```

**Test**:

```sql
-- As client, should see only own events
SET LOCAL role = 'client';
SET LOCAL request.jwt.claim.sub = 'client_auth_user_id';

SELECT * FROM events;
-- Returns: Only events where client_id = this client's ID
```

---

### Client Ledger Visibility

```sql
-- Clients can only see their own ledger entries
CREATE POLICY ledger_client_select ON ledger_entries
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id() AND
    tenant_id = get_current_tenant_id()
  );
```

**Test**:

```sql
-- As client, should see only own payments
SET LOCAL role = 'client';
SET LOCAL request.jwt.claim.sub = 'client_auth_user_id';

SELECT * FROM ledger_entries;
-- Returns: Only entries where client_id = this client's ID
```

---

### Client Menu Visibility

```sql
-- Clients can only see menus attached to their events
CREATE POLICY menus_client_select ON menus
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    id IN (
      SELECT menu_id FROM event_menus
      WHERE event_id IN (
        SELECT id FROM events WHERE client_id = get_current_client_id()
      )
    )
  );
```

---

## Visibility Audit

### Tracking Visibility Changes

**V1**: No explicit visibility audit (tracked via `event_transitions`).

**V2 Enhancement**: Log visibility changes.

```typescript
// V2: Log when client first views event
interface VisibilityAuditEntry {
  id: UUID;
  event_id: UUID;
  client_id: UUID;
  first_viewed_at: Timestamp;
  view_count: number;
  last_viewed_at: Timestamp;
}

async function logClientView(eventId: string, clientId: string) {
  const existing = await db.visibility_audit.findUnique({
    where: { event_id_client_id: { event_id: eventId, client_id: clientId } }
  });

  if (existing) {
    await db.visibility_audit.update({
      where: { id: existing.id },
      data: {
        view_count: { increment: 1 },
        last_viewed_at: new Date()
      }
    });
  } else {
    await db.visibility_audit.create({
      data: {
        event_id: eventId,
        client_id: clientId,
        first_viewed_at: new Date(),
        view_count: 1
      }
    });
  }
}
```

---

## Visibility Edge Cases

### Edge Case 1: Client Views Event Mid-Transition

**Scenario**: Client loads event page while status transitioning from `paid → confirmed`.

**Behavior**: Client sees **current status** (atomic read).

**Guarantee**: RLS + database transactions ensure consistency.

---

### Edge Case 2: Client Accesses Direct Event URL

**Scenario**: Client guesses event URL (`/my-events/other-client-event-uuid`).

**Behavior**: RLS blocks access (empty result set).

**User Experience**: 404 Not Found or "Event does not exist".

---

### Edge Case 3: Draft Event URL Shared

**Scenario**: Chef shares draft event URL with client before proposing.

**Behavior**: Client sees 404 (RLS excludes draft).

**Resolution**: Chef must propose event first.

---

## Client vs Chef Visibility Comparison

### Side-by-Side Comparison

| Data | Client (`confirmed` status) | Chef (`confirmed` status) |
|------|----------------------------|--------------------------|
| Event details | ✅ Read-only | ✅ Editable (limited) |
| Pricing | ✅ View only | ✅ View only (locked) |
| Menus | ✅ View only | ✅ Editable (can finalize) |
| Ledger | ✅ Own entries only | ✅ All entries |
| Messages | ✅ Event thread only | ✅ All threads |
| Internal notes | ❌ Hidden | ✅ Visible |
| Other clients | ❌ Hidden | ✅ Visible (same tenant) |
| Audit trail | ⚠️ Limited | ✅ Full access |

---

## Visibility Testing

### RLS Test Cases

| Test | Setup | Expected Result |
|------|-------|----------------|
| **Client sees own event** | Client A, Event owned by A | ✅ Visible |
| **Client cannot see other event** | Client A, Event owned by B | ❌ Hidden |
| **Client cannot see draft** | Client A, Own draft event | ❌ Hidden |
| **Client sees proposed** | Client A, Own proposed event | ✅ Visible |
| **Client sees own ledger** | Client A, Payment by A | ✅ Visible |
| **Client cannot see other ledger** | Client A, Payment by B | ❌ Hidden |
| **Cross-tenant isolation** | Client A (Tenant 1), Event (Tenant 2) | ❌ Hidden |

**Verification Script**: See `scripts/verify-rls.sql`.

---

## Visibility Performance

### Optimizing Visibility Queries

All visibility queries use indexes:

```sql
-- Client event queries
CREATE INDEX idx_events_client ON events(client_id, status);

-- Client ledger queries
CREATE INDEX idx_ledger_client ON ledger_entries(client_id);

-- Tenant scoping
CREATE INDEX idx_events_tenant ON events(tenant_id);
```

**Performance Target**: Client dashboard loads in <200ms (P95).

---

## Related Documents

- [CLIENT_PORTAL_BOUNDARIES.md](./CLIENT_PORTAL_BOUNDARIES.md)
- [CLIENT_PORTAL_DATA_OWNERSHIP.md](./CLIENT_PORTAL_DATA_OWNERSHIP.md)
- [CLIENT_LIFECYCLE_STATE_MACHINE.md](./CLIENT_LIFECYCLE_STATE_MACHINE.md)
- [CLIENT_AUTHORIZATION_INVARIANTS.md](./CLIENT_AUTHORIZATION_INVARIANTS.md)
- [RLS_POLICIES.md](../../RLS_POLICIES.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

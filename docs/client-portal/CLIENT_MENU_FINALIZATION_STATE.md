# Client Menu Finalization State

## Document Identity
- **File**: `CLIENT_MENU_FINALIZATION_STATE.md`
- **Category**: Lifecycle System (28/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines **menu finalization** for ChefFlow V1.

It specifies:
- When and how menus are finalized
- Menu mutability rules throughout lifecycle
- Menu versioning and locking
- Client visibility of finalized menus
- Menu-lifecycle integration
- Menu finalization audit trail

---

## Menu Finalization Definition

**Menu finalization** is the process of **locking a menu version** for an event, preventing further changes.

### Why Finalize Menus?

| Reason | Explanation |
|--------|-------------|
| **Client expectation** | Client expects specific dishes as agreed |
| **Ingredient procurement** | Chef orders ingredients based on finalized menu |
| **Pricing locked** | Menu changes could affect pricing |
| **Audit trail** | Historical record of what was served |

---

## Menu Lifecycle States

### Menu Mutability by Event Status

| Event Status | Menu State | Can Add/Remove? | Can Edit Dishes? | Client Visibility |
|-------------|-----------|----------------|------------------|------------------|
| `draft` | Draft | ✅ Yes | ✅ Yes | ❌ No (event not proposed) |
| `proposed` | Proposed | ❌ No (immutable) | ❌ No | ✅ Yes (read-only) |
| `accepted` | Proposed | ❌ No | ❌ No | ✅ Yes (read-only) |
| `paid` | Proposed | ⚠️ Chef only | ⚠️ Chef only | ✅ Yes (read-only) |
| `confirmed` | **Finalizable** | ⚠️ Chef only | ⚠️ Chef only | ✅ Yes (read-only) |
| `in_progress` | **Finalized** | ❌ No | ❌ No | ✅ Yes (read-only) |
| `completed` | **Finalized** | ❌ No | ❌ No | ✅ Yes (historical) |

**Key Transition**: Menu should be finalized **before** `confirmed → in_progress`.

---

## Menu Attachment Model

### Database Schema

Menus are attached to events via **many-to-many** relationship:

```sql
-- Menus (chef's template library)
CREATE TABLE menus (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES chefs(id),
  name TEXT NOT NULL,
  description TEXT,
  price_per_person_cents INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Event-Menu relationship (many-to-many)
CREATE TABLE event_menus (
  event_id UUID REFERENCES events(id),
  menu_id UUID REFERENCES menus(id),
  PRIMARY KEY (event_id, menu_id)
);
```

**Note**: In V1, menus are **templates** (not versioned per event).

---

## Menu Finalization Flow

### V1 Simplified Flow

```
┌─────────────────────────────────────────────────────────────┐
│              MENU FINALIZATION FLOW (V1)                     │
└─────────────────────────────────────────────────────────────┘

1. Chef creates menu templates (anytime)
        ↓
2. Chef attaches menus to event (during draft)
        ↓
3. Chef proposes event (menus visible to client)
        ↓
4. Client accepts proposal (agrees to menus)
        ↓
5. Chef confirms event (menus still editable)
        ↓
6. Chef finalizes menu (before event starts)
        ↓
7. Event starts (menus locked)
        ↓
8. Event completed (menus preserved for history)
```

**V1 Limitation**: No explicit "finalize menu" action. Menus implicitly locked when event starts.

---

## Menu Finalization Trigger

### When Are Menus Finalized?

**V1 Behavior**: Menus automatically finalized when event transitions to `in_progress`.

**Trigger**: `confirmed → in_progress` transition.

**Enforcement**:

```typescript
async function startEvent(eventId: string, chefUserId: string): Promise<void> {
  // Validate event is confirmed
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  if (event.status !== 'confirmed') {
    throw new Error('Only confirmed events can be started');
  }

  // Check menus attached (warning only)
  const menusAttached = await db.event_menus.count({
    where: { event_id: eventId }
  });

  if (menusAttached === 0) {
    console.warn('Starting event without attached menus');
  }

  // Transition to in_progress (implicitly finalizes menus)
  await db.events.update({
    where: { id: eventId },
    data: {
      status: 'in_progress',
      status_changed_at: new Date(),
      updated_by: chefUserId
    }
  });

  // Menus now locked
}
```

---

## Menu Versioning

### V1: No Menu Versioning

**V1 Limitation**: Menus are **templates**, not versioned per event.

**Implications**:
- If chef edits menu template, **all events** using that menu see changes
- No snapshot of menu as it was when event was proposed

**Workaround**: Chef should **not** edit menu templates after attaching to proposed events.

### V2 Enhancement: Menu Snapshots

```typescript
// V2: Create menu snapshot when event proposed
interface MenuSnapshot {
  id: UUID;
  event_id: UUID;
  menu_id: UUID; // Original template
  snapshot_data: MenuData; // Frozen copy of menu
  created_at: Timestamp;
}

// When event proposed, create snapshot
async function proposeEvent(eventId: string) {
  const menus = await getEventMenus(eventId);

  for (const menu of menus) {
    await db.menu_snapshots.create({
      data: {
        event_id: eventId,
        menu_id: menu.id,
        snapshot_data: {
          name: menu.name,
          description: menu.description,
          dishes: menu.dishes // Full menu data
        }
      }
    });
  }

  // Proceed with proposal
}
```

---

## Menu Display in Client Portal

### Proposed/Confirmed Events

Client sees attached menus in read-only view:

```
┌────────────────────────────────────────────────────┐
│         EVENT MENUS                                 │
├────────────────────────────────────────────────────┤
│ Birthday Party - March 15, 2026                    │
│                                                     │
│ ATTACHED MENUS:                                     │
│                                                     │
│ 1. Italian Family Style Dinner                      │
│    $45 per person                                   │
│    [View Menu Details]                              │
│                                                     │
│ 2. Dessert Platter                                  │
│    $15 per person                                   │
│    [View Menu Details]                              │
│                                                     │
│ Total Menu Cost: $60 per person × 25 guests         │
│ = $1,500                                            │
└────────────────────────────────────────────────────┘
```

### Menu Detail View

```
┌────────────────────────────────────────────────────┐
│    ITALIAN FAMILY STYLE DINNER                      │
├────────────────────────────────────────────────────┤
│ $45 per person                                      │
│                                                     │
│ ANTIPASTI                                           │
│ - Bruschetta with tomato and basil                  │
│ - Caprese salad                                     │
│ - Prosciutto and melon                              │
│                                                     │
│ PRIMI                                               │
│ - Homemade fettuccine alfredo                       │
│ - Penne arrabbiata                                  │
│                                                     │
│ SECONDI                                             │
│ - Chicken marsala                                   │
│ - Grilled salmon with lemon                         │
│                                                     │
│ CONTORNI                                            │
│ - Roasted vegetables                                │
│ - Garlic mashed potatoes                            │
│                                                     │
│ [Close]                                             │
└────────────────────────────────────────────────────┘
```

**Client Actions**: View only (no edits).

---

## Menu Changes After Proposal

### V1 Policy: Chef Can Edit Until Event Starts

**Allowed**:
- Chef can attach/detach menus during `paid` or `confirmed` status
- Chef can edit menu templates anytime

**Client Notification**: ⚠️ No automatic notification in V1 if menu changes.

**Best Practice**: Chef should message client if menu changes after proposal.

### V2 Enhancement: Change Notifications

```typescript
// V2: Notify client when menu changed
async function notifyMenuChange(eventId: string, changeType: string) {
  const event = await getEvent(eventId);
  const client = await getClient(event.client_id);

  if (event.status === 'proposed' || event.status === 'confirmed') {
    await sendEmail({
      to: client.email,
      subject: 'Menu Update for Your Event',
      body: `
        The menu for your event has been updated.

        Change: ${changeType}
        Event: ${event.title}
        Date: ${event.event_date}

        View updated menu: ${process.env.APP_URL}/my-events/${eventId}
      `
    });
  }
}
```

---

## Menu Finalization Audit

### Tracking Menu Changes

**V1**: No explicit menu change tracking.

**V2 Enhancement**: Track menu changes in `event_transitions` metadata.

```json
{
  "event": "menu_attached",
  "event_id": "event_uuid",
  "menu_id": "menu_uuid",
  "menu_name": "Italian Family Style Dinner",
  "attached_at": "2026-02-14T10:00:00Z",
  "attached_by": "chef_auth_user_id"
}
```

---

## Menu Pricing Integration

### Menu Price vs Event Price

**Important**: Menu `price_per_person_cents` is **informational only**.

**Event pricing** (`total_amount_cents`) is **authoritative**.

### Example

```
Menu 1: $45/person
Menu 2: $15/person
Guests: 25
Calculated Total: ($45 + $15) × 25 = $1,500

Event total_amount_cents: 250000 ($2,500)
```

**Difference**: Chef may add service fees, delivery, etc.

**Client View**: Shows both menu pricing and final event total.

---

## Menu Finalization Validation

### Pre-Start Checklist

Before transitioning `confirmed → in_progress`, validate:

```typescript
async function validateMenuFinalization(eventId: string): Promise<void> {
  const warnings: string[] = [];

  // Check menus attached
  const menusCount = await db.event_menus.count({
    where: { event_id: eventId }
  });

  if (menusCount === 0) {
    warnings.push('No menus attached to event');
  }

  // Check menu pricing consistency
  const event = await db.events.findUnique({
    where: { id: eventId },
    include: { event_menus: { include: { menu: true } } }
  });

  const menuTotal = event.event_menus.reduce(
    (sum, em) => sum + (em.menu.price_per_person_cents || 0),
    0
  ) * event.guest_count;

  if (menuTotal > event.total_amount_cents) {
    warnings.push('Menu pricing exceeds event total');
  }

  // Log warnings (don't block)
  if (warnings.length > 0) {
    console.warn('Menu finalization warnings:', warnings);
  }
}
```

**V1**: Warnings only (don't block event start).

---

## Menu Immutability After Event

### Post-Execution Menu State

After event completes:

| Action | Allowed? | Rationale |
|--------|---------|----------|
| **View menus** | ✅ Yes | Historical record |
| **Edit menu template** | ✅ Yes | Doesn't affect completed event |
| **Detach menu from event** | ❌ No | Would break audit trail |
| **Delete menu template** | ⚠️ Yes (soft delete) | Event still references snapshot |

**Enforcement**:

```typescript
async function preventMenuDetachFromCompletedEvent(
  eventId: string
): Promise<void> {
  const event = await db.events.findUnique({
    where: { id: eventId }
  });

  if (event.status === 'completed' || event.status === 'in_progress') {
    throw new Error('Cannot modify menus for in-progress or completed events');
  }
}
```

---

## Menu Finalization Display

### Chef View (Before Finalization)

```
┌────────────────────────────────────────────────────┐
│      EVENT READY TO START                           │
├────────────────────────────────────────────────────┤
│ Event: Birthday Party                               │
│ Status: Confirmed                                   │
│                                                     │
│ ATTACHED MENUS:                                     │
│ - Italian Family Style Dinner                       │
│ - Dessert Platter                                   │
│                                                     │
│ ⚠️ Menus will be locked when event starts           │
│                                                     │
│ [Start Event]  [Edit Menus]                         │
└────────────────────────────────────────────────────┘
```

### Chef View (After Finalization)

```
┌────────────────────────────────────────────────────┐
│      EVENT IN PROGRESS                              │
├────────────────────────────────────────────────────┤
│ Event: Birthday Party                               │
│ Status: In Progress                                 │
│                                                     │
│ FINALIZED MENUS:                                    │
│ ✓ Italian Family Style Dinner                       │
│ ✓ Dessert Platter                                   │
│                                                     │
│ 🔒 Menus locked (cannot edit)                       │
│                                                     │
│ [Complete Event]  [View Menus]                      │
└────────────────────────────────────────────────────┘
```

---

## Menu Finalization Edge Cases

### Edge Case 1: No Menus Attached

**Scenario**: Event reaches `in_progress` with no menus attached.

**Behavior**: Allowed (warning only).

**Rationale**: Chef may have custom menu not in template library.

**Client View**: Shows "No menus attached" (doesn't block event).

---

### Edge Case 2: Menu Template Deleted

**Scenario**: Chef deletes menu template that's attached to active event.

**V1 Behavior**: Soft delete (`is_active = false`).

**Impact**: Event still references menu, but menu hidden from chef's library.

**Client View**: Menu still visible in event (data preserved).

---

### Edge Case 3: Menu Edited After Proposal

**Scenario**: Chef edits menu template after attaching to proposed event.

**V1 Behavior**: All events using that template see changes.

**Risk**: Client may see different menu than originally proposed.

**Mitigation**: V2 menu snapshots prevent this.

---

## Related Documents

- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_EVENT_CONFIRMATION_RULES.md](./CLIENT_EVENT_CONFIRMATION_RULES.md)
- [CLIENT_EVENT_EXECUTION_STATE.md](./CLIENT_EVENT_EXECUTION_STATE.md)
- [MENUS.md](../../MENUS.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14

# Notification Integration Points — Phase 7 Restaurant Ops

This document lists where each restaurant ops notification trigger should be called in the codebase. The trigger functions live in `lib/notifications/triggers.ts` and are all non-blocking (try/catch, log on failure, never throw).

## Architecture

- Notifications go to the **chef** (tenant owner), not individual staff members
- Staff members do not have Supabase auth accounts, so they cannot receive in-app notifications
- All trigger functions accept `tenantId` as the first parameter and internally resolve the chef's `auth_user_id`
- Triggers are fire-and-forget side effects — they should never block the main operation

## Integration Points

### 1. `notifyStaffAssignment(tenantId, staffMemberName, eventTitle, eventDate, eventId)`

**Where to call:** `lib/staff/actions.ts` in `assignStaffToEvent()` after the successful insert of a `staff_event_assignments` row.

```typescript
// After successful assignment insert:
try {
  await notifyStaffAssignment(user.tenantId!, staffMember.name, event.title, event.date, event.id)
} catch (err) {
  console.error('[non-blocking] Staff assignment notification failed', err)
}
```

---

### 2. `notifyTaskAssigned(tenantId, staffMemberName, taskTitle, dueDate)`

**Where to call:** `lib/tasks/actions.ts` (or wherever `createTask()` lives) after a successful task insert, **only if `assigned_to` is set**.

```typescript
// After successful task insert, if assigned_to is set:
if (task.assigned_to && staffMember) {
  try {
    await notifyTaskAssigned(user.tenantId!, staffMember.name, task.title, task.due_date)
  } catch (err) {
    console.error('[non-blocking] Task assignment notification failed', err)
  }
}
```

---

### 3. `notifyScheduleChange(tenantId, eventTitle, change, eventId)`

**Where to call:** In the event update flow — when an event's `date`, `time`, or `venue` fields change and the event already has staff assigned. This could be in `lib/events/actions.ts` `updateEvent()` or similar.

```typescript
// After successful event date/time update:
if (dateChanged || timeChanged || venueChanged) {
  const changeDesc = dateChanged
    ? `Date changed to ${newDate}`
    : timeChanged
      ? `Time changed to ${newTime}`
      : `Venue changed to ${newVenue}`

  try {
    await notifyScheduleChange(user.tenantId!, event.title, changeDesc, event.id)
  } catch (err) {
    console.error('[non-blocking] Schedule change notification failed', err)
  }
}
```

---

### 4. `notifyOrderReady(tenantId, stationCount)`

**Where to call:** In the station order system when order aggregation runs — i.e., when all stations have submitted their `order_requests` for the day and the chef needs to review the unified order sheet.

This might be triggered by:

- A manual "finalize orders" button in the ops/orders UI
- An automated check when the last station submits its orders

```typescript
try {
  await notifyOrderReady(user.tenantId!, stationCount)
} catch (err) {
  console.error('[non-blocking] Order ready notification failed', err)
}
```

---

### 5. `notifyDeliveryReceived(tenantId, stationName, stationId)`

**Where to call:** When an order request status transitions to `'received'` — in the order request update action (likely in a station/clipboard action file).

```typescript
// After marking order_request status = 'received':
try {
  await notifyDeliveryReceived(user.tenantId!, station.name, station.id)
} catch (err) {
  console.error('[non-blocking] Delivery received notification failed', err)
}
```

---

### 6. `notifyLowStock(tenantId, stationName, componentName, onHand, parLevel)`

**Where to call:** In the clipboard entry update flow — when `on_hand` is updated and the new value drops below a threshold (e.g., `on_hand < par_level * 0.25` or a configurable percentage).

```typescript
// After updating clipboard_entries.on_hand:
const threshold = 0.25 // 25% of par
if (entry.on_hand < component.par_level * threshold) {
  try {
    await notifyLowStock(
      user.tenantId!,
      station.name,
      component.name,
      entry.on_hand,
      component.par_level
    )
  } catch (err) {
    console.error('[non-blocking] Low stock notification failed', err)
  }
}
```

---

### 7. `notifyGuestComp(tenantId, guestName, compDescription, guestId)`

**Where to call:** Already handled by the UI — the guest profile page shows a comp badge when pending comps exist. This notification can additionally be triggered:

- When a guest checks in (reservation status changes to `'seated'`) and they have unredeemed comps
- When a new comp is created for a guest (to remind the chef later)

```typescript
// At guest check-in, if guest has pending comps:
const pendingComps = await getPendingComps(guestId)
for (const comp of pendingComps) {
  try {
    await notifyGuestComp(user.tenantId!, guest.name, comp.description, guest.id)
  } catch (err) {
    console.error('[non-blocking] Guest comp notification failed', err)
  }
}
```

---

## Notification Types Summary

| Action             | Category | Icon          | Toast | Description                                          |
| ------------------ | -------- | ------------- | ----- | ---------------------------------------------------- |
| `staff_assignment` | ops      | UserCheck     | Yes   | Staff member assigned to an event                    |
| `task_assigned`    | ops      | ClipboardList | Yes   | Task assigned to a staff member                      |
| `schedule_change`  | ops      | CalendarClock | Yes   | Event date/time/venue changed after staff assigned   |
| `order_status`     | ops      | Package       | Yes   | Order requests ready for review or delivery received |
| `low_stock`        | ops      | AlertTriangle | Yes   | Component on-hand below par threshold                |
| `guest_comp`       | ops      | Gift          | Yes   | Guest has pending unredeemed comp at check-in        |

## File Locations

| File                                              | Purpose                             |
| ------------------------------------------------- | ----------------------------------- |
| `lib/notifications/types.ts`                      | Type definitions + display config   |
| `lib/notifications/send.ts`                       | Convenience dispatch wrapper        |
| `lib/notifications/check.ts`                      | Query helpers for notification page |
| `lib/notifications/triggers.ts`                   | Restaurant ops trigger functions    |
| `lib/notifications/actions.ts`                    | Core CRUD (existing)                |
| `components/notifications/notification-bell.tsx`  | Bell icon with badge (existing)     |
| `components/notifications/notification-panel.tsx` | Dropdown panel (updated)            |
| `app/(chef)/notifications/page.tsx`               | Full notification history page      |

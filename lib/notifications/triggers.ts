// Restaurant Ops Notification Triggers - Phase 7
// Functions that fire notifications for restaurant operations events.
// All trigger functions are NON-BLOCKING - they use try/catch internally
// and never throw. Safe to call as side effects after any operation.
//
// Notifications go to the chef (tenant owner) since staff members do not
// have Auth.js accounts. The chef sees all operational notifications in
// their bell panel and notifications page.

'use server'

import { sendNotification } from './send'
import { getChefAuthUserId } from './actions'

// ─── Staff Assignment ────────────────────────────────────────────────────

/**
 * Called after assigning a staff member to an event.
 * Notifies the chef that the assignment was made (useful when
 * multiple managers or automated assignment is in play).
 */
export async function notifyStaffAssignment(
  tenantId: string,
  staffMemberName: string,
  eventTitle: string,
  eventDate: string,
  eventId: string
): Promise<void> {
  try {
    const recipientId = await getChefAuthUserId(tenantId)
    if (!recipientId) return

    await sendNotification({
      tenantId,
      recipientId,
      type: 'staff_assignment',
      title: `${staffMemberName} assigned to ${eventTitle}`,
      message: `Staff member has been assigned to the event on ${eventDate}.`,
      link: `/events/${eventId}`,
      eventId,
      metadata: {
        staff_member_name: staffMemberName,
        event_title: eventTitle,
        event_date: eventDate,
      },
    })
  } catch (err) {
    console.error('[notifyStaffAssignment] Failed (non-fatal):', err)
  }
}

// ─── Task Assignment ─────────────────────────────────────────────────────

/**
 * Called after creating a task assigned to a specific staff member.
 * Notifies the chef that a task has been assigned.
 */
export async function notifyTaskAssigned(
  tenantId: string,
  staffMemberName: string,
  taskTitle: string,
  dueDate: string | null
): Promise<void> {
  try {
    const recipientId = await getChefAuthUserId(tenantId)
    if (!recipientId) return

    const dueDateText = dueDate ? ` - due ${dueDate}` : ''

    await sendNotification({
      tenantId,
      recipientId,
      type: 'task_assigned',
      title: `Task assigned to ${staffMemberName}`,
      message: `"${taskTitle}"${dueDateText}`,
      link: '/ops/tasks',
      metadata: {
        staff_member_name: staffMemberName,
        task_title: taskTitle,
        due_date: dueDate,
      },
    })
  } catch (err) {
    console.error('[notifyTaskAssigned] Failed (non-fatal):', err)
  }
}

// ─── Staff Schedule Change ───────────────────────────────────────────────

/**
 * Called when a staff member is added to or removed from an event.
 * Notifies the chef so they have a record of roster changes.
 * changeType: 'added' | 'removed'
 */
export async function notifyStaffScheduleChange(
  tenantId: string,
  staffMemberName: string,
  eventTitle: string,
  eventId: string,
  changeType: 'added' | 'removed'
): Promise<void> {
  try {
    const recipientId = await getChefAuthUserId(tenantId)
    if (!recipientId) return

    const action = changeType === 'added' ? 'added to' : 'removed from'

    await sendNotification({
      tenantId,
      recipientId,
      type: 'staff_assignment',
      title: `${staffMemberName} ${action} ${eventTitle}`,
      message: `Staff roster updated for this event.`,
      link: `/events/${eventId}`,
      eventId,
      metadata: {
        staff_member_name: staffMemberName,
        event_title: eventTitle,
        change_type: changeType,
      },
    })
  } catch (err) {
    console.error('[notifyStaffScheduleChange] Failed (non-fatal):', err)
  }
}

// ─── Schedule Change ─────────────────────────────────────────────────────

/**
 * Called when an event's date, time, or venue changes after staff
 * have already been assigned.
 * Notifies the chef so they can communicate the change to staff.
 */
export async function notifyScheduleChange(
  tenantId: string,
  eventTitle: string,
  change: string,
  eventId: string
): Promise<void> {
  try {
    const recipientId = await getChefAuthUserId(tenantId)
    if (!recipientId) return

    await sendNotification({
      tenantId,
      recipientId,
      type: 'schedule_change',
      title: `Schedule changed: ${eventTitle}`,
      message: change,
      link: `/events/${eventId}`,
      eventId,
      metadata: {
        event_title: eventTitle,
        change_description: change,
      },
    })
  } catch (err) {
    console.error('[notifyScheduleChange] Failed (non-fatal):', err)
  }
}

// ─── Order Status ────────────────────────────────────────────────────────

/**
 * Called when all stations have submitted their order requests
 * and the unified order sheet is ready for review.
 */
export async function notifyOrderReady(tenantId: string, stationCount: number): Promise<void> {
  // Tenant isolation: verify tenantId matches session when called from user context
  const { getCurrentUser } = await import('@/lib/auth/get-user')
  const sessionUser = await getCurrentUser()
  if (sessionUser && tenantId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  try {
    const recipientId = await getChefAuthUserId(tenantId)
    if (!recipientId) return

    await sendNotification({
      tenantId,
      recipientId,
      type: 'order_status',
      title: 'Order requests ready for review',
      message: `${stationCount} station${stationCount !== 1 ? 's' : ''} submitted orders. Review and place with vendors.`,
      link: '/ops/orders',
      metadata: {
        station_count: stationCount,
        status: 'ready_for_review',
      },
    })
  } catch (err) {
    console.error('[notifyOrderReady] Failed (non-fatal):', err)
  }
}

/**
 * Called when a delivery is received at a station.
 */
export async function notifyDeliveryReceived(
  tenantId: string,
  stationName: string,
  stationId: string
): Promise<void> {
  try {
    const recipientId = await getChefAuthUserId(tenantId)
    if (!recipientId) return

    await sendNotification({
      tenantId,
      recipientId,
      type: 'order_status',
      title: `Delivery received: ${stationName}`,
      message: `${stationName} station has received its delivery. Stock levels updated.`,
      link: `/ops/stations/${stationId}`,
      metadata: {
        station_name: stationName,
        station_id: stationId,
        status: 'delivered',
      },
    })
  } catch (err) {
    console.error('[notifyDeliveryReceived] Failed (non-fatal):', err)
  }
}

// ─── Low Stock ───────────────────────────────────────────────────────────

/**
 * Called when a component's on_hand drops below the par level threshold.
 * This is a critical operational alert - the chef needs to order more.
 */
export async function notifyLowStock(
  tenantId: string,
  stationName: string,
  componentName: string,
  onHand: number,
  parLevel: number
): Promise<void> {
  try {
    const recipientId = await getChefAuthUserId(tenantId)
    if (!recipientId) return

    const percentage = parLevel > 0 ? Math.round((onHand / parLevel) * 100) : 0

    await sendNotification({
      tenantId,
      recipientId,
      type: 'low_stock',
      title: `Low stock: ${componentName}`,
      message: `${stationName} - on hand: ${onHand}, par: ${parLevel} (${percentage}% of par)`,
      link: '/ops/clipboard',
      metadata: {
        station_name: stationName,
        component_name: componentName,
        on_hand: onHand,
        par_level: parLevel,
        percentage,
      },
    })
  } catch (err) {
    console.error('[notifyLowStock] Failed (non-fatal):', err)
  }
}

// ─── Guest Comp ──────────────────────────────────────────────────────────

/**
 * Called at guest check-in when the guest has pending (unredeemed) comps.
 * Reminds the chef/FOH that a free item was promised.
 */
export async function notifyGuestComp(
  tenantId: string,
  guestName: string,
  compDescription: string,
  guestId: string
): Promise<void> {
  try {
    const recipientId = await getChefAuthUserId(tenantId)
    if (!recipientId) return

    await sendNotification({
      tenantId,
      recipientId,
      type: 'guest_comp',
      title: `Comp reminder: ${guestName}`,
      message: `Pending comp: "${compDescription}". Don't forget to honor it!`,
      link: `/ops/guests/${guestId}`,
      metadata: {
        guest_name: guestName,
        comp_description: compDescription,
        guest_id: guestId,
      },
    })
  } catch (err) {
    console.error('[notifyGuestComp] Failed (non-fatal):', err)
  }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { log } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { transitionEvent } from './transitions'

// ── Types ──────────────────────────────────────────────────────────────────

type CancelEventInput = {
  reason: string
  initiatedBy: 'chef' | 'client' | 'mutual'
  notifyStaff?: boolean
  notifyVendors?: boolean
}

type CancelEventResult = {
  success: boolean
  cancellation_fee_cents?: number
  error?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((to.getTime() - from.getTime()) / msPerDay)
}

async function calculateCancellationFeeFromSchedule(
  db: any,
  chefId: string,
  eventId: string,
  eventDate: string
): Promise<number> {
  const now = new Date()
  const original = new Date(eventDate)
  const daysBefore = daysBetween(now, original)

  const { data: tiers } = await db
    .from('cancellation_fee_schedule')
    .select('days_before_min, days_before_max, fee_type, fee_value')
    .eq('chef_id', chefId)
    .order('days_before_min', { ascending: true })

  if (!tiers || tiers.length === 0) return 0

  for (const tier of tiers) {
    if (daysBefore >= tier.days_before_min && daysBefore <= tier.days_before_max) {
      if (tier.fee_type === 'flat') {
        return tier.fee_value
      }
      if (tier.fee_type === 'percent') {
        try {
          const { getEventFinancialSummary } = await import('@/lib/ledger/compute')
          const financials = await getEventFinancialSummary(eventId)
          const totalCents = financials?.totalPaidCents ?? 0
          return Math.round(totalCents * (tier.fee_value / 10000))
        } catch {
          return 0
        }
      }
    }
  }

  return 0
}

// ── Main Action ────────────────────────────────────────────────────────────

/**
 * Cancel an event with FSM transition, fee calculation, and notifications.
 * Uses transitionEvent() for state machine enforcement, then adds fee
 * tracking and notification dispatch on top.
 */
export async function cancelEvent(
  eventId: string,
  data: CancelEventInput
): Promise<CancelEventResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Fetch event to get details before transition
  const { data: event, error: fetchError } = await db
    .from('events')
    .select('id, event_date, status, tenant_id, occasion, client_id, original_event_date')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.tenant_id !== tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. Calculate cancellation fee before transitioning
  const effectiveDate = event.original_event_date || event.event_date
  const feeCents = await calculateCancellationFeeFromSchedule(db, tenantId, eventId, effectiveDate)

  // 3. Transition via FSM (handles state validation, permissions, audit log)
  try {
    await transitionEvent({
      eventId,
      toStatus: 'cancelled',
      metadata: {
        cancellation_reason: data.reason,
        cancellation_initiated_by: data.initiatedBy,
        cancellation_fee_cents: feeCents,
        source: 'cancel-actions',
      },
    })
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to cancel event' }
  }

  // 4. Update cancellation fee column
  try {
    await db.from('events').update({ cancellation_fee_cents: feeCents }).eq('id', eventId)
  } catch (err) {
    log.events.warn('Failed to update cancellation fee on event (non-blocking)', { error: err })
  }

  // 5. Non-blocking notifications
  const shouldNotifyStaff = data.notifyStaff !== false
  const shouldNotifyVendors = data.notifyVendors !== false

  sendCancellationNotifications(
    db,
    eventId,
    event,
    data,
    shouldNotifyStaff,
    shouldNotifyVendors
  ).catch((err) => {
    log.events.warn('Cancellation notifications failed (non-blocking)', { error: err })
  })

  // 6. Revalidate
  revalidatePath('/calendar')
  revalidatePath('/events/' + eventId)
  revalidatePath('/events')

  return { success: true, cancellation_fee_cents: feeCents }
}

async function sendCancellationNotifications(
  db: any,
  eventId: string,
  event: any,
  data: CancelEventInput,
  notifyStaff: boolean,
  notifyVendors: boolean
) {
  const { sendEmail } = await import('@/lib/email/send')

  // Staff notification
  if (notifyStaff) {
    try {
      const { data: assignments } = await db
        .from('staff_assignments')
        .select('staff_member_id, staff_members!inner(email, first_name)')
        .eq('event_id', eventId)

      if (assignments && assignments.length > 0) {
        for (const assignment of assignments) {
          const staff = assignment.staff_members as any
          if (staff?.email) {
            const { EventCancelledStaffEmail } =
              await import('@/lib/email/templates/event-cancelled-staff')
            await sendEmail({
              to: staff.email,
              subject:
                'Event cancelled: ' + (event.occasion || 'Event') + ' on ' + event.event_date,
              react: EventCancelledStaffEmail({
                recipientName: staff.first_name || 'Team member',
                occasion: event.occasion || 'Event',
                eventDate: event.event_date,
                cancelledBy: data.initiatedBy,
                reason: data.reason,
              }),
            })
          }
        }

        await db.from('events').update({ cancellation_staff_notified: true }).eq('id', eventId)
      }
    } catch (err) {
      log.events.warn('Staff cancellation notification failed', { error: err })
    }
  }

  // Vendor notification
  if (notifyVendors) {
    try {
      const { data: vendors } = await db
        .from('event_vendors')
        .select('contact_email, contact_name, vendor_name')
        .eq('event_id', eventId)

      if (vendors && vendors.length > 0) {
        for (const vendor of vendors) {
          if (vendor.contact_email) {
            const { EventCancelledStaffEmail } =
              await import('@/lib/email/templates/event-cancelled-staff')
            await sendEmail({
              to: vendor.contact_email,
              subject:
                'Event cancelled: ' + (event.occasion || 'Event') + ' on ' + event.event_date,
              react: EventCancelledStaffEmail({
                recipientName: vendor.contact_name || vendor.vendor_name || 'Vendor',
                occasion: event.occasion || 'Event',
                eventDate: event.event_date,
                cancelledBy: data.initiatedBy,
                reason: data.reason,
              }),
            })
          }
        }

        await db.from('events').update({ cancellation_vendor_notified: true }).eq('id', eventId)
      }
    } catch (err) {
      log.events.warn('Vendor cancellation notification failed', { error: err })
    }
  }
}

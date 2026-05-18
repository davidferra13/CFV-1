'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { log } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

// Statuses that allow rescheduling
const RESCHEDULABLE_STATUSES = ['draft', 'proposed', 'accepted', 'paid', 'confirmed']

type RescheduleInput = {
  newDate: string
  reason?: string
  initiatedBy: 'chef' | 'client'
  waiveFee?: boolean
  waiveReason?: string
}

type RescheduleResult = {
  success: boolean
  fee_cents?: number
  fee_waived?: boolean
  error?: string
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((to.getTime() - from.getTime()) / msPerDay)
}

/**
 * Calculate the reschedule fee based on cancellation_fee_schedule.
 * Uses days between now and the original event date to determine tier.
 * fee_value is cents (flat) or basis points (percent, where 10000 = 100%).
 */
async function lookupFee(
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

/**
 * Reschedule an event with fee calculation, history tracking, and notifications.
 */
export async function rescheduleEventWithFee(
  eventId: string,
  data: RescheduleInput
): Promise<RescheduleResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Fetch event and verify ownership
  const { data: event, error: fetchError } = await db
    .from('events')
    .select(
      'id, event_date, status, tenant_id, occasion, original_event_date, reschedule_count, client_id'
    )
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.tenant_id !== tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. Status check
  if (!RESCHEDULABLE_STATUSES.includes(event.status)) {
    return { success: false, error: `Cannot reschedule a ${event.status} event` }
  }

  // 3. Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.newDate)) {
    return { success: false, error: 'Invalid date format' }
  }

  // 4. No-op if same date
  if (event.event_date === data.newDate) {
    return { success: true, fee_cents: 0, fee_waived: false }
  }

  // 5. Calculate fee
  const effectiveOriginalDate = event.original_event_date || event.event_date
  let feeCents = await lookupFee(db, tenantId, eventId, effectiveOriginalDate)
  const feeWaived = data.waiveFee === true && feeCents > 0

  if (feeWaived) {
    feeCents = 0
  }

  // 6. Record reschedule history
  const { error: insertError } = await db.from('event_reschedules').insert({
    event_id: eventId,
    tenant_id: tenantId,
    original_date: event.event_date,
    new_date: data.newDate,
    initiated_by: data.initiatedBy,
    reason: data.reason || null,
    fee_cents: feeWaived ? 0 : feeCents,
    fee_waived: feeWaived,
    fee_waive_reason: feeWaived ? data.waiveReason || null : null,
    staff_notified: false,
    vendor_notified: false,
    client_notified: false,
  })

  if (insertError) {
    log.events.error('Failed to insert reschedule record', { error: insertError })
    return { success: false, error: 'Failed to record reschedule' }
  }

  // 7. Update event
  const updatePayload: Record<string, any> = {
    event_date: data.newDate,
    reschedule_count: (event.reschedule_count || 0) + 1,
    last_rescheduled_at: new Date().toISOString(),
  }

  if (!event.original_event_date) {
    updatePayload.original_event_date = event.event_date
  }

  const { error: updateError } = await db.from('events').update(updatePayload).eq('id', eventId)

  if (updateError) {
    log.events.error('Failed to update event date', { error: updateError })
    return { success: false, error: 'Failed to update event date' }
  }

  // 8. Non-blocking notifications
  sendRescheduleNotifications(db, eventId, tenantId, event, data.newDate).catch((err) => {
    log.events.warn('Reschedule notifications failed (non-blocking)', { error: err })
  })

  // 9. Google Calendar sync (non-blocking)
  try {
    const { syncEventToGoogleCalendar } = await import('@/lib/scheduling/calendar-sync')
    syncEventToGoogleCalendar(eventId).catch((err: any) => {
      log.events.warn('Google Calendar re-sync after reschedule failed (non-blocking)', {
        error: err,
      })
    })
  } catch {
    // calendar-sync module not available
  }

  // 10. Revalidate
  revalidatePath('/calendar')
  revalidatePath(`/events/${eventId}`)

  return { success: true, fee_cents: feeCents, fee_waived: feeWaived }
}

async function sendRescheduleNotifications(
  db: any,
  eventId: string,
  tenantId: string,
  event: any,
  newDate: string
) {
  const { sendEmail } = await import('@/lib/email/send')

  const { data: rescheduleRecord } = await db
    .from('event_reschedules')
    .select('id')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const rescheduleId = rescheduleRecord?.id

  // Client notification
  try {
    if (event.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('email, full_name')
        .eq('id', event.client_id)
        .single()

      if (client?.email) {
        const { EventRescheduledEmail } = await import('@/lib/email/templates/event-rescheduled')
        await sendEmail({
          to: client.email,
          subject: `Your event has been rescheduled to ${newDate}`,
          react: EventRescheduledEmail({
            recipientName: client.full_name || 'there',
            occasion: event.occasion || 'Your event',
            originalDate: event.event_date,
            newDate,
          }),
        })

        if (rescheduleId) {
          await db
            .from('event_reschedules')
            .update({ client_notified: true })
            .eq('id', rescheduleId)
        }
      }
    }
  } catch (err) {
    log.events.warn('Client reschedule notification failed', { error: err })
  }

  // Staff notification
  try {
    const { data: assignments } = await db
      .from('staff_assignments')
      .select('staff_member_id, staff_members!inner(email, first_name)')
      .eq('event_id', eventId)

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        const staff = assignment.staff_members as any
        if (staff?.email) {
          const { EventRescheduledEmail } = await import('@/lib/email/templates/event-rescheduled')
          await sendEmail({
            to: staff.email,
            subject: `Event rescheduled: ${event.occasion || 'Event'} moved to ${newDate}`,
            react: EventRescheduledEmail({
              recipientName: staff.first_name || 'Team member',
              occasion: event.occasion || 'Event',
              originalDate: event.event_date,
              newDate,
            }),
          })
        }
      }

      if (rescheduleId) {
        await db.from('event_reschedules').update({ staff_notified: true }).eq('id', rescheduleId)
      }
    }
  } catch (err) {
    log.events.warn('Staff reschedule notification failed', { error: err })
  }

  // Vendor notification
  try {
    const { data: vendors } = await db
      .from('event_vendors')
      .select('contact_email, contact_name, vendor_name')
      .eq('event_id', eventId)

    if (vendors && vendors.length > 0) {
      for (const vendor of vendors) {
        if (vendor.contact_email) {
          const { EventRescheduledEmail } = await import('@/lib/email/templates/event-rescheduled')
          await sendEmail({
            to: vendor.contact_email,
            subject: `Event rescheduled: ${event.occasion || 'Event'} moved to ${newDate}`,
            react: EventRescheduledEmail({
              recipientName: vendor.contact_name || vendor.vendor_name || 'Vendor',
              occasion: event.occasion || 'Event',
              originalDate: event.event_date,
              newDate,
            }),
          })
        }
      }

      if (rescheduleId) {
        await db.from('event_reschedules').update({ vendor_notified: true }).eq('id', rescheduleId)
      }
    }
  } catch (err) {
    log.events.warn('Vendor reschedule notification failed', { error: err })
  }
}

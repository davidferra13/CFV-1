'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { log } from '@/lib/logger' // events namespace covers calendar operations
import { revalidatePath } from 'next/cache'

// Keep this aligned with calendar item editability.
const RESCHEDULABLE_STATUSES = ['draft', 'proposed', 'accepted']

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function rescheduleEvent(
  eventId: string,
  newDate: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
    return { success: false, error: 'Event ID is required' }
  }

  if (!isValidDateInput(newDate)) {
    return { success: false, error: 'Invalid date format' }
  }

  const db: any = createServerClient()

  // 1. Fetch tenant-scoped event.
  const { data: event, error: fetchError } = await db
    .from('events')
    .select('id, event_date, status, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  // 2. Only allow rescheduling for early-stage events
  if (!RESCHEDULABLE_STATUSES.includes(event.status)) {
    return {
      success: false,
      error: `Cannot reschedule a ${event.status} event`,
    }
  }

  // 3. No-op if same date
  if (event.event_date === newDate) {
    return { success: true }
  }

  // 4. Update event_date within the same tenant scope.
  const { error: updateError } = await db
    .from('events')
    .update({ event_date: newDate })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    return { success: false, error: 'Failed to update event date' }
  }

  // 5. Re-sync Google Calendar if a linked entry exists (non-blocking)
  try {
    const { syncEventToGoogleCalendar } = await import('@/lib/scheduling/calendar-sync')
    await syncEventToGoogleCalendar(eventId)
  } catch (err) {
    log.events.warn('Google Calendar re-sync after reschedule failed (non-blocking)', {
      error: err,
    })
  }

  // 6. Revalidate affected pages.
  revalidatePath('/calendar')
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/my-events')
  revalidatePath(`/my-events/${eventId}`)

  return { success: true }
}

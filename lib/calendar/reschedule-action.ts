'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Statuses that allow rescheduling — events that are confirmed, in-progress,
// completed, or cancelled are locked and cannot be moved.
const RESCHEDULABLE_STATUSES = ['draft', 'proposed', 'accepted']

export async function rescheduleEvent(
  eventId: string,
  newDate: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // 1. Fetch event and verify ownership
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, event_date, status, tenant_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.tenant_id !== user.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. Only allow rescheduling for early-stage events
  if (!RESCHEDULABLE_STATUSES.includes(event.status)) {
    return {
      success: false,
      error: `Cannot reschedule a ${event.status} event`,
    }
  }

  // 3. Validate the new date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    return { success: false, error: 'Invalid date format' }
  }

  // 4. No-op if same date
  if (event.event_date === newDate) {
    return { success: true }
  }

  // 5. Update event_date
  const { error: updateError } = await supabase
    .from('events')
    .update({ event_date: newDate })
    .eq('id', eventId)

  if (updateError) {
    return { success: false, error: 'Failed to update event date' }
  }

  // 6. Revalidate calendar pages
  revalidatePath('/calendar')
  revalidatePath(`/events/${eventId}`)

  return { success: true }
}

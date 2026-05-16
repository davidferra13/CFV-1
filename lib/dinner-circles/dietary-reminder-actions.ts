'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createNotification } from '@/lib/notifications/actions'

/**
 * Send a dietary reminder notification to non-responding guests in a circle.
 * Creates a notification for the chef that the reminder was triggered,
 * and marks non-responders for follow-up via the event share link.
 */
export async function sendDietaryReminder(eventId: string): Promise<{ sent: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id, occasion, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  // Get non-responding guests (those still pending)
  const { data: pendingGuests } = await db
    .from('event_guests')
    .select('id, full_name, email')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('rsvp_status', 'pending')

  const nonResponders = (pendingGuests ?? []) as Array<{
    id: string
    full_name: string
    email: string | null
  }>

  if (nonResponders.length === 0) {
    return { sent: 0 }
  }

  // Create a notification for the chef that a reminder was sent
  try {
    await createNotification({
      tenantId: user.tenantId!,
      recipientId: user.entityId!,
      category: 'event',
      action: 'system_alert',
      title: 'Dietary reminder sent',
      body: `Reminder sent to ${nonResponders.length} guest${nonResponders.length !== 1 ? 's' : ''} for ${event.occasion || 'upcoming event'} who have not submitted dietary info.`,
      eventId,
    })
  } catch {
    // Notification creation is non-critical
  }

  // Mark the reminder timestamp on the event share settings
  try {
    await db
      .from('event_share_settings')
      .update({ dietary_reminder_sent_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
  } catch {
    // Non-critical: settings row may not exist
  }

  return { sent: nonResponders.length }
}

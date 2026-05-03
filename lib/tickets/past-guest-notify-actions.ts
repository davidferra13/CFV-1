// Event Ticketing - Past Guest Notification System
// Notify previous ticket buyers about a new event.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * Get count of unique past guests who could be notified about this event.
 */
export async function getPastGuestCount(eventId: string): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()

  // All paid ticket buyers across all events EXCEPT this one, deduped by email
  const { data } = await db
    .from('event_tickets')
    .select('buyer_email')
    .eq('tenant_id', user.entityId)
    .eq('payment_status', 'paid')
    .neq('event_id', eventId)

  if (!data) return 0
  const uniqueEmails = new Set(data.map((t: any) => t.buyer_email.toLowerCase()))
  return uniqueEmails.size
}

/**
 * Send notification emails to all past ticket buyers about a new event.
 * Rate limited: once per event (cannot spam the same event announcement).
 */
export async function notifyPastGuests(input: {
  eventId: string
}): Promise<{ success: boolean; sent: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Rate limit: 1 notification blast per event per 24h
  try {
    await checkRateLimit(`past-guest-notify:${input.eventId}`, 1, 24 * 60 * 60 * 1000)
  } catch {
    return { success: false, sent: 0, error: 'Already sent notifications for this event today.' }
  }

  // Verify event belongs to chef and get event details
  const { data: event } = await db
    .from('events')
    .select('id, title, occasion, event_date, serve_time, location')
    .eq('id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { success: false, sent: 0, error: 'Event not found' }

  // Get share token for public link
  const { data: shareSettings } = await db
    .from('event_share_settings')
    .select('share_token')
    .eq('event_id', input.eventId)
    .eq('is_active', true)
    .maybeSingle()

  const { data: chef } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', user.entityId)
    .single()

  // Get all unique past buyers (not from this event)
  const { data: pastTickets } = await db
    .from('event_tickets')
    .select('buyer_email, buyer_name')
    .eq('tenant_id', user.entityId)
    .eq('payment_status', 'paid')
    .neq('event_id', input.eventId)

  if (!pastTickets || pastTickets.length === 0) {
    return { success: false, sent: 0, error: 'No past guests to notify' }
  }

  // Dedupe by email (keep first name found)
  const guestMap = new Map<string, string>()
  for (const t of pastTickets) {
    const email = t.buyer_email.toLowerCase()
    if (!guestMap.has(email)) {
      guestMap.set(email, t.buyer_name)
    }
  }

  // Also exclude anyone who already has a ticket for THIS event
  const { data: currentTickets } = await db
    .from('event_tickets')
    .select('buyer_email')
    .eq('event_id', input.eventId)
    .eq('tenant_id', user.entityId)

  const alreadyRegistered = new Set(
    (currentTickets || []).map((t: any) => t.buyer_email.toLowerCase())
  )

  const recipients = [...guestMap.entries()].filter(([email]) => !alreadyRegistered.has(email))

  if (recipients.length === 0) {
    return { success: false, sent: 0, error: 'All past guests already have tickets for this event' }
  }

  // Send emails
  const { sendEmail } = await import('@/lib/email/send')
  const { createElement } = await import('react')
  const { NotificationGenericEmail } = await import('@/lib/email/templates/notification-generic')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const eventName = event.title || event.occasion || 'an upcoming event'
  const chefName = chef?.business_name || chef?.display_name || 'Your chef'
  const eventUrl = shareSettings?.share_token
    ? `${appUrl}/e/${shareSettings.share_token}`
    : `${appUrl}/events/${input.eventId}`

  const dateText = event.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null

  let sent = 0
  const batchSize = 5
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)
    await Promise.allSettled(
      batch.map(async ([email, name]) => {
        const bodyLines = [
          `Hi ${name.split(' ')[0]},`,
          '',
          `${chefName} is hosting a new event: ${eventName}.`,
          dateText ? `Date: ${dateText}${event.serve_time ? ` at ${event.serve_time}` : ''}` : '',
          event.location ? `Location: ${event.location}` : '',
          '',
          'Tickets are available now. Would love to see you there.',
        ]
          .filter((l) => l !== undefined)
          .join('\n')

        try {
          await sendEmail({
            to: email,
            subject: `New event from ${chefName}: ${eventName}`,
            react: createElement(NotificationGenericEmail, {
              title: `You are invited: ${eventName}`,
              body: bodyLines,
              actionUrl: eventUrl,
              actionLabel: 'View Event & Get Tickets',
            }),
          })
          sent++
        } catch (err) {
          console.error(`[notifyPastGuests] Failed to send to ${email}:`, err)
        }
      })
    )
  }

  return { success: true, sent }
}

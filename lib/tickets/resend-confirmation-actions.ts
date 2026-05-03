// Event Ticketing - Resend Confirmation Email

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * Resend the purchase confirmation email to a ticket holder.
 * Rate limited: max 3 per ticket per hour.
 */
export async function resendTicketConfirmation(input: {
  eventId: string
  ticketId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: ticket } = await db
    .from('event_tickets')
    .select('id, buyer_email, buyer_name, quantity, payment_status, event_id')
    .eq('id', input.ticketId)
    .eq('event_id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!ticket) return { success: false, error: 'Ticket not found' }
  if (ticket.payment_status !== 'paid') {
    return { success: false, error: 'Can only resend for paid tickets' }
  }

  // Rate limit: 3 per ticket per hour
  try {
    await checkRateLimit(`resend-confirm:${input.ticketId}`, 3, 60 * 60 * 1000)
  } catch {
    return { success: false, error: 'Rate limit exceeded. Try again in an hour.' }
  }

  // Fetch event and chef info for email
  const { data: event } = await db
    .from('events')
    .select('title, occasion, event_date, serve_time, location')
    .eq('id', input.eventId)
    .single()

  const { data: chef } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', user.entityId)
    .single()

  // Find circle link
  const { data: circleGroup } = await db
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', input.eventId)
    .eq('is_active', true)
    .maybeSingle()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const circleUrl = circleGroup?.group_token ? `${appUrl}/hub/g/${circleGroup.group_token}` : null

  const { sendEmail } = await import('@/lib/email/send')
  const { createElement } = await import('react')
  const { NotificationGenericEmail } = await import('@/lib/email/templates/notification-generic')

  const eventName = event?.title || event?.occasion || 'the event'
  const chefName = chef?.business_name || chef?.display_name || 'your chef'
  const dateText = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const bodyLines = [
    `Your ticket${ticket.quantity > 1 ? 's' : ''} for ${eventName} ${ticket.quantity > 1 ? 'are' : 'is'} confirmed.`,
    dateText ? `Date: ${dateText}${event?.serve_time ? ` at ${event.serve_time}` : ''}` : '',
    event?.location ? `Location: ${event.location}` : '',
    `Chef: ${chefName}`,
    '',
    circleUrl
      ? 'Join the Dinner Circle to chat with the chef and other guests, get event updates, and share dietary needs.'
      : 'You will receive updates as the event gets closer.',
  ]
    .filter((l) => l !== undefined)
    .join('\n')

  try {
    await sendEmail({
      to: ticket.buyer_email,
      subject: `Your tickets for ${eventName} are confirmed`,
      react: createElement(NotificationGenericEmail, {
        title: 'You are in!',
        body: bodyLines,
        actionUrl: circleUrl || `${appUrl}/e/${input.eventId}`,
        actionLabel: circleUrl ? 'Open Dinner Circle' : 'View Event',
      }),
    })
  } catch (err) {
    console.error('[resendTicketConfirmation] email send failed:', err)
    return { success: false, error: 'Failed to send email' }
  }

  return { success: true }
}

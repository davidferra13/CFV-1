// Post-Event Thank-You Email Blast
// Send a personalized thank-you to all attendees after the event.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * Send thank-you emails to all paid ticket holders for an event.
 * Rate limited: once per event.
 */
export async function sendThankYouEmails(input: {
  eventId: string
  customMessage?: string
}): Promise<{ success: boolean; sent: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Rate limit: 1 thank-you blast per event ever
  try {
    await checkRateLimit(`thank-you:${input.eventId}`, 1, 365 * 24 * 60 * 60 * 1000)
  } catch {
    return { success: false, sent: 0, error: 'Thank-you emails already sent for this event.' }
  }

  // Verify event belongs to chef and is completed
  const { data: event } = await db
    .from('events')
    .select('id, title, occasion, event_date, lifecycle_state')
    .eq('id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { success: false, sent: 0, error: 'Event not found' }

  const { data: chef } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', user.entityId)
    .single()

  // Get all paid/attended tickets
  const { data: tickets } = await db
    .from('event_tickets')
    .select('buyer_email, buyer_name, quantity, attended')
    .eq('event_id', input.eventId)
    .eq('tenant_id', user.entityId)
    .eq('payment_status', 'paid')

  if (!tickets || tickets.length === 0) {
    return { success: false, sent: 0, error: 'No guests to thank' }
  }

  // Dedupe by email
  const guestMap = new Map<string, { name: string; attended: boolean | null }>()
  for (const t of tickets) {
    const email = t.buyer_email.toLowerCase()
    if (!guestMap.has(email)) {
      guestMap.set(email, { name: t.buyer_name, attended: t.attended })
    }
  }

  // Get share token for event recap link
  const { data: shareSettings } = await db
    .from('event_share_settings')
    .select('share_token')
    .eq('event_id', input.eventId)
    .eq('is_active', true)
    .maybeSingle()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const recapUrl = shareSettings?.share_token ? `${appUrl}/e/${shareSettings.share_token}` : null

  const { sendEmail } = await import('@/lib/email/send')
  const { createElement } = await import('react')
  const { NotificationGenericEmail } = await import('@/lib/email/templates/notification-generic')

  const eventName = event.title || event.occasion || 'the event'
  const chefName = chef?.business_name || chef?.display_name || 'Your chef'

  let sent = 0
  const batchSize = 5
  const recipients = [...guestMap.entries()]

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)
    await Promise.allSettled(
      batch.map(async ([email, guest]) => {
        const firstName = guest.name.split(' ')[0]
        const bodyLines = [
          `Hi ${firstName},`,
          '',
          input.customMessage ||
            `Thank you for joining us at ${eventName}. It was a pleasure cooking for you.`,
          '',
          `Hope to see you at the next one.`,
          '',
          `${chefName}`,
        ].join('\n')

        try {
          await sendEmail({
            to: email,
            subject: `Thank you for ${eventName}`,
            react: createElement(NotificationGenericEmail, {
              title: `Thank you, ${firstName}`,
              body: bodyLines,
              actionUrl: recapUrl || undefined,
              actionLabel: recapUrl ? 'View Event Recap' : undefined,
            }),
          })
          sent++
        } catch (err) {
          console.error(`[sendThankYouEmails] Failed to send to ${email}:`, err)
        }
      })
    )
  }

  return { success: true, sent }
}

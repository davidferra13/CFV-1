// Broadcast Message to Ticket Holders
// Send a quick update email to all paid guests of a ticketed event.

'use server'

import { createElement } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * Send a message to all paid ticket holders for an event.
 * Rate limited: 3 broadcasts per event per 24 hours.
 */
export async function broadcastToTicketHolders(input: {
  eventId: string
  subject: string
  message: string
}): Promise<{ success: boolean; sent: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, occasion')
    .eq('id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { success: false, sent: 0, error: 'Event not found' }

  if (!input.subject.trim() || !input.message.trim()) {
    return { success: false, sent: 0, error: 'Subject and message are required' }
  }

  // Rate limit: 3 per event per 24h
  try {
    await checkRateLimit(`ticket-broadcast:${input.eventId}`, 3, 24 * 60 * 60 * 1000)
  } catch {
    return { success: false, sent: 0, error: 'Broadcast limit reached (3 per day)' }
  }

  // Get all paid ticket holders with email
  const { data: tickets } = await db
    .from('event_tickets')
    .select('buyer_email, buyer_name')
    .eq('event_id', input.eventId)
    .eq('payment_status', 'paid')

  if (!tickets || tickets.length === 0) {
    return { success: false, sent: 0, error: 'No paid ticket holders to notify' }
  }

  // Dedupe by email
  const emailMap = new Map<string, string>()
  for (const t of tickets) {
    if (t.buyer_email && !emailMap.has(t.buyer_email)) {
      emailMap.set(t.buyer_email, t.buyer_name || 'Guest')
    }
  }

  const { sendEmail } = await import('@/lib/email/send')
  const { NotificationGenericEmail } = await import('@/lib/email/templates/notification-generic')

  // Get chef name for the from context
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', user.entityId)
    .single()

  const chefName = chef?.business_name || chef?.display_name || 'Your Chef'

  let sent = 0
  const entries = [...emailMap.entries()]

  // Send in batches of 5
  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5)
    await Promise.allSettled(
      batch.map(async ([email, name]) => {
        try {
          await sendEmail({
            to: email,
            subject: `${chefName}: ${input.subject.trim()}`,
            react: createElement(NotificationGenericEmail, {
              title: input.subject.trim(),
              body: `Hi ${name},\n\n${input.message.trim()}\n\n- ${chefName}`,
            }),
          })
          sent++
        } catch {
          // Non-blocking per-recipient failure
        }
      })
    )
  }

  return { success: true, sent }
}

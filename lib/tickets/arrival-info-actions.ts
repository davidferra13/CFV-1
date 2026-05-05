// Guest Arrival Information
// Auto-sends directions, parking, and gate code to ticket holders 24h before event.

'use server'

import { createElement } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * Send arrival info (directions, parking, gate code) to all paid guests.
 * Rate limited: 1 per event per 48 hours.
 */
export async function sendArrivalInfo(input: {
  eventId: string
}): Promise<{ success: boolean; sent: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, occasion, event_date, serve_time, location_address')
    .eq('id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) return { success: false, sent: 0, error: 'Event not found' }

  // Rate limit
  try {
    await checkRateLimit(`arrival-info:${input.eventId}`, 1, 48 * 60 * 60 * 1000)
  } catch {
    return { success: false, sent: 0, error: 'Already sent recently (limit: once per 48h)' }
  }

  // Get venue details
  const { data: venue } = await db
    .from('event_venue_details')
    .select(
      'gate_code, parking_instructions, directions_from_road, access_instructions, welcome_message, restroom_info, property_rules'
    )
    .eq('event_id', input.eventId)
    .maybeSingle()

  // Get paid ticket holders
  const { data: tickets } = await db
    .from('event_tickets')
    .select('buyer_email, buyer_name')
    .eq('event_id', input.eventId)
    .eq('payment_status', 'paid')

  if (!tickets || tickets.length === 0) {
    return { success: false, sent: 0, error: 'No paid guests to notify' }
  }

  // Dedupe
  const emailMap = new Map<string, string>()
  for (const t of tickets) {
    if (t.buyer_email && !emailMap.has(t.buyer_email)) {
      emailMap.set(t.buyer_email, t.buyer_name || 'Guest')
    }
  }

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', user.entityId)
    .single()

  const chefName = chef?.business_name || chef?.display_name || 'Your Chef'

  // Build the arrival info body
  const sections: string[] = []

  if (venue?.welcome_message) {
    sections.push(venue.welcome_message)
  }

  sections.push(`Event: ${event.occasion || 'Dinner'}`)
  if (event.event_date) {
    const dateStr = new Date(event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    sections.push(`Date: ${dateStr}${event.serve_time ? ` at ${event.serve_time}` : ''}`)
  }
  if (event.location_address) {
    sections.push(`Address: ${event.location_address}`)
  }

  if (venue?.directions_from_road) {
    sections.push(`\nDirections:\n${venue.directions_from_road}`)
  }

  if (venue?.gate_code) {
    sections.push(`\nGate Code: ${venue.gate_code}`)
  }

  if (venue?.parking_instructions) {
    sections.push(`\nParking: ${venue.parking_instructions}`)
  }

  if (venue?.access_instructions) {
    sections.push(`\nOn Arrival: ${venue.access_instructions}`)
  }

  if (venue?.restroom_info) {
    sections.push(`\nRestrooms: ${venue.restroom_info}`)
  }

  if (venue?.property_rules && venue.property_rules.length > 0) {
    sections.push(`\nPlease note:\n${venue.property_rules.map((r: string) => `- ${r}`).join('\n')}`)
  }

  sections.push(`\nSee you there!\n- ${chefName}`)

  const bodyText = sections.join('\n')

  const { sendEmail } = await import('@/lib/email/send')
  const { NotificationGenericEmail } = await import('@/lib/email/templates/notification-generic')

  let sent = 0
  const entries = [...emailMap.entries()]

  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5)
    await Promise.allSettled(
      batch.map(async ([email]) => {
        try {
          await sendEmail({
            to: email,
            subject: `How to find us: ${event.occasion || 'Dinner'} arrival info`,
            react: createElement(NotificationGenericEmail, {
              title: 'Arrival Information',
              body: bodyText,
            }),
          })
          sent++
        } catch {
          // Non-blocking
        }
      })
    )
  }

  return { success: true, sent }
}

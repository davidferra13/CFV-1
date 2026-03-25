'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

/**
 * Get all guests with emails across events - for batch communication.
 * Chef only.
 */
export async function getGuestEmailList(filters?: { eventId?: string; rsvpStatus?: string }) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('event_guests')
    .select(
      `
      id, full_name, email, rsvp_status, event_id,
      events!inner(id, occasion, event_date, tenant_id)
    `
    )
    .eq('events.tenant_id', user.tenantId!)
    .not('email', 'is', null)

  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  if (filters?.rsvpStatus) {
    query = query.eq('rsvp_status', filters.rsvpStatus)
  }

  const { data, error } = await query.order('full_name')

  if (error) {
    console.error('[getGuestEmailList] Error:', error)
    return []
  }

  // Deduplicate by email
  const seen = new Set<string>()
  const unique = (data ?? []).filter((g: any) => {
    const email = g.email?.toLowerCase()?.trim()
    if (!email || seen.has(email)) return false
    seen.add(email)
    return true
  })

  return unique.map((g: any) => ({
    id: g.id,
    name: g.full_name,
    email: g.email,
    rsvpStatus: g.rsvp_status,
    eventId: g.event_id,
    eventName: g.events?.occasion || 'Event',
    eventDate: g.events?.event_date,
  }))
}

/**
 * Draft a post-event follow-up email to all RSVP guests.
 * Chef reviews before sending.
 */
export async function draftPostEventEmail(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('occasion, event_date, guest_code')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, booking_slug')
    .eq('id', user.tenantId!)
    .single()

  if (!event || !chef) throw new Error('Event or chef not found')

  const chefName = chef.display_name || chef.business_name
  const occasion = event.occasion || 'our dinner'
  const eventDate = event.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'recently'

  const profileUrl = chef.booking_slug
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/chef/${chef.booking_slug}`
    : null

  const recapUrl = event.guest_code
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/g/${event.guest_code}`
    : null

  const subject = `Thank you for joining ${occasion}!`

  const body = [
    `Hi there,`,
    ``,
    `Thank you so much for joining us at ${occasion} on ${eventDate}! It was an absolute pleasure cooking for you.`,
    ``,
    `I'd love to know what you thought of the evening. If you have a moment, sharing your photos or a quick note would mean the world to me.`,
    ``,
    recapUrl ? `Check out the event recap and share your photos: ${recapUrl}` : null,
    ``,
    `If you or anyone you know would love to host your own private dining event, I'd be thrilled to help make it happen.`,
    ``,
    profileUrl
      ? `Book your own event: ${profileUrl}`
      : `Just reply to this email and we'll get started!`,
    ``,
    `Until next time,`,
    `${chefName}`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  // Get recipients
  const guests = await getGuestEmailList({ eventId, rsvpStatus: 'attending' })

  return {
    subject,
    body,
    recipientCount: guests.length,
    recipients: guests.map((g: { name: string; email: string }) => ({
      name: g.name,
      email: g.email,
    })),
    chefName,
  }
}

/**
 * Draft a testimonial request email for an event's guests.
 * Chef reviews before sending.
 */
export async function draftTestimonialRequest(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('occasion, event_date')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', user.tenantId!)
    .single()

  if (!event || !chef) throw new Error('Event or chef not found')

  const chefName = chef.display_name || chef.business_name
  const occasion = event.occasion || 'our dinner'

  const subject = `Would you share your experience at ${occasion}?`

  const body = [
    `Hi there,`,
    ``,
    `I hope you're still riding the wave from ${occasion}! I had such a great time cooking for everyone.`,
    ``,
    `If you enjoyed the experience, would you mind sharing a quick testimonial? Even a sentence or two would mean so much to me and helps other people discover private dining.`,
    ``,
    `You can simply reply to this email with your thoughts - no pressure at all!`,
    ``,
    `Some prompts if helpful:`,
    `- What was the highlight of the evening?`,
    `- How would you describe the food?`,
    `- Would you recommend this to a friend?`,
    ``,
    `Thank you so much for your support!`,
    ``,
    `Warmly,`,
    `${chefName}`,
  ].join('\n')

  const guests = await getGuestEmailList({ eventId, rsvpStatus: 'attending' })

  return {
    subject,
    body,
    recipientCount: guests.length,
    recipients: guests.map((g: { name: string; email: string }) => ({
      name: g.name,
      email: g.email,
    })),
    chefName,
  }
}

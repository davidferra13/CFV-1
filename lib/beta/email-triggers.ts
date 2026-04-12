'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { getDietaryRollupForEvent } from './onboarding-actions'
import { format } from 'date-fns'

// ---------------------------------------------------------------------------
// Pre-Event Dietary Summary Email (48 hours before event)
// ---------------------------------------------------------------------------

/**
 * Send the pre-event dietary summary email to the chef.
 * Called by the daily ops scheduler or manually triggered.
 */
export async function sendPreEventDietarySummary(eventId: string) {
  const db: any = createServerClient({ admin: true })

  // Get event details
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, tenant_id,
      client:clients(id, full_name)
    `
    )
    .eq('id', eventId)
    .single()

  if (!event) return { success: false, reason: 'event_not_found' }

  // Get chef email
  const { data: chef } = await db
    .from('chefs')
    .select('email, display_name, business_name')
    .eq('id', event.tenant_id)
    .single()

  if (!chef?.email) return { success: false, reason: 'no_chef_email' }

  // Get dietary rollup
  const rollup = await getDietaryRollupForEvent(eventId)

  const clientData = event.client as { full_name: string } | null
  const chefName = chef.display_name || chef.business_name || 'Chef'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

  // Send via the notification system
  try {
    const { sendEmail } = (await import('@/lib/email/send')) as any
    const { PreEventDietarySummaryEmail } =
      await import('@/lib/email/templates/pre-event-dietary-summary')
    const { render } = await import('@react-email/render')

    const html = await render(
      PreEventDietarySummaryEmail({
        chefName,
        eventDate: format(new Date(event.event_date), 'MMMM d, yyyy'),
        occasion: event.occasion || 'Dinner',
        clientName: clientData?.full_name || 'Client',
        guestCount: event.guest_count,
        guestsWithInfo: rollup.guestsWithInfo,
        allergies: rollup.allergies,
        restrictions: rollup.restrictions,
        eventUrl: `${appUrl}/events/${eventId}`,
      })
    )

    await sendEmail({
      to: chef.email,
      subject: `Dietary Summary: ${clientData?.full_name || 'Client'}'s ${event.occasion || 'event'} on ${format(new Date(event.event_date), 'MMM d')}`,
      html,
    })

    return { success: true }
  } catch (err) {
    console.error('[non-blocking] Pre-event dietary summary email failed', err)
    return { success: false, reason: 'send_failed' }
  }
}

// ---------------------------------------------------------------------------
// Post-Event Circle Thank You (sent after event completes)
// ---------------------------------------------------------------------------

/**
 * Send thank you emails to all circle members after an event completes.
 * Called when event transitions to 'completed'.
 */
export async function sendPostEventCircleThanks(eventId: string) {
  const db: any = createServerClient({ admin: true })

  // Get event + circle info
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, tenant_id,
      client:clients(id, full_name)
    `
    )
    .eq('id', eventId)
    .single()

  if (!event) return { success: false, reason: 'event_not_found' }

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, slug')
    .eq('id', event.tenant_id)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your Chef'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

  // Find circles linked to this event
  const { data: groupEvents } = await db
    .from('hub_group_events')
    .select('group_id')
    .eq('event_id', eventId)

  if (!groupEvents || groupEvents.length === 0) {
    return { success: true, reason: 'no_circles_linked' }
  }

  const groupIds = groupEvents.map((g: any) => g.group_id)

  // Get all members of these circles
  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id, hub_guest_profiles(id, display_name, email, auth_user_id)')
    .in('group_id', groupIds)

  if (!members || members.length === 0) {
    return { success: true, reason: 'no_members' }
  }

  // Get menu dishes for the event via event_menus -> dishes chain
  const { data: eventMenuLinks2 } = await db
    .from('event_menus' as any)
    .select('menu_id')
    .eq('event_id', eventId)
  const triggerMenuIds = ((eventMenuLinks2 ?? []) as Array<{ menu_id: string }>).map(
    (em) => em.menu_id
  )
  const { data: menuDishes } =
    triggerMenuIds.length > 0
      ? await db
          .from('dishes' as any)
          .select('name, course_name')
          .eq('tenant_id', event.tenant_id)
          .in('menu_id', triggerMenuIds)
          .not('name', 'is', null)
          .order('course_number', { ascending: true })
      : { data: [] }

  const menuHighlights = ((menuDishes ?? []) as Array<{ name: string }>)
    .map((m) => m.name)
    .slice(0, 5)
  const eventDate = format(new Date(event.event_date), 'MMMM d, yyyy')

  // Send to each member
  let sent = 0
  for (const member of members) {
    const profile = member.hub_guest_profiles as {
      id: string
      display_name: string
      email: string | null
      auth_user_id: string | null
    } | null

    if (!profile?.email) continue

    const isGuest = !profile.auth_user_id

    try {
      const { sendEmail } = (await import('@/lib/email/send')) as any
      const { PostEventCircleThanksEmail } =
        await import('@/lib/email/templates/post-event-circle-thanks')
      const { render } = await import('@react-email/render')

      const html = await render(
        PostEventCircleThanksEmail({
          recipientName: profile.display_name,
          chefName,
          occasion: event.occasion || 'Dinner',
          eventDate,
          menuHighlights,
          isGuest,
          signupUrl: isGuest ? `${appUrl}/auth/signup?upgrade=${profile.id}` : undefined,
          circleUrl: `${appUrl}/hub/join/${groupIds[0]}`,
          bookUrl: chef?.slug ? `${appUrl}/${chef.slug}` : undefined,
        })
      )

      await sendEmail({
        to: profile.email,
        subject: `Thanks for joining ${event.occasion || 'dinner'}!`,
        html,
      })

      sent++
    } catch (err) {
      console.error(`[non-blocking] Post-event thank you failed for ${profile.email}`, err)
    }
  }

  return { success: true, sent }
}

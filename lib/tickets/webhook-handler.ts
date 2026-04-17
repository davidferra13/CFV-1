// Event Ticketing - Stripe Webhook Handler
// Called from app/api/webhooks/stripe/route.ts on checkout.session.completed
// when metadata.type === 'event_ticket'.

import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type Stripe from 'stripe'

/**
 * Handle completed ticket purchase checkout session.
 * 1. Mark ticket as paid
 * 2. Store Stripe payment intent ID
 * 3. Create/match hub guest profile
 * 4. Create event guest record
 * 5. Auto-join dinner circle
 * 6. Send confirmation email
 * 7. Notify chef
 */
export async function handleTicketPurchaseCompleted(session: Stripe.Checkout.Session) {
  const { ticket_id, event_id, tenant_id, ticket_type_id } = session.metadata ?? {}

  if (!ticket_id || !event_id || !tenant_id) {
    console.error('[handleTicketPurchaseCompleted] Missing metadata on session:', session.id)
    return
  }

  const db: any = createServerClient({ admin: true })

  // Idempotency: check if ticket is already paid
  const { data: ticket } = await db
    .from('event_tickets')
    .select(
      'id, payment_status, buyer_name, buyer_email, buyer_phone, quantity, dietary_restrictions, allergies, plus_one_name, plus_one_dietary, plus_one_allergies, notes'
    )
    .eq('id', ticket_id)
    .single()

  if (!ticket) {
    console.error('[handleTicketPurchaseCompleted] Ticket not found:', ticket_id)
    return
  }

  if (ticket.payment_status === 'paid') {
    console.info('[handleTicketPurchaseCompleted] Already paid (idempotent):', ticket_id)
    return
  }

  // 1. Mark ticket as paid
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : ((session.payment_intent as any)?.id ?? null)

  await db
    .from('event_tickets')
    .update({
      payment_status: 'paid',
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq('id', ticket_id)
    .eq('payment_status', 'pending') // CAS guard

  // 2. Create/match hub guest profile
  let hubProfileId: string | null = null
  try {
    const normalizedEmail = ticket.buyer_email.toLowerCase().trim()

    // Try to find existing profile by email
    const { data: existing } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('email_normalized', normalizedEmail)
      .maybeSingle()

    if (existing) {
      hubProfileId = existing.id

      // Update dietary info if provided
      const updates: Record<string, unknown> = {}
      if (ticket.allergies?.length) updates.known_allergies = ticket.allergies
      if (ticket.dietary_restrictions?.length) updates.known_dietary = ticket.dietary_restrictions
      if (Object.keys(updates).length > 0) {
        await db
          .from('hub_guest_profiles')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', hubProfileId)
      }
    } else {
      // Create new profile
      const crypto = require('crypto')
      const profileToken = crypto.randomUUID()

      const { data: newProfile } = await db
        .from('hub_guest_profiles')
        .insert({
          email: ticket.buyer_email,
          email_normalized: normalizedEmail,
          display_name: ticket.buyer_name,
          profile_token: profileToken,
          known_allergies: ticket.allergies ?? [],
          known_dietary: ticket.dietary_restrictions ?? [],
        })
        .select('id')
        .single()

      if (newProfile) {
        hubProfileId = newProfile.id
      }
    }

    // Link profile to ticket
    if (hubProfileId) {
      await db.from('event_tickets').update({ hub_profile_id: hubProfileId }).eq('id', ticket_id)
    }
  } catch (profileErr) {
    console.error(
      '[handleTicketPurchaseCompleted] Profile creation failed (non-blocking):',
      profileErr
    )
  }

  // 3. Create event guest record
  try {
    const { data: guest } = await db
      .from('event_guests')
      .insert({
        event_id,
        tenant_id,
        full_name: ticket.buyer_name,
        email: ticket.buyer_email,
        phone: ticket.buyer_phone ?? null,
        rsvp_status: 'attending',
        dietary_restrictions: ticket.dietary_restrictions ?? [],
        allergies: ticket.allergies ?? [],
        plus_one: !!ticket.plus_one_name,
        plus_one_name: ticket.plus_one_name ?? null,
        notes: ticket.notes ?? null,
        source: 'ticket',
      })
      .select('id')
      .single()

    if (guest) {
      await db.from('event_tickets').update({ event_guest_id: guest.id }).eq('id', ticket_id)
    }
  } catch (guestErr) {
    // May fail if event_guests doesn't have a source column - non-blocking
    console.error(
      '[handleTicketPurchaseCompleted] Guest record creation failed (non-blocking):',
      guestErr
    )
  }

  // 4. Auto-join dinner circle
  if (hubProfileId) {
    try {
      // Find the circle for this event
      const { data: group } = await db
        .from('hub_groups')
        .select('id, group_token, name')
        .eq('event_id', event_id)
        .eq('is_active', true)
        .maybeSingle()

      if (group) {
        // Check if already a member
        const { data: existingMember } = await db
          .from('hub_group_members')
          .select('id')
          .eq('group_id', group.id)
          .eq('profile_id', hubProfileId)
          .maybeSingle()

        if (!existingMember) {
          await db.from('hub_group_members').insert({
            group_id: group.id,
            profile_id: hubProfileId,
            role: 'member',
            can_post: true,
            can_invite: false,
            can_pin: false,
          })

          // Post system message
          await db.from('hub_messages').insert({
            group_id: group.id,
            author_profile_id: hubProfileId,
            message_type: 'system',
            system_event_type: 'member_joined',
            body: `${ticket.buyer_name} got tickets and joined the circle!`,
            system_metadata: { display_name: ticket.buyer_name, source: 'ticket_purchase' },
          })
        }
      }
    } catch (circleErr) {
      console.error(
        '[handleTicketPurchaseCompleted] Circle auto-join failed (non-blocking):',
        circleErr
      )
    }
  }

  // 5. Send confirmation email
  try {
    const { data: event } = await db
      .from('events')
      .select('title, occasion, event_date, serve_time, location')
      .eq('id', event_id)
      .single()

    const { data: chef } = await db
      .from('chefs')
      .select('business_name, display_name')
      .eq('id', tenant_id)
      .single()

    // Find circle link for the email
    const { data: circleGroup } = await db
      .from('hub_groups')
      .select('group_token')
      .eq('event_id', event_id)
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

    await sendEmail({
      to: ticket.buyer_email,
      subject: `Your tickets for ${eventName} are confirmed`,
      react: createElement(NotificationGenericEmail, {
        title: 'You are in!',
        body: bodyLines,
        actionUrl: circleUrl || `${appUrl}/e/${event_id}`,
        actionLabel: circleUrl ? 'Open Dinner Circle' : 'View Event',
      }),
    })
  } catch (emailErr) {
    console.error(
      '[handleTicketPurchaseCompleted] Confirmation email failed (non-blocking):',
      emailErr
    )
  }

  // 6. Notify chef
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenant_id)
    if (chefUserId) {
      const ticketLabel = ticket.quantity > 1 ? `${ticket.quantity} tickets` : '1 ticket'
      await createNotification({
        tenantId: tenant_id,
        recipientId: chefUserId,
        category: 'payment',
        action: 'ticket_purchased',
        title: 'Ticket sold',
        body: `${ticket.buyer_name} purchased ${ticketLabel}`,
        actionUrl: `/events/${event_id}`,
        eventId: event_id,
        metadata: {
          ticket_id,
          buyer_name: ticket.buyer_name,
          buyer_email: ticket.buyer_email,
          quantity: ticket.quantity,
        },
      })
    }
  } catch (notifErr) {
    console.error(
      '[handleTicketPurchaseCompleted] Chef notification failed (non-blocking):',
      notifErr
    )
  }

  // 7. Cache invalidation
  try {
    revalidatePath(`/events/${event_id}`)
    revalidatePath('/events')
    revalidatePath('/dashboard')
  } catch (cacheErr) {
    console.error(
      '[handleTicketPurchaseCompleted] Cache invalidation failed (non-blocking):',
      cacheErr
    )
  }

  console.info(
    '[handleTicketPurchaseCompleted] Ticket confirmed:',
    ticket_id,
    'for event:',
    event_id
  )
}

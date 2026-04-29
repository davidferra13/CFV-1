// Event Ticketing - Stripe Webhook Handler
// Called from app/api/webhooks/stripe/route.ts on checkout.session.completed
// when metadata.type === 'event_ticket'.

import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type Stripe from 'stripe'
import { log } from '@/lib/logger'
import { appendLedgerEntryFromWebhook } from '@/lib/ledger/append-internal'

async function releaseTicketCapacity(db: any, ticket: any) {
  if (!ticket?.ticket_type_id || ticket.capacity_released_at) return

  const { data: ticketType } = await db
    .from('event_ticket_types')
    .select('sold_count')
    .eq('id', ticket.ticket_type_id)
    .single()

  if (!ticketType) return

  await db
    .from('event_ticket_types')
    .update({
      sold_count: Math.max(0, Number(ticketType.sold_count || 0) - Number(ticket.quantity || 0)),
    })
    .eq('id', ticket.ticket_type_id)
    .eq('sold_count', ticketType.sold_count)
}

async function getOrCreateTicketBuyerClient({
  db,
  tenantId,
  buyerName,
  buyerEmail,
  buyerPhone,
  dietaryRestrictions,
  allergies,
}: {
  db: any
  tenantId: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string | null
  dietaryRestrictions: string[] | null
  allergies: string[] | null
}) {
  const normalizedEmail = buyerEmail.toLowerCase().trim()

  const { data: existing } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const insertData: Record<string, unknown> = {
    tenant_id: tenantId,
    full_name: buyerName.trim() || normalizedEmail,
    email: normalizedEmail,
    phone: buyerPhone ?? null,
    status: 'active',
    referral_source: 'website',
  }

  if (dietaryRestrictions?.length) insertData.dietary_restrictions = dietaryRestrictions
  if (allergies?.length) insertData.allergies = allergies

  const { data: created, error } = await db.from('clients').insert(insertData).select('id').single()

  if (error) {
    if (error.code === '23505') {
      const { data: raced } = await db
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', normalizedEmail)
        .maybeSingle()
      if (raced?.id) return raced.id as string
    }
    throw error
  }

  return created.id as string
}

async function appendTicketRevenueLedgerEntry({
  db,
  session,
  ticket,
  ticketId,
  eventId,
  tenantId,
  paymentIntentId,
}: {
  db: any
  session: Stripe.Checkout.Session
  ticket: any
  ticketId: string
  eventId: string
  tenantId: string
  paymentIntentId: string | null
}) {
  const ticketCents = Number(ticket.total_cents ?? 0)
  const { data: addonRows } = await db
    .from('event_ticket_addon_purchases')
    .select('total_cents')
    .eq('ticket_id', ticketId)

  const addonCents = (addonRows ?? []).reduce(
    (sum: number, row: any) => sum + Number(row.total_cents ?? 0),
    0
  )
  const totalCents = ticketCents + addonCents
  if (totalCents <= 0) return

  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id, occasion')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event) {
    throw new Error('Ticket event not found for ledger entry')
  }

  const clientId =
    event.client_id ??
    (await getOrCreateTicketBuyerClient({
      db,
      tenantId,
      buyerName: ticket.buyer_name,
      buyerEmail: ticket.buyer_email,
      buyerPhone: ticket.buyer_phone ?? null,
      dietaryRestrictions: ticket.dietary_restrictions ?? null,
      allergies: ticket.allergies ?? null,
    }))

  const transactionReference = `stripe_ticket_${paymentIntentId ?? session.id}`
  const eventLabel = event.occasion ? ` for ${event.occasion}` : ''

  await appendLedgerEntryFromWebhook({
    tenant_id: tenantId,
    client_id: clientId,
    entry_type: 'payment',
    amount_cents: totalCents,
    payment_method: 'card',
    description: `Ticket purchase${eventLabel}`,
    event_id: eventId,
    transaction_reference: transactionReference,
    internal_notes: `Stripe checkout session ${session.id}; ticket ${ticketId}`,
    is_refund: false,
    received_at: new Date().toISOString(),
    created_by: null,
  })
}

export async function handleTicketPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { ticket_id, event_id, tenant_id } = paymentIntent.metadata ?? {}
  if (!ticket_id || !event_id || !tenant_id) {
    log.webhooks.info('Ticket payment failure skipped without metadata', {
      context: { paymentIntentId: paymentIntent.id },
    })
    return
  }

  const db: any = createServerClient({ admin: true })
  const { data: ticket } = await db
    .from('event_tickets')
    .select(
      'id, event_id, tenant_id, ticket_type_id, quantity, payment_status, payment_failure_count, capacity_released_at'
    )
    .eq('id', ticket_id)
    .single()

  if (!ticket || ticket.payment_status === 'paid') return

  await releaseTicketCapacity(db, ticket)

  const nowIso = new Date().toISOString()
  await db
    .from('event_tickets')
    .update({
      payment_status: 'failed',
      stripe_payment_intent_id: paymentIntent.id,
      payment_failure_count: (ticket.payment_failure_count ?? 0) + 1,
      last_payment_error:
        paymentIntent.last_payment_error?.message ||
        paymentIntent.last_payment_error?.code ||
        'Payment failed',
      payment_failed_at: nowIso,
      retry_available_at: nowIso,
      capacity_released_at: ticket.capacity_released_at ?? nowIso,
    })
    .eq('id', ticket_id)
    .neq('payment_status', 'paid')

  log.webhooks.warn('Ticket payment failed', {
    tenantId: tenant_id,
    context: {
      eventId: event_id,
      ticketId: ticket_id,
      paymentIntentId: paymentIntent.id,
    },
  })

  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenant_id)
    if (chefUserId) {
      await createNotification({
        tenantId: tenant_id,
        recipientId: chefUserId,
        category: 'payment',
        action: 'payment_failed',
        title: 'Ticket payment failed',
        body: 'A guest ticket payment failed and the seats were released.',
        actionUrl: `/events/${event_id}`,
        eventId: event_id,
        metadata: { ticket_id, payment_intent_id: paymentIntent.id },
      })
    }
  } catch (err) {
    console.error('[handleTicketPaymentFailed] Notification failed (non-blocking):', err)
  }

  revalidatePath(`/events/${event_id}`)
}

export async function handleTicketPaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const { ticket_id, event_id } = paymentIntent.metadata ?? {}
  if (!ticket_id || !event_id) return

  const db: any = createServerClient({ admin: true })
  const { data: ticket } = await db
    .from('event_tickets')
    .select('id, ticket_type_id, quantity, payment_status, capacity_released_at')
    .eq('id', ticket_id)
    .single()

  if (!ticket || ticket.payment_status === 'paid') return

  await releaseTicketCapacity(db, ticket)
  const nowIso = new Date().toISOString()
  await db
    .from('event_tickets')
    .update({
      payment_status: 'cancelled',
      stripe_payment_intent_id: paymentIntent.id,
      last_payment_error: paymentIntent.cancellation_reason || 'Payment canceled',
      retry_available_at: nowIso,
      capacity_released_at: ticket.capacity_released_at ?? nowIso,
      cancelled_at: nowIso,
    })
    .eq('id', ticket_id)
    .neq('payment_status', 'paid')

  revalidatePath(`/events/${event_id}`)
}

export async function handleTicketCheckoutExpired(session: Stripe.Checkout.Session) {
  const { ticket_id, event_id } = session.metadata ?? {}
  if (!ticket_id || !event_id) return

  const db: any = createServerClient({ admin: true })
  const { data: ticket } = await db
    .from('event_tickets')
    .select('id, ticket_type_id, quantity, payment_status, capacity_released_at')
    .eq('id', ticket_id)
    .single()

  if (!ticket || ticket.payment_status !== 'pending') return

  await releaseTicketCapacity(db, ticket)
  const nowIso = new Date().toISOString()
  await db
    .from('event_tickets')
    .update({
      payment_status: 'cancelled',
      last_payment_error: 'Checkout expired',
      retry_available_at: nowIso,
      capacity_released_at: ticket.capacity_released_at ?? nowIso,
      cancelled_at: nowIso,
    })
    .eq('id', ticket_id)
    .eq('payment_status', 'pending')

  revalidatePath(`/events/${event_id}`)
}

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
      'id, payment_status, buyer_name, buyer_email, buyer_phone, quantity, total_cents, dietary_restrictions, allergies, plus_one_name, plus_one_dietary, plus_one_allergies, notes'
    )
    .eq('id', ticket_id)
    .single()

  if (!ticket) {
    console.error('[handleTicketPurchaseCompleted] Ticket not found:', ticket_id)
    return
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : ((session.payment_intent as any)?.id ?? null)

  if (ticket.payment_status === 'paid') {
    await appendTicketRevenueLedgerEntry({
      db,
      session,
      ticket,
      ticketId: ticket_id,
      eventId: event_id,
      tenantId: tenant_id,
      paymentIntentId,
    })
    console.info('[handleTicketPurchaseCompleted] Already paid (idempotent):', ticket_id)
    return
  }

  // 1. Mark ticket as paid

  const { data: paidUpdate, error: paidUpdateError } = await db
    .from('event_tickets')
    .update({
      payment_status: 'paid',
      stripe_payment_intent_id: paymentIntentId,
      last_payment_error: null,
      retry_available_at: null,
      payment_failed_at: null,
    })
    .eq('id', ticket_id)
    .eq('payment_status', 'pending') // CAS guard
    .select('id')
    .maybeSingle()

  if (paidUpdateError || !paidUpdate) {
    throw new Error('Ticket payment state changed before confirmation could be recorded')
  }

  await appendTicketRevenueLedgerEntry({
    db,
    session,
    ticket,
    ticketId: ticket_id,
    eventId: event_id,
    tenantId: tenant_id,
    paymentIntentId,
  })

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
    let eventShareId: string | null = null
    try {
      const { data: share } = await db
        .from('event_shares')
        .select('id')
        .eq('event_id', event_id)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      eventShareId = share?.id ?? null
    } catch (shareErr) {
      console.error(
        '[handleTicketPurchaseCompleted] Event share lookup failed (non-blocking):',
        shareErr
      )
    }

    const guestInsert: Record<string, unknown> = {
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
    }
    if (eventShareId) {
      guestInsert.event_share_id = eventShareId
    }

    const { data: guest } = await db.from('event_guests').insert(guestInsert).select('id').single()

    if (guest) {
      await db.from('event_tickets').update({ event_guest_id: guest.id }).eq('id', ticket_id)
    }
  } catch (guestErr) {
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

    const { data: shareSettings } = await db
      .from('event_share_settings')
      .select('share_token')
      .eq('event_id', event_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
    const circleUrl = circleGroup?.group_token ? `${appUrl}/hub/g/${circleGroup.group_token}` : null
    const eventUrl = shareSettings?.share_token ? `${appUrl}/e/${shareSettings.share_token}` : null

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
        actionUrl: circleUrl || eventUrl || appUrl,
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

  log.events.info('Ticket purchase confirmed', {
    tenantId: tenant_id,
    context: {
      eventId: event_id,
      ticketId: ticket_id,
      ticketTypeId: ticket_type_id ?? null,
      quantity: ticket.quantity,
      paymentIntentId,
    },
  })

  // 7. Cache invalidation
  try {
    revalidatePath(`/events/${event_id}`)
    revalidatePath('/events')
    revalidatePath('/dashboard')
    revalidatePath('/finance')
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

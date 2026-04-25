// Quote Client Actions - Client-side
// Clients can view pending quotes and accept/reject them.

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { getClientPortalAccess } from '@/lib/client-portal/actions'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { convertInquiryToEventWithContext } from '@/lib/inquiries/actions'
import { revalidatePath } from 'next/cache'
import { pushToDLQ } from '@/lib/resilience/retry'
import { executeInteraction } from '@/lib/interactions'

const CLIENT_QUOTE_DETAIL_SELECT = `
  id, tenant_id, inquiry_id, event_id, client_id,
  created_at, updated_at, quote_name, pricing_model,
  price_per_person_cents, guest_count_estimated,
  total_quoted_cents, deposit_required, deposit_amount_cents,
  deposit_percentage, pricing_notes, status,
  sent_at, accepted_at, rejected_at, rejected_reason,
  expired_at, valid_until, snapshot_frozen,
  negotiation_occurred, original_quoted_cents,
  version, is_superseded, show_cost_breakdown,
  exclusions_note, addon_total_cents, effective_total_cents,
  cover_photo_url, chef_message,
  inquiry:inquiries(id, confirmed_occasion, confirmed_date, confirmed_guest_count)
`

type QuoteResponseContext = {
  clientId: string
  actorId: string | null
}

async function loadQuoteMenus(db: any, eventId: string | null) {
  if (!eventId) return []

  const { data: menuData } = await db
    .from('menus')
    .select(
      `id, name, description, service_style,
      dishes (id, course_name, course_number, description, dietary_tags, allergen_flags, sort_order)`
    )
    .eq('event_id', eventId)

  return menuData || []
}

async function getQuoteDetailForClient(db: any, quoteId: string, clientId: string) {
  const { data: quote, error } = await db
    .from('quotes')
    .select(CLIENT_QUOTE_DETAIL_SELECT)
    .eq('id', quoteId)
    .eq('client_id', clientId)
    .single()

  if (error || !quote) {
    if (error) {
      console.error('[getQuoteDetailForClient] Error:', error)
    }
    return null
  }

  const menus = await loadQuoteMenus(db, quote.event_id ?? null)
  return { ...quote, menus }
}

// ============================================
// 1. GET CLIENT QUOTES
// ============================================

export async function getClientQuotes() {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: quotes, error } = await db
    .from('quotes')
    .select(
      `
      *,
      inquiry:inquiries(id, confirmed_occasion, confirmed_date, confirmed_guest_count),
      event:events(occasion, event_date)
    `
    )
    .eq('client_id', user.entityId)
    .in('status', ['sent', 'accepted', 'rejected'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClientQuotes] Error:', error)
    throw new Error('Failed to fetch quotes')
  }

  return quotes
}

// ============================================
// 2. GET CLIENT QUOTE BY ID
// ============================================

export async function getClientQuoteById(quoteId: string) {
  const user = await requireClient()
  const db: any = createServerClient()
  return getQuoteDetailForClient(db, quoteId, user.entityId)
}

export async function getClientPortalQuoteById(token: string, quoteId: string) {
  const access = await getClientPortalAccess(token)
  if (!access) return null

  const db: any = createServerClient({ admin: true })
  return getQuoteDetailForClient(db, quoteId, access.clientId)
}

// ============================================
// 3. ACCEPT QUOTE
// ============================================

/**
 * Client accepts a quote.
 * Atomic DB RPC updates:
 * - quotes.status -> accepted (with frozen snapshot trigger)
 * - inquiries.status quoted -> confirmed (if linked)
 * - events pricing fields (if linked)
 */
async function acceptQuoteForContext(quoteId: string, context: QuoteResponseContext) {
  const db: any = createServerClient({ admin: true })

  const { data: preCheck } = await db
    .from('quotes')
    .select(
      'id, status, valid_until, event_id, tenant_id, inquiry_id, quote_name, total_quoted_cents, deposit_required, deposit_amount_cents, events(status)'
    )
    .eq('id', quoteId)
    .eq('client_id', context.clientId)
    .single()

  if (!preCheck) {
    throw new Error('Quote not found')
  }

  if (preCheck.status !== 'sent') {
    throw new Error('This quote is no longer available for acceptance.')
  }
  if (preCheck.valid_until && new Date(preCheck.valid_until) < new Date()) {
    throw new Error('This quote has expired and can no longer be accepted.')
  }
  const eventStatus = (preCheck.events as any)?.status
  if (eventStatus === 'cancelled') {
    throw new Error('This event has been cancelled. The quote is no longer available.')
  }

  const hadLinkedEvent = Boolean(preCheck.event_id)
  const { error: responseError } = await db.rpc('respond_to_quote_atomic', {
    p_quote_id: quoteId,
    p_client_id: context.clientId,
    p_new_status: 'accepted',
    p_actor_id: context.actorId,
    p_rejected_reason: null,
  })

  if (responseError) {
    throw new Error(
      responseError.message
        ? `Failed to accept quote: ${responseError.message}`
        : 'Failed to accept quote'
    )
  }

  let eventId = (preCheck.event_id as string | null) ?? null
  if (!eventId && preCheck.inquiry_id && preCheck.tenant_id) {
    try {
      const conversion = await convertInquiryToEventWithContext({
        db,
        tenantId: preCheck.tenant_id as string,
        actorId: context.actorId,
        inquiryId: preCheck.inquiry_id as string,
      })
      eventId = (conversion as any)?.event?.id ?? null
    } catch (conversionErr) {
      console.error(
        '[acceptQuote] Inquiry conversion failed after quote acceptance (manual recovery may be required):',
        conversionErr
      )
    }
  }

  const quote = {
    tenant_id: preCheck.tenant_id as string,
    event_id: eventId,
    inquiry_id: preCheck.inquiry_id as string | null,
    quote_name: preCheck.quote_name as string | null,
    total_quoted_cents: preCheck.total_quoted_cents as number | null,
    deposit_required: preCheck.deposit_required as boolean | null,
    deposit_amount_cents: preCheck.deposit_amount_cents as number | null,
  }

  revalidatePath('/my-quotes')
  revalidatePath(`/my-quotes/${quoteId}`)
  revalidatePath('/my-events')
  revalidatePath('/quotes')
  revalidatePath(`/quotes/${quoteId}`)
  if (quote.inquiry_id) {
    revalidatePath(`/inquiries/${quote.inquiry_id}`)
    revalidatePath('/inquiries')
  }
  if (quote.event_id) {
    revalidatePath(`/events/${quote.event_id}`)
    revalidatePath('/events')
  }

  await executeInteraction({
    action_type: 'approve_quote',
    actor_id: context.actorId ?? context.clientId,
    actor: {
      role: 'client',
      actorId: context.actorId ?? context.clientId,
      entityId: context.clientId,
      tenantId: quote.tenant_id,
    },
    target_type: quote.event_id ? 'event' : 'system',
    target_id: quote.event_id ?? quoteId,
    context_type: 'client',
    context_id: context.clientId,
    visibility: 'private',
    metadata: {
      tenant_id: quote.tenant_id,
      client_id: context.clientId,
      quote_id: quoteId,
      inquiry_id: quote.inquiry_id,
      event_id: quote.event_id,
      total_quoted_cents: quote.total_quoted_cents,
      deposit_required: quote.deposit_required,
      deposit_amount_cents: quote.deposit_amount_cents,
      source: 'client_quote_accept',
      suppress_interaction_notifications: true,
      suppress_interaction_activity: true,
      suppress_interaction_automation: true,
    },
    idempotency_key: `approve_quote:${quoteId}:${context.clientId}`,
  })

  if (hadLinkedEvent && quote.event_id) {
    try {
      const { transitionEvent } = await import('@/lib/events/transitions')
      await transitionEvent({
        eventId: quote.event_id,
        toStatus: 'accepted',
        metadata: { triggered_by: 'quote_acceptance', quote_id: quoteId },
      })
    } catch (transitionErr) {
      console.error('[acceptQuote] Event auto-transition failed (non-blocking):', transitionErr)
    }
  }

  if (quote.tenant_id) {
    try {
      const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
      await circleFirstNotify({
        eventId: quote.event_id,
        inquiryId: quote.inquiry_id,
        notificationType: 'quote_accepted',
        body: "Quote accepted! We're locked in. Next up: finalizing the menu and confirming all the details.",
        metadata: { quote_id: quoteId },
        actionUrl: quote.event_id ? `/my-events/${quote.event_id}` : undefined,
        actionLabel: quote.event_id ? 'View Event' : undefined,
      })
    } catch (circleErr) {
      console.error('[acceptQuote] Circle-first notify failed (non-blocking):', circleErr)
    }
  }

  if (quote.tenant_id) {
    try {
      const { emitWebhook } = await import('@/lib/webhooks/emitter')
      await emitWebhook(quote.tenant_id, 'quote.accepted', {
        quote_id: quoteId,
        client_id: context.clientId,
        total_quoted_cents: quote.total_quoted_cents,
      })
    } catch (err) {
      console.error('[acceptQuote] Webhook emit failed (non-blocking):', err)
    }
  }

  if (quote.tenant_id) {
    try {
      const { fireTrigger } = await import('@/lib/loyalty/triggers')
      await fireTrigger('quote_accepted', quote.tenant_id, context.clientId, {
        eventId: quote.event_id || undefined,
        description: 'Quote accepted',
      })
    } catch (err) {
      console.error('[acceptQuote] Loyalty trigger failed (non-blocking):', err)
    }
  }

  if (quote.tenant_id) {
    notifyChefOfQuoteAccepted(quote.tenant_id, quoteId, quote, context.clientId).catch(
      async (err) => {
        console.error('[acceptQuote] Chef notification failed:', err)
        await pushToDLQ(createAdminClient() as any, {
          tenantId: quote.tenant_id,
          jobType: 'quote.accepted.notify_chef',
          jobId: quoteId,
          payload: { quote_id: quoteId, client_id: context.clientId },
          errorMessage: err instanceof Error ? err.message : 'Unknown notification failure',
          attempts: 1,
        })
      }
    )
  }

  return { success: true, eventId: quote.event_id }
}

export async function acceptQuote(quoteId: string) {
  const user = await requireClient()
  return acceptQuoteForContext(quoteId, {
    clientId: user.entityId,
    actorId: user.id,
  })
}

export async function acceptQuoteByPortalToken(token: string, quoteId: string) {
  const access = await getClientPortalAccess(token)
  if (!access) {
    throw new Error('This secure link is no longer valid.')
  }

  return acceptQuoteForContext(quoteId, {
    clientId: access.clientId,
    actorId: null,
  })
}

// ============================================
// 4. REJECT QUOTE
// ============================================

async function rejectQuoteForContext(
  quoteId: string,
  reason: string | undefined,
  context: QuoteResponseContext
) {
  const db: any = createServerClient({ admin: true })

  const { data: response, error: responseError } = await db.rpc('respond_to_quote_atomic', {
    p_quote_id: quoteId,
    p_client_id: context.clientId,
    p_new_status: 'rejected',
    p_actor_id: context.actorId,
    p_rejected_reason: reason ?? null,
  })

  if (responseError || !response) {
    throw new Error(
      responseError?.message
        ? `Failed to reject quote: ${responseError.message}`
        : 'Failed to reject quote'
    )
  }

  const quote = response as {
    tenant_id: string
    event_id?: string | null
    quote_name?: string | null
    inquiry_id?: string | null
  }

  revalidatePath('/my-quotes')
  revalidatePath(`/my-quotes/${quoteId}`)
  revalidatePath('/my-events')

  if (quote.inquiry_id) {
    try {
      const { data: inq } = await db
        .from('inquiries')
        .select('status')
        .eq('id', quote.inquiry_id)
        .single()
      if (inq && (inq as any).status === 'quoted') {
        await db
          .from('inquiries')
          .update({ status: 'awaiting_chef', updated_at: new Date().toISOString() })
          .eq('id', quote.inquiry_id)
        await db.from('inquiry_state_transitions').insert({
          tenant_id: quote.tenant_id,
          inquiry_id: quote.inquiry_id,
          from_status: 'quoted',
          to_status: 'awaiting_chef',
          reason: `Quote rejected by client${reason ? `: ${reason}` : ''}`,
        })
      }
    } catch (err) {
      console.error('[rejectQuote] Inquiry status revert failed (non-blocking):', err)
    }
  }

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${quoteId}`)
  revalidatePath('/dashboard')
  if (quote.inquiry_id) {
    revalidatePath(`/inquiries/${quote.inquiry_id}`)
    revalidatePath('/inquiries')
  }
  if (quote.event_id) {
    revalidatePath(`/events/${quote.event_id}`)
    revalidatePath('/events')
  }

  if (quote.tenant_id) {
    try {
      const { emitWebhook } = await import('@/lib/webhooks/emitter')
      await emitWebhook(quote.tenant_id, 'quote.rejected', {
        quote_id: quoteId,
        client_id: context.clientId,
        reason: reason || null,
      })
    } catch (err) {
      console.error('[rejectQuote] Webhook emit failed (non-blocking):', err)
    }
  }

  if (quote.tenant_id) {
    notifyChefOfQuoteRejected(
      quote.tenant_id,
      quoteId,
      { quote_name: quote.quote_name, inquiry_id: quote.inquiry_id },
      context.clientId,
      reason || null
    ).catch(async (err) => {
      console.error('[rejectQuote] Chef notification failed:', err)
      await pushToDLQ(createAdminClient() as any, {
        tenantId: quote.tenant_id,
        jobType: 'quote.rejected.notify_chef',
        jobId: quoteId,
        payload: { quote_id: quoteId, client_id: context.clientId },
        errorMessage: err instanceof Error ? err.message : 'Unknown notification failure',
        attempts: 1,
      })
    })
  }

  return { success: true }
}

export async function rejectQuote(quoteId: string, reason?: string) {
  const user = await requireClient()
  return rejectQuoteForContext(quoteId, reason, {
    clientId: user.entityId,
    actorId: user.id,
  })
}

export async function rejectQuoteByPortalToken(token: string, quoteId: string, reason?: string) {
  const access = await getClientPortalAccess(token)
  if (!access) {
    throw new Error('This secure link is no longer valid.')
  }

  return rejectQuoteForContext(quoteId, reason, {
    clientId: access.clientId,
    actorId: null,
  })
}

// --- Internal: notify chef when a quote is accepted ---

async function notifyChefOfQuoteAccepted(
  tenantId: string,
  quoteId: string,
  quote: {
    quote_name?: string | null
    total_quoted_cents?: number | null
    deposit_required?: boolean | null
    deposit_amount_cents?: number | null
    inquiry_id?: string | null
  },
  clientId: string
): Promise<void> {
  const { createNotification, getChefAuthUserId, getChefProfile } =
    await import('@/lib/notifications/actions')

  const [chefUserId, chefProfile] = await Promise.all([
    getChefAuthUserId(tenantId),
    getChefProfile(tenantId),
  ])

  if (!chefUserId) return

  // Load client name
  const db: any = createAdminClient()
  const { data: client } = await db.from('clients').select('full_name').eq('id', clientId).single()
  const clientName = client?.full_name ?? 'A client'

  const quoteName = quote.quote_name || 'Quote'
  const totalCents = quote.total_quoted_cents ?? 0
  const inquiryId = quote.inquiry_id

  // In-app notification
  await createNotification({
    tenantId,
    recipientId: chefUserId,
    category: 'quote',
    action: 'quote_accepted',
    title: 'Quote accepted',
    body: `${clientName} accepted ${quoteName}`,
    actionUrl: inquiryId ? `/inquiries/${inquiryId}` : '/inquiries',
    clientId,
    inquiryId: inquiryId ?? undefined,
    metadata: { quote_id: quoteId, total_cents: totalCents },
  })

  // Email the chef
  if (chefProfile) {
    const { sendQuoteAcceptedChefEmail } = await import('@/lib/email/notifications')
    await sendQuoteAcceptedChefEmail({
      chefEmail: chefProfile.email,
      chefName: chefProfile.name,
      clientName,
      quoteName,
      totalCents,
      depositRequired: quote.deposit_required ?? false,
      depositCents: quote.deposit_amount_cents ?? null,
      inquiryId: inquiryId ?? quoteId,
    })
  }
}

// --- Internal: notify chef when a quote is rejected ---

async function notifyChefOfQuoteRejected(
  tenantId: string,
  quoteId: string,
  quote: {
    quote_name?: string | null
    inquiry_id?: string | null
  },
  clientId: string,
  rejectionReason: string | null
): Promise<void> {
  const { createNotification, getChefAuthUserId, getChefProfile } =
    await import('@/lib/notifications/actions')

  const [chefUserId, chefProfile] = await Promise.all([
    getChefAuthUserId(tenantId),
    getChefProfile(tenantId),
  ])

  if (!chefUserId) return

  // Load client name
  const db: any = createAdminClient()
  const { data: client } = await db.from('clients').select('full_name').eq('id', clientId).single()
  const clientName = client?.full_name ?? 'A client'

  const quoteName = quote.quote_name || 'Quote'
  const inquiryId = quote.inquiry_id

  // In-app notification
  await createNotification({
    tenantId,
    recipientId: chefUserId,
    category: 'quote',
    action: 'quote_rejected',
    title: 'Quote declined',
    body: `${clientName} declined ${quoteName}`,
    actionUrl: inquiryId ? `/inquiries/${inquiryId}` : '/inquiries',
    clientId,
    inquiryId: inquiryId ?? undefined,
    metadata: { quote_id: quoteId, rejection_reason: rejectionReason },
  })

  // Email the chef
  if (chefProfile) {
    const { sendQuoteRejectedChefEmail } = await import('@/lib/email/notifications')
    await sendQuoteRejectedChefEmail({
      chefEmail: chefProfile.email,
      chefName: chefProfile.name,
      clientName,
      quoteName,
      rejectionReason,
      inquiryId: inquiryId ?? null,
    })
  }
}

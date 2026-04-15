// Quote Client Actions - Client-side
// Clients can view pending quotes and accept/reject them.

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { revalidatePath } from 'next/cache'
import { pushToDLQ } from '@/lib/resilience/retry'

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
      inquiry:inquiries(id, confirmed_occasion)
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

  const { data: quote, error } = await db
    .from('quotes')
    .select(
      `
      *,
      inquiry:inquiries(id, confirmed_occasion, confirmed_date, confirmed_guest_count)
    `
    )
    .eq('id', quoteId)
    .eq('client_id', user.entityId)
    .single()

  if (error) {
    console.error('[getClientQuoteById] Error:', error)
    return null
  }

  return quote
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
export async function acceptQuote(quoteId: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  // Pre-flight: fetch quote + associated event before calling the atomic RPC.
  // The RPC checks client ownership but not expiry or event cancellation.
  const { data: preCheck } = await db
    .from('quotes')
    .select('id, status, valid_until, event_id, events(status)')
    .eq('id', quoteId)
    .eq('client_id', user.entityId)
    .single()

  if (preCheck) {
    // Only quotes in 'sent' status can be accepted. Guard here to fail fast
    // before the atomic RPC — the RPC enforces this too, but an early check
    // returns a clearer error message to the client.
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
  }

  const { data: response, error: responseError } = await db.rpc('respond_to_quote_atomic', {
    p_quote_id: quoteId,
    p_client_id: user.entityId,
    p_new_status: 'accepted',
    p_actor_id: user.id,
    p_rejected_reason: null,
  })

  if (responseError || !response) {
    throw new Error(
      responseError?.message
        ? `Failed to accept quote: ${responseError.message}`
        : 'Failed to accept quote'
    )
  }

  const quote = response as {
    tenant_id: string
    event_id: string | null
    inquiry_id: string | null
    quote_name?: string | null
    total_quoted_cents?: number | null
    deposit_required?: boolean | null
    deposit_amount_cents?: number | null
  }

  revalidatePath('/my-quotes')
  revalidatePath(`/my-quotes/${quoteId}`)
  revalidatePath('/my-events')

  // Chef-side cache invalidation
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

  // Circle-first: post quote accepted notification (non-blocking)
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

  // Outbound webhook dispatch (non-blocking)
  if (quote.tenant_id) {
    try {
      const { emitWebhook } = await import('@/lib/webhooks/emitter')
      await emitWebhook(quote.tenant_id, 'quote.accepted', {
        quote_id: quoteId,
        client_id: user.entityId,
        total_quoted_cents: quote.total_quoted_cents,
      })
    } catch {}
  }

  // Loyalty trigger: quote accepted (non-blocking)
  if (quote.tenant_id) {
    try {
      const { fireTrigger } = await import('@/lib/loyalty/triggers')
      await fireTrigger('quote_accepted', quote.tenant_id, user.entityId, {
        eventId: quote.event_id || undefined,
        description: 'Quote accepted',
      })
    } catch (err) {
      console.error('[acceptQuote] Loyalty trigger failed (non-blocking):', err)
    }
  }

  // Notify chef that quote was accepted (non-blocking)
  if (quote.tenant_id) {
    notifyChefOfQuoteAccepted(quote.tenant_id, quoteId, quote, user.entityId).catch(async (err) => {
      console.error('[acceptQuote] Chef notification failed:', err)
      await pushToDLQ(createAdminClient() as any, {
        tenantId: quote.tenant_id,
        jobType: 'quote.accepted.notify_chef',
        jobId: quoteId,
        payload: { quote_id: quoteId, client_id: user.entityId },
        errorMessage: err instanceof Error ? err.message : 'Unknown notification failure',
        attempts: 1,
      })
    })
  }

  return { success: true }
}

// ============================================
// 4. REJECT QUOTE
// ============================================

export async function rejectQuote(quoteId: string, reason?: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: response, error: responseError } = await db.rpc('respond_to_quote_atomic', {
    p_quote_id: quoteId,
    p_client_id: user.entityId,
    p_new_status: 'rejected',
    p_actor_id: user.id,
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

  // Chef-side cache invalidation
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

  // Outbound webhook dispatch (non-blocking)
  if (quote.tenant_id) {
    try {
      const { emitWebhook } = await import('@/lib/webhooks/emitter')
      await emitWebhook(quote.tenant_id, 'quote.rejected', {
        quote_id: quoteId,
        client_id: user.entityId,
        reason: reason || null,
      })
    } catch {}
  }

  // Notify chef that quote was rejected (non-blocking)
  if (quote.tenant_id) {
    notifyChefOfQuoteRejected(
      quote.tenant_id,
      quoteId,
      { quote_name: quote.quote_name, inquiry_id: quote.inquiry_id },
      user.entityId,
      reason || null
    ).catch(async (err) => {
      console.error('[rejectQuote] Chef notification failed:', err)
      await pushToDLQ(createAdminClient() as any, {
        tenantId: quote.tenant_id,
        jobType: 'quote.rejected.notify_chef',
        jobId: quoteId,
        payload: { quote_id: quoteId, client_id: user.entityId },
        errorMessage: err instanceof Error ? err.message : 'Unknown notification failure',
        attempts: 1,
      })
    })
  }

  return { success: true }
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

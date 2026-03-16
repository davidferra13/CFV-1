// Quote Client Actions - Client-side
// Clients can view pending quotes and accept/reject them.

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { pushToDLQ } from '@/lib/resilience/retry'

// ============================================
// 1. GET CLIENT QUOTES
// ============================================

export async function getClientQuotes() {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: quotes, error } = await supabase
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
  const supabase: any = createServerClient()

  const { data: quote, error } = await supabase
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
  const supabase: any = createServerClient()

  const { data: response, error: responseError } = await supabase.rpc('respond_to_quote_atomic', {
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
  const supabase: any = createServerClient()

  const { data: response, error: responseError } = await supabase.rpc('respond_to_quote_atomic', {
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
    quote_name?: string | null
    inquiry_id?: string | null
  }

  revalidatePath('/my-quotes')
  revalidatePath(`/my-quotes/${quoteId}`)

  // Chef-side cache invalidation
  revalidatePath('/quotes')
  revalidatePath(`/quotes/${quoteId}`)
  if (quote.inquiry_id) {
    revalidatePath(`/inquiries/${quote.inquiry_id}`)
    revalidatePath('/inquiries')
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
  const supabase: any = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', clientId)
    .single()
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
  const supabase: any = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', clientId)
    .single()
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

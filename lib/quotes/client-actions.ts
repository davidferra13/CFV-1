// Quote Client Actions — Client-side
// Clients can view pending quotes and accept/reject them

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database, Json } from '@/types/database'

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
 * Client accepts a quote
 * Freezes pricing snapshot and triggers downstream effects:
 * - If linked to inquiry at 'quoted' status → transitions inquiry to 'confirmed'
 * - If linked to event → updates event pricing
 */
export async function acceptQuote(quoteId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Fetch quote with full pricing data
  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('*, tenant_id')
    .eq('id', quoteId)
    .eq('client_id', user.entityId)
    .single()

  if (fetchError || !quote) {
    throw new Error('Quote not found')
  }

  if (quote.status !== 'sent') {
    throw new Error('Quote is not pending review')
  }

  // Freeze the pricing snapshot
  const pricingSnapshot = {
    total_quoted_cents: quote.total_quoted_cents,
    price_per_person_cents: quote.price_per_person_cents,
    guest_count_estimated: quote.guest_count_estimated,
    pricing_model: quote.pricing_model,
    deposit_amount_cents: quote.deposit_amount_cents,
    deposit_percentage: quote.deposit_percentage,
    deposit_required: quote.deposit_required,
    frozen_at: new Date().toISOString(),
  }

  // Update quote to accepted. Prefer client-scoped update (RLS-enforced).
  const updatePayload = {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    snapshot_frozen: true,
    pricing_snapshot: pricingSnapshot as unknown as Json,
  }

  const { data: updatedByClient, error: updateError } = await supabase
    .from('quotes')
    .update(updatePayload)
    .eq('id', quoteId)
    .eq('client_id', user.entityId)
    .eq('status', 'sent')
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('[acceptQuote] Error:', updateError)
    throw new Error(`Failed to accept quote: ${updateError.message}`)
  }

  // Downstream effects use admin client to bypass RLS
  const adminSupabase: any = createAdminClient()

  // Backward compatibility: if UPDATE returned no row due missing client UPDATE policy,
  // complete the transition via admin client after ownership was already verified above.
  if (!updatedByClient) {
    const { data: updatedByAdmin, error: adminUpdateError } = await adminSupabase
      .from('quotes')
      .update(updatePayload)
      .eq('id', quoteId)
      .eq('client_id', user.entityId)
      .eq('status', 'sent')
      .select('id')
      .maybeSingle()

    if (adminUpdateError || !updatedByAdmin) {
      console.error('[acceptQuote] Admin fallback failed:', adminUpdateError)
      throw new Error(
        adminUpdateError
          ? `Failed to accept quote: ${adminUpdateError.message}`
          : 'Failed to accept quote: no rows updated'
      )
    }
  }

  // If linked to inquiry at 'quoted' → transition to 'confirmed'
  if (quote.inquiry_id) {
    const { data: inquiry } = await adminSupabase
      .from('inquiries')
      .select('status')
      .eq('id', quote.inquiry_id)
      .single()

    if (inquiry && inquiry.status === 'quoted') {
      await adminSupabase
        .from('inquiries')
        .update({ status: 'confirmed' })
        .eq('id', quote.inquiry_id)
    }
  }

  // If linked to event → update event pricing
  if (quote.event_id) {
    await adminSupabase
      .from('events')
      .update({
        quoted_price_cents: quote.total_quoted_cents,
        deposit_amount_cents: quote.deposit_amount_cents,
        pricing_model: quote.pricing_model,
      })
      .eq('id', quote.event_id)
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

  // Notify chef that quote was accepted (non-blocking)
  const quoteTenantId = quote.tenant_id as string | undefined
  if (quoteTenantId) {
    notifyChefOfQuoteAccepted(quoteTenantId, quoteId, quote, user.entityId).catch((err) =>
      console.error('[acceptQuote] Chef notification failed:', err)
    )
  }

  return { success: true }
}

// ============================================
// 4. REJECT QUOTE
// ============================================

export async function rejectQuote(quoteId: string, reason?: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('status, tenant_id, quote_name, inquiry_id')
    .eq('id', quoteId)
    .eq('client_id', user.entityId)
    .single()

  if (fetchError || !quote) {
    throw new Error('Quote not found')
  }

  if (quote.status !== 'sent') {
    throw new Error('Quote is not pending review')
  }

  const updatePayload = {
    status: 'rejected',
    rejected_at: new Date().toISOString(),
    rejected_reason: reason || null,
  }

  const { data: updatedByClient, error: updateError } = await supabase
    .from('quotes')
    .update(updatePayload)
    .eq('id', quoteId)
    .eq('client_id', user.entityId)
    .eq('status', 'sent')
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('[rejectQuote] Error:', updateError)
    throw new Error(`Failed to reject quote: ${updateError.message}`)
  }

  if (!updatedByClient) {
    const adminSupabase: any = createAdminClient()
    const { data: updatedByAdmin, error: adminUpdateError } = await adminSupabase
      .from('quotes')
      .update(updatePayload)
      .eq('id', quoteId)
      .eq('client_id', user.entityId)
      .eq('status', 'sent')
      .select('id')
      .maybeSingle()

    if (adminUpdateError || !updatedByAdmin) {
      console.error('[rejectQuote] Admin fallback failed:', adminUpdateError)
      throw new Error(
        adminUpdateError
          ? `Failed to reject quote: ${adminUpdateError.message}`
          : 'Failed to reject quote: no rows updated'
      )
    }
  }

  revalidatePath('/my-quotes')
  revalidatePath(`/my-quotes/${quoteId}`)

  // Chef-side cache invalidation
  revalidatePath('/quotes')
  revalidatePath(`/quotes/${quoteId}`)

  // Notify chef that quote was rejected (non-blocking)
  if (quote.tenant_id) {
    notifyChefOfQuoteRejected(
      quote.tenant_id,
      quoteId,
      { quote_name: quote.quote_name, inquiry_id: quote.inquiry_id },
      user.entityId,
      reason || null
    ).catch((err) => console.error('[rejectQuote] Chef notification failed:', err))
  }

  return { success: true }
}

// ─── Internal: notify chef when a quote is accepted ──────────────────────────

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

// ─── Internal: notify chef when a quote is rejected ──────────────────────────

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

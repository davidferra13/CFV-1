// Quote Client Actions — Client-side
// Clients can view pending quotes and accept/reject them

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database, Json } from '@/types/database'

// ============================================
// 1. GET CLIENT QUOTES
// ============================================

export async function getClientQuotes() {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      *,
      inquiry:inquiries(id, confirmed_occasion)
    `)
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
  const supabase = createServerClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      inquiry:inquiries(id, confirmed_occasion, confirmed_date, confirmed_guest_count)
    `)
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
  const supabase = createServerClient()

  // Fetch quote with full pricing data
  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('*')
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

  // Update quote to accepted
  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      snapshot_frozen: true,
      pricing_snapshot: pricingSnapshot as unknown as Json,
    })
    .eq('id', quoteId)
    .eq('client_id', user.entityId)

  if (updateError) {
    console.error('[acceptQuote] Error:', updateError)
    throw new Error('Failed to accept quote')
  }

  // Downstream effects use admin client to bypass RLS
  const adminSupabase = createServerClient({ admin: true })

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
  return { success: true }
}

// ============================================
// 4. REJECT QUOTE
// ============================================

export async function rejectQuote(quoteId: string, reason?: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('status')
    .eq('id', quoteId)
    .eq('client_id', user.entityId)
    .single()

  if (fetchError || !quote) {
    throw new Error('Quote not found')
  }

  if (quote.status !== 'sent') {
    throw new Error('Quote is not pending review')
  }

  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_reason: reason || null,
    })
    .eq('id', quoteId)
    .eq('client_id', user.entityId)

  if (updateError) {
    console.error('[rejectQuote] Error:', updateError)
    throw new Error('Failed to reject quote')
  }

  revalidatePath('/my-quotes')
  revalidatePath(`/my-quotes/${quoteId}`)
  return { success: true }
}

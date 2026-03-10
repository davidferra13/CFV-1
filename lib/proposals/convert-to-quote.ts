// Proposal-to-Quote Conversion
// One-click conversion from a proposal (proposal_token) into a new draft quote,
// carrying over all pricing, addon, and event details so the chef never re-enters data.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ValidationError, UnknownAppError } from '@/lib/errors/app-error'
import type { CreateQuoteInput } from '@/lib/quotes/actions'

// ============================================
// TYPES
// ============================================

export type ProposalConversionPreview = {
  proposalTokenId: string
  quoteId: string
  clientId: string
  clientName: string
  eventId: string | null
  eventOccasion: string | null
  eventDate: string | null
  guestCount: number | null
  pricingModel: string
  totalQuotedCents: number
  pricePerPersonCents: number | null
  depositRequired: boolean
  depositAmountCents: number | null
  depositPercentage: number | null
  pricingNotes: string | null
  addonCount: number
  addonTotalCents: number
  addons: Array<{
    name: string
    priceCents: number
    isPerPerson: boolean
  }>
}

// ============================================
// 1. PREVIEW - What the quote will look like
// ============================================

export async function getProposalForConversion(
  proposalTokenId: string
): Promise<ProposalConversionPreview> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the proposal token (must belong to this chef)
  const { data: tokenRow, error: tokenError } = await supabase
    .from('proposal_tokens')
    .select('id, quote_id, event_id, client_id')
    .eq('id', proposalTokenId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (tokenError || !tokenRow) {
    throw new ValidationError('Proposal not found or does not belong to your account')
  }

  // Fetch the source quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(
      `id, client_id, inquiry_id, event_id, pricing_model,
       total_quoted_cents, price_per_person_cents, guest_count_estimated,
       deposit_required, deposit_amount_cents, deposit_percentage,
       pricing_notes, addon_total_cents`
    )
    .eq('id', tokenRow.quote_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (quoteError || !quote) {
    throw new ValidationError('Source quote not found')
  }

  // Fetch client name
  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', tokenRow.client_id)
    .single()

  // Fetch event details
  let eventOccasion: string | null = null
  let eventDate: string | null = null
  let guestCount: number | null = quote.guest_count_estimated ?? null

  if (tokenRow.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('occasion, event_date, guest_count')
      .eq('id', tokenRow.event_id)
      .single()

    if (event) {
      eventOccasion = event.occasion
      eventDate = event.event_date
      guestCount = event.guest_count ?? guestCount
    }
  }

  // Fetch quote addons
  const { data: addons } = await supabase
    .from('quote_addons')
    .select('name, price_cents, is_per_person')
    .eq('quote_id', tokenRow.quote_id)
    .order('sort_order', { ascending: true })

  const addonList = (addons ?? []).map((a: any) => ({
    name: a.name,
    priceCents: a.price_cents,
    isPerPerson: a.is_per_person,
  }))

  const addonTotalCents = quote.addon_total_cents ?? 0

  return {
    proposalTokenId: tokenRow.id,
    quoteId: tokenRow.quote_id,
    clientId: tokenRow.client_id,
    clientName: client?.full_name ?? 'Unknown Client',
    eventId: tokenRow.event_id,
    eventOccasion,
    eventDate,
    guestCount,
    pricingModel: quote.pricing_model,
    totalQuotedCents: quote.total_quoted_cents,
    pricePerPersonCents: quote.price_per_person_cents,
    depositRequired: quote.deposit_required,
    depositAmountCents: quote.deposit_amount_cents,
    depositPercentage: quote.deposit_percentage,
    pricingNotes: quote.pricing_notes,
    addonCount: addonList.length,
    addonTotalCents,
    addons: addonList,
  }
}

// ============================================
// 2. CONVERT - Create a new quote from proposal
// ============================================

export async function convertProposalToQuote(
  proposalTokenId: string
): Promise<{ success: true; quoteId: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the proposal token (must belong to this chef)
  const { data: tokenRow, error: tokenError } = await supabase
    .from('proposal_tokens')
    .select('id, quote_id, event_id, client_id, contract_id')
    .eq('id', proposalTokenId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (tokenError || !tokenRow) {
    throw new ValidationError('Proposal not found or does not belong to your account')
  }

  // Fetch the source quote with all fields we need
  const { data: sourceQuote, error: quoteError } = await supabase
    .from('quotes')
    .select(
      `id, client_id, inquiry_id, event_id, quote_name,
       pricing_model, total_quoted_cents, price_per_person_cents,
       guest_count_estimated, deposit_required, deposit_amount_cents,
       deposit_percentage, valid_until, pricing_notes, internal_notes,
       addon_total_cents, effective_total_cents`
    )
    .eq('id', tokenRow.quote_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (quoteError || !sourceQuote) {
    throw new ValidationError('Source quote not found')
  }

  // Build the effective total including addons
  const addonTotal = sourceQuote.addon_total_cents ?? 0
  const effectiveTotal = sourceQuote.total_quoted_cents + addonTotal

  // Create the new quote via direct insert (not calling createQuote to avoid
  // redundant validation since we already verified ownership)
  const { createQuote } = await import('@/lib/quotes/actions')

  const quoteInput: CreateQuoteInput = {
    client_id: sourceQuote.client_id,
    inquiry_id: sourceQuote.inquiry_id ?? null,
    event_id: sourceQuote.event_id ?? tokenRow.event_id ?? null,
    quote_name: sourceQuote.quote_name
      ? `${sourceQuote.quote_name} (from proposal)`
      : 'Quote from proposal',
    pricing_model: sourceQuote.pricing_model as 'per_person' | 'flat_rate' | 'custom',
    total_quoted_cents:
      effectiveTotal > sourceQuote.total_quoted_cents
        ? effectiveTotal
        : sourceQuote.total_quoted_cents,
    price_per_person_cents: sourceQuote.price_per_person_cents ?? null,
    guest_count_estimated: sourceQuote.guest_count_estimated ?? null,
    deposit_required: sourceQuote.deposit_required ?? false,
    deposit_amount_cents: sourceQuote.deposit_amount_cents ?? null,
    deposit_percentage: sourceQuote.deposit_percentage ?? null,
    valid_until: sourceQuote.valid_until ?? null,
    pricing_notes: sourceQuote.pricing_notes ?? '',
    internal_notes: sourceQuote.internal_notes
      ? `${sourceQuote.internal_notes}\n\nConverted from proposal token: ${proposalTokenId}`
      : `Converted from proposal token: ${proposalTokenId}`,
  }

  const result = await createQuote(quoteInput)

  if (!result?.quote?.id) {
    throw new UnknownAppError('Failed to create quote from proposal')
  }

  const newQuoteId = result.quote.id

  // Copy addons to the new quote (non-blocking)
  try {
    const { data: sourceAddons } = await supabase
      .from('quote_addons')
      .select(
        'addon_id, label, description, price_cents, is_per_person, is_default_selected, sort_order'
      )
      .eq('quote_id', tokenRow.quote_id)
      .order('sort_order', { ascending: true })

    if (sourceAddons && sourceAddons.length > 0) {
      const addonRows = sourceAddons.map((a: any) => ({
        quote_id: newQuoteId,
        addon_id: a.addon_id,
        tenant_id: user.tenantId!,
        label: a.label,
        description: a.description,
        price_cents: a.price_cents,
        is_per_person: a.is_per_person,
        is_default_selected: a.is_default_selected,
        sort_order: a.sort_order,
      }))

      const { error: addonError } = await supabase.from('quote_addons').insert(addonRows)

      if (addonError) {
        console.error('[convertProposalToQuote] Addon copy failed (non-blocking):', addonError)
      }
    }
  } catch (err) {
    console.error('[convertProposalToQuote] Addon copy failed (non-blocking):', err)
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const amount = `$${(quoteInput.total_quoted_cents / 100).toFixed(2)}`
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'quote_created',
      domain: 'quote',
      entityType: 'quote',
      entityId: newQuoteId,
      summary: `Created quote from proposal conversion for ${amount}`,
      context: {
        source: 'proposal_conversion',
        proposal_token_id: proposalTokenId,
        source_quote_id: tokenRow.quote_id,
        total_cents: quoteInput.total_quoted_cents,
        amount_display: amount,
      },
      clientId: sourceQuote.client_id,
    })
  } catch (err) {
    console.error('[convertProposalToQuote] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${newQuoteId}`)
  if (tokenRow.event_id) {
    revalidatePath(`/events/${tokenRow.event_id}`)
  }

  return { success: true, quoteId: newQuoteId }
}

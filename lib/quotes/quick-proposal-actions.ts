// Quick Proposal Actions - Generate proposals from existing events
// Pre-fills quote data from event details (menu, pricing, dietary, terms)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type ProposalData = {
  eventId: string
  // Chef info
  chefBusinessName: string
  chefEmail: string
  chefPhone: string | null
  // Client info
  clientName: string
  clientEmail: string
  clientPhone: string | null
  // Event details
  eventDate: string
  occasion: string | null
  guestCount: number
  serviceStyle: string
  serveTime: string
  locationAddress: string
  locationCity: string
  locationState: string
  specialRequests: string | null
  // Dietary
  dietaryRestrictions: string[]
  allergies: string[]
  // Menu
  menuName: string | null
  menuDescription: string | null
  menuContent: string | null
  cuisineType: string | null
  // Pricing
  pricingModel: 'per_person' | 'flat_rate' | 'custom'
  quotedPriceCents: number | null
  pricePerPersonCents: number | null
  pricingNotes: string | null
  // Terms
  defaultTerms: string | null
  // Existing quote check
  hasExistingQuote: boolean
  existingQuoteId: string | null
}

export type ProposalOverrides = {
  quoteName?: string
  totalQuotedCents?: number
  pricePerPersonCents?: number | null
  pricingModel?: 'per_person' | 'flat_rate' | 'custom'
  pricingNotes?: string | null
  depositRequired?: boolean
  depositAmountCents?: number | null
  depositPercentage?: number | null
  validUntil?: string | null
  internalNotes?: string | null
}

// ============================================
// 1. GENERATE PROPOSAL FROM EVENT
// ============================================

export async function generateProposalFromEvent(
  eventId: string
): Promise<{ success: true; data: ProposalData } | { success: false; error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Fetch event with client and menu
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      event_date,
      occasion,
      guest_count,
      service_style,
      serve_time,
      location_address,
      location_city,
      location_state,
      special_requests,
      dietary_restrictions,
      allergies,
      pricing_model,
      quoted_price_cents,
      pricing_notes,
      menu_id,
      client_id
    `)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  // Fetch client
  const { data: client } = await supabase
    .from('clients')
    .select('full_name, email, phone')
    .eq('id', event.client_id)
    .single()

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Fetch chef info
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone')
    .eq('id', tenantId)
    .single()

  if (!chef) {
    return { success: false, error: 'Chef profile not found' }
  }

  // Fetch menu if assigned
  let menuData: {
    name: string | null
    description: string | null
    simple_mode_content: string | null
    cuisine_type: string | null
  } | null = null

  if (event.menu_id) {
    const { data: menu } = await supabase
      .from('menus')
      .select('name, description, simple_mode_content, cuisine_type')
      .eq('id', event.menu_id)
      .eq('tenant_id', tenantId)
      .single()

    menuData = menu
  }

  // Check for existing quote on this event
  const { data: existingQuote } = await supabase
    .from('quotes')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle()

  // Calculate price per person if flat rate and we have guest count
  let pricePerPersonCents: number | null = null
  if (event.quoted_price_cents && event.guest_count > 0) {
    pricePerPersonCents = Math.round(event.quoted_price_cents / event.guest_count)
  }

  const proposal: ProposalData = {
    eventId: event.id,
    chefBusinessName: chef.business_name,
    chefEmail: chef.email,
    chefPhone: chef.phone,
    clientName: client.full_name,
    clientEmail: client.email,
    clientPhone: client.phone,
    eventDate: event.event_date,
    occasion: event.occasion,
    guestCount: event.guest_count,
    serviceStyle: event.service_style,
    serveTime: event.serve_time,
    locationAddress: event.location_address,
    locationCity: event.location_city,
    locationState: event.location_state,
    specialRequests: event.special_requests,
    dietaryRestrictions: event.dietary_restrictions || [],
    allergies: event.allergies || [],
    menuName: menuData?.name || null,
    menuDescription: menuData?.description || null,
    menuContent: menuData?.simple_mode_content || null,
    cuisineType: menuData?.cuisine_type || null,
    pricingModel: event.pricing_model || 'flat_rate',
    quotedPriceCents: event.quoted_price_cents,
    pricePerPersonCents,
    pricingNotes: event.pricing_notes,
    defaultTerms: null, // Client-side will load from localStorage
    hasExistingQuote: !!existingQuote,
    existingQuoteId: existingQuote?.id || null,
  }

  return { success: true, data: proposal }
}

// ============================================
// 2. GET PROPOSAL PREVIEW
// ============================================

export async function getProposalPreview(
  eventId: string
): Promise<{ success: true; data: ProposalData } | { success: false; error: string }> {
  // Same as generateProposalFromEvent - preview shows the same data
  return generateProposalFromEvent(eventId)
}

// ============================================
// 3. CREATE QUOTE FROM PROPOSAL
// ============================================

export async function createQuoteFromProposal(
  eventId: string,
  overrides?: ProposalOverrides
): Promise<{ success: true; quoteId: string } | { success: false; error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Fetch the event to get base data
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      client_id,
      inquiry_id,
      guest_count,
      quoted_price_cents,
      pricing_model,
      pricing_notes
    `)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  // Check if a quote already exists for this event
  const { data: existingQuote } = await supabase
    .from('quotes')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle()

  if (existingQuote) {
    return { success: false, error: 'A quote already exists for this event' }
  }

  // Determine final values (overrides take precedence)
  const totalQuotedCents = overrides?.totalQuotedCents ?? event.quoted_price_cents
  if (!totalQuotedCents || totalQuotedCents <= 0) {
    return { success: false, error: 'A total price is required to create a quote' }
  }

  const pricingModel = overrides?.pricingModel ?? event.pricing_model ?? 'flat_rate'

  let pricePerPersonCents: number | null = overrides?.pricePerPersonCents ?? null
  if (pricePerPersonCents === null && pricingModel === 'per_person' && event.guest_count > 0) {
    pricePerPersonCents = Math.round(totalQuotedCents / event.guest_count)
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      tenant_id: tenantId,
      client_id: event.client_id,
      event_id: event.id,
      inquiry_id: event.inquiry_id || null,
      quote_name: overrides?.quoteName || null,
      pricing_model: pricingModel,
      total_quoted_cents: totalQuotedCents,
      price_per_person_cents: pricePerPersonCents,
      guest_count_estimated: event.guest_count,
      deposit_required: overrides?.depositRequired ?? false,
      deposit_amount_cents: overrides?.depositAmountCents ?? null,
      deposit_percentage: overrides?.depositPercentage ?? null,
      valid_until: overrides?.validUntil || null,
      pricing_notes: overrides?.pricingNotes ?? event.pricing_notes ?? null,
      internal_notes: overrides?.internalNotes ?? null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (quoteError || !quote) {
    console.error('[createQuoteFromProposal] Error:', quoteError)
    return { success: false, error: 'Failed to create quote' }
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: user.id,
      action: 'quote_created',
      domain: 'quote',
      entityType: 'quote',
      entityId: quote.id,
      summary: `Created quote from event proposal - $${(totalQuotedCents / 100).toFixed(2)}`,
    })
  } catch (err) {
    console.error('[non-blocking] Activity log failed', err)
  }

  revalidatePath('/quotes')
  revalidatePath(`/events/${eventId}`)

  return { success: true, quoteId: quote.id }
}

// ============================================
// 4. GET DEFAULT TERMS (from chef profile metadata)
// ============================================

export async function getDefaultTerms(): Promise<{
  success: true
  terms: string | null
} | {
  success: false
  error: string
}> {
  // Default terms are stored client-side in localStorage.
  // This action exists as a placeholder for future DB-backed terms.
  // For now, return null and let the client handle it.
  await requireChef()
  return { success: true, terms: null }
}

// ============================================
// 5. SAVE DEFAULT TERMS
// ============================================

export async function saveDefaultTerms(
  _terms: string
): Promise<{ success: true } | { success: false; error: string }> {
  // Default terms are stored client-side in localStorage.
  // This action exists as a placeholder for future DB-backed terms.
  await requireChef()
  return { success: true }
}

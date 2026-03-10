// Smart Proposal Flow - Server Actions
// Combined quote + contract + payment in one link.
// Chefs generate a proposal token; clients view, accept, sign, and pay in a single flow.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { breakers } from '@/lib/resilience/circuit-breaker'
import { isConnectOnboardingRequiredForPayments } from '@/lib/stripe/payment-policy'
import type Stripe from 'stripe'
import type { ProposalSection, SectionType } from '@/lib/proposal/types'

// ============================================
// STRIPE HELPER (mirrors lib/stripe/checkout.ts)
// ============================================

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

// ============================================
// SCHEMAS
// ============================================

const AcceptProposalSchema = z.object({
  token: z.string().min(1, 'Token required'),
  selectedAddonIds: z.array(z.string()),
  signatureDataUrl: z.string().min(1, 'Signature required'),
  signerIp: z.string().optional(),
  signerUserAgent: z.string().optional(),
})

const RecordViewSchema = z.object({
  viewerIp: z.string().optional(),
  timeOnPageSeconds: z.number().optional(),
  sectionsViewed: z.array(z.string()).optional(),
})

const AttachAddonSchema = z.object({
  addonId: z.string().uuid(),
  priceOverrideCents: z.number().int().optional(),
  isPerPerson: z.boolean().optional(),
  isDefaultSelected: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Validate a proposal token for public access.
 * Returns the token row or throws.
 */
async function validateToken(token: string) {
  const supabase: any = createServerClient({ admin: true })

  const { data: tokenRow, error } = await supabase
    .from('proposal_tokens')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .single()

  if (error || !tokenRow) {
    throw new Error('Invalid or expired proposal link')
  }

  // Check expiration
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    throw new Error('This proposal link has expired')
  }

  return tokenRow
}

// ============================================
// 1. GENERATE PROPOSAL TOKEN (chef-only)
// ============================================

export async function generateProposalToken(quoteId: string, contractId?: string): Promise<string> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Validate quote exists and belongs to this chef
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, event_id, client_id, valid_until')
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (quoteError || !quote) {
    throw new Error('Quote not found')
  }

  // If contractId provided, validate it
  if (contractId) {
    const { data: contract } = await supabase
      .from('event_contracts')
      .select('id')
      .eq('id', contractId)
      .eq('chef_id', user.tenantId!)
      .single()

    if (!contract) {
      throw new Error('Contract not found')
    }
  }

  const token = randomBytes(32).toString('hex')
  const now = new Date().toISOString()

  // Revoke any existing active tokens for this quote
  await supabase
    .from('proposal_tokens')
    .update({ revoked_at: now })
    .eq('quote_id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .is('revoked_at', null)

  // Create new token
  const { error: insertError } = await supabase.from('proposal_tokens').insert({
    token,
    quote_id: quoteId,
    event_id: quote.event_id,
    contract_id: contractId ?? null,
    tenant_id: user.tenantId!,
    client_id: quote.client_id,
    expires_at: quote.valid_until ?? null,
    created_at: now,
  })

  if (insertError) {
    console.error('[generateProposalToken] Insert error:', insertError)
    throw new Error('Failed to generate proposal link')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'
  revalidatePath(`/events/${quote.event_id}`)

  return `${appUrl}/proposal/${token}`
}

// ============================================
// 2. GET PROPOSAL BY TOKEN (public, no auth)
// ============================================

export async function getProposalByToken(token: string) {
  const supabase: any = createServerClient({ admin: true })
  const tokenRow = await validateToken(token)
  const now = new Date().toISOString()

  // Update view tracking
  const updates: Record<string, unknown> = {
    last_viewed_at: now,
    view_count: (tokenRow.view_count ?? 0) + 1,
  }
  if (!tokenRow.first_viewed_at) {
    updates.first_viewed_at = now
  }

  await supabase.from('proposal_tokens').update(updates).eq('id', tokenRow.id)

  // Fetch quote (exclude chef-private fields, include interactive proposal fields)
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      `
      id, event_id, status, total_quoted_cents, deposit_required,
      deposit_amount_cents, valid_until, accepted_at,
      addon_total_cents, effective_total_cents,
      cover_photo_url, chef_message,
      created_at, updated_at
    `
    )
    .eq('id', tokenRow.quote_id)
    .single()

  if (!quote) {
    throw new Error('Quote data not found')
  }

  // Fetch event (public-safe fields)
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status,
      location_city, location_state,
      start_time, end_time
    `
    )
    .eq('id', tokenRow.event_id)
    .single()

  // Fetch client name only
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, first_name, last_name')
    .eq('id', tokenRow.client_id)
    .single()

  const clientName =
    client?.full_name ||
    [client?.first_name, client?.last_name].filter(Boolean).join(' ') ||
    'Valued Client'

  // Fetch chef branding + profile info
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, logo_url, profile_image_url, bio, tagline')
    .eq('id', tokenRow.tenant_id)
    .single()

  // Fetch contract body snapshot (if contract attached)
  let contractSnapshot: string | null = null
  let contractStatus: string | null = null
  if (tokenRow.contract_id) {
    const { data: contract } = await supabase
      .from('event_contracts')
      .select('body_snapshot, status')
      .eq('id', tokenRow.contract_id)
      .single()

    contractSnapshot = contract?.body_snapshot ?? null
    contractStatus = contract?.status ?? null
  }

  // Fetch quote addons
  const { data: addons } = await supabase
    .from('quote_addons')
    .select(
      `
      id, addon_id, name, description, price_cents,
      is_per_person, is_default_selected, sort_order
    `
    )
    .eq('quote_id', tokenRow.quote_id)
    .order('sort_order', { ascending: true })

  // Fetch menu + dishes for this event (if event has a menu)
  let menuData: {
    name: string
    description: string | null
    dishes: Array<{
      id: string
      name: string
      description: string | null
      course: string | null
      photoUrl: string | null
      dietaryTags: string[]
    }>
  } | null = null

  if (event?.id) {
    // Events link to menus via menu_id
    const { data: eventRow } = await supabase
      .from('events')
      .select('menu_id')
      .eq('id', event.id)
      .single()

    if (eventRow?.menu_id) {
      const { data: menu } = await supabase
        .from('menus')
        .select('id, name, description')
        .eq('id', eventRow.menu_id)
        .single()

      if (menu) {
        const { data: dishes } = await supabase
          .from('dishes')
          .select('id, name, description, course_name, photo_url, dietary_tags, sort_order')
          .eq('menu_id', menu.id)
          .order('course_number', { ascending: true })
          .order('sort_order', { ascending: true })

        menuData = {
          name: menu.name,
          description: menu.description,
          dishes: (dishes ?? []).map((d: any) => ({
            id: d.id,
            name: d.name || 'Untitled Dish',
            description: d.description,
            course: d.course_name,
            photoUrl: d.photo_url,
            dietaryTags: d.dietary_tags ?? [],
          })),
        }
      }
    }
  }

  // Fetch proposal sections
  const { data: sectionsRaw } = await supabase
    .from('proposal_sections')
    .select('id, section_type, title, body_text, photo_url, photo_urls, sort_order, is_visible')
    .eq('quote_id', tokenRow.quote_id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })

  const proposalSections: ProposalSection[] = (sectionsRaw ?? []).map((s: any) => ({
    id: s.id,
    quoteId: tokenRow.quote_id,
    sectionType: s.section_type,
    title: s.title,
    bodyText: s.body_text,
    photoUrl: s.photo_url,
    photoUrls: s.photo_urls ?? [],
    sortOrder: s.sort_order,
    isVisible: s.is_visible,
  }))

  return {
    tokenId: tokenRow.id,
    quoteId: tokenRow.quote_id,
    eventId: tokenRow.event_id,
    contractId: tokenRow.contract_id,
    expiresAt: tokenRow.expires_at,
    quote: {
      id: quote.id,
      status: quote.status,
      totalQuotedCents: quote.total_quoted_cents,
      depositRequired: quote.deposit_required,
      depositAmountCents: quote.deposit_amount_cents,
      validUntil: quote.valid_until,
      acceptedAt: quote.accepted_at,
      addonTotalCents: quote.addon_total_cents,
      effectiveTotalCents: quote.effective_total_cents,
      coverPhotoUrl: quote.cover_photo_url ?? null,
      chefMessage: quote.chef_message ?? null,
    },
    event: event
      ? {
          id: event.id,
          occasion: event.occasion,
          eventDate: event.event_date,
          guestCount: event.guest_count,
          status: event.status,
          locationCity: event.location_city,
          locationState: event.location_state,
          startTime: event.start_time,
          endTime: event.end_time,
        }
      : null,
    client: { name: clientName },
    chef: {
      businessName: chef?.business_name ?? null,
      logoUrl: chef?.logo_url ?? null,
      profileImageUrl: chef?.profile_image_url ?? null,
      bio: chef?.bio ?? null,
      tagline: chef?.tagline ?? null,
    },
    menu: menuData,
    proposalSections,
    contract: tokenRow.contract_id
      ? { bodySnapshot: contractSnapshot, status: contractStatus }
      : null,
    addons: (addons ?? []).map((a: any) => ({
      id: a.id,
      addonId: a.addon_id,
      name: a.name,
      description: a.description,
      priceCents: a.price_cents,
      isPerPerson: a.is_per_person,
      isDefaultSelected: a.is_default_selected,
      sortOrder: a.sort_order,
    })),
  }
}

// ============================================
// 3. RECORD PROPOSAL VIEW (public)
// ============================================

export async function recordProposalView(
  token: string,
  viewData: { viewerIp?: string; timeOnPageSeconds?: number; sectionsViewed?: string[] }
) {
  const validated = RecordViewSchema.parse(viewData)
  const supabase: any = createServerClient({ admin: true })

  // Look up token (no full validation needed, just find the row)
  const { data: tokenRow } = await supabase
    .from('proposal_tokens')
    .select('id')
    .eq('token', token)
    .single()

  if (!tokenRow) return

  const now = new Date().toISOString()

  // Insert view record
  try {
    await supabase.from('proposal_views').insert({
      proposal_token_id: tokenRow.id,
      viewed_at: now,
      viewer_ip: validated.viewerIp ?? null,
      time_on_page_seconds: validated.timeOnPageSeconds ?? null,
      sections_viewed: validated.sectionsViewed ?? null,
    })
  } catch (err) {
    console.error('[recordProposalView] Non-blocking view insert failed:', err)
  }

  // Update token tracking
  try {
    await supabase
      .from('proposal_tokens')
      .update({
        last_viewed_at: now,
        view_count: (tokenRow.view_count ?? 0) + 1,
      })
      .eq('id', tokenRow.id)
  } catch (err) {
    console.error('[recordProposalView] Non-blocking token update failed:', err)
  }
}

// ============================================
// 4. ACCEPT PROPOSAL AND SIGN (public)
// ============================================

export async function acceptProposalAndSign(input: {
  token: string
  selectedAddonIds: string[]
  signatureDataUrl: string
  signerIp?: string
  signerUserAgent?: string
}) {
  const validated = AcceptProposalSchema.parse(input)
  const supabase: any = createServerClient({ admin: true })
  const tokenRow = await validateToken(validated.token)
  const now = new Date().toISOString()

  // Validate quote status
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, total_quoted_cents, deposit_required, deposit_amount_cents')
    .eq('id', tokenRow.quote_id)
    .single()

  if (!quote) throw new Error('Quote not found')
  if (!['sent', 'draft'].includes(quote.status)) {
    throw new Error('This quote is no longer available for acceptance')
  }

  // Freeze addon selections and compute addon total
  let addonTotalCents = 0

  if (validated.selectedAddonIds.length > 0) {
    // Fetch the quote addons that were selected
    const { data: selectedAddons } = await supabase
      .from('quote_addons')
      .select('id, addon_id, name, price_cents, is_per_person')
      .eq('quote_id', tokenRow.quote_id)
      .in('id', validated.selectedAddonIds)

    if (selectedAddons && selectedAddons.length > 0) {
      // Fetch guest count for per-person addons
      const { data: event } = await supabase
        .from('events')
        .select('guest_count')
        .eq('id', tokenRow.event_id)
        .single()

      const guestCount = event?.guest_count ?? 1

      const selectionRows = selectedAddons.map((addon: any) => {
        const frozenPrice = addon.is_per_person ? addon.price_cents * guestCount : addon.price_cents
        addonTotalCents += frozenPrice

        return {
          proposal_token_id: tokenRow.id,
          quote_addon_id: addon.id,
          addon_id: addon.addon_id,
          frozen_price_cents: frozenPrice,
          selected_at: now,
        }
      })

      const { error: selectionError } = await supabase
        .from('proposal_addon_selections')
        .insert(selectionRows)

      if (selectionError) {
        console.error('[acceptProposalAndSign] Addon selection insert error:', selectionError)
        throw new Error('Failed to save addon selections')
      }
    }
  }

  const baseTotalCents = quote.total_quoted_cents ?? 0
  const effectiveTotalCents = baseTotalCents + addonTotalCents

  // Update quote: accepted with addon totals
  const { error: quoteUpdateError } = await supabase
    .from('quotes')
    .update({
      status: 'accepted',
      accepted_at: now,
      addon_total_cents: addonTotalCents,
      effective_total_cents: effectiveTotalCents,
    })
    .eq('id', tokenRow.quote_id)

  if (quoteUpdateError) {
    console.error('[acceptProposalAndSign] Quote update error:', quoteUpdateError)
    throw new Error('Failed to accept quote')
  }

  // Sign contract (if attached)
  if (tokenRow.contract_id) {
    const { error: contractError } = await supabase
      .from('event_contracts')
      .update({
        status: 'signed',
        signed_at: now,
        signature_data_url: validated.signatureDataUrl,
        signer_ip_address: validated.signerIp ?? null,
        signer_user_agent: validated.signerUserAgent ?? null,
      })
      .eq('id', tokenRow.contract_id)
      .in('status', ['draft', 'sent', 'viewed'])

    if (contractError) {
      console.error('[acceptProposalAndSign] Contract sign error:', contractError)
      throw new Error('Failed to sign contract')
    }
  }

  // Transition event from 'proposed' to 'accepted'
  // Using admin client directly since no auth session in public flow
  const { error: eventError } = await supabase
    .from('events')
    .update({ status: 'accepted', updated_at: now })
    .eq('id', tokenRow.event_id)
    .eq('status', 'proposed')

  if (eventError) {
    console.error('[acceptProposalAndSign] Event transition error:', eventError)
    // Non-fatal: quote is accepted, event transition is best-effort
  }

  // Update the event quoted_price_cents to reflect effective total
  try {
    await supabase
      .from('events')
      .update({ quoted_price_cents: effectiveTotalCents })
      .eq('id', tokenRow.event_id)
  } catch (err) {
    console.error('[acceptProposalAndSign] Non-blocking event price update failed:', err)
  }

  // Auto-block the event date on the chef's calendar (non-blocking)
  try {
    const { autoBlockEventDate } = await import('@/lib/calendar/auto-block')
    await autoBlockEventDate(tokenRow.event_id, tokenRow.tenant_id)
  } catch (err) {
    console.error('[acceptProposalAndSign] Non-blocking calendar block failed:', err)
  }

  // Send confirmation email to client (non-blocking)
  try {
    const adminSupa: any = createServerClient({ admin: true })
    const { data: client } = await adminSupa
      .from('clients')
      .select('email, full_name')
      .eq('id', tokenRow.client_id)
      .single()

    const { data: chef } = await adminSupa
      .from('chefs')
      .select('business_name')
      .eq('id', tokenRow.tenant_id)
      .single()

    const { data: evt } = await adminSupa
      .from('events')
      .select('occasion, event_date')
      .eq('id', tokenRow.event_id)
      .single()

    if (client?.email && chef && evt) {
      const { sendEmail } = await import('@/lib/email/send')
      const { getEmailBrand } = await import('@/lib/email/brand-helpers')
      const { createElement } = await import('react')
      const { NotificationGenericEmail } =
        await import('@/lib/email/templates/notification-generic')

      const { brand, fromName } = await getEmailBrand(tokenRow.tenant_id)
      const chefName = chef.business_name || 'Your Chef'
      const occasion = evt.occasion || 'your event'
      const eventDate = evt.event_date
        ? new Date(`${evt.event_date}T00:00:00`).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'your upcoming event'

      const totalLabel =
        effectiveTotalCents > 0 ? ` Total: $${(effectiveTotalCents / 100).toFixed(2)}.` : ''
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'

      await sendEmail({
        to: client.email,
        subject: `Proposal accepted for ${occasion}`,
        fromName,
        react: createElement(NotificationGenericEmail, {
          title: 'Proposal Accepted!',
          body:
            `Hi ${client.full_name || 'there'}, your proposal for "${occasion}" on ${eventDate} with ${chefName} has been accepted and signed.${totalLabel} ` +
            'You will receive payment instructions shortly.',
          actionUrl: `${appUrl}/my-events`,
          actionLabel: 'View My Events',
          brand,
        }),
      })
    }
  } catch (err) {
    console.error('[acceptProposalAndSign] Non-blocking confirmation email failed:', err)
  }

  // Create notification for chef (non-blocking)
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tokenRow.tenant_id)

    if (chefUserId) {
      const adminSupa2: any = createServerClient({ admin: true })
      const { data: evt2 } = await adminSupa2
        .from('events')
        .select('occasion')
        .eq('id', tokenRow.event_id)
        .single()

      const { data: cl2 } = await adminSupa2
        .from('clients')
        .select('full_name')
        .eq('id', tokenRow.client_id)
        .single()

      const eventTitle = evt2?.occasion || 'Untitled event'
      const clientName = cl2?.full_name || 'A client'

      await createNotification({
        tenantId: tokenRow.tenant_id,
        recipientId: chefUserId,
        category: 'event',
        action: 'proposal_accepted' as any,
        title: 'Proposal signed!',
        body: `${clientName} signed and accepted your proposal for "${eventTitle}"`,
        actionUrl: `/events/${tokenRow.event_id}`,
        eventId: tokenRow.event_id,
        clientId: tokenRow.client_id,
      })
    }
  } catch (err) {
    console.error('[acceptProposalAndSign] Non-blocking chef notification failed:', err)
  }

  // Create checkout session for payment
  let checkoutUrl: string | null = null
  try {
    checkoutUrl = await createProposalCheckoutSession(validated.token)
  } catch (err) {
    console.error('[acceptProposalAndSign] Non-blocking checkout creation failed:', err)
  }

  revalidatePath(`/events/${tokenRow.event_id}`)

  return {
    success: true,
    effectiveTotalCents,
    checkoutUrl,
  }
}

// ============================================
// 5. CREATE PROPOSAL CHECKOUT SESSION (public)
// ============================================

export async function createProposalCheckoutSession(token: string): Promise<string | null> {
  const supabase: any = createServerClient({ admin: true })
  const tokenRow = await validateToken(token)

  // Fetch quote for payment amount
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      'id, total_quoted_cents, deposit_required, deposit_amount_cents, effective_total_cents, status'
    )
    .eq('id', tokenRow.quote_id)
    .single()

  if (!quote) return null
  if (quote.status !== 'accepted') return null

  const effectiveTotal = quote.effective_total_cents ?? quote.total_quoted_cents ?? 0
  if (effectiveTotal <= 0) return null

  // Determine payment amount (deposit or full)
  let amountCents: number
  let paymentType: string

  if (quote.deposit_required && quote.deposit_amount_cents > 0) {
    amountCents = quote.deposit_amount_cents
    paymentType = 'deposit'
  } else {
    amountCents = effectiveTotal
    paymentType = 'full_payment'
  }

  if (amountCents <= 0) return null

  // Fetch event for line item description
  const { data: event } = await supabase
    .from('events')
    .select('occasion, client:clients(email)')
    .eq('id', tokenRow.event_id)
    .single()

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'

  // Stripe Connect transfer routing (mirrors lib/stripe/checkout.ts)
  const { getChefStripeConfig, computeApplicationFee } =
    await import('@/lib/stripe/transfer-routing')
  const chefConfig = await getChefStripeConfig(tokenRow.tenant_id)
  const requireConnect = isConnectOnboardingRequiredForPayments()

  if (requireConnect && !chefConfig.canReceiveTransfers) {
    console.warn(
      '[createProposalCheckoutSession] Connect onboarding incomplete for tenant:',
      tokenRow.tenant_id
    )
    return null
  }

  const transferRouted = chefConfig.canReceiveTransfers && !!chefConfig.stripeAccountId

  const paymentIntentData: Record<string, unknown> = {
    metadata: {
      event_id: tokenRow.event_id,
      tenant_id: tokenRow.tenant_id,
      client_id: tokenRow.client_id,
      payment_type: paymentType,
      proposal_token_id: tokenRow.id,
      transfer_routed: transferRouted ? 'true' : 'false',
    },
  }

  if (transferRouted && chefConfig.stripeAccountId) {
    paymentIntentData.transfer_data = {
      destination: chefConfig.stripeAccountId,
    }

    const applicationFee = computeApplicationFee(
      amountCents,
      chefConfig.platformFeePercent,
      chefConfig.platformFeeFixedCents
    )
    if (applicationFee > 0) {
      paymentIntentData.application_fee_amount = applicationFee
    }
  }

  // Apple Pay / Google Pay preferences
  const { data: chefPrefs } = await supabase
    .from('chefs')
    .select('apple_pay_enabled, google_pay_enabled')
    .eq('id', tokenRow.tenant_id)
    .single()

  const applePayOn = chefPrefs?.apple_pay_enabled !== false
  const googlePayOn = chefPrefs?.google_pay_enabled !== false

  const occasion = event?.occasion || 'Private Chef Event'
  const lineItemName = paymentType === 'deposit' ? `${occasion} - Deposit` : `${occasion} - Payment`

  const checkoutParams: Record<string, unknown> = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: lineItemName },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: paymentIntentData as any,
    success_url: `${appUrl}/proposal/${token}?payment=success`,
    cancel_url: `${appUrl}/proposal/${token}?payment=cancelled`,
    customer_email: (event?.client as { email: string | null } | null)?.email || undefined,
    expires_at: Math.floor(Date.now() / 1000) + 72 * 3600, // 72 hours
  }

  if (!applePayOn || !googlePayOn) {
    const types: string[] = ['card']
    if (applePayOn) types.push('apple_pay')
    if (googlePayOn) types.push('google_pay')
    checkoutParams.payment_method_types = types
  }

  const session = await breakers.stripe.execute(() =>
    stripe.checkout.sessions.create(checkoutParams as any)
  )

  return session.url
}

// ============================================
// 6. REVOKE PROPOSAL TOKEN (chef-only)
// ============================================

export async function revokeProposalToken(tokenId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('proposal_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[revokeProposalToken] Error:', error)
    throw new Error('Failed to revoke proposal link')
  }

  revalidatePath('/events')
  return { success: true }
}

// ============================================
// 7. GET PROPOSAL TOKENS FOR EVENT (chef-only)
// ============================================

export async function getProposalTokensForEvent(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('proposal_tokens')
    .select(
      `
      id, token, quote_id, contract_id, client_id,
      expires_at, revoked_at,
      first_viewed_at, last_viewed_at, view_count,
      created_at
    `
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getProposalTokensForEvent] Error:', error)
    throw new Error('Failed to load proposal tokens')
  }

  return (data ?? []).map((t: any) => ({
    id: t.id,
    token: t.token,
    quoteId: t.quote_id,
    contractId: t.contract_id,
    clientId: t.client_id,
    expiresAt: t.expires_at,
    revokedAt: t.revoked_at,
    firstViewedAt: t.first_viewed_at,
    lastViewedAt: t.last_viewed_at,
    viewCount: t.view_count ?? 0,
    createdAt: t.created_at,
    isActive: !t.revoked_at && (!t.expires_at || new Date(t.expires_at) > new Date()),
  }))
}

// ============================================
// 8. ATTACH ADDONS TO QUOTE (chef-only)
// ============================================

export async function attachAddonsToQuote(
  quoteId: string,
  addons: Array<{
    addonId: string
    priceOverrideCents?: number
    isPerPerson?: boolean
    isDefaultSelected?: boolean
    sortOrder?: number
  }>
): Promise<{ success: true; count: number }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Validate addons input
  const validatedAddons = addons.map((a) => AttachAddonSchema.parse(a))

  // Verify quote belongs to this chef
  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!quote) throw new Error('Quote not found')

  // Clear existing quote addons (replace all strategy)
  await supabase.from('quote_addons').delete().eq('quote_id', quoteId)

  if (validatedAddons.length === 0) {
    revalidatePath('/events')
    return { success: true, count: 0 }
  }

  // Fetch addon library entries for defaults
  const addonIds = validatedAddons.map((a) => a.addonId)
  const { data: libraryAddons } = await supabase
    .from('proposal_addons')
    .select('id, name, description, default_price_cents, is_per_person')
    .eq('tenant_id', user.tenantId!)
    .in('id', addonIds)

  const libraryMap = new Map((libraryAddons ?? []).map((a: any) => [a.id, a]))

  // Build rows using library defaults with optional overrides
  const rows = validatedAddons.map((addon, index) => {
    const lib = libraryMap.get(addon.addonId) as any

    return {
      quote_id: quoteId,
      addon_id: addon.addonId,
      name: lib?.name ?? 'Add-on',
      description: lib?.description ?? null,
      price_cents: addon.priceOverrideCents ?? lib?.default_price_cents ?? 0,
      is_per_person: addon.isPerPerson ?? lib?.is_per_person ?? false,
      is_default_selected: addon.isDefaultSelected ?? false,
      sort_order: addon.sortOrder ?? index,
    }
  })

  const { error: insertError } = await supabase.from('quote_addons').insert(rows)

  if (insertError) {
    console.error('[attachAddonsToQuote] Insert error:', insertError)
    throw new Error('Failed to attach add-ons to quote')
  }

  revalidatePath('/events')
  return { success: true, count: rows.length }
}

// ============================================
// 9. GET PROPOSAL SECTIONS (chef-only)
// ============================================

export async function getProposalSections(quoteId: string): Promise<ProposalSection[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify quote belongs to this chef
  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!quote) throw new Error('Quote not found')

  const { data, error } = await supabase
    .from('proposal_sections')
    .select('id, section_type, title, body_text, photo_url, photo_urls, sort_order, is_visible')
    .eq('quote_id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getProposalSections] Error:', error)
    throw new Error('Failed to load proposal sections')
  }

  return (data ?? []).map((s: any) => ({
    id: s.id,
    quoteId,
    sectionType: s.section_type as SectionType,
    title: s.title,
    bodyText: s.body_text,
    photoUrl: s.photo_url,
    photoUrls: s.photo_urls ?? [],
    sortOrder: s.sort_order,
    isVisible: s.is_visible,
  }))
}

// ============================================
// 10. UPSERT PROPOSAL SECTION (chef-only)
// ============================================

export async function upsertProposalSection(
  quoteId: string,
  section: {
    id?: string
    sectionType: SectionType
    title: string | null
    bodyText: string | null
    photoUrl: string | null
    photoUrls: string[]
    sortOrder: number
    isVisible: boolean
  }
): Promise<{ id: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify quote belongs to this chef
  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!quote) throw new Error('Quote not found')

  const now = new Date().toISOString()

  if (section.id) {
    // Update existing section
    const { error } = await supabase
      .from('proposal_sections')
      .update({
        section_type: section.sectionType,
        title: section.title,
        body_text: section.bodyText,
        photo_url: section.photoUrl,
        photo_urls: section.photoUrls,
        sort_order: section.sortOrder,
        is_visible: section.isVisible,
        updated_at: now,
      })
      .eq('id', section.id)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[upsertProposalSection] Update error:', error)
      throw new Error('Failed to update proposal section')
    }

    revalidatePath('/events')
    return { id: section.id }
  } else {
    // Insert new section
    const { data, error } = await supabase
      .from('proposal_sections')
      .insert({
        quote_id: quoteId,
        tenant_id: user.tenantId!,
        section_type: section.sectionType,
        title: section.title,
        body_text: section.bodyText,
        photo_url: section.photoUrl,
        photo_urls: section.photoUrls,
        sort_order: section.sortOrder,
        is_visible: section.isVisible,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('[upsertProposalSection] Insert error:', error)
      throw new Error('Failed to create proposal section')
    }

    revalidatePath('/events')
    return { id: data.id }
  }
}

// ============================================
// 11. REORDER PROPOSAL SECTIONS (chef-only)
// ============================================

export async function reorderProposalSections(
  quoteId: string,
  sectionIds: string[]
): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify quote belongs to this chef
  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!quote) throw new Error('Quote not found')

  // Update sort_order for each section
  const now = new Date().toISOString()

  for (let i = 0; i < sectionIds.length; i++) {
    const { error } = await supabase
      .from('proposal_sections')
      .update({ sort_order: i, updated_at: now })
      .eq('id', sectionIds[i])
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[reorderProposalSections] Error updating section:', sectionIds[i], error)
    }
  }

  revalidatePath('/events')
  return { success: true }
}

// ============================================
// 12. DELETE PROPOSAL SECTION (chef-only)
// ============================================

export async function deleteProposalSection(sectionId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('proposal_sections')
    .delete()
    .eq('id', sectionId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteProposalSection] Error:', error)
    throw new Error('Failed to delete proposal section')
  }

  revalidatePath('/events')
  return { success: true }
}

// ============================================
// 13. UPDATE QUOTE PROPOSAL FIELDS (chef-only)
// ============================================

export async function updateQuoteProposalFields(
  quoteId: string,
  fields: { coverPhotoUrl?: string | null; chefMessage?: string | null }
): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updateData: Record<string, unknown> = {}
  if ('coverPhotoUrl' in fields) updateData.cover_photo_url = fields.coverPhotoUrl
  if ('chefMessage' in fields) updateData.chef_message = fields.chefMessage

  if (Object.keys(updateData).length === 0) {
    return { success: true }
  }

  const { error } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateQuoteProposalFields] Error:', error)
    throw new Error('Failed to update proposal fields')
  }

  revalidatePath('/events')
  return { success: true }
}

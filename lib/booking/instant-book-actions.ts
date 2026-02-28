// Instant-Book Server Action
// Creates a draft event + Stripe Checkout Session for deposit payment.
// On successful payment, the Stripe webhook transitions draft -> paid.
// No auth required — public booking page action.

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createClientFromLead } from '@/lib/clients/actions'
import { z } from 'zod'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

const InstantBookSchema = z.object({
  chef_slug: z.string().min(1),
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().or(z.literal('')),
  occasion: z.string().min(1, 'Occasion is required'),
  event_date: z.string().min(1, 'Event date is required'),
  serve_time: z.string().min(1, 'Serve time is required'),
  guest_count: z.number().int().positive(),
  address: z.string().min(1, 'Address is required'),
  allergies_food_restrictions: z.string().optional().or(z.literal('')),
  additional_notes: z.string().optional().or(z.literal('')),
})

export type InstantBookInput = z.infer<typeof InstantBookSchema>

export type InstantBookResult = {
  checkoutUrl: string
  totalCents: number
  depositCents: number
}

/**
 * Create an instant-book checkout session.
 * 1. Validates chef is set up for instant-book
 * 2. Computes pricing and deposit
 * 3. Creates client + inquiry + draft event
 * 4. Creates Stripe Checkout Session with deposit
 * 5. Returns checkout URL for client redirect
 */
export async function createInstantBookingCheckout(
  input: InstantBookInput
): Promise<InstantBookResult> {
  const validated = InstantBookSchema.parse(input)
  const supabase: any = createServerClient({ admin: true })

  // 1. Resolve chef and verify instant-book configuration
  const { data: chef } = await supabase
    .from('chefs')
    .select(
      `
      id, business_name, booking_slug, booking_enabled, booking_model,
      booking_base_price_cents, booking_pricing_type,
      booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents,
      stripe_account_id, stripe_onboarding_complete,
      platform_fee_percent, platform_fee_fixed_cents
    `
    )
    .eq('booking_slug', validated.chef_slug)
    .eq('booking_enabled', true)
    .single()

  if (!chef) {
    throw new Error('Chef not found or booking not enabled')
  }

  if (chef.booking_model !== 'instant_book') {
    throw new Error('This chef does not accept instant bookings')
  }

  if (!chef.stripe_onboarding_complete || !chef.stripe_account_id) {
    throw new Error('Chef has not completed payment setup')
  }

  const basePriceCents = chef.booking_base_price_cents
  if (!basePriceCents || basePriceCents <= 0) {
    throw new Error('Chef pricing is not configured')
  }

  const tenantId = chef.id as string

  // 2. Compute total and deposit
  const totalCents =
    chef.booking_pricing_type === 'per_person'
      ? basePriceCents * validated.guest_count
      : basePriceCents

  let depositCents: number
  if (chef.booking_deposit_type === 'fixed' && chef.booking_deposit_fixed_cents > 0) {
    depositCents = Math.min(chef.booking_deposit_fixed_cents, totalCents)
  } else {
    const pct = chef.booking_deposit_percent ?? 30
    depositCents = Math.round(totalCents * (pct / 100))
  }

  if (depositCents <= 0) depositCents = totalCents

  // 3. Create or find client (idempotent by email)
  const client = await createClientFromLead(tenantId, {
    email: validated.email.toLowerCase().trim(),
    full_name: validated.full_name.trim(),
    phone: validated.phone?.trim() || null,
    source: 'website',
  })

  // 4. Create inquiry for traceability
  const { data: inquiry } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel: 'website',
      client_id: client.id,
      first_contact_at: new Date().toISOString(),
      confirmed_date: validated.event_date,
      confirmed_guest_count: validated.guest_count,
      confirmed_location: validated.address.trim(),
      confirmed_occasion: validated.occasion.trim(),
      source_message: `Instant-book request. Serve time: ${validated.serve_time}`,
      status: 'new',
    })
    .select('id')
    .single()

  // 5. Create draft event with booking_source = 'instant_book'
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      tenant_id: tenantId,
      client_id: client.id,
      inquiry_id: inquiry?.id ?? null,
      event_date: validated.event_date,
      serve_time: validated.serve_time.trim(),
      guest_count: validated.guest_count,
      location_address: validated.address.trim(),
      location_city: 'TBD',
      location_zip: 'TBD',
      occasion: validated.occasion.trim(),
      quoted_price_cents: totalCents,
      deposit_amount_cents: depositCents,
      special_requests: validated.additional_notes?.trim() || null,
      booking_source: 'instant_book',
    })
    .select('id')
    .single()

  if (eventError || !event) {
    console.error('[createInstantBookingCheckout] Event creation failed:', eventError)
    throw new Error('Failed to create event')
  }

  // Log initial transition (null → draft)
  await supabase.from('event_state_transitions').insert({
    tenant_id: tenantId,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    metadata: {
      action: 'auto_created_from_instant_book',
      inquiry_id: inquiry?.id,
      booking_source: 'instant_book',
    },
  })

  // Link inquiry to event
  if (inquiry?.id) {
    await supabase
      .from('inquiries')
      .update({ converted_to_event_id: event.id })
      .eq('id', inquiry.id)
  }

  // 6. Create Stripe Checkout Session
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const chefName = (chef.business_name as string) || 'Private Chef'

  const { computeApplicationFee } = await import('@/lib/stripe/transfer-routing')
  const feePercent = Number(chef.platform_fee_percent ?? 0)
  const feeFixed = Number(chef.platform_fee_fixed_cents ?? 0)
  const applicationFee = computeApplicationFee(depositCents, feePercent, feeFixed)

  const paymentIntentData: Record<string, unknown> = {
    metadata: {
      event_id: event.id,
      tenant_id: tenantId,
      client_id: client.id,
      payment_type: 'deposit',
      transfer_routed: 'true',
      booking_source: 'instant_book',
    },
    transfer_data: {
      destination: chef.stripe_account_id,
    },
  }

  if (applicationFee > 0) {
    paymentIntentData.application_fee_amount = applicationFee
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: depositCents,
          product_data: {
            name: `${validated.occasion} — Deposit (${chefName})`,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: paymentIntentData as any,
    success_url: `${appUrl}/book/${validated.chef_slug}/thank-you?mode=instant&event=${event.id}`,
    cancel_url: `${appUrl}/book/${validated.chef_slug}?booking=cancelled`,
    customer_email: validated.email.toLowerCase().trim(),
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
  })

  return {
    checkoutUrl: session.url!,
    totalCents,
    depositCents,
  }
}

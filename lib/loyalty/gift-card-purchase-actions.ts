'use server'

// Gift Card Purchase Flow
// Initiates a Stripe Checkout session for clients (or guests) to purchase a gift card
// for a specific chef (tenant). On payment success, the Stripe webhook creates the
// client_incentives record and sends the gift card code to the recipient.

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

const InitiateGiftCardPurchaseSchema = z.object({
  tenantId: z.string().uuid('Invalid chef ID'),
  amountCents: z
    .number()
    .int()
    .min(500, 'Minimum gift card amount is $5')
    .max(200000, 'Maximum gift card amount is $2,000'),
  recipientEmail: z.string().email('Valid recipient email required'),
  recipientName: z.string().max(120).optional(),
  personalMessage: z.string().max(500).optional(),
  buyerEmail: z.string().email('Valid buyer email required'),
  chefSlug: z.string().min(1), // For success/cancel URL construction
})

export type InitiateGiftCardPurchaseInput = z.infer<typeof InitiateGiftCardPurchaseSchema>

/**
 * Initiate a Stripe Checkout session for purchasing a gift card.
 *
 * Can be called by:
 *   - Logged-in clients (user is resolved automatically)
 *   - Guests (no auth required; buyerEmail must be provided)
 *
 * Flow:
 *   1. Validate input
 *   2. Verify chef (tenant) exists and is discoverable
 *   3. Create gift_card_purchase_intents row (pre-payment state)
 *   4. Create Stripe Checkout Session with metadata linking to the intent
 *   5. Return { checkoutUrl } to redirect the client to Stripe
 *
 * On payment success, the Stripe webhook (checkout.session.completed) reads
 * the purchase_intent_id from metadata and creates the client_incentives record.
 */
export async function initiateGiftCardPurchase(input: InitiateGiftCardPurchaseInput) {
  const validated = InitiateGiftCardPurchaseSchema.parse(input)

  // Resolve logged-in user (if any) — gift card purchases are also open to guests
  const currentUser = await getCurrentUser()
  const supabase = createServerClient({ admin: true })

  // Verify chef exists and get their display name for the checkout line item
  const { data: chef, error: chefError } = await (supabase as any)
    .from('chefs')
    .select('id, display_name, business_name, is_discoverable')
    .eq('id', validated.tenantId)
    .single()

  if (chefError || !chef) {
    throw new Error('Chef not found.')
  }

  const chefDisplayName = chef.display_name || chef.business_name || 'Private Chef'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Create the purchase intent row first (pre-payment audit state)
  const { data: intent, error: intentError } = await (supabase as any)
    .from('gift_card_purchase_intents')
    .insert({
      tenant_id: validated.tenantId,
      amount_cents: validated.amountCents,
      currency_code: 'USD',
      recipient_email: validated.recipientEmail.toLowerCase(),
      recipient_name: validated.recipientName?.trim() || null,
      personal_message: validated.personalMessage?.trim() || null,
      buyer_user_id: currentUser?.id || null,
      buyer_email: validated.buyerEmail.toLowerCase(),
      status: 'pending',
    })
    .select('id')
    .single()

  if (intentError || !intent) {
    console.error('[initiateGiftCardPurchase] Failed to create intent:', intentError)
    throw new Error('Failed to initialize gift card purchase. Please try again.')
  }

  // Format the dollar amount for display
  const amountFormatted = (validated.amountCents / 100).toFixed(2)

  // Create the Stripe Checkout Session
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: validated.amountCents,
          product_data: {
            name: `Gift Card — ${chefDisplayName}`,
            description: `$${amountFormatted} gift card for ${chefDisplayName}'s private chef services. Code will be emailed to ${validated.recipientEmail}.`,
          },
        },
        quantity: 1,
      },
    ],
    // Metadata on the session (accessible to webhook as checkout.session.completed)
    metadata: {
      payment_type: 'gift_card_purchase',
      purchase_intent_id: intent.id,
      tenant_id: validated.tenantId,
    },
    // Also set on payment_intent for consistency (charge.refunded reads from here)
    payment_intent_data: {
      metadata: {
        payment_type: 'gift_card_purchase',
        purchase_intent_id: intent.id,
        tenant_id: validated.tenantId,
      },
    },
    customer_email: validated.buyerEmail,
    success_url: `${appUrl}/chef/${validated.chefSlug}/gift-cards/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/chef/${validated.chefSlug}/gift-cards`,
    expires_at: Math.floor(Date.now() / 1000) + 24 * 3600, // 24 hours
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session. Please try again.')
  }

  // Store the session ID on the intent for later lookup
  await (supabase as any)
    .from('gift_card_purchase_intents')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', intent.id)

  return { checkoutUrl: session.url }
}

/**
 * Look up a completed gift card purchase by Stripe session ID.
 * Used on the success page to show purchase confirmation details.
 */
export async function getGiftCardPurchaseBySession(sessionId: string) {
  if (!sessionId) return null

  const supabase = createServerClient({ admin: true })

  const { data: intent } = await (supabase as any)
    .from('gift_card_purchase_intents')
    .select(`
      *,
      incentive:created_incentive_id (
        code,
        amount_cents,
        remaining_balance_cents,
        is_active
      )
    `)
    .eq('stripe_checkout_session_id', sessionId)
    .single()

  return intent || null
}

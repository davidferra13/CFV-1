// Stripe Checkout Session Helpers
// Creates shareable payment links for email correspondence.
// Not a server action module - called internally by server actions.

import { createServerClient } from '@/lib/db/server'
import { breakers } from '@/lib/resilience/circuit-breaker'
import { isConnectOnboardingRequiredForPayments } from '@/lib/stripe/payment-policy'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

/**
 * Create a Stripe Checkout Session for an event payment.
 * Returns the hosted checkout URL for embedding in emails.
 *
 * Called from approveAndSendMessage() when [PAYMENT_LINK] is detected.
 * Uses admin client - caller is responsible for auth.
 *
 * Returns null if event is not in a payable state.
 */
export async function createPaymentCheckoutUrl(
  eventId: string,
  tenantId: string,
  options?: {
    successUrl?: string
    cancelUrl?: string
  }
): Promise<string | null> {
  const db = createServerClient({ admin: true })

  // Fetch event with client info
  const { data: event } = await db
    .from('events')
    .select('*, client:clients(email, full_name)')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return null
  const payableStatuses = ['accepted', 'paid', 'confirmed', 'in_progress', 'completed']
  if (!payableStatuses.includes(event.status)) return null

  // Determine payment amount
  const { data: financial } = await db
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  const depositCents = event.deposit_amount_cents ?? 0
  const totalPaidCents = financial?.total_paid_cents ?? 0
  const quotedCents = event.quoted_price_cents ?? 0

  if (quotedCents <= 0) return null
  if (depositCents < 0 || depositCents > quotedCents) return null

  let amountCents: number
  let paymentType: string

  if (totalPaidCents === 0 && depositCents > 0) {
    amountCents = depositCents
    paymentType = 'deposit'
  } else {
    amountCents = quotedCents - totalPaidCents
    paymentType = 'balance'
  }

  if (amountCents <= 0) return null

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

  // Fetch chef's Stripe Connect config for transfer routing
  const { getChefStripeConfig, computeApplicationFee } =
    await import('@/lib/stripe/transfer-routing')
  const chefConfig = await getChefStripeConfig(tenantId)
  const requireConnect = isConnectOnboardingRequiredForPayments()

  if (requireConnect && !chefConfig.canReceiveTransfers) {
    console.warn(
      '[createPaymentCheckoutUrl] Connect onboarding incomplete for tenant in required mode:',
      tenantId
    )
    return null
  }

  const transferRouted = chefConfig.canReceiveTransfers && !!chefConfig.stripeAccountId

  const paymentIntentData: Record<string, unknown> = {
    metadata: {
      event_id: eventId,
      tenant_id: event.tenant_id,
      client_id: event.client_id,
      payment_type: paymentType,
      transfer_routed: transferRouted ? 'true' : 'false',
    },
  }

  // Route to chef's connected Stripe account if ready
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

  // Check chef's payment method preferences
  const { data: chefPrefs } = await db
    .from('chefs')
    .select('apple_pay_enabled, google_pay_enabled, ach_enabled')
    .eq('id', tenantId)
    .single()

  // Build payment method config based on chef preferences.
  // If both wallets are enabled (or no prefs row), use automatic_payment_methods (Stripe default).
  // Otherwise, explicitly list allowed methods to exclude disabled wallets.
  const applePayOn = chefPrefs?.apple_pay_enabled !== false
  const googlePayOn = chefPrefs?.google_pay_enabled !== false
  const achOn = chefPrefs?.ach_enabled === true

  const checkoutParams: Record<string, unknown> = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `${event.occasion || 'Private Chef Event'} - ${paymentType === 'deposit' ? 'Deposit' : 'Payment'}`,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: paymentIntentData as any,
    success_url: options?.successUrl ?? `${appUrl}/my-events/${eventId}?payment=success`,
    cancel_url: options?.cancelUrl ?? `${appUrl}/my-events/${eventId}?payment=cancelled`,
    customer_email: (event.client as { email: string | null })?.email || undefined,
    expires_at: Math.floor(Date.now() / 1000) + 72 * 3600, // 72 hours
  }

  if (!applePayOn || !googlePayOn || achOn) {
    // Explicit list: always include card; conditionally add wallets and ACH
    const types: string[] = ['card']
    if (applePayOn) types.push('apple_pay')
    if (googlePayOn) types.push('google_pay')
    if (achOn) types.push('us_bank_account')
    checkoutParams.payment_method_types = types
  }

  const session = await breakers.stripe.execute(() =>
    stripe.checkout.sessions.create(checkoutParams as any)
  )

  return session.url
}

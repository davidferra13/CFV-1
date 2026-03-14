// Stripe Payment Actions
// Creates PaymentIntents for client payments
// Server-side only (uses Stripe secret key)

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { breakers } from '@/lib/resilience/circuit-breaker'
import type Stripe from 'stripe'

/**
 * Lazy Stripe client initialization
 * Avoids module-level side effects during build/import
 */
function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

/**
 * Create PaymentIntent for event payment
 * Client-only: Can only pay for own events
 */
export async function createPaymentIntent(eventId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Fetch event and verify ownership
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (error || !event) {
    return { success: false as const, error: 'Event not found' }
  }

  // Verify event is in correct status for payment
  if (event.status !== 'accepted') {
    return { success: false as const, error: 'Event is not ready for payment' }
  }

  // Determine amount from financial summary
  const { data: financial } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  // Use outstanding balance, or deposit if no payments yet, or quoted price
  const outstandingCents = financial?.outstanding_balance_cents ?? 0
  const depositCents = event.deposit_amount_cents ?? 0
  const quotedCents = event.quoted_price_cents ?? 0
  const totalPaidCents = financial?.total_paid_cents ?? 0

  // If nothing paid yet and deposit defined, charge deposit; otherwise charge outstanding
  let amountCents: number
  let paymentType: string

  if (totalPaidCents === 0 && depositCents > 0) {
    amountCents = depositCents
    paymentType = 'deposit'
  } else if (outstandingCents > 0) {
    amountCents = outstandingCents
    paymentType = 'balance'
  } else {
    amountCents = quotedCents
    paymentType = 'full'
  }

  if (amountCents <= 0) {
    throw new Error('Invalid payment amount')
  }

  const stripe = getStripe()

  // Fetch chef's Stripe Connect config for transfer routing
  const { getChefStripeConfig, computeApplicationFee } =
    await import('@/lib/stripe/transfer-routing')
  const chefConfig = await getChefStripeConfig(event.tenant_id)

  // Build PaymentIntent params
  const createParams: Stripe.PaymentIntentCreateParams = {
    amount: amountCents,
    currency: 'usd',
    metadata: {
      event_id: eventId,
      tenant_id: event.tenant_id,
      client_id: user.entityId!,
      payment_type: paymentType,
      transfer_routed: chefConfig.canReceiveTransfers ? 'true' : 'false',
    },
    automatic_payment_methods: {
      enabled: true,
    },
  }

  // Route to chef's connected Stripe account if ready
  if (chefConfig.canReceiveTransfers && chefConfig.stripeAccountId) {
    createParams.transfer_data = {
      destination: chefConfig.stripeAccountId,
    }

    const applicationFee = computeApplicationFee(
      amountCents,
      chefConfig.platformFeePercent,
      chefConfig.platformFeeFixedCents
    )
    if (applicationFee > 0) {
      createParams.application_fee_amount = applicationFee
    }
  }

  // Create PaymentIntent with metadata for webhook processing
  // Circuit breaker: trips after 3 consecutive Stripe failures (30s reset)
  const paymentIntent = await breakers.stripe.execute(() =>
    stripe.paymentIntents.create(createParams)
  )

  return {
    clientSecret: paymentIntent.client_secret,
    amount: amountCents,
  }
}

/**
 * Get payment status for event
 */
export async function getEventPaymentStatus(eventId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Fetch event
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  // Fetch financial summary from view
  const { data: summary, error: summaryError } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  if (summaryError || !summary) {
    return { success: false as const, error: 'Could not load financial data' }
  }

  const paymentStatus = summary.payment_status ?? 'unpaid'

  return {
    event,
    paymentStatus,
    isDepositPaid: paymentStatus !== 'unpaid',
    isFullyPaid: paymentStatus === 'paid',
    totalPaidCents: summary.total_paid_cents ?? 0,
    outstandingBalanceCents: summary.outstanding_balance_cents ?? 0,
    quotedPriceCents: event.quoted_price_cents ?? 0,
    depositAmountCents: event.deposit_amount_cents ?? 0,
  }
}

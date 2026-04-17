// Stripe Payment Actions
// Creates PaymentIntents for client payments
// Server-side only (uses Stripe secret key)

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { breakers } from '@/lib/resilience/circuit-breaker'
import { isConnectOnboardingRequiredForPayments } from '@/lib/stripe/payment-policy'
import type Stripe from 'stripe'

export type CreatePaymentIntentResult =
  | {
      clientSecret: string | null
      amount: number
    }
  | {
      success: false
      error: string
    }

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
export async function createPaymentIntent(eventId: string): Promise<CreatePaymentIntentResult> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Fetch event and verify ownership
  const { data: event, error } = await db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (error || !event) {
    return { success: false as const, error: 'Event not found' }
  }

  // Verify event is in correct status for payment
  // Allow: accepted (initial/deposit), paid/confirmed/in_progress (balance payments)
  const payableStatuses = ['accepted', 'paid', 'confirmed', 'in_progress']
  if (!payableStatuses.includes(event.status)) {
    return { success: false as const, error: 'Event is not ready for payment' }
  }

  const quotedCents = event.quoted_price_cents ?? 0
  const depositCents = event.deposit_amount_cents ?? 0
  if (quotedCents <= 0) {
    return {
      success: false as const,
      error: 'Event is missing a valid quoted price. Please contact your chef.',
    }
  }
  if (depositCents < 0 || depositCents > quotedCents) {
    return {
      success: false as const,
      error: 'Event has an invalid deposit configuration. Please contact your chef.',
    }
  }

  // Determine amount from financial summary
  const { data: financial } = await db
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  // Use outstanding balance, or deposit if no payments yet, or quoted price
  const outstandingCents = financial?.outstanding_balance_cents ?? 0
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
    return { success: false as const, error: 'Invalid payment amount for this event' }
  }

  const stripe = getStripe()

  // Fetch chef's Stripe Connect config for transfer routing
  const { getChefStripeConfig, computeApplicationFee } =
    await import('@/lib/stripe/transfer-routing')
  const chefConfig = await getChefStripeConfig(event.tenant_id)
  const requireConnect = isConnectOnboardingRequiredForPayments()

  if (requireConnect && !chefConfig.canReceiveTransfers) {
    return {
      success: false as const,
      error:
        'Online payments are temporarily unavailable while your chef finishes payout setup. Please contact support.',
    }
  }

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
  let paymentIntent: Stripe.Response<Stripe.PaymentIntent>
  try {
    paymentIntent = await breakers.stripe.execute(() => stripe.paymentIntents.create(createParams))
  } catch (error) {
    console.error('[createPaymentIntent] Failed to create PaymentIntent:', error)
    return {
      success: false as const,
      error: 'Unable to initialize payment right now. Please try again.',
    }
  }

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
  const db: any = createServerClient()

  // Fetch event
  const { data: event, error } = await db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  // Fetch financial summary from view
  const { data: summary, error: summaryError } = await db
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

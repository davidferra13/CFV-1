// Stripe Refund Utility
// Called by lib/cancellation/refund-actions.ts when initiating a refund for a Stripe payment.
// The resulting charge.refunded webhook fires automatically and the existing handleRefund()
// in the webhook handler writes the ledger entry - so callers must NOT write a ledger
// entry for Stripe refunds (double-entry prevention).

import { breakers } from '@/lib/resilience/circuit-breaker'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

export type StripeRefundResult = {
  refundId: string
  status: string
  amountCents: number
}

/**
 * Find the most recent successful PaymentIntent for an event and issue a partial or full refund.
 *
 * @param paymentIntentId - Stripe PaymentIntent ID (pi_xxx)
 * @param amountCents - amount to refund in cents. Pass full amount for complete refund.
 * @param reason - optional refund reason (shown on Stripe dashboard)
 */
export async function createStripeRefund(
  paymentIntentId: string,
  amountCents: number,
  reason?: string
): Promise<StripeRefundResult> {
  const stripe = getStripe()

  // Retrieve the PaymentIntent to get the charge ID
  const paymentIntent = await breakers.stripe.execute(() =>
    stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
  )

  const charge = paymentIntent.latest_charge as Stripe.Charge | null

  if (!charge?.id) {
    throw new Error(`No charge found on PaymentIntent ${paymentIntentId}`)
  }

  if (charge.refunded) {
    throw new Error(`PaymentIntent ${paymentIntentId} has already been fully refunded`)
  }

  // Validate refund amount does not exceed what's refundable
  const refundableAmount = charge.amount - (charge.amount_refunded || 0)
  if (amountCents > refundableAmount) {
    throw new Error(
      `Refund amount (${amountCents}) exceeds refundable amount (${refundableAmount}) for PaymentIntent ${paymentIntentId}`
    )
  }

  // For destination charges (transferred payments), reverse the transfer
  // and refund the application fee so the connected account is properly debited.
  const hasTransfer = !!(charge as any).transfer

  // Idempotency key prevents duplicate refunds on retry/double-click
  const idempotencyKey = `refund_${charge.id}_${amountCents}`

  const refund = await breakers.stripe.execute(() =>
    stripe.refunds.create(
      {
        charge: charge.id,
        amount: amountCents,
        reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
        ...(hasTransfer
          ? {
              reverse_transfer: true,
              refund_application_fee: true,
            }
          : {}),
      },
      { idempotencyKey }
    )
  )

  return {
    refundId: refund.id,
    status: refund.status ?? 'unknown',
    amountCents: refund.amount,
  }
}

/**
 * Look up the latest paid PaymentIntent ID for an event from the ledger.
 * Returns null if the event was paid via offline method (no Stripe ID).
 */
export async function getStripePaymentIntentIdForEvent(eventId: string): Promise<string | null> {
  // Import here to avoid circular deps
  const { createServerClient } = await import('@/lib/db/server')
  const db = createServerClient({ admin: true })

  // Find the most recent ledger entry with a Stripe transaction_reference (starts with 'evt_')
  // The transaction_reference on payment entries is the Stripe *event* ID (evt_xxx),
  // so we retrieve the matching charge via the charge notes.
  // Better: find entries with internal_notes containing a PaymentIntent ID.
  const { data: entries } = await db
    .from('ledger_entries')
    .select('internal_notes, transaction_reference')
    .eq('event_id', eventId)
    .in('entry_type', ['payment', 'deposit'])
    .eq('is_refund', false)
    .not('transaction_reference', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!entries || entries.length === 0) return null

  const notes = entries[0].internal_notes ?? ''
  // Extract PaymentIntent ID from internal_notes: "PaymentIntent: pi_xxx"
  const match = notes.match(/PaymentIntent:\s*(pi_\w+)/)
  return match ? match[1] : null
}

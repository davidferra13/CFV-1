// Stripe Webhook Handler
// Enforces System Law #3: Ledger-first financial truth
// Idempotent: Duplicate webhooks are safely ignored via transaction_reference

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { appendLedgerEntryFromWebhook } from '@/lib/ledger/append'
import { transitionEvent } from '@/lib/events/transitions'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Lazy Stripe client initialization
 */
function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion
  })
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] No signature header')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const error = err as Error
    console.error('[Stripe Webhook] Signature verification failed:', error.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  console.log('[Stripe Webhook] Received event:', event.type, event.id)

  // Idempotency check: Has this event been processed?
  // Uses transaction_reference column for deduplication
  const supabase = createServerClient({ admin: true })
  const { data: existingEntry } = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('transaction_reference', event.id)
    .single()

  if (existingEntry) {
    console.log('[Stripe Webhook] Event already processed (idempotent):', event.id)
    return NextResponse.json({ received: true, cached: true })
  }

  try {
    // Route to appropriate handler
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event)
        break

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event)
        break

      case 'charge.refunded':
        await handleRefund(event)
        break

      case 'charge.dispute.created':
        await handleDisputeCreated(event)
        break

      case 'charge.dispute.funds_withdrawn':
        await handleDisputeFundsWithdrawn(event)
        break

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const err = error as Error
    console.error('[Stripe Webhook] Handler error:', err.message)
    // Return 500 so Stripe retries
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful payment
 * 1. Append to ledger (source of truth)
 * 2. Check financial summary
 * 3. Transition event to 'paid' status
 */
async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent

  // Extract metadata (set when creating PaymentIntent)
  const { event_id, tenant_id, client_id, payment_type } = paymentIntent.metadata

  if (!event_id || !tenant_id || !client_id) {
    throw new Error('Missing required metadata on PaymentIntent')
  }

  console.log('[handlePaymentSucceeded] Processing payment for event:', event_id)

  // Determine entry type based on payment_type metadata
  const entryType = payment_type === 'deposit' ? 'deposit' as const : 'payment' as const

  // 1. Append to ledger (transaction_reference = stripe event ID for idempotency)
  const result = await appendLedgerEntryFromWebhook({
    tenant_id,
    client_id,
    entry_type: entryType,
    amount_cents: paymentIntent.amount, // Already in cents
    payment_method: 'card',
    description: `Stripe payment for event ${event_id} (${payment_type})`,
    event_id,
    transaction_reference: event.id,
    internal_notes: `PaymentIntent: ${paymentIntent.id}`,
    created_by: null
  })

  if (result.duplicate) {
    console.log('[handlePaymentSucceeded] Duplicate entry (idempotent)')
    return
  }

  // 2. Check financial summary
  const supabase = createServerClient({ admin: true })
  const { data: financialSummary } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', event_id)
    .single()

  if (!financialSummary) {
    console.error('[handlePaymentSucceeded] Could not fetch financial summary')
    return
  }

  // 3. Transition event to 'paid' status
  try {
    await transitionEvent({
      eventId: event_id,
      toStatus: 'paid',
      metadata: {
        source: 'stripe_webhook',
        stripe_event_id: event.id,
        payment_intent_id: paymentIntent.id,
        amount_cents: paymentIntent.amount,
        payment_status: financialSummary.payment_status
      },
      systemTransition: true // Bypass permission checks
    })

    console.log('[handlePaymentSucceeded] Event transitioned to paid:', event_id)
  } catch (transitionError) {
    // Log but don't throw - ledger entry is what matters
    console.error('[handlePaymentSucceeded] Transition failed:', transitionError)

    // Insert audit trail so failed transition can be investigated and resolved manually
    try {
      await supabase
        .from('event_state_transitions')
        .insert({
          event_id,
          tenant_id,
          from_status: null,
          to_status: 'paid' as const,
          transitioned_by: null,
          reason: 'Auto-transition failed after payment',
          metadata: {
            error: String(transitionError),
            stripe_event_id: event.id,
            payment_intent_id: paymentIntent.id,
            requires_manual_review: true
          }
        })
      console.log('[handlePaymentSucceeded] Audit trail inserted for failed transition:', event_id)
    } catch (auditError: unknown) {
      console.error('[handlePaymentSucceeded] Failed to insert audit trail:', auditError)
    }
  }
}

/**
 * Handle failed payment
 * Log to ledger as adjustment with 0 amount (no money moved, but we track the attempt)
 */
async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const { event_id, tenant_id, client_id } = paymentIntent.metadata

  if (!event_id || !tenant_id || !client_id) {
    console.log('[handlePaymentFailed] Missing metadata, skipping')
    return
  }

  console.log('[handlePaymentFailed] Payment failed for event:', event_id)

  await appendLedgerEntryFromWebhook({
    tenant_id,
    client_id,
    entry_type: 'adjustment',
    amount_cents: 0, // No money moved
    payment_method: 'card',
    description: `Payment failed for event ${event_id}`,
    event_id,
    transaction_reference: event.id,
    internal_notes: `Failure: ${paymentIntent.last_payment_error?.code ?? 'unknown'} - ${paymentIntent.last_payment_error?.message ?? 'no message'}`,
    created_by: null
  })
}

/**
 * Handle canceled PaymentIntent
 * Log to ledger as 0-amount adjustment for audit trail
 */
async function handlePaymentCanceled(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const { event_id, tenant_id, client_id } = paymentIntent.metadata

  if (!event_id || !tenant_id || !client_id) {
    console.log('[handlePaymentCanceled] Missing metadata, skipping')
    return
  }

  console.log('[handlePaymentCanceled] Payment canceled for event:', event_id)

  await appendLedgerEntryFromWebhook({
    tenant_id,
    client_id,
    entry_type: 'adjustment',
    amount_cents: 0,
    payment_method: 'card',
    description: `Payment canceled for event ${event_id}`,
    event_id,
    transaction_reference: event.id,
    internal_notes: `PaymentIntent ${paymentIntent.id} was canceled. Cancellation reason: ${paymentIntent.cancellation_reason ?? 'none'}`,
    created_by: null
  })
}

/**
 * Handle refund
 * Append refund entry to ledger
 */
async function handleRefund(event: Stripe.Event) {
  const refund = event.data.object as Stripe.Refund
  const stripe = getStripe()

  // Safely handle refund.charge — can be null in edge cases
  if (!refund.charge || typeof refund.charge !== 'string') {
    console.error('[handleRefund] No charge ID on refund object:', refund.id)
    return
  }

  // Get charge to find metadata
  const charge = await stripe.charges.retrieve(refund.charge)
  const { event_id, tenant_id, client_id } = charge.metadata

  if (!event_id || !tenant_id || !client_id) {
    console.log('[handleRefund] Missing metadata, skipping')
    return
  }

  console.log('[handleRefund] Processing refund for event:', event_id)

  await appendLedgerEntryFromWebhook({
    tenant_id,
    client_id,
    entry_type: 'refund',
    amount_cents: refund.amount, // Positive amount; is_refund flag handles sign semantics
    payment_method: 'card',
    description: `Refund issued for event ${event_id}`,
    event_id,
    transaction_reference: event.id,
    is_refund: true,
    refund_reason: refund.reason ?? 'Stripe refund',
    internal_notes: `Charge: ${refund.charge}, Refund: ${refund.id}`,
    created_by: null
  })
}

/**
 * Handle dispute created
 * Log to ledger as adjustment (money may be clawed back)
 */
async function handleDisputeCreated(event: Stripe.Event) {
  const dispute = event.data.object as Stripe.Dispute
  const stripe = getStripe()

  // Get the charge to find our metadata
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
  if (!chargeId) {
    console.error('[handleDisputeCreated] No charge ID on dispute:', dispute.id)
    return
  }

  const charge = await stripe.charges.retrieve(chargeId)
  const { event_id, tenant_id, client_id } = charge.metadata

  if (!event_id || !tenant_id || !client_id) {
    console.log('[handleDisputeCreated] Missing metadata, skipping')
    return
  }

  console.log('[handleDisputeCreated] Dispute opened for event:', event_id)

  await appendLedgerEntryFromWebhook({
    tenant_id,
    client_id,
    entry_type: 'adjustment',
    amount_cents: 0, // No money moved yet — funds_withdrawn handles that
    payment_method: 'card',
    description: `Dispute opened for event ${event_id}`,
    event_id,
    transaction_reference: event.id,
    internal_notes: `Dispute ${dispute.id}: ${dispute.reason}. Amount: ${dispute.amount}. Status: ${dispute.status}`,
    created_by: null
  })
}

/**
 * Handle dispute funds withdrawn
 * Log to ledger as negative adjustment — money has been clawed back by the bank
 */
async function handleDisputeFundsWithdrawn(event: Stripe.Event) {
  const dispute = event.data.object as Stripe.Dispute
  const stripe = getStripe()

  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
  if (!chargeId) {
    console.error('[handleDisputeFundsWithdrawn] No charge ID on dispute:', dispute.id)
    return
  }

  const charge = await stripe.charges.retrieve(chargeId)
  const { event_id, tenant_id, client_id } = charge.metadata

  if (!event_id || !tenant_id || !client_id) {
    console.log('[handleDisputeFundsWithdrawn] Missing metadata, skipping')
    return
  }

  console.log('[handleDisputeFundsWithdrawn] Funds withdrawn for event:', event_id)

  await appendLedgerEntryFromWebhook({
    tenant_id,
    client_id,
    entry_type: 'refund',
    amount_cents: dispute.amount,
    payment_method: 'card',
    description: `Dispute funds withdrawn for event ${event_id}`,
    event_id,
    transaction_reference: event.id,
    is_refund: true,
    refund_reason: `Dispute: ${dispute.reason}`,
    internal_notes: `Dispute ${dispute.id} funds withdrawn. Amount: ${dispute.amount}`,
    created_by: null
  })
}

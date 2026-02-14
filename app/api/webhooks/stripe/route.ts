// Stripe Webhook Handler
// Enforces System Law #3: Ledger-first financial truth
// Idempotent: Duplicate webhooks are safely ignored

import { headers } from 'next/headers'
import { NextResponse } from 'next/response'
import Stripe from 'stripe'
import { appendLedgerEntry } from '@/lib/ledger/append'
import { transitionEvent} from '@/lib/events/transitions'
import { createServerClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] No signature header')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

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
  const supabase = createServerClient({ admin: true })
  const { data: existingEntry } = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('stripe_event_id', event.id)
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

      case 'charge.refunded':
        await handleRefund(event)
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
 * 2. Check if deposit/full amount paid
 * 3. Transition event to 'paid' status
 */
async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent

  // Extract metadata (set when creating PaymentIntent)
  const { event_id, tenant_id, client_id } = paymentIntent.metadata

  if (!event_id || !tenant_id || !client_id) {
    throw new Error('Missing required metadata on PaymentIntent')
  }

  console.log('[handlePaymentSucceeded] Processing payment for event:', event_id)

  // 1. Append to ledger (idempotency key = stripe_event_id)
  const result = await appendLedgerEntry({
    tenant_id,
    entry_type: 'charge_succeeded',
    amount_cents: paymentIntent.amount, // Already in cents
    currency: paymentIntent.currency,
    event_id,
    client_id,
    stripe_event_id: event.id,
    stripe_object_id: paymentIntent.id,
    stripe_event_type: event.type,
    description: `Payment received for event ${event_id}`,
    metadata: {
      payment_method: paymentIntent.payment_method,
      receipt_email: paymentIntent.receipt_email
    },
    created_by: null // Webhook entry
  })

  if (result.duplicate) {
    console.log('[handlePaymentSucceeded] Duplicate entry (idempotent)')
    return
  }

  // 2. Check if deposit or full amount is paid
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
        is_fully_paid: financialSummary.is_fully_paid,
        is_deposit_paid: financialSummary.is_deposit_paid
      },
      systemTransition: true // Bypass permission checks
    })

    console.log('[handlePaymentSucceeded] Event transitioned to paid:', event_id)
  } catch (transitionError) {
    // Log but don't throw - ledger entry is what matters
    console.error('[handlePaymentSucceeded] Transition failed:', transitionError)
  }
}

/**
 * Handle failed payment
 * Log to ledger (no money moved, but we track the attempt)
 */
async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const { event_id, tenant_id, client_id } = paymentIntent.metadata

  if (!event_id || !tenant_id) {
    console.log('[handlePaymentFailed] Missing metadata, skipping')
    return
  }

  console.log('[handlePaymentFailed] Payment failed for event:', event_id)

  await appendLedgerEntry({
    tenant_id,
    entry_type: 'charge_failed',
    amount_cents: 0, // No money moved
    currency: paymentIntent.currency,
    event_id,
    client_id,
    stripe_event_id: event.id,
    stripe_object_id: paymentIntent.id,
    stripe_event_type: event.type,
    description: `Payment failed for event ${event_id}`,
    metadata: {
      failure_code: paymentIntent.last_payment_error?.code,
      failure_message: paymentIntent.last_payment_error?.message
    },
    created_by: null
  })
}

/**
 * Handle refund
 * Append negative entry to ledger (reverses credit)
 */
async function handleRefund(event: Stripe.Event) {
  const refund = event.data.object as Stripe.Refund

  // Get charge to find metadata
  const charge = await stripe.charges.retrieve(refund.charge as string)
  const { event_id, tenant_id, client_id } = charge.metadata

  if (!event_id || !tenant_id) {
    console.log('[handleRefund] Missing metadata, skipping')
    return
  }

  console.log('[handleRefund] Processing refund for event:', event_id)

  await appendLedgerEntry({
    tenant_id,
    entry_type: 'refund_succeeded',
    amount_cents: -refund.amount, // Negative to reverse credit
    currency: refund.currency,
    event_id,
    client_id,
    stripe_event_id: event.id,
    stripe_object_id: refund.id,
    stripe_event_type: event.type,
    description: `Refund issued for event ${event_id}`,
    metadata: {
      reason: refund.reason,
      charge_id: refund.charge
    },
    created_by: null
  })
}

// Stripe Payment Actions
// Creates PaymentIntents for client payments
// Server-side only (uses Stripe secret key)

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

/**
 * Create PaymentIntent for event deposit
 * Client-only: Can only pay for own events
 */
export async function createPaymentIntent(eventId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  // Fetch event and verify ownership
  const { data: event, error } = await supabase
    .from('events')
    .select('*, client:clients(stripe_customer_id)')
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  // Verify event is in correct status for payment
  if (event.status !== 'accepted') {
    throw new Error('Event is not ready for payment')
  }

  // Determine amount (deposit or full)
  const amountCents = event.deposit_required
    ? event.deposit_amount_cents
    : event.total_amount_cents

  if (amountCents <= 0) {
    throw new Error('Invalid payment amount')
  }

  // Get or create Stripe customer
  let customerId = event.client?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        client_id: user.entityId!,
        tenant_id: user.tenantId!
      }
    })
    customerId = customer.id

    // Update client record with Stripe customer ID
    await supabase
      .from('clients')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.entityId!)
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    metadata: {
      event_id: eventId,
      tenant_id: event.tenant_id,
      client_id: user.entityId!,
      payment_type: event.deposit_required ? 'deposit' : 'full'
    },
    automatic_payment_methods: {
      enabled: true
    }
  })

  return {
    clientSecret: paymentIntent.client_secret,
    amount: amountCents
  }
}

/**
 * Get payment status for event
 */
export async function getEventPaymentStatus(eventId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

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

  // Fetch financial summary
  const { data: summary } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  return {
    event,
    isDepositPaid: summary?.is_deposit_paid || false,
    isFullyPaid: summary?.is_fully_paid || false,
    collectedCents: summary?.collected_cents || 0,
    expectedTotalCents: event.total_amount_cents,
    expectedDepositCents: event.deposit_amount_cents
  }
}

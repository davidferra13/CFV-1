// Stripe Webhook Handler
// Enforces System Law #3: Ledger-first financial truth
// Idempotent: Duplicate webhooks are safely ignored via transaction_reference

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { appendLedgerEntryFromWebhook } from '@/lib/ledger/append'
import { transitionEvent } from '@/lib/events/transitions'
import { createServerClient } from '@/lib/supabase/server'
import { logWebhookEvent } from '@/lib/webhooks/audit-log'

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

  // Log webhook receipt for audit trail — fire-and-forget
  logWebhookEvent({
    provider: 'stripe',
    eventType: event.type,
    providerEventId: event.id,
    status: 'received',
    payloadSizeBytes: body.length,
  })

  // Idempotency check: Has this event been processed?
  // Uses transaction_reference column for deduplication.
  // NOTE: checkout.session.completed does NOT write to ledger_entries, so it has
  // its own idempotency check inside handleGiftCardPurchaseCompleted().
  const supabase = createServerClient({ admin: true })

  // Events that do not write ledger entries bypass the ledger idempotency check
  const isNonLedgerEvent =
    event.type === 'checkout.session.completed' ||
    event.type === 'account.updated' ||
    event.type === 'transfer.created' ||
    event.type === 'transfer.updated' ||
    event.type === 'transfer.reversed' ||
    event.type === 'application_fee.refunded'

  if (!isNonLedgerEvent) {
    const { data: existingEntry } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('transaction_reference', event.id)
      .single()

    if (existingEntry) {
      console.log('[Stripe Webhook] Event already processed (idempotent):', event.id)
      return NextResponse.json({ received: true, cached: true })
    }
  }

  try {
    // Route to appropriate handler
    switch (event.type) {
      case 'checkout.session.completed':
        await handleGiftCardPurchaseCompleted(event, supabase)
        break

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

      case 'account.updated':
        await handleAccountUpdated(event)
        break

      case 'transfer.created':
      case 'transfer.updated':
      case 'transfer.reversed':
        await handleTransferEvent(event)
        break

      case 'application_fee.refunded':
        await handleApplicationFeeRefunded(event)
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
 * Handle gift card purchase via Stripe Checkout Session.
 * Reads purchase_intent_id from session metadata to create the client_incentives record,
 * sends the gift card code to the recipient, and confirms the buyer.
 *
 * Idempotency: Checks gift_card_purchase_intents.status — if already 'paid', returns early.
 */
async function handleGiftCardPurchaseCompleted(
  event: Stripe.Event,
  supabase: ReturnType<typeof createServerClient>
) {
  const session = event.data.object as Stripe.Checkout.Session

  // Only handle gift card purchases (ignore other checkout sessions)
  const { payment_type, purchase_intent_id, tenant_id } = session.metadata ?? {}

  if (payment_type !== 'gift_card_purchase') {
    console.log('[handleGiftCardPurchaseCompleted] Not a gift card purchase, skipping')
    return
  }

  if (!purchase_intent_id || !tenant_id) {
    console.error('[handleGiftCardPurchaseCompleted] Missing metadata on session:', session.id)
    return
  }

  console.log('[handleGiftCardPurchaseCompleted] Processing gift card purchase:', purchase_intent_id)

  // Idempotency: if already processed, skip
  const { data: intent } = await (supabase as any)
    .from('gift_card_purchase_intents')
    .select('*')
    .eq('id', purchase_intent_id)
    .single()

  if (!intent) {
    console.error('[handleGiftCardPurchaseCompleted] Purchase intent not found:', purchase_intent_id)
    return
  }

  if (intent.status === 'paid') {
    console.log('[handleGiftCardPurchaseCompleted] Already processed (idempotent):', purchase_intent_id)
    return
  }

  // Generate the gift card code
  const crypto = require('crypto')
  const code = `GFT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

  // Fetch the chef's display name and email for the gift card title and notification
  const { data: chef } = await (supabase as any)
    .from('chefs')
    .select('display_name, business_name, email')
    .eq('id', tenant_id)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your Chef'
  const amountDollars = (intent.amount_cents / 100).toFixed(2)

  // Create the client_incentives row (the actual gift card)
  const { data: incentive, error: incentiveError } = await (supabase as any)
    .from('client_incentives')
    .insert({
      tenant_id,
      type: 'gift_card',
      code,
      title: `Gift Card — ${chefName} ($${amountDollars})`,
      currency_code: intent.currency_code || 'USD',
      amount_cents: intent.amount_cents,
      // remaining_balance_cents initialized automatically by trigger
      max_redemptions: 10, // Generous limit; actual balance is the gate
      is_active: true,
      purchase_status: 'paid',
      purchase_stripe_payment_intent_id: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : null,
      purchased_by_user_id: intent.buyer_user_id || null,
      purchased_by_email: intent.buyer_email,
      // Webhook-created gift cards use 'system' role — buyer may be a guest (no auth account).
      // Admin client bypasses RLS; 'system' satisfies the creator_role_shape CHECK constraint
      // (see migration 20260228000002 which made created_by_user_id nullable for system rows).
      created_by_user_id: null,
      created_by_role: 'system',
      created_by_client_id: null,
    })
    .select('id, code, amount_cents, title')
    .single()

  if (incentiveError || !incentive) {
    console.error('[handleGiftCardPurchaseCompleted] Failed to create incentive:', incentiveError)
    // Mark as failed so we can retry / investigate
    await (supabase as any)
      .from('gift_card_purchase_intents')
      .update({ status: 'failed' })
      .eq('id', purchase_intent_id)
    return
  }

  // Mark the intent as paid and link the created incentive
  await (supabase as any)
    .from('gift_card_purchase_intents')
    .update({
      status: 'paid',
      created_incentive_id: incentive.id,
    })
    .eq('id', purchase_intent_id)

  console.log('[handleGiftCardPurchaseCompleted] Gift card created:', code)

  // Send the gift card code to the recipient (non-blocking)
  try {
    const { sendIncentiveDeliveryEmail } = await import('@/lib/email/notifications')
    const expiresAtLabel = null // Gift cards purchased via Stripe don't expire by default

    await sendIncentiveDeliveryEmail({
      recipientEmail: intent.recipient_email,
      recipientName: intent.recipient_name,
      senderName: intent.buyer_email, // Buyer's email as sender identifier
      incentiveType: 'gift_card',
      title: incentive.title || `Gift Card — ${chefName}`,
      code,
      valueLabel: `$${amountDollars} gift card value`,
      expiresAt: expiresAtLabel,
      personalMessage: intent.personal_message,
    })
  } catch (emailErr) {
    console.error('[handleGiftCardPurchaseCompleted] Recipient email failed (non-blocking):', emailErr)
  }

  // Send purchase confirmation to the buyer (non-blocking)
  try {
    const { sendGiftCardPurchaseConfirmationEmail } = await import('@/lib/email/notifications')
    await sendGiftCardPurchaseConfirmationEmail({
      buyerEmail: intent.buyer_email,
      recipientEmail: intent.recipient_email,
      recipientName: intent.recipient_name,
      amountCents: intent.amount_cents,
      code,
      chefName,
    })
  } catch (emailErr) {
    console.error('[handleGiftCardPurchaseCompleted] Buyer confirmation email failed (non-blocking):', emailErr)
  }

  // Notify chef of gift card sale (non-blocking)
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenant_id)
    if (chefUserId) {
      await createNotification({
        tenantId: tenant_id,
        recipientId: chefUserId,
        category: 'payment',
        action: 'gift_card_purchased',
        title: 'Gift card sold',
        body: `A $${amountDollars} gift card was purchased by ${intent.buyer_email}`,
        actionUrl: '/clients/gift-cards',
        metadata: {
          amount_cents: intent.amount_cents,
          code,
          recipient_email: intent.recipient_email,
          purchase_intent_id,
        },
      })
    }
  } catch (notifErr) {
    console.error('[handleGiftCardPurchaseCompleted] Notification failed (non-blocking):', notifErr)
  }

  // Email the chef about the gift card sale (non-blocking)
  if (chef?.email) {
    try {
      const { sendGiftCardPurchasedChefEmail } = await import('@/lib/email/notifications')
      await sendGiftCardPurchasedChefEmail({
        chefEmail: chef.email,
        chefName,
        buyerName: intent.buyer_name || null,
        recipientName: intent.recipient_name || null,
        amountCents: intent.amount_cents,
        code,
      })
    } catch (emailErr) {
      console.error('[handleGiftCardPurchaseCompleted] Chef email failed (non-blocking):', emailErr)
    }
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

  // Security: verify the metadata actually maps to a real event owned by that tenant.
  // This prevents crafted PaymentIntents (with arbitrary metadata) from writing
  // to the ledger for an event they don't own — even if RLS has a gap.
  const supabaseAdmin = createServerClient({ admin: true })
  const { data: ownershipCheck } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('id', event_id)
    .eq('tenant_id', tenant_id)
    .single()

  if (!ownershipCheck) {
    console.error('[handlePaymentSucceeded] Metadata mismatch — event_id not owned by tenant_id', { event_id, tenant_id })
    throw new Error('Payment metadata does not match a known event for this tenant')
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

  // 2. Record transfer details if payment was routed to chef's connected account
  const transferRouted = paymentIntent.metadata.transfer_routed === 'true'
  if (transferRouted) {
    try {
      const latestCharge = paymentIntent.latest_charge
      const chargeId = typeof latestCharge === 'string' ? latestCharge : (latestCharge as any)?.id
      if (chargeId) {
        const stripeClient = getStripe()
        const chargeObj = await stripeClient.charges.retrieve(chargeId, { expand: ['transfer'] })
        const transfer = (chargeObj as any).transfer
        if (transfer) {
          const { recordStripeTransfer, recordPlatformFee } = await import('@/lib/stripe/transfer-routing')
          const destination = typeof transfer.destination === 'string'
            ? transfer.destination
            : transfer.destination?.id ?? ''

          await recordStripeTransfer({
            tenantId: tenant_id,
            eventId: event_id,
            stripeTransferId: transfer.id,
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: chargeId,
            stripeDestinationAccount: destination,
            grossAmountCents: paymentIntent.amount,
            platformFeeCents: (paymentIntent as any).application_fee_amount ?? 0,
            netTransferCents: transfer.amount,
            status: 'paid',
          })

          const appFee = (paymentIntent as any).application_fee_amount
          if (appFee && appFee > 0) {
            await recordPlatformFee({
              tenantId: tenant_id,
              eventId: event_id,
              stripeTransferId: transfer.id,
              stripePaymentIntentId: paymentIntent.id,
              amountCents: appFee,
              description: `Platform fee on event ${event_id} payment`,
              transactionReference: `fee_${event.id}`,
            })
          }
        }
      }
    } catch (transferErr) {
      console.error('[handlePaymentSucceeded] Transfer recording failed (non-blocking):', transferErr)
    }
  }

  // 3. Check financial summary (reuse the admin client created above)
  const { data: financialSummary } = await supabaseAdmin
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

    // Assign invoice number (non-blocking — idempotent if already set)
    try {
      const { assignInvoiceNumber } = await import('@/lib/events/invoice-actions')
      await assignInvoiceNumber(event_id)
    } catch (invoiceErr) {
      console.error('[handlePaymentSucceeded] Invoice number assignment failed (non-blocking):', invoiceErr)
    }

    // Notify chef of payment (non-blocking)
    try {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(tenant_id)
      if (chefUserId) {
        const amountFormatted = (paymentIntent.amount / 100).toFixed(2)
        await createNotification({
          tenantId: tenant_id,
          recipientId: chefUserId,
          category: 'payment',
          action: 'payment_received',
          title: 'Payment received',
          body: `$${amountFormatted} ${payment_type || 'payment'} received`,
          actionUrl: `/events/${event_id}`,
          eventId: event_id,
          clientId: client_id,
          metadata: { amount_cents: paymentIntent.amount, stripe_event_id: event.id },
        })
      }
    } catch (notifErr) {
      console.error('[handlePaymentSucceeded] Notification failed (non-blocking):', notifErr)
    }

    // Send payment confirmation email to client + chef (non-blocking)
    try {
      const { data: eventData } = await supabaseAdmin
        .from('events')
        .select('occasion, event_date')
        .eq('id', event_id)
        .single()

      const { data: clientData } = await supabaseAdmin
        .from('clients')
        .select('email, full_name')
        .eq('id', client_id)
        .single()

      const { data: chefData } = await supabaseAdmin
        .from('chefs')
        .select('email, business_name, display_name')
        .eq('id', tenant_id)
        .single()

      if (clientData?.email && eventData) {
        const { sendPaymentConfirmationEmail, sendPaymentReceivedChefEmail } = await import('@/lib/email/notifications')
        const remaining = financialSummary.outstanding_balance_cents

        // Client receipt
        await sendPaymentConfirmationEmail({
          clientEmail: clientData.email,
          clientName: clientData.full_name,
          amountCents: paymentIntent.amount,
          paymentType: payment_type || 'payment',
          occasion: eventData.occasion || 'your event',
          eventDate: eventData.event_date,
          remainingBalanceCents: typeof remaining === 'number' ? remaining : null,
        })

        // Chef email notification (in addition to in-app notification)
        if (chefData?.email) {
          await sendPaymentReceivedChefEmail({
            chefEmail: chefData.email,
            chefName: chefData.business_name || chefData.display_name || 'Chef',
            clientName: clientData.full_name,
            amountCents: paymentIntent.amount,
            paymentType: payment_type || 'payment',
            occasion: eventData.occasion || 'your event',
            eventDate: eventData.event_date,
            eventId: event_id,
            remainingBalanceCents: typeof remaining === 'number' ? remaining : null,
          })
        }
      }
    } catch (emailErr) {
      console.error('[handlePaymentSucceeded] Email failed (non-blocking):', emailErr)
    }

    // Instant-book: send dedicated chef notification email (non-blocking)
    const bookingSource = paymentIntent.metadata.booking_source
    if (bookingSource === 'instant_book') {
      try {
        const { data: eventData } = await supabaseAdmin
          .from('events')
          .select('occasion, event_date, guest_count, quoted_price_cents, deposit_amount_cents')
          .eq('id', event_id)
          .single()

        const { data: clientData } = await supabaseAdmin
          .from('clients')
          .select('email, full_name')
          .eq('id', client_id)
          .single()

        const { data: chefData } = await supabaseAdmin
          .from('chefs')
          .select('email, business_name, display_name')
          .eq('id', tenant_id)
          .single()

        if (chefData?.email && eventData && clientData) {
          const { sendInstantBookingChefEmail } = await import('@/lib/email/notifications')
          await sendInstantBookingChefEmail({
            chefEmail: chefData.email,
            chefName: chefData.business_name || chefData.display_name || 'Chef',
            clientName: clientData.full_name,
            clientEmail: clientData.email,
            occasion: eventData.occasion || 'Private Event',
            eventDate: eventData.event_date,
            guestCount: eventData.guest_count,
            depositCents: paymentIntent.amount,
            totalCents: eventData.quoted_price_cents ?? paymentIntent.amount,
            eventId: event_id,
          })
        }
      } catch (instantBookEmailErr) {
        console.error('[handlePaymentSucceeded] Instant-book chef email failed (non-blocking):', instantBookEmailErr)
      }
    }
  } catch (transitionError) {
    // Log but don't throw - ledger entry is what matters
    console.error('[handlePaymentSucceeded] Transition failed:', transitionError)

    // Insert audit trail so failed transition can be investigated and resolved manually
    try {
      await supabaseAdmin
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

  // Notify chef of payment failure (non-blocking)
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenant_id)
    if (chefUserId) {
      await createNotification({
        tenantId: tenant_id,
        recipientId: chefUserId,
        category: 'payment',
        action: 'payment_failed',
        title: 'Payment failed',
        body: `Payment failed for event. Error: ${paymentIntent.last_payment_error?.code ?? 'unknown'}`,
        actionUrl: `/events/${event_id}`,
        eventId: event_id,
        clientId: client_id,
      })
    }
  } catch (notifErr) {
    console.error('[handlePaymentFailed] Notification failed (non-blocking):', notifErr)
  }

  // Send payment failed email to client (non-blocking)
  try {
    const supabase = createServerClient({ admin: true })
    const { data: eventData } = await supabase
      .from('events')
      .select('occasion')
      .eq('id', event_id)
      .single()

    const { data: clientData } = await supabase
      .from('clients')
      .select('email, full_name')
      .eq('id', client_id)
      .single()

    if (clientData?.email && eventData) {
      const { sendPaymentFailedEmail } = await import('@/lib/email/notifications')
      await sendPaymentFailedEmail({
        clientEmail: clientData.email,
        clientName: clientData.full_name,
        occasion: eventData.occasion || 'your event',
        eventId: event_id,
        errorMessage: paymentIntent.last_payment_error?.message ?? null,
      })
    }
  } catch (emailErr) {
    console.error('[handlePaymentFailed] Email failed (non-blocking):', emailErr)
  }
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

  // Notify chef of refund (non-blocking)
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenant_id)
    if (chefUserId) {
      const amountFormatted = (refund.amount / 100).toFixed(2)
      await createNotification({
        tenantId: tenant_id,
        recipientId: chefUserId,
        category: 'payment',
        action: 'refund_processed',
        title: 'Refund processed',
        body: `$${amountFormatted} refund processed for event`,
        actionUrl: `/events/${event_id}`,
        eventId: event_id,
        clientId: client_id,
        metadata: { amount_cents: refund.amount },
      })
    }
  } catch (notifErr) {
    console.error('[handleRefund] Notification failed (non-blocking):', notifErr)
  }
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

  // Notify chef of dispute (non-blocking, urgent)
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenant_id)
    if (chefUserId) {
      const amountFormatted = (dispute.amount / 100).toFixed(2)
      await createNotification({
        tenantId: tenant_id,
        recipientId: chefUserId,
        category: 'payment',
        action: 'dispute_created',
        title: 'Dispute filed',
        body: `A $${amountFormatted} dispute was filed. Reason: ${dispute.reason}`,
        actionUrl: `/events/${event_id}`,
        eventId: event_id,
        clientId: client_id,
        metadata: { amount_cents: dispute.amount, dispute_id: dispute.id, reason: dispute.reason },
      })
    }
  } catch (notifErr) {
    console.error('[handleDisputeCreated] Notification failed (non-blocking):', notifErr)
  }
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

/**
 * Handle Stripe Connect account.updated
 * Updates stripe_onboarding_complete when Stripe confirms charges_enabled.
 * This is the production-safe, async path for Connect status — it keeps the
 * DB in sync even if the chef closes the browser before the callback fires.
 */
async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account
  console.log('[handleAccountUpdated] account:', account.id, 'charges_enabled:', account.charges_enabled)

  try {
    const { updateConnectStatusFromWebhook } = await import('@/lib/stripe/connect')
    await updateConnectStatusFromWebhook(account.id, account.charges_enabled === true)
  } catch (err) {
    console.error('[handleAccountUpdated] Failed to update connect status:', err)
    throw err // Rethrow so Stripe retries the webhook
  }
}

/**
 * Handle Stripe Transfer lifecycle events
 * Upserts stripe_transfers table to keep status in sync.
 * transfer.created  → status 'paid'
 * transfer.updated  → status from Stripe
 * transfer.reversed → status 'reversed'
 */
async function handleTransferEvent(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer

  console.log('[handleTransferEvent]', event.type, 'transfer:', transfer.id)

  const supabase = createServerClient({ admin: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Check if we already track this transfer
  const { data: existing } = await db.from('stripe_transfers')
    .select('id')
    .eq('stripe_transfer_id', transfer.id)
    .single()

  const newStatus = event.type === 'transfer.reversed'
    ? 'reversed'
    : transfer.reversed
      ? 'reversed'
      : 'paid'

  if (existing) {
    // Update existing record's status
    await db.from('stripe_transfers')
      .update({ status: newStatus })
      .eq('stripe_transfer_id', transfer.id)

    console.log('[handleTransferEvent] Updated transfer status:', transfer.id, '→', newStatus)
  } else {
    // Transfer wasn't recorded yet (e.g., handlePaymentSucceeded's recording failed).
    // Create a minimal record so we don't lose visibility.
    const destination = typeof transfer.destination === 'string'
      ? transfer.destination
      : (transfer.destination as any)?.id ?? ''

    // Try to find tenant_id from the destination account
    const { data: chef } = await supabase
      .from('chefs')
      .select('id')
      .eq('stripe_account_id', destination)
      .single()

    if (chef) {
      const { recordStripeTransfer } = await import('@/lib/stripe/transfer-routing')
      await recordStripeTransfer({
        tenantId: chef.id,
        eventId: null, // We don't have event context from the transfer object alone
        stripeTransferId: transfer.id,
        stripePaymentIntentId: null,
        stripeChargeId: null,
        stripeDestinationAccount: destination,
        grossAmountCents: transfer.amount,
        platformFeeCents: 0,
        netTransferCents: transfer.amount,
        status: newStatus,
      })
      console.log('[handleTransferEvent] Created new transfer record:', transfer.id)
    } else {
      console.log('[handleTransferEvent] No chef found for destination:', destination)
    }
  }
}

/**
 * Handle application fee refund
 * When a charge is refunded with refund_application_fee: true, Stripe fires this event.
 * We record a fee_refund entry in platform_fee_ledger for reconciliation.
 */
async function handleApplicationFeeRefunded(event: Stripe.Event) {
  const feeRefund = event.data.object as Stripe.ApplicationFee
  console.log('[handleApplicationFeeRefunded] fee:', feeRefund.id)

  const supabase = createServerClient({ admin: true })

  // Find the associated transfer record via the charge
  const chargeId = typeof feeRefund.charge === 'string'
    ? feeRefund.charge
    : (feeRefund.charge as any)?.id ?? null

  // Look up the transfer record to get tenant and event context
  let tenantId: string | null = null
  let eventId: string | null = null
  let stripePaymentIntentId: string | null = null
  let stripeTransferId: string | null = null

  if (chargeId) {
    const { data: transferRecord } = await (supabase as any)
      .from('stripe_transfers')
      .select('tenant_id, event_id, stripe_payment_intent_id, stripe_transfer_id')
      .eq('stripe_charge_id', chargeId)
      .single()

    if (transferRecord) {
      tenantId = transferRecord.tenant_id
      eventId = transferRecord.event_id
      stripePaymentIntentId = transferRecord.stripe_payment_intent_id
      stripeTransferId = transferRecord.stripe_transfer_id
    }
  }

  if (!tenantId) {
    // Try to find tenant from the account
    const accountId = typeof feeRefund.account === 'string'
      ? feeRefund.account
      : (feeRefund.account as any)?.id ?? null

    if (accountId) {
      const { data: chef } = await supabase
        .from('chefs')
        .select('id')
        .eq('stripe_account_id', accountId)
        .single()
      tenantId = chef?.id ?? null
    }
  }

  if (!tenantId) {
    console.error('[handleApplicationFeeRefunded] Could not determine tenant for fee:', feeRefund.id)
    return
  }

  // Record fee refund in platform_fee_ledger
  const refundedAmount = feeRefund.amount_refunded ?? 0
  if (refundedAmount > 0) {
    const { recordPlatformFee } = await import('@/lib/stripe/transfer-routing')
    await recordPlatformFee({
      tenantId,
      eventId,
      stripeTransferId,
      stripePaymentIntentId,
      amountCents: refundedAmount,
      description: `Platform fee refund (application_fee ${feeRefund.id})`,
      transactionReference: `fee_refund_${event.id}`,
      entryType: 'fee_refund',
    })

    console.log('[handleApplicationFeeRefunded] Recorded fee refund:', refundedAmount, 'cents for tenant:', tenantId)
  }
}

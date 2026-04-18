// Stripe Webhook Handler
// Enforces System Law #3: Ledger-first financial truth
// Idempotent: Duplicate webhooks are safely ignored via transaction_reference

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { appendLedgerEntryFromWebhook } from '@/lib/ledger/append-internal'
import { transitionEvent } from '@/lib/events/transitions'
import { createServerClient } from '@/lib/db/server'
import { logWebhookEvent } from '@/lib/webhooks/audit-log'
import { revalidatePath } from 'next/cache'

/**
 * Lazy Stripe client initialization
 */
function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] No signature header')
    await logWebhookEvent({
      provider: 'stripe',
      eventType: 'signature_missing',
      status: 'failed',
      errorText: 'Missing stripe-signature header',
      payloadSizeBytes: body.length,
    })
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured - rejecting event')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const error = err as Error
    console.error('[Stripe Webhook] Signature verification failed')
    await logWebhookEvent({
      provider: 'stripe',
      eventType: 'signature_verification_failed',
      status: 'failed',
      errorText: error.message,
      payloadSizeBytes: body.length,
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.info('[Stripe Webhook] Received:', event.type)

  // Log webhook receipt for audit trail - fire-and-forget
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
  const db = createServerClient({ admin: true })

  // Events that do not write ledger entries bypass the ledger idempotency check
  const isNonLedgerEvent =
    event.type === 'checkout.session.completed' ||
    event.type === 'account.updated' ||
    event.type === 'transfer.created' ||
    event.type === 'transfer.updated' ||
    event.type === 'transfer.reversed' ||
    event.type === 'application_fee.refunded' ||
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted' ||
    event.type === 'payout.paid' ||
    event.type === 'payout.failed'

  if (!isNonLedgerEvent) {
    const { data: existingEntry } = await db
      .from('ledger_entries')
      .select('id')
      .eq('transaction_reference', event.id)
      .single()

    if (existingEntry) {
      console.info('[Stripe Webhook] Event already processed (idempotent):', event.id)
      await logWebhookEvent({
        provider: 'stripe',
        eventType: event.type,
        providerEventId: event.id,
        status: 'skipped',
        result: { reason: 'duplicate_ledger_entry' },
        payloadSizeBytes: body.length,
      })
      return NextResponse.json({ received: true, cached: true })
    }
  }

  try {
    // Route to appropriate handler
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session
        const checkoutType = checkoutSession.metadata?.type

        if (checkoutType === 'event_ticket') {
          const { handleTicketPurchaseCompleted } = await import('@/lib/tickets/webhook-handler')
          await handleTicketPurchaseCompleted(checkoutSession)
        } else {
          await handleGiftCardPurchaseCompleted(event, db)
        }
        break
      }

      case 'payment_intent.succeeded': {
        // Route: Commerce payments (sale_id in metadata) go through commerce_payments table.
        // Event payments (event_id in metadata) use the existing ledger-first path.
        const pi = event.data.object as Stripe.PaymentIntent
        if (pi.metadata?.sale_id) {
          await handleCommercePaymentSucceeded(event)
        } else {
          await handlePaymentSucceeded(event)
        }
        break
      }

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

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const { handleSubscriptionUpdated } = await import('@/lib/stripe/subscription')
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const { handleSubscriptionDeleted } = await import('@/lib/stripe/subscription')
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      }

      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutEvent(event)
        break

      // FC-G14: Handle subscription payment failures
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId && (invoice as any).subscription) {
          console.warn('[Stripe Webhook] Invoice payment failed for customer:', customerId)
          // Notify chef about failed payment (non-blocking)
          try {
            const { sendDeveloperAlert } = await import('@/lib/email/developer-alerts')
            await sendDeveloperAlert({
              system: 'stripe',
              title: 'Subscription payment failed',
              description: `Customer ${customerId} payment failed. Stripe will retry. Invoice: ${invoice.id}`,
              severity: 'warning',
            })
          } catch (alertErr) {
            console.error('[Stripe Webhook] Alert failed (non-blocking):', alertErr)
          }
        }
        break
      }

      default:
        console.info('[Stripe Webhook] Unhandled event type:', event.type)
    }

    await logWebhookEvent({
      provider: 'stripe',
      eventType: event.type,
      providerEventId: event.id,
      status: 'processed',
      result: { ok: true },
      payloadSizeBytes: body.length,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    const err = error as Error
    console.error('[Stripe Webhook] Handler error:', err.message)
    await logWebhookEvent({
      provider: 'stripe',
      eventType: event.type,
      providerEventId: event.id,
      status: 'failed',
      errorText: err.message,
      payloadSizeBytes: body.length,
    })
    // Return 500 so Stripe retries
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}

/**
 * Handle gift card purchase via Stripe Checkout Session.
 * Reads purchase_intent_id from session metadata to create the client_incentives record,
 * sends the gift card code to the recipient, and confirms the buyer.
 *
 * Idempotency: Checks gift_card_purchase_intents.status - if already 'paid', returns early.
 */
async function handleGiftCardPurchaseCompleted(event: Stripe.Event, db: any) {
  const session = event.data.object as Stripe.Checkout.Session

  // Only handle gift card purchases (ignore other checkout sessions)
  const { payment_type, purchase_intent_id, tenant_id } = session.metadata ?? {}

  if (payment_type !== 'gift_card_purchase') {
    console.info('[handleGiftCardPurchaseCompleted] Not a gift card purchase, skipping')
    return
  }

  if (!purchase_intent_id || !tenant_id) {
    console.error('[handleGiftCardPurchaseCompleted] Missing metadata on session:', session.id)
    return
  }

  console.info(
    '[handleGiftCardPurchaseCompleted] Processing gift card purchase:',
    purchase_intent_id
  )

  // Idempotency: if already processed, skip
  const { data: intent } = await (db
    .from('gift_card_purchase_intents')
    .select('*')
    .eq('id', purchase_intent_id)
    .single() as any)

  if (!intent) {
    console.error(
      '[handleGiftCardPurchaseCompleted] Purchase intent not found:',
      purchase_intent_id
    )
    return
  }

  if (intent.status === 'paid') {
    console.info(
      '[handleGiftCardPurchaseCompleted] Already processed (idempotent):',
      purchase_intent_id
    )
    return
  }

  // Generate the gift card code
  const crypto = require('crypto')
  const code = `GFT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

  // Fetch the chef's display name and email for the gift card title and notification
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, email')
    .eq('id', tenant_id)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your Chef'
  const amountDollars = (intent.amount_cents / 100).toFixed(2)

  // Create the client_incentives row (the actual gift card)
  const { data: incentive, error: incentiveError } = await (db
    .from('client_incentives')
    .insert({
      tenant_id,
      type: 'gift_card',
      code,
      title: `Gift Card - ${chefName} ($${amountDollars})`,
      currency_code: intent.currency_code || 'USD',
      amount_cents: intent.amount_cents,
      // remaining_balance_cents initialized automatically by trigger
      max_redemptions: 10, // Generous limit; actual balance is the gate
      is_active: true,
      purchase_status: 'paid',
      purchase_stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      purchased_by_user_id: intent.buyer_user_id || null,
      purchased_by_email: intent.buyer_email,
      // Webhook-created gift cards use 'system' role - buyer may be a guest (no auth account).
      // Admin client bypasses RLS; 'system' satisfies the creator_role_shape CHECK constraint
      // (see migration 20260228000002 which made created_by_user_id nullable for system rows).
      created_by_user_id: null,
      created_by_role: 'system',
      created_by_client_id: null,
    } as any)
    .select('id, code, amount_cents, title')
    .single() as any)

  if (incentiveError || !incentive) {
    console.error('[handleGiftCardPurchaseCompleted] Failed to create incentive:', incentiveError)
    // Mark as failed so we can retry / investigate
    await (db
      .from('gift_card_purchase_intents')
      .update({ status: 'failed' } as any)
      .eq('id', purchase_intent_id) as any)
    return
  }

  // Mark the intent as paid and link the created incentive
  await (db
    .from('gift_card_purchase_intents')
    .update({
      status: 'paid',
      created_incentive_id: (incentive as any).id,
    } as any)
    .eq('id', purchase_intent_id) as any)

  console.info('[handleGiftCardPurchaseCompleted] Gift card created:', code)

  // Send the gift card code to the recipient (non-blocking)
  try {
    const { sendIncentiveDeliveryEmail } = await import('@/lib/email/notifications')
    const expiresAtLabel = null // Gift cards purchased via Stripe don't expire by default

    await sendIncentiveDeliveryEmail({
      recipientEmail: intent.recipient_email,
      recipientName: intent.recipient_name,
      senderName: intent.buyer_email, // Buyer's email as sender identifier
      incentiveType: 'gift_card',
      title: (incentive as any).title || `Gift Card - ${chefName}`,
      code,
      valueLabel: `$${amountDollars} gift card value`,
      expiresAt: expiresAtLabel,
      personalMessage: intent.personal_message,
    })
  } catch (emailErr) {
    console.error(
      '[handleGiftCardPurchaseCompleted] Recipient email failed (non-blocking):',
      emailErr
    )
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
    console.error(
      '[handleGiftCardPurchaseCompleted] Buyer confirmation email failed (non-blocking):',
      emailErr
    )
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
        buyerName: (intent as any).buyer_name || null,
        recipientName: intent.recipient_name || null,
        amountCents: intent.amount_cents,
        code,
      })
    } catch (emailErr) {
      console.error('[handleGiftCardPurchaseCompleted] Chef email failed (non-blocking):', emailErr)
    }
  }

  // FC-G13: Bust cache for gift card pages
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/clients/gift-cards')
  } catch {
    // non-blocking
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

  // Validate UUID formats before hitting DB to avoid PostgreSQL 22P02 errors
  // (invalid UUID would cause the DB to throw, triggering infinite Stripe retries)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(event_id) || !UUID_RE.test(tenant_id) || !UUID_RE.test(client_id)) {
    console.error('[handlePaymentSucceeded] Invalid UUID in metadata - ignoring', {
      event_id,
      tenant_id,
      client_id,
    })
    return // return silently so Stripe does not retry
  }

  // Security: verify the metadata actually maps to a real event owned by that tenant.
  // This prevents crafted PaymentIntents (with arbitrary metadata) from writing
  // to the ledger for an event they don't own - even if RLS has a gap.
  const dbAdmin = createServerClient({ admin: true })
  const { data: ownershipCheck } = await dbAdmin
    .from('events')
    .select('id')
    .eq('id', event_id)
    .eq('tenant_id', tenant_id)
    .single()

  if (!ownershipCheck) {
    console.error('[handlePaymentSucceeded] Metadata mismatch - event_id not owned by tenant_id', {
      event_id,
      tenant_id,
    })
    throw new Error('Payment metadata does not match a known event for this tenant')
  }

  // Guard: if event is cancelled, don't apply payment - issue auto-refund instead
  const { data: eventStatusRow } = await dbAdmin
    .from('events')
    .select('status')
    .eq('id', event_id)
    .single()

  if (eventStatusRow?.status === 'cancelled') {
    console.warn(
      `[handlePaymentSucceeded] Payment received for CANCELLED event ${event_id}. ` +
        `Issuing automatic refund for ${paymentIntent.amount}c.`
    )
    try {
      const stripe = getStripe()
      await stripe.refunds.create({ payment_intent: paymentIntent.id })

      const { recordSideEffectFailure } = await import('@/lib/monitoring/non-blocking')
      await recordSideEffectFailure({
        source: 'stripe:webhook',
        operation: 'auto_refund_cancelled_event',
        severity: 'high',
        entityType: 'event',
        entityId: event_id,
        tenantId: tenant_id,
        errorMessage: `Auto-refunded ${paymentIntent.amount}c - payment arrived after event cancellation`,
      })
    } catch (refundErr) {
      console.error('[handlePaymentSucceeded] Auto-refund failed for cancelled event:', refundErr)
      const { recordSideEffectFailure } = await import('@/lib/monitoring/non-blocking')
      await recordSideEffectFailure({
        source: 'stripe:webhook',
        operation: 'auto_refund_failed',
        severity: 'critical',
        entityType: 'event',
        entityId: event_id,
        tenantId: tenant_id,
        errorMessage: `Payment ${paymentIntent.amount}c on cancelled event - auto-refund FAILED: ${(refundErr as Error).message}`,
      })
    }
    return // Do not record in ledger or transition event
  }

  console.info('[handlePaymentSucceeded] Processing payment for event:', event_id)

  // Q6: Ensure quoted_price_cents is set (instant-book race: webhook arrives before price is set)
  {
    const { data: pricingCheck } = await dbAdmin
      .from('events')
      .select('quoted_price_cents')
      .eq('id', event_id)
      .single()

    if (pricingCheck && pricingCheck.quoted_price_cents == null) {
      // Set quoted_price from PaymentIntent amount so financial views don't break
      await dbAdmin
        .from('events')
        .update({ quoted_price_cents: paymentIntent.amount } as any)
        .eq('id', event_id)
      console.info(
        '[handlePaymentSucceeded] Set quoted_price_cents from PaymentIntent amount:',
        paymentIntent.amount
      )
    }
  }

  // Amount reconciliation: warn if Stripe amount diverges from expected
  // Not a hard block (Stripe is the payment authority), but flags discrepancies for review
  {
    const { data: eventPricing } = await dbAdmin
      .from('events')
      .select('quoted_price_cents, deposit_amount_cents')
      .eq('id', event_id)
      .single()

    if (eventPricing) {
      const expectedCents =
        payment_type === 'deposit'
          ? eventPricing.deposit_amount_cents
          : eventPricing.quoted_price_cents
      if (expectedCents && expectedCents !== paymentIntent.amount) {
        console.warn(
          `[handlePaymentSucceeded] Amount mismatch: Stripe=${paymentIntent.amount}c, expected=${expectedCents}c (event=${event_id}, type=${payment_type})`
        )
        // Q11: Surface mismatch to chef as notification (not just a log warning)
        try {
          const { createNotification, getChefAuthUserId } =
            await import('@/lib/notifications/actions')
          const chefUserId = await getChefAuthUserId(tenant_id)
          if (chefUserId) {
            const stripeAmt = (paymentIntent.amount / 100).toFixed(2)
            const expectedAmt = (expectedCents / 100).toFixed(2)
            await createNotification({
              tenantId: tenant_id,
              recipientId: chefUserId,
              category: 'payment',
              action: 'payment_amount_mismatch',
              title: 'Payment amount mismatch',
              body: `Received $${stripeAmt} but expected $${expectedAmt} for ${payment_type}. Review the event financials.`,
              actionUrl: `/events/${event_id}`,
              eventId: event_id,
              clientId: client_id,
            })
          }
        } catch (mismatchErr) {
          console.error(
            '[handlePaymentSucceeded] Mismatch notification failed (non-blocking):',
            mismatchErr
          )
        }
      }
    }
  }

  // Determine entry type based on payment_type metadata
  const entryType = payment_type === 'deposit' ? ('deposit' as const) : ('payment' as const)

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
    created_by: null,
  })

  const isDuplicateLedger = result.duplicate
  if (isDuplicateLedger) {
    console.info(
      '[handlePaymentSucceeded] Duplicate ledger entry - skipping transfer recording, still checking transition'
    )
  }

  // 2. Record transfer details if payment was routed to chef's connected account (skip on duplicate)
  if (!isDuplicateLedger) {
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
            const { recordStripeTransfer, recordPlatformFee } =
              await import('@/lib/stripe/transfer-routing')
            const destination =
              typeof transfer.destination === 'string'
                ? transfer.destination
                : (transfer.destination?.id ?? '')

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
        console.error(
          '[handlePaymentSucceeded] Transfer recording failed (non-blocking):',
          transferErr
        )
      }
    }
  } // end !isDuplicateLedger

  // 3. Check financial summary (reuse the admin client created above)
  const { data: financialSummary } = await (dbAdmin
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', event_id)
    .single() as any)

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
        payment_status: (financialSummary as any).payment_status,
      },
      systemTransition: true, // Bypass permission checks
    })

    console.info('[handlePaymentSucceeded] Event transitioned to paid:', event_id)

    // Assign invoice number (non-blocking - idempotent if already set)
    try {
      const { assignInvoiceNumber } = await import('@/lib/events/invoice-actions')
      await assignInvoiceNumber(event_id)
    } catch (invoiceErr) {
      console.error(
        '[handlePaymentSucceeded] Invoice number assignment failed (non-blocking):',
        invoiceErr
      )
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

    // Notify client of payment confirmation in-app (non-blocking)
    try {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      const amountFormatted = (paymentIntent.amount / 100).toFixed(2)
      await createClientNotification({
        tenantId: tenant_id,
        clientId: client_id,
        category: 'payment',
        action: 'event_paid_to_client',
        title: 'Payment confirmed',
        body: `Your $${amountFormatted} payment has been confirmed`,
        actionUrl: `/my-events/${event_id}`,
        eventId: event_id,
      })
    } catch (clientNotifErr) {
      console.error(
        '[handlePaymentSucceeded] Client notification failed (non-blocking):',
        clientNotifErr
      )
    }

    // Circle-first: post payment notification to circle (non-blocking)
    try {
      const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
      const amount = (paymentIntent.amount / 100).toFixed(2)
      const typeLabel = payment_type === 'deposit' ? 'Deposit' : 'Payment'

      await circleFirstNotify({
        eventId: event_id,
        notificationType: 'payment_received',
        body: `${typeLabel} of $${amount} received. Thank you!`,
        metadata: {
          event_id: event_id,
          amount_cents: paymentIntent.amount,
          payment_type: payment_type || 'payment',
        },
        actionUrl: `/my-events/${event_id}`,
        actionLabel: 'View Invoice',
      })
    } catch (circleErr) {
      console.error(
        '[handlePaymentSucceeded] Circle-first notify failed (non-blocking):',
        circleErr
      )
    }

    // Chef email notification (chef-only, stays as standalone email)
    try {
      const { data: eventData } = await dbAdmin
        .from('events')
        .select('occasion, event_date')
        .eq('id', event_id)
        .single()

      const { data: clientData } = await (dbAdmin
        .from('clients')
        .select('email, full_name')
        .eq('id', client_id)
        .single() as any)

      const { data: chefData } = await dbAdmin
        .from('chefs')
        .select('email, business_name, display_name')
        .eq('id', tenant_id)
        .single()

      if (chefData?.email && eventData && clientData) {
        const { sendPaymentReceivedChefEmail } = await import('@/lib/email/notifications')
        const remaining = (financialSummary as any).outstanding_balance_cents

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
    } catch (emailErr) {
      console.error('[handlePaymentSucceeded] Chef email failed (non-blocking):', emailErr)
    }

    // Client payment confirmation email (non-blocking)
    // Skip for instant_book (handled separately below with richer context)
    const bookingSourceForConfirm = paymentIntent.metadata.booking_source
    if (bookingSourceForConfirm !== 'instant_book') {
      try {
        const { data: eventData } = await dbAdmin
          .from('events')
          .select('occasion, event_date')
          .eq('id', event_id)
          .single()

        const { data: clientData } = await (dbAdmin
          .from('clients')
          .select('email, full_name')
          .eq('id', client_id)
          .single() as any)

        if (clientData?.email && eventData) {
          const remaining = (financialSummary as any).outstanding_balance_cents
          const { sendPaymentConfirmationEmail } = await import('@/lib/email/notifications')

          await sendPaymentConfirmationEmail({
            clientEmail: clientData.email,
            clientName: clientData.full_name,
            amountCents: paymentIntent.amount,
            paymentType: payment_type || 'payment',
            occasion: eventData.occasion || 'your event',
            eventDate: eventData.event_date,
            remainingBalanceCents:
              typeof remaining === 'number' && remaining > 0 ? remaining : null,
          })
        }
      } catch (clientEmailErr) {
        console.error(
          '[handlePaymentSucceeded] Client confirmation email failed (non-blocking):',
          clientEmailErr
        )
      }
    }

    // Instant-book: send dedicated chef notification email (non-blocking)
    const bookingSource = paymentIntent.metadata.booking_source
    if (bookingSource === 'instant_book') {
      try {
        const { data: eventData } = await (dbAdmin
          .from('events')
          .select('occasion, event_date, guest_count, quoted_price_cents, deposit_amount_cents')
          .eq('id', event_id)
          .single() as any)

        const { data: clientData } = await dbAdmin
          .from('clients')
          .select('email, full_name')
          .eq('id', client_id)
          .single()

        const { data: chefData } = await dbAdmin
          .from('chefs')
          .select('email, business_name, display_name')
          .eq('id', tenant_id)
          .single()

        if (chefData?.email && eventData && clientData) {
          const { sendInstantBookingChefEmail, sendInstantBookingClientEmail } =
            await import('@/lib/email/notifications')
          const chefName = chefData.business_name || chefData.display_name || 'Chef'

          // Look up Dinner Circle token so the confirmation email links directly there
          let circleUrl: string | undefined
          try {
            const { getCircleForEvent } = await import('@/lib/hub/circle-lookup')
            const circle = await getCircleForEvent(event_id)
            if (circle?.groupToken) {
              circleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/hub/g/${circle.groupToken}`
            }
          } catch {
            // Non-blocking - email still sends without circle link
          }

          await sendInstantBookingChefEmail({
            chefEmail: chefData.email,
            chefName,
            clientName: clientData.full_name,
            clientEmail: clientData.email,
            occasion: eventData.occasion || 'Private Event',
            eventDate: eventData.event_date,
            guestCount: eventData.guest_count,
            depositCents: paymentIntent.amount,
            totalCents: eventData.quoted_price_cents ?? paymentIntent.amount,
            eventId: event_id,
          })
          // Also confirm the booking directly to the client
          await sendInstantBookingClientEmail({
            clientEmail: clientData.email,
            clientName: clientData.full_name,
            chefName,
            occasion: eventData.occasion || 'Private Event',
            eventDate: eventData.event_date,
            guestCount: eventData.guest_count,
            depositCents: paymentIntent.amount,
            totalCents: eventData.quoted_price_cents ?? paymentIntent.amount,
            eventId: event_id,
            circleUrl,
          })
        }
      } catch (instantBookEmailErr) {
        console.error(
          '[handlePaymentSucceeded] Instant-book chef email failed (non-blocking):',
          instantBookEmailErr
        )
      }
    }

    // Enqueue Remy reactive AI task - payment confirmation (non-blocking)
    try {
      const { onPaymentReceived } = await import('@/lib/ai/reactive/hooks')
      await onPaymentReceived(tenant_id, event_id, client_id, paymentIntent.amount)
    } catch (remyErr) {
      console.error(
        '[handlePaymentSucceeded] Remy reactive enqueue failed (non-blocking):',
        remyErr
      )
    }

    // Legacy OneSignal push removed: createNotification above already handles
    // push/email/SMS via the unified notification pipeline.

    // Zapier/Make webhook dispatch (non-blocking)
    try {
      const { dispatchWebhookEvent } = await import('@/lib/integrations/zapier/zapier-webhooks')
      await dispatchWebhookEvent(tenant_id, 'payment.received', {
        event_id,
        client_id,
        amount_cents: paymentIntent.amount,
        payment_type: payment_type || 'payment',
        stripe_payment_intent_id: paymentIntent.id,
      })
    } catch (zapierErr) {
      console.error('[handlePaymentSucceeded] Zapier dispatch failed (non-blocking):', zapierErr)
    }

    // Cache invalidation - financial pages, invoice, dashboard (non-blocking)
    try {
      revalidatePath(`/events/${event_id}`)
      revalidatePath(`/events/${event_id}/financial`)
      revalidatePath(`/events/${event_id}/invoice`)
      revalidatePath(`/my-events/${event_id}`)
      revalidatePath(`/my-events/${event_id}/invoice`)
      revalidatePath('/events')
      revalidatePath('/my-events')
      revalidatePath('/dashboard')
    } catch (cacheErr) {
      console.error('[handlePaymentSucceeded] Cache invalidation failed (non-blocking):', cacheErr)
    }

    // Bust Remy context cache so AI reflects payment immediately (non-blocking)
    try {
      const { invalidateRemyContextCache } = await import('@/lib/ai/remy-context')
      invalidateRemyContextCache(tenant_id)
    } catch {
      /* non-blocking */
    }
  } catch (transitionError) {
    // Log but don't throw - ledger entry is what matters
    console.error('[handlePaymentSucceeded] Transition failed:', transitionError)

    // Insert audit trail so failed transition can be investigated and resolved manually
    try {
      await dbAdmin.from('event_state_transitions').insert({
        event_id,
        tenant_id,
        from_status: null,
        to_status: 'paid',
        transitioned_by: null,
        reason: 'Auto-transition failed after payment',
        metadata: {
          error: String(transitionError),
          stripe_event_id: event.id,
          payment_intent_id: paymentIntent.id,
          requires_manual_review: true,
        },
      } as any)
      console.info('[handlePaymentSucceeded] Audit trail inserted for failed transition:', event_id)
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
    console.info('[handlePaymentFailed] Missing metadata, skipping')
    return
  }

  console.info('[handlePaymentFailed] Payment failed for event:', event_id)

  // H1 fix: No ledger entry for failed payments (amount_cents: 0 violates the
  // positive-amount guard and causes infinite Stripe retries). The audit trail
  // is already captured by logWebhookEvent() at the top of the POST handler.

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

  // Notify client of payment failure in-app (non-blocking)
  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    await createClientNotification({
      tenantId: tenant_id,
      clientId: client_id,
      category: 'payment',
      action: 'event_paid_to_client',
      title: 'Payment failed',
      body: 'Your payment could not be processed. Please try again or use a different payment method.',
      actionUrl: `/my-events/${event_id}`,
      eventId: event_id,
    })
  } catch (clientNotifErr) {
    console.error(
      '[handlePaymentFailed] Client notification failed (non-blocking):',
      clientNotifErr
    )
  }

  // Send payment failed email to client (non-blocking)
  try {
    const db = createServerClient({ admin: true })
    const { data: eventData } = await db
      .from('events')
      .select('occasion')
      .eq('id', event_id)
      .single()

    const { data: clientData } = await db
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

  // Cache invalidation (non-blocking)
  try {
    revalidatePath(`/events/${event_id}`)
    revalidatePath(`/my-events/${event_id}`)
    revalidatePath('/dashboard')
  } catch (cacheErr) {
    console.error('[handlePaymentFailed] Cache invalidation failed (non-blocking):', cacheErr)
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
    console.info('[handlePaymentCanceled] Missing metadata, skipping')
    return
  }

  console.info('[handlePaymentCanceled] Payment canceled for event:', event_id)

  // H1 fix: No ledger entry for canceled payments (amount_cents: 0 violates the
  // positive-amount guard and causes infinite Stripe retries). The audit trail
  // is already captured by logWebhookEvent() at the top of the POST handler.

  // Notify chef of payment cancellation (non-blocking)
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenant_id)
    if (chefUserId) {
      await createNotification({
        tenantId: tenant_id,
        recipientId: chefUserId,
        category: 'payment',
        action: 'payment_failed',
        title: 'Payment canceled',
        body: `A payment was canceled. Reason: ${paymentIntent.cancellation_reason ?? 'not specified'}`,
        actionUrl: `/events/${event_id}`,
        eventId: event_id,
        clientId: client_id,
      })
    }
  } catch (notifErr) {
    console.error('[handlePaymentCanceled] Chef notification failed (non-blocking):', notifErr)
  }

  // Notify client of payment cancellation (non-blocking)
  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    await createClientNotification({
      tenantId: tenant_id,
      clientId: client_id,
      category: 'payment',
      action: 'event_paid_to_client',
      title: 'Payment canceled',
      body: 'Your payment has been canceled. Contact your chef if you have questions.',
      actionUrl: `/my-events/${event_id}`,
      eventId: event_id,
    })
  } catch (clientNotifErr) {
    console.error(
      '[handlePaymentCanceled] Client notification failed (non-blocking):',
      clientNotifErr
    )
  }

  // Cache invalidation (non-blocking)
  try {
    revalidatePath(`/events/${event_id}`)
    revalidatePath(`/my-events/${event_id}`)
    revalidatePath('/events')
    revalidatePath('/my-events')
    revalidatePath('/dashboard')
  } catch (cacheErr) {
    console.error('[handlePaymentCanceled] Cache invalidation failed (non-blocking):', cacheErr)
  }
}

/**
 * Handle refund
 * Append refund entry to ledger
 */
async function handleRefund(event: Stripe.Event) {
  const refund = event.data.object as Stripe.Refund
  const stripe = getStripe()

  // Safely handle refund.charge - can be null in edge cases
  if (!refund.charge || typeof refund.charge !== 'string') {
    console.error('[handleRefund] No charge ID on refund object:', refund.id)
    return
  }

  // Get charge to find metadata
  const charge = await stripe.charges.retrieve(refund.charge)
  const { event_id, tenant_id, client_id } = charge.metadata

  if (!event_id || !tenant_id || !client_id) {
    console.info('[handleRefund] Missing metadata, skipping')
    return
  }

  console.info('[handleRefund] Processing refund for event:', event_id)

  await appendLedgerEntryFromWebhook({
    tenant_id,
    client_id,
    entry_type: 'refund',
    amount_cents: -Math.abs(refund.amount), // H2 fix: DB constraint requires negative for is_refund=true
    payment_method: 'card',
    description: `Refund issued for event ${event_id}`,
    event_id,
    transaction_reference: event.id,
    is_refund: true,
    refund_reason: refund.reason ?? 'Stripe refund',
    internal_notes: `Charge: ${refund.charge}, Refund: ${refund.id}`,
    created_by: null,
  })

  // Recompute payment_status from ledger (Q2 fix: stored status drifts after refunds)
  try {
    const dbAdmin = createServerClient({ admin: true })
    const { data: summary } = await dbAdmin
      .from('event_financial_summary')
      .select('net_revenue_cents, quoted_price_cents')
      .eq('event_id', event_id)
      .single()

    if (summary) {
      const net = Number(summary.net_revenue_cents ?? 0)
      const quoted = Number(summary.quoted_price_cents ?? 0)
      let newPaymentStatus: string
      if (net <= 0) {
        newPaymentStatus = 'refunded'
      } else if (quoted > 0 && net >= quoted) {
        newPaymentStatus = 'paid'
      } else {
        newPaymentStatus = 'partial'
      }

      await dbAdmin
        .from('events')
        .update({ payment_status: newPaymentStatus } as any)
        .eq('id', event_id)

      // Q13: Alert chef if event is fully refunded but still in an active state
      if (net <= 0) {
        const { data: eventState } = await dbAdmin
          .from('events')
          .select('status, occasion')
          .eq('id', event_id)
          .single()

        const activeStates = ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress']
        if (eventState && activeStates.includes(eventState.status)) {
          try {
            const { createNotification, getChefAuthUserId } =
              await import('@/lib/notifications/actions')
            const chefUserId = await getChefAuthUserId(tenant_id)
            if (chefUserId) {
              await createNotification({
                tenantId: tenant_id,
                recipientId: chefUserId,
                category: 'payment',
                action: 'full_refund_active_event',
                title: 'Full refund on active event',
                body: `"${eventState.occasion || 'Event'}" has been fully refunded but is still ${eventState.status}. Consider cancelling.`,
                actionUrl: `/events/${event_id}`,
                eventId: event_id,
                clientId: client_id,
              })
            }
          } catch (alertErr) {
            console.error('[handleRefund] Full refund alert failed (non-blocking):', alertErr)
          }
        }
      }
    }
  } catch (payStatusErr) {
    console.error('[handleRefund] payment_status recompute failed (non-blocking):', payStatusErr)
  }

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

  // Notify client of refund confirmation in-app (non-blocking)
  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    const amountFormatted = (refund.amount / 100).toFixed(2)
    await createClientNotification({
      tenantId: tenant_id,
      clientId: client_id,
      category: 'payment',
      action: 'refund_processed_to_client',
      title: 'Refund processed',
      body: `A $${amountFormatted} refund has been processed`,
      actionUrl: `/my-events/${event_id}`,
      eventId: event_id,
    })
  } catch (clientNotifErr) {
    console.error('[handleRefund] Client notification failed (non-blocking):', clientNotifErr)
  }

  // Send refund email to client (non-blocking)
  try {
    const db = createServerClient({ admin: true })
    const { data: clientData } = await db
      .from('clients')
      .select('email, full_name')
      .eq('id', client_id)
      .single()

    const { data: chefData } = await db
      .from('chefs')
      .select('business_name, display_name')
      .eq('id', tenant_id)
      .single()

    if (clientData?.email) {
      const { sendRefundInitiatedEmail } = await import('@/lib/email/notifications')
      await sendRefundInitiatedEmail({
        clientEmail: clientData.email,
        clientName: clientData.full_name,
        chefName: chefData?.business_name || chefData?.display_name || 'Your chef',
        amountCents: refund.amount,
        reason: refund.reason ?? 'Refund processed',
        isStripeRefund: true,
        occasion: '',
        eventDate: null,
      })
    }
  } catch (emailErr) {
    console.error('[handleRefund] Client refund email failed (non-blocking):', emailErr)
  }

  // Cache invalidation (non-blocking)
  try {
    revalidatePath(`/events/${event_id}`)
    revalidatePath(`/events/${event_id}/financial`)
    revalidatePath(`/my-events/${event_id}`)
    revalidatePath('/events')
    revalidatePath('/my-events')
    revalidatePath('/dashboard')
  } catch (cacheErr) {
    console.error('[handleRefund] Cache invalidation failed (non-blocking):', cacheErr)
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
    console.info('[handleDisputeCreated] Missing metadata, skipping')
    return
  }

  console.info('[handleDisputeCreated] Dispute opened for event:', event_id)

  // H1 fix: No ledger entry for dispute creation (amount_cents: 0 violates the
  // positive-amount guard and causes infinite Stripe retries). The audit trail
  // is already captured by logWebhookEvent(). Actual fund movement is handled
  // by handleDisputeFundsWithdrawn when the bank claws back the money.

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

  // Cache invalidation (non-blocking)
  try {
    revalidatePath(`/events/${event_id}`)
    revalidatePath(`/events/${event_id}/financial`)
    revalidatePath(`/my-events/${event_id}`)
    revalidatePath('/dashboard')
  } catch (cacheErr) {
    console.error('[handleDisputeCreated] Cache invalidation failed (non-blocking):', cacheErr)
  }
}

/**
 * Handle dispute funds withdrawn
 * Log to ledger as negative adjustment - money has been clawed back by the bank
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
    console.info('[handleDisputeFundsWithdrawn] Missing metadata, skipping')
    return
  }

  console.info('[handleDisputeFundsWithdrawn] Funds withdrawn for event:', event_id)

  await appendLedgerEntryFromWebhook({
    tenant_id,
    client_id,
    entry_type: 'refund',
    amount_cents: -Math.abs(dispute.amount),
    payment_method: 'card',
    description: `Dispute funds withdrawn for event ${event_id}`,
    event_id,
    transaction_reference: event.id,
    is_refund: true,
    refund_reason: `Dispute: ${dispute.reason}`,
    internal_notes: `Dispute ${dispute.id} funds withdrawn. Amount: ${dispute.amount}`,
    created_by: null,
  })

  // Notify chef of dispute funds withdrawal (non-blocking, urgent)
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenant_id)
    if (chefUserId) {
      const amountFormatted = (dispute.amount / 100).toFixed(2)
      await createNotification({
        tenantId: tenant_id,
        recipientId: chefUserId,
        category: 'payment',
        action: 'dispute_funds_withdrawn',
        title: 'Dispute funds withdrawn',
        body: `$${amountFormatted} has been withdrawn due to a dispute`,
        actionUrl: `/events/${event_id}`,
        eventId: event_id,
        clientId: client_id,
        metadata: { amount_cents: dispute.amount, dispute_id: dispute.id },
      })
    }
  } catch (notifErr) {
    console.error('[handleDisputeFundsWithdrawn] Notification failed (non-blocking):', notifErr)
  }

  // Cache invalidation (non-blocking)
  try {
    revalidatePath(`/events/${event_id}`)
    revalidatePath(`/events/${event_id}/financial`)
    revalidatePath(`/my-events/${event_id}`)
    revalidatePath('/dashboard')
  } catch (cacheErr) {
    console.error(
      '[handleDisputeFundsWithdrawn] Cache invalidation failed (non-blocking):',
      cacheErr
    )
  }
}

/**
 * Handle Stripe Connect account.updated
 * Updates stripe_onboarding_complete when Stripe confirms charges_enabled.
 * This is the production-safe, async path for Connect status - it keeps the
 * DB in sync even if the chef closes the browser before the callback fires.
 */
async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account
  console.info(
    '[handleAccountUpdated] account:',
    account.id,
    'charges_enabled:',
    account.charges_enabled
  )

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

  console.info('[handleTransferEvent]', event.type, 'transfer:', transfer.id)

  const db = createServerClient({ admin: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  // Check if we already track this transfer
  const { data: existing } = await db
    .from('stripe_transfers')
    .select('id')
    .eq('stripe_transfer_id', transfer.id)
    .single()

  const newStatus =
    event.type === 'transfer.reversed' ? 'reversed' : transfer.reversed ? 'reversed' : 'paid'

  if (existing) {
    // Update existing record's status
    await db
      .from('stripe_transfers')
      .update({ status: newStatus })
      .eq('stripe_transfer_id', transfer.id)

    console.info('[handleTransferEvent] Updated transfer status:', transfer.id, '→', newStatus)
  } else {
    // Transfer wasn't recorded yet (e.g., handlePaymentSucceeded's recording failed).
    // Create a minimal record so we don't lose visibility.
    const destination =
      typeof transfer.destination === 'string'
        ? transfer.destination
        : ((transfer.destination as any)?.id ?? '')

    // Try to find tenant_id from the destination account
    const { data: chef } = await db
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
      console.info('[handleTransferEvent] Created new transfer record:', transfer.id)
    } else {
      console.info('[handleTransferEvent] No chef found for destination:', destination)
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
  console.info('[handleApplicationFeeRefunded] fee:', feeRefund.id)

  const db = createServerClient({ admin: true })

  // Find the associated transfer record via the charge
  const chargeId =
    typeof feeRefund.charge === 'string'
      ? feeRefund.charge
      : ((feeRefund.charge as any)?.id ?? null)

  // Look up the transfer record to get tenant and event context
  let tenantId: string | null = null
  let eventId: string | null = null
  let stripePaymentIntentId: string | null = null
  let stripeTransferId: string | null = null

  if (chargeId) {
    const { data: transferRecord } = await (db
      .from('stripe_transfers')
      .select('tenant_id, event_id, stripe_payment_intent_id, stripe_transfer_id')
      .eq('stripe_charge_id', chargeId)
      .single() as any)

    if (transferRecord) {
      tenantId = transferRecord.tenant_id
      eventId = transferRecord.event_id
      stripePaymentIntentId = transferRecord.stripe_payment_intent_id
      stripeTransferId = transferRecord.stripe_transfer_id
    }
  }

  if (!tenantId) {
    // Try to find tenant from the account
    const accountId =
      typeof feeRefund.account === 'string'
        ? feeRefund.account
        : ((feeRefund.account as any)?.id ?? null)

    if (accountId) {
      const { data: chef } = await db
        .from('chefs')
        .select('id')
        .eq('stripe_account_id', accountId)
        .single()
      tenantId = chef?.id ?? null
    }
  }

  if (!tenantId) {
    console.error(
      '[handleApplicationFeeRefunded] Could not determine tenant for fee:',
      feeRefund.id
    )
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

    console.info(
      '[handleApplicationFeeRefunded] Recorded fee refund:',
      refundedAmount,
      'cents for tenant:',
      tenantId
    )
  }
}

/**
 * Handle Commerce Engine payment succeeded.
 * Routes through commerce_payments table instead of direct ledger append.
 * The DB trigger `commerce_payment_to_ledger` auto-creates the ledger entry.
 */
async function handleCommercePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const { sale_id, tenant_id } = paymentIntent.metadata

  if (!sale_id || !tenant_id) {
    console.error('[handleCommercePaymentSucceeded] Missing sale_id or tenant_id metadata')
    return
  }

  console.info('[handleCommercePaymentSucceeded] Processing commerce payment for sale:', sale_id)

  const db = createServerClient({ admin: true })

  // Verify the sale exists and belongs to the tenant
  const { data: sale } = await (db
    .from('sales' as any)
    .select('id, client_id, event_id')
    .eq('id', sale_id)
    .eq('tenant_id', tenant_id)
    .single() as any)

  if (!sale) {
    console.error('[handleCommercePaymentSucceeded] Sale not found or tenant mismatch:', sale_id)
    return
  }

  // Build idempotency key from Stripe event ID
  const idempotencyKey = `stripe_${event.id}`
  const txnRef = `commerce_${paymentIntent.id}`

  // Insert into commerce_payments - DB trigger handles ledger entry
  const { error: insertErr } = await (db.from('commerce_payments').insert({
    tenant_id,
    sale_id,
    event_id: (sale as any).event_id ?? null,
    client_id: (sale as any).client_id ?? null,
    amount_cents: paymentIntent.amount,
    tip_cents: 0,
    payment_method: 'card',
    status: 'captured',
    processor_type: 'stripe',
    processor_reference_id: paymentIntent.id,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_charge_id:
      typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null,
    idempotency_key: idempotencyKey,
    transaction_reference: txnRef,
    captured_at: new Date().toISOString(),
    created_by: null,
  } as any) as any)

  if (insertErr) {
    // Idempotency: duplicate key is fine
    if (insertErr.code === '23505') {
      console.info(
        '[handleCommercePaymentSucceeded] Duplicate payment (idempotent):',
        idempotencyKey
      )
      return
    }
    console.error('[handleCommercePaymentSucceeded] Failed to insert payment:', insertErr.message)
    throw insertErr
  }

  // Update sale status
  const { data: payments } = await (db
    .from('commerce_payments')
    .select('amount_cents, status')
    .eq('sale_id', sale_id)
    .eq('tenant_id', tenant_id) as any)

  const totalPaid = ((payments ?? []) as any[])
    .filter((p) => ['captured', 'settled'].includes(p.status))
    .reduce((sum, p) => sum + p.amount_cents, 0)

  const { data: saleData } = await (db
    .from('sales' as any)
    .select('total_cents, status')
    .eq('id', sale_id)
    .single() as any)

  if (saleData) {
    const { computeSaleStatus } = await import('@/lib/commerce/sale-fsm')
    const newStatus = computeSaleStatus({
      currentStatus: (saleData as any).status,
      totalCents: (saleData as any).total_cents,
      totalPaidCents: totalPaid,
      totalRefundedCents: 0,
    })

    if (newStatus !== (saleData as any).status) {
      await (db as any)
        .from('sales')
        .update({ status: newStatus })
        .eq('id', sale_id)
        .eq('tenant_id', tenant_id)
    }
  }

  console.info('[handleCommercePaymentSucceeded] Commerce payment recorded for sale:', sale_id)
}

/**
 * Handle Stripe payout events.
 * Maps the payout to commerce payments via Inngest background job.
 */
async function handlePayoutEvent(event: Stripe.Event) {
  const payout = event.data.object as Stripe.Payout
  console.info('[handlePayoutEvent]', event.type, 'payout:', payout.id)

  // Find the tenant by their connected account
  // Payout events include the connected account in event.account
  const connectedAccountId = (event as any).account
  if (!connectedAccountId) {
    console.info('[handlePayoutEvent] No connected account on payout event, skipping')
    return
  }

  const db = createServerClient({ admin: true })
  const { data: chef } = await db
    .from('chefs')
    .select('id')
    .eq('stripe_account_id', connectedAccountId)
    .single()

  if (!chef) {
    console.info('[handlePayoutEvent] No chef found for account:', connectedAccountId)
    return
  }

  // Dispatch Inngest job to map the settlement
  try {
    const { inngest } = await import('@/lib/jobs/inngest-client')
    await (inngest as any).send({
      name: 'chefflow/commerce.map-settlement',
      data: {
        tenantId: chef.id,
        stripePayoutId: payout.id,
        payoutAmountCents: payout.amount,
        payoutStatus: event.type === 'payout.paid' ? 'paid' : 'failed',
        arrivalDate: payout.arrival_date
          ? ((_pad) =>
              `${_pad.getFullYear()}-${String(_pad.getMonth() + 1).padStart(2, '0')}-${String(_pad.getDate()).padStart(2, '0')}`)(
              new Date(payout.arrival_date * 1000)
            )
          : undefined,
      },
    })
    console.info('[handlePayoutEvent] Settlement mapping job dispatched for payout:', payout.id)
  } catch (err) {
    console.error('[handlePayoutEvent] Failed to dispatch settlement mapping job:', err)
  }
}

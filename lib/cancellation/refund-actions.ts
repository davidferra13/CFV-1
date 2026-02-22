// Refund Initiation Actions
// Chef-only server actions for initiating refunds on cancelled events.
// Handles both Stripe-paid events (triggers Stripe refund API) and
// offline-paid events (ledger-only entry).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  computeCancellationRefund,
  DEFAULT_POLICY,
  type CancellationPolicyConfig,
  type LedgerSnapshot,
} from '@/lib/cancellation/policy'

export type InitiateRefundInput = {
  eventId: string
  amountCents: number // Actual amount to refund (chef may override)
  refundDepositAlso: boolean // Whether to also refund the deposit
  reason: string
}

export type RefundResult = {
  success: boolean
  ledgerEntryId: string | null
  stripeRefundId: string | null
  isOfflineRefund: boolean
}

/**
 * Get the recommended refund amount for a cancelled event based on cancellation policy.
 * Returns the computed refund breakdown so the chef can review before initiating.
 */
export async function getCancellationRefundRecommendation(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event
  const { data: event } = await supabase
    .from('events')
    .select(
      'id, tenant_id, client_id, status, event_date, deposit_amount_cents, cancelled_at, created_at'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  // Fetch chef's cancellation policy config
  // Cast to any: cancellation_cutoff_days and deposit_refundable are new columns from
  // migration 20260228000006, not yet reflected in types/database.ts until supabase gen types.
  const { data: chef } = (await supabase
    .from('chefs')
    .select('cancellation_cutoff_days, deposit_refundable')
    .eq('id', user.tenantId!)
    .single()) as { data: { cancellation_cutoff_days: number; deposit_refundable: boolean } | null }

  const policy: CancellationPolicyConfig = {
    cancellationCutoffDays: chef?.cancellation_cutoff_days ?? DEFAULT_POLICY.cancellationCutoffDays,
    depositRefundable: chef?.deposit_refundable ?? DEFAULT_POLICY.depositRefundable,
  }

  // Fetch financial summary
  const { data: summary } = await supabase
    .from('event_financial_summary')
    .select('total_paid_cents, total_refunded_cents')
    .eq('event_id', eventId)
    .single()

  // Fetch deposit entries specifically
  const { data: depositEntries } = await supabase
    .from('ledger_entries')
    .select('amount_cents')
    .eq('event_id', eventId)
    .eq('entry_type', 'deposit')
    .eq('is_refund', false)

  const depositPaidCents = (depositEntries ?? []).reduce((sum, e) => sum + e.amount_cents, 0)

  const ledger: LedgerSnapshot = {
    totalPaidCents: summary?.total_paid_cents ?? 0,
    totalRefundedCents: summary?.total_refunded_cents ?? 0,
    depositPaidCents,
  }

  // Find first payment date for 24-hr window check
  const { data: firstPayment } = await supabase
    .from('ledger_entries')
    .select('created_at')
    .eq('event_id', eventId)
    .eq('is_refund', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const cancelledAt = event.cancelled_at ? new Date(event.cancelled_at) : new Date()

  const recommendation = computeCancellationRefund(
    event.event_date,
    firstPayment?.created_at ?? null,
    ledger,
    cancelledAt,
    policy
  )

  return {
    recommendation,
    policy,
    totalPaidCents: ledger.totalPaidCents,
    totalRefundedCents: ledger.totalRefundedCents,
    depositPaidCents,
    netRefundableCents: Math.max(0, ledger.totalPaidCents - ledger.totalRefundedCents),
  }
}

/**
 * Initiate a refund for a cancelled event.
 *
 * For Stripe payments:
 *  - Calls Stripe refund API (triggers charge.refunded webhook)
 *  - The webhook's handleRefund() writes the ledger entry automatically
 *  - We do NOT write a ledger entry here (prevents double-entry)
 *
 * For offline payments (cash, Venmo, etc.):
 *  - Writes ledger entry directly (negative amount, is_refund=true)
 *  - No Stripe API call
 */
export async function initiateRefund(input: InitiateRefundInput): Promise<RefundResult> {
  const { eventId, amountCents, reason } = input

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Refund amount must be a positive integer (cents)')
  }

  if (!reason?.trim()) {
    throw new Error('Refund reason is required')
  }

  const user = await requireChef()
  const supabase = createServerClient()

  // Validate event ownership and cancelled status
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, status, occasion, event_date, deposit_amount_cents')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  // Allow refunds for cancelled events and also paid/completed events (for adjustments)
  const allowedStatuses = ['cancelled', 'paid', 'confirmed', 'in_progress', 'completed']
  if (!allowedStatuses.includes(event.status)) {
    throw new Error(`Cannot initiate a refund for an event in '${event.status}' status`)
  }

  // Check if event was paid via Stripe by looking for a PaymentIntent ID in ledger notes
  const { getStripePaymentIntentIdForEvent } = await import('@/lib/stripe/refund')
  const stripePaymentIntentId = await getStripePaymentIntentIdForEvent(eventId)
  const isStripePayment = stripePaymentIntentId !== null

  let stripeRefundId: string | null = null
  let ledgerEntryId: string | null = null

  if (isStripePayment && stripePaymentIntentId) {
    // ── Stripe refund path ───────────────────────────────────────────────────
    // The Stripe webhook will fire and handleRefund() writes the ledger entry.
    // We only call the Stripe API here.
    try {
      const { createStripeRefund } = await import('@/lib/stripe/refund')
      const refundResult = await createStripeRefund(
        stripePaymentIntentId,
        amountCents,
        'requested_by_customer'
      )
      stripeRefundId = refundResult.refundId
    } catch (stripeErr) {
      console.error('[initiateRefund] Stripe refund failed:', stripeErr)
      throw new Error(`Stripe refund failed: ${(stripeErr as Error).message}`)
    }
  } else {
    // ── Offline refund path ──────────────────────────────────────────────────
    // Write ledger entry manually (negative amount, is_refund=true)
    const supabaseAdmin = createServerClient({ admin: true })
    const { data: ledgerEntry, error: ledgerError } = await supabaseAdmin
      .from('ledger_entries')
      .insert({
        tenant_id: event.tenant_id,
        client_id: event.client_id,
        entry_type: 'refund',
        amount_cents: -Math.abs(amountCents), // Negative for refunds
        payment_method: 'cash', // Offline refunds default to cash
        description: `Offline refund issued by chef`,
        event_id: eventId,
        transaction_reference: null,
        is_refund: true,
        refund_reason: reason,
        internal_notes: `Manual refund by ${user.email} on ${new Date().toISOString()}. Reason: ${reason}`,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (ledgerError) {
      console.error('[initiateRefund] Offline ledger entry failed:', ledgerError)
      throw new Error('Failed to record refund in ledger')
    }

    ledgerEntryId = ledgerEntry?.id ?? null
  }

  // ── Send client refund notification email ────────────────────────────────
  try {
    const supabaseAdmin = createServerClient({ admin: true })
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('email, full_name')
      .eq('id', event.client_id)
      .single()

    const { data: chef } = await supabaseAdmin
      .from('chefs')
      .select('business_name')
      .eq('id', event.tenant_id)
      .single()

    if (client?.email) {
      const { sendRefundInitiatedEmail } = await import('@/lib/email/notifications')
      await sendRefundInitiatedEmail({
        clientEmail: client.email,
        clientName: client.full_name,
        chefName: chef?.business_name || 'Your Chef',
        amountCents,
        reason,
        isStripeRefund: isStripePayment,
        occasion: event.occasion || 'your event',
        eventDate: event.event_date,
      })
    }
  } catch (emailErr) {
    console.error('[initiateRefund] Email failed (non-blocking):', emailErr)
  }

  // ── Log chef activity ─────────────────────────────────────────────────────
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'ledger_entry_created',
      domain: 'financial',
      entityType: 'ledger_entry',
      entityId: ledgerEntryId || stripeRefundId || eventId,
      summary: `Initiated refund: $${(amountCents / 100).toFixed(2)} — ${reason}`,
      context: {
        amount_cents: amountCents,
        reason,
        is_stripe: isStripePayment,
        stripe_refund_id: stripeRefundId,
        event_id: eventId,
      },
      clientId: event.client_id,
    })
  } catch (activityErr) {
    console.error('[initiateRefund] Activity log failed (non-blocking):', activityErr)
  }

  return {
    success: true,
    ledgerEntryId,
    stripeRefundId,
    isOfflineRefund: !isStripePayment,
  }
}

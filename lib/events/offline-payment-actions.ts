// Offline Payment Recording
// Allows chefs to record payments received outside of Stripe (cash, Venmo, Zelle, etc.)
// Appends to the immutable ledger and transitions the event to 'paid' when thresholds are met.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { transitionEvent } from '@/lib/events/transitions'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod, LedgerEntryType } from '@/lib/ledger/append'

export type RecordOfflinePaymentInput = {
  eventId: string
  amountCents: number
  paymentMethod: PaymentMethod
  paidAt: string // ISO date string (e.g. "2026-02-28")
  notes?: string
}

/**
 * Record a payment received outside of Stripe (cash, Venmo, Zelle, check, etc.)
 *
 * Flow:
 *  1. Validate event ownership and status
 *  2. Determine entry_type (deposit if first payment and deposit not yet met, else payment)
 *  3. Append to ledger
 *  4. Re-fetch financial summary — if deposit or full balance now covered, transition event
 *  5. Email client a receipt (non-blocking)
 *  6. Log chef activity (non-blocking)
 */
export async function recordOfflinePayment(input: RecordOfflinePaymentInput) {
  const { eventId, amountCents, paymentMethod, paidAt, notes } = input

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Amount must be a positive integer (cents)')
  }

  const user = await requireChef()
  const supabase = createServerClient()

  // ── 1. Fetch event and verify ownership ─────────────────────────────────
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      'id, tenant_id, client_id, status, quoted_price_cents, deposit_amount_cents, occasion, event_date'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or does not belong to your tenant')
  }

  const allowedStatuses = ['accepted', 'paid', 'confirmed', 'in_progress']
  if (!allowedStatuses.includes(event.status)) {
    throw new Error(`Cannot record payment for an event in '${event.status}' status`)
  }

  // ── 2. Determine entry type ──────────────────────────────────────────────
  const { data: currentSummary } = await supabase
    .from('event_financial_summary')
    .select('total_paid_cents, outstanding_balance_cents')
    .eq('event_id', eventId)
    .single()

  const totalPaidSoFar = currentSummary?.total_paid_cents ?? 0
  const depositCents = event.deposit_amount_cents ?? 0

  // Use 'deposit' type if this is the first payment and the deposit threshold hasn't been met yet
  const isFirstPayment = totalPaidSoFar === 0
  const depositNotYetMet = totalPaidSoFar < depositCents
  const entryType: LedgerEntryType =
    (isFirstPayment || depositNotYetMet) && depositCents > 0 ? 'deposit' : 'payment'

  // ── 3. Append to ledger ──────────────────────────────────────────────────
  // Use admin client since we're bypassing the webhook path (which uses admin internally).
  // Auth is validated above via requireChef + tenant check.
  const supabaseAdmin = createServerClient({ admin: true })

  // Generate a deterministic idempotency key to prevent duplicate ledger entries
  // on double-submit (same event + amount + method + date = same payment)
  const offlineTxRef = `offline_${eventId}_${amountCents}_${paymentMethod}_${paidAt}`

  // Check for existing entry with same reference (dedup guard)
  const { data: existingEntry } = await supabaseAdmin
    .from('ledger_entries')
    .select('id')
    .eq('transaction_reference', offlineTxRef)
    .limit(1)

  if (existingEntry && existingEntry.length > 0) {
    // Already recorded — return idempotently instead of creating a duplicate
    revalidatePath(`/events/${eventId}`)
    return { success: true, entryId: existingEntry[0].id, deduplicated: true }
  }

  const { data: ledgerEntry, error: ledgerError } = await supabaseAdmin
    .from('ledger_entries')
    .insert({
      tenant_id: event.tenant_id,
      client_id: event.client_id,
      entry_type: entryType,
      amount_cents: amountCents,
      payment_method: paymentMethod,
      description: `Offline ${entryType} recorded by chef — ${paymentMethod}`,
      event_id: eventId,
      transaction_reference: offlineTxRef,
      internal_notes:
        notes ||
        `Recorded by ${user.email} on ${new Date().toISOString()}. Payment date: ${paidAt}`,
      received_at: new Date(paidAt).toISOString(),
      is_refund: false,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (ledgerError) {
    console.error('[recordOfflinePayment] Ledger error:', ledgerError)
    throw new Error('Failed to record payment in ledger')
  }

  // ── 4. Re-fetch financial summary to get updated balance ─────────────────
  // Always fetch after insert: used for (a) transition check and (b) receipt email.
  const { data: updatedSummary } = await supabaseAdmin
    .from('event_financial_summary')
    .select('total_paid_cents, outstanding_balance_cents, payment_status')
    .eq('event_id', eventId)
    .single()

  const remainingBalanceCents = updatedSummary?.outstanding_balance_cents ?? null

  // Transition accepted → paid when deposit threshold is met
  if (event.status === 'accepted') {
    const newTotalPaid = updatedSummary?.total_paid_cents ?? 0
    const depositMet = depositCents === 0 || newTotalPaid >= depositCents

    if (depositMet) {
      try {
        await transitionEvent({
          eventId,
          toStatus: 'paid',
          metadata: {
            source: 'offline_payment',
            payment_method: paymentMethod,
            amount_cents: amountCents,
            entry_type: entryType,
          },
          systemTransition: true,
        })
      } catch (transitionErr) {
        // Log but don't throw — ledger entry is the source of truth
        console.error(
          '[recordOfflinePayment] Event transition failed (non-blocking):',
          transitionErr
        )
      }
    }
  }

  // ── 5. Email client a receipt ────────────────────────────────────────────
  try {
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
      const { sendOfflinePaymentReceiptEmail } = await import('@/lib/email/notifications')
      await sendOfflinePaymentReceiptEmail({
        clientEmail: client.email,
        clientName: client.full_name,
        chefName: chef?.business_name || 'Your Chef',
        amountCents,
        paymentMethod,
        entryType,
        occasion: event.occasion || 'your event',
        eventDate: event.event_date,
        paidAt,
        remainingBalanceCents,
      })
    }
  } catch (emailErr) {
    console.error('[recordOfflinePayment] Email failed (non-blocking):', emailErr)
  }

  // ── 6. Log chef activity ─────────────────────────────────────────────────
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'ledger_entry_created',
      domain: 'financial',
      entityType: 'ledger_entry',
      entityId: ledgerEntry?.id,
      summary: `Recorded offline ${entryType}: $${(amountCents / 100).toFixed(2)} via ${paymentMethod}`,
      context: {
        amount_cents: amountCents,
        payment_method: paymentMethod,
        entry_type: entryType,
        event_id: eventId,
      },
      clientId: event.client_id,
    })
  } catch (activityErr) {
    console.error('[recordOfflinePayment] Activity log failed (non-blocking):', activityErr)
  }

  // ── 7. Push notification — payment received (non-blocking) ──────────────
  try {
    const { notifyPaymentReceived } = await import('@/lib/notifications/onesignal')
    const amountFormatted = `$${(amountCents / 100).toFixed(2)}`
    // Fetch client name for the push message
    const { data: pushClient } = await supabaseAdmin
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    const clientName = pushClient?.full_name || 'Client'
    await notifyPaymentReceived(user.id, amountFormatted, clientName)
  } catch (pushErr) {
    console.error('[recordOfflinePayment] Push notification failed (non-blocking):', pushErr)
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)
  revalidatePath('/events')
  revalidatePath('/my-events')

  return { success: true, entryId: ledgerEntry?.id }
}

// Offline Payment Recording
// Allows chefs to record payments received outside of Stripe (cash, Venmo, Zelle, etc.)
// Appends to the immutable ledger and transitions the event to 'paid' when thresholds are met.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { transitionEvent } from '@/lib/events/transitions'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod, LedgerEntryType } from '@/lib/ledger/append'

/**
 * Fetch ledger entries for an event (chef-only).
 * Used by VoidPaymentPanel to show voidable payments.
 */
export async function getEventLedgerEntries(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: entries } = await db
    .from('ledger_entries')
    .select(
      'id, entry_type, amount_cents, payment_method, description, is_refund, received_at, created_at, refunded_entry_id'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  return entries ?? []
}

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
 *  4. Re-fetch financial summary - if deposit or full balance now covered, transition event
 *  5. Email client a receipt (non-blocking)
 *  6. Log chef activity (non-blocking)
 */
export async function recordOfflinePayment(input: RecordOfflinePaymentInput) {
  const { eventId, amountCents, paymentMethod, paidAt, notes } = input

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Amount must be a positive integer (cents)')
  }

  const user = await requireChef()
  const db: any = createServerClient()

  // ── 1. Fetch event and verify ownership ─────────────────────────────────
  const { data: event, error: eventError } = await db
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
  const { data: currentSummary } = await db
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
  const dbAdmin = createServerClient({ admin: true })

  // Generate a deterministic idempotency key to prevent duplicate ledger entries
  // on double-submit (same event + amount + method + date = same payment)
  const offlineTxRef = `offline_${eventId}_${amountCents}_${paymentMethod}_${paidAt}`

  // Check for existing entry with same reference (dedup guard)
  const { data: existingEntry } = await dbAdmin
    .from('ledger_entries')
    .select('id')
    .eq('transaction_reference', offlineTxRef)
    .limit(1)

  if (existingEntry && existingEntry.length > 0) {
    // Already recorded - return idempotently instead of creating a duplicate
    revalidatePath(`/events/${eventId}`)
    return { success: true, entryId: existingEntry[0].id, deduplicated: true }
  }

  const { data: ledgerEntry, error: ledgerError } = await dbAdmin
    .from('ledger_entries')
    .insert({
      tenant_id: event.tenant_id,
      client_id: event.client_id,
      entry_type: entryType,
      amount_cents: amountCents,
      payment_method: paymentMethod,
      description: `Offline ${entryType} recorded by chef - ${paymentMethod}`,
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
  const { data: updatedSummary } = await dbAdmin
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
        // Log but don't throw - ledger entry is the source of truth
        console.error(
          '[recordOfflinePayment] Event transition failed (non-blocking):',
          transitionErr
        )
      }
    }
  }

  // ── 5. Email client a receipt ────────────────────────────────────────────
  try {
    const { data: client } = await dbAdmin
      .from('clients')
      .select('email, full_name, loyalty_tier, loyalty_points')
      .eq('id', event.client_id)
      .single()

    const { data: chef } = await dbAdmin
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
        loyaltyTier: client.loyalty_tier ?? undefined,
        loyaltyPoints: client.loyalty_points ?? undefined,
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

  // ── 7. Notification - payment received (non-blocking) ──────────────
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    const amountFormatted = `$${(amountCents / 100).toFixed(2)}`
    const { data: pushClient } = await dbAdmin
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    const clientName = pushClient?.full_name || 'Client'
    await createNotification({
      tenantId: user.tenantId!,
      recipientId: user.id,
      category: 'payment',
      action: 'payment_received',
      title: `Payment received: ${amountFormatted}`,
      body: `${clientName} paid ${amountFormatted}`,
      eventId,
      clientId: event.client_id,
    })
  } catch (pushErr) {
    console.error('[recordOfflinePayment] Notification failed (non-blocking):', pushErr)
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)
  revalidatePath('/events')
  revalidatePath('/my-events')
  revalidatePath('/dashboard')
  revalidatePath('/finance')

  return { success: true, entryId: ledgerEntry?.id }
}

// ── Void an offline payment ─────────────────────────────────────────────────
// Creates a reversal entry (negative amount) referencing the original.
// The ledger is immutable: voiding = appending a counter-entry, not deleting.

export type VoidOfflinePaymentInput = {
  entryId: string
  reason: string
}

export async function voidOfflinePayment(input: VoidOfflinePaymentInput) {
  const { entryId, reason } = input

  if (!reason || reason.trim().length === 0) {
    throw new Error('A reason is required to void a payment')
  }

  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch original entry + verify ownership
  const { data: original, error: fetchError } = await db
    .from('ledger_entries')
    .select(
      'id, tenant_id, event_id, client_id, amount_cents, entry_type, payment_method, is_refund, transaction_reference'
    )
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !original) {
    throw new Error('Ledger entry not found or does not belong to your account')
  }

  if (original.is_refund) {
    throw new Error('Cannot void a refund entry (already a reversal)')
  }

  // Check not already voided (look for existing reversal referencing this entry)
  const { data: existingVoid } = await db
    .from('ledger_entries')
    .select('id')
    .eq('refunded_entry_id', entryId)
    .eq('is_refund', true)
    .limit(1)

  if (existingVoid && existingVoid.length > 0) {
    throw new Error('This payment has already been voided')
  }

  // Create reversal entry
  const dbAdmin = createServerClient({ admin: true })
  const voidRef = `void_${entryId}_${Date.now()}`

  const { data: voidEntry, error: voidError } = await dbAdmin
    .from('ledger_entries')
    .insert({
      tenant_id: original.tenant_id,
      client_id: original.client_id,
      entry_type: 'adjustment' as const,
      amount_cents: original.amount_cents, // same amount
      payment_method: original.payment_method,
      description: `Voided: ${reason}`,
      event_id: original.event_id,
      transaction_reference: voidRef,
      internal_notes: `Void of entry ${entryId}. Reason: ${reason}. Voided by ${user.email} on ${new Date().toISOString()}`,
      is_refund: true,
      refund_reason: reason,
      refunded_entry_id: entryId,
      received_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select('id')
    .single()

  if (voidError) {
    console.error('[voidOfflinePayment] Ledger error:', voidError)
    throw new Error('Failed to void payment')
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'ledger_entry_voided',
      domain: 'financial',
      entityType: 'ledger_entry',
      entityId: voidEntry?.id,
      summary: `Voided $${(original.amount_cents / 100).toFixed(2)} ${original.payment_method} payment: ${reason}`,
      context: {
        original_entry_id: entryId,
        amount_cents: original.amount_cents,
        payment_method: original.payment_method,
        reason,
      },
      clientId: original.client_id,
    })
  } catch (err) {
    console.error('[voidOfflinePayment] Activity log failed (non-blocking):', err)
  }

  if (original.event_id) {
    revalidatePath(`/events/${original.event_id}`)
    revalidatePath(`/my-events/${original.event_id}`)
  }
  revalidatePath('/events')
  revalidatePath('/finance')

  return { success: true, voidEntryId: voidEntry?.id }
}

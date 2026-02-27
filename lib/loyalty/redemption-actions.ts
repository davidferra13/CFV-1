'use server'

// Gift Card & Voucher Redemption Actions
// Handles code validation (read-only preview) and atomic code redemption
// (writes ledger credit + updates balance + inserts audit row via RPC).

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ValidationResult =
  | {
      valid: true
      incentiveId: string
      type: 'voucher' | 'gift_card'
      code: string
      appliedAmountCents: number
      remainingAfterCents: number | null
      title: string
    }
  | {
      valid: false
      error: string
    }

type RedemptionResult = {
  success: true
  appliedAmountCents: number
  remainingBalanceCents: number | null
  ledgerEntryId: string
  eventNowFullyCovered: boolean
}

/**
 * Validate a voucher or gift card code against a specific event.
 * READ-ONLY — does not write anything.
 * Returns a preview of the discount that would be applied.
 * Used to show the client a discount preview before they confirm payment.
 */
export async function validateIncentiveCode(
  code: string,
  eventId: string
): Promise<ValidationResult> {
  const user = await requireClient()
  const supabase = createServerClient()
  // Admin client used specifically for the incentive code lookup.
  // The regular client RLS policy only lets clients see codes they created or were
  // targeted at them — but a gift card purchased by a guest (no auth account) or
  // issued by a chef to "anyone" won't pass that filter. The code string itself is
  // the authorization token; authentication via requireClient() is the access guard.
  const adminSupabase = createServerClient({ admin: true })

  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) {
    return { valid: false, error: 'Please enter a code.' }
  }

  // 1. Fetch the event to get tenant_id and outstanding balance
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, status, quoted_price_cents')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (eventError || !event) {
    return { valid: false, error: 'Event not found.' }
  }

  if (event.status !== 'accepted') {
    return { valid: false, error: 'This event is not ready for payment.' }
  }

  // 2. Fetch outstanding balance from the financial summary view
  const { data: financial } = await supabase
    .from('event_financial_summary')
    .select('outstanding_balance_cents')
    .eq('event_id', eventId)
    .single()

  const outstandingCents = financial?.outstanding_balance_cents ?? event.quoted_price_cents ?? 0

  if (outstandingCents <= 0) {
    return { valid: false, error: 'This event has no outstanding balance.' }
  }

  // 3. Look up the incentive code scoped to the event's tenant (admin client bypasses RLS)
  const { data: incentive, error: incentiveError } = await (adminSupabase as any)
    .from('client_incentives')
    .select('*')
    .eq('tenant_id', event.tenant_id)
    .eq('code', normalizedCode)
    .single()

  if (incentiveError || !incentive) {
    return { valid: false, error: 'Code not found. Please check and try again.' }
  }

  // 4. Validate status
  if (!incentive.is_active) {
    return { valid: false, error: 'This code is no longer active.' }
  }

  if (incentive.expires_at && new Date(incentive.expires_at).getTime() < Date.now()) {
    return { valid: false, error: 'This code has expired.' }
  }

  if (incentive.redemptions_used >= incentive.max_redemptions) {
    return { valid: false, error: 'This code has already been fully redeemed.' }
  }

  // 5. Validate gift card has remaining balance
  if (incentive.type === 'gift_card') {
    const remaining = incentive.remaining_balance_cents ?? incentive.amount_cents ?? 0
    if (remaining <= 0) {
      return { valid: false, error: 'This gift card has no remaining balance.' }
    }

    const appliedAmountCents = Math.min(remaining, outstandingCents)
    const remainingAfterCents = remaining - appliedAmountCents

    return {
      valid: true,
      incentiveId: incentive.id,
      type: 'gift_card',
      code: incentive.code,
      appliedAmountCents,
      remainingAfterCents,
      title: incentive.title,
    }
  }

  // 6. Voucher — fixed amount or percent discount
  if (incentive.type === 'voucher') {
    let appliedAmountCents: number

    if (incentive.amount_cents != null) {
      appliedAmountCents = Math.min(incentive.amount_cents, outstandingCents)
    } else if (incentive.discount_percent != null) {
      appliedAmountCents = Math.round((outstandingCents * incentive.discount_percent) / 100)
    } else {
      return { valid: false, error: 'This voucher has an invalid value configuration.' }
    }

    if (appliedAmountCents <= 0) {
      return { valid: false, error: 'This voucher results in no discount for this event.' }
    }

    return {
      valid: true,
      incentiveId: incentive.id,
      type: 'voucher',
      code: incentive.code,
      appliedAmountCents,
      remainingAfterCents: null, // Vouchers don't track remaining balance
      title: incentive.title,
    }
  }

  return { valid: false, error: 'Unrecognized incentive type.' }
}

/**
 * Redeem a voucher or gift card code against an event.
 * WRITES: ledger credit entry + incentive balance update + redemption audit row
 * All three writes are atomic via the redeem_incentive() Postgres RPC.
 *
 * Call sequence on the payment page:
 *   1. redeemIncentiveCode()  ← this function; writes credit, decrements balance
 *   2. createPaymentIntent()  ← now reads updated outstanding (already reflects credit)
 *   3. Stripe payment / or skip if outstanding is now 0
 */
export async function redeemIncentiveCode(
  code: string,
  eventId: string
): Promise<RedemptionResult> {
  const user = await requireClient()
  const supabase = createServerClient()
  const adminSupabase = createServerClient({ admin: true })

  const normalizedCode = code.trim().toUpperCase()

  // Re-validate to guard against race conditions (another redemption between validate and redeem)
  const validation = await validateIncentiveCode(normalizedCode, eventId)

  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const { incentiveId, type, appliedAmountCents, remainingAfterCents } = validation

  // Fetch the raw incentive again for balance_before snapshot (admin to bypass RLS)
  const { data: incentive } = await (adminSupabase as any)
    .from('client_incentives')
    .select('remaining_balance_cents, amount_cents')
    .eq('id', incentiveId)
    .single()

  const balanceBefore =
    type === 'gift_card'
      ? (incentive?.remaining_balance_cents ?? incentive?.amount_cents ?? null)
      : null

  // Call the atomic RPC (inserts ledger + updates incentive + inserts audit row)
  const { data: ledgerEntryId, error: rpcError } = await (adminSupabase as any).rpc(
    'redeem_incentive',
    {
      p_incentive_id: incentiveId,
      p_event_id: eventId,
      p_client_id: user.entityId,
      p_tenant_id: await getEventTenantId(supabase, eventId, user.entityId),
      p_applied_cents: appliedAmountCents,
      p_incentive_type: type,
      p_code: normalizedCode,
      p_balance_before_cents: balanceBefore,
      p_redeemed_by: user.id,
    }
  )

  if (rpcError || !ledgerEntryId) {
    console.error('[redeemIncentiveCode] RPC error:', rpcError)
    throw new Error('Failed to apply code. Please try again.')
  }

  // Check if the event is now fully covered (outstanding balance → 0)
  const { data: updated } = await supabase
    .from('event_financial_summary')
    .select('outstanding_balance_cents')
    .eq('event_id', eventId)
    .single()

  const outstandingAfter = updated?.outstanding_balance_cents ?? null
  const eventNowFullyCovered = outstandingAfter !== null && outstandingAfter <= 0

  // If fully covered, transition the event to 'paid' (no Stripe needed)
  if (eventNowFullyCovered) {
    try {
      const { transitionEvent } = await import('@/lib/events/transitions')
      await transitionEvent({
        eventId,
        toStatus: 'paid',
        metadata: {
          source: 'gift_card_full_coverage',
          incentive_code: normalizedCode,
          ledger_entry_id: ledgerEntryId,
        },
        systemTransition: true,
      })
    } catch (transitionErr) {
      // Log but don't fail — the credit is already in the ledger
      console.error('[redeemIncentiveCode] Auto-transition failed (non-blocking):', transitionErr)
    }
  }

  revalidatePath(`/my-events/${eventId}`)
  revalidatePath('/my-rewards')

  // Non-blocking: notify chef of gift card redemption
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    // Get the event's tenant_id
    const supabaseAdmin = createServerClient({ admin: true })
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select('tenant_id')
      .eq('id', eventId)
      .single()

    if (eventData?.tenant_id) {
      const chefUserId = await getChefAuthUserId(eventData.tenant_id)
      if (chefUserId) {
        const appliedFormatted = (appliedAmountCents / 100).toFixed(2)
        await createNotification({
          tenantId: eventData.tenant_id,
          recipientId: chefUserId,
          category: 'loyalty',
          action: 'gift_card_redeemed',
          title: 'Gift card redeemed',
          body: `$${appliedFormatted} applied to an event`,
          actionUrl: `/events/${eventId}`,
          eventId,
        })
      }
    }
  } catch (err) {
    console.error('[redeemIncentiveCode] Chef notification failed (non-blocking):', err)
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/loyalty')

  return {
    success: true,
    appliedAmountCents,
    remainingBalanceCents: remainingAfterCents,
    ledgerEntryId: String(ledgerEntryId),
    eventNowFullyCovered,
  }
}

async function getEventTenantId(
  supabase: ReturnType<typeof createServerClient>,
  eventId: string,
  clientId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .eq('client_id', clientId)
    .single()

  if (error || !data) {
    throw new Error('Event not found for tenant resolution')
  }

  return data.tenant_id
}

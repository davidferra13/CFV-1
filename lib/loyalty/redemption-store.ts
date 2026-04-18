// Tenant-explicit incentive redemption helpers for API v2 routes.
// These functions accept tenantId + clientEntityId directly instead of
// calling requireClient(). Used when an API-key caller redeems on behalf
// of a client.

import { createServerClient } from '@/lib/db/server'

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
  | { valid: false; error: string }

type RedemptionResult = {
  success: true
  appliedAmountCents: number
  remainingBalanceCents: number | null
  ledgerEntryId: string
  eventNowFullyCovered: boolean
}

/**
 * Validate a voucher/gift card code against a specific event, scoped to a tenant.
 * READ-ONLY: does not write anything.
 */
export async function validateIncentiveCodeForTenant(
  tenantId: string,
  code: string,
  eventId: string,
  clientEntityId: string
): Promise<ValidationResult> {
  const db: any = createServerClient({ admin: true })
  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) return { valid: false, error: 'Please enter a code.' }

  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, tenant_id, client_id, status, quoted_price_cents')
    .eq('id', eventId)
    .eq('client_id', clientEntityId)
    .single()

  if (eventError || !event) return { valid: false, error: 'Event not found.' }
  if (event.tenant_id !== tenantId)
    return { valid: false, error: 'Event does not belong to this tenant.' }
  if (event.status !== 'accepted')
    return { valid: false, error: 'This event is not ready for payment.' }

  const { data: financial } = await db
    .from('event_financial_summary')
    .select('outstanding_balance_cents')
    .eq('event_id', eventId)
    .single()

  const outstandingCents = financial?.outstanding_balance_cents ?? event.quoted_price_cents ?? 0
  if (outstandingCents <= 0)
    return { valid: false, error: 'This event has no outstanding balance.' }

  const { data: incentive, error: incentiveError } = await db
    .from('client_incentives')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('code', normalizedCode)
    .single()

  if (incentiveError || !incentive) return { valid: false, error: 'Code not found.' }
  if (!incentive.is_active) return { valid: false, error: 'This code is no longer active.' }
  if (incentive.expires_at && new Date(incentive.expires_at).getTime() < Date.now())
    return { valid: false, error: 'This code has expired.' }
  if (incentive.redemptions_used >= incentive.max_redemptions)
    return { valid: false, error: 'This code has already been fully redeemed.' }

  if (incentive.type === 'gift_card') {
    const remaining = incentive.remaining_balance_cents ?? incentive.amount_cents ?? 0
    if (remaining <= 0) return { valid: false, error: 'This gift card has no remaining balance.' }
    const appliedAmountCents = Math.min(remaining, outstandingCents)
    return {
      valid: true,
      incentiveId: incentive.id,
      type: 'gift_card',
      code: incentive.code,
      appliedAmountCents,
      remainingAfterCents: remaining - appliedAmountCents,
      title: incentive.title,
    }
  }

  if (incentive.type === 'voucher') {
    let appliedAmountCents: number
    if (incentive.amount_cents != null) {
      appliedAmountCents = Math.min(incentive.amount_cents, outstandingCents)
    } else if (incentive.discount_percent != null) {
      appliedAmountCents = Math.round((outstandingCents * incentive.discount_percent) / 100)
    } else {
      return { valid: false, error: 'This voucher has an invalid value configuration.' }
    }
    if (appliedAmountCents <= 0)
      return { valid: false, error: 'This voucher results in no discount.' }
    return {
      valid: true,
      incentiveId: incentive.id,
      type: 'voucher',
      code: incentive.code,
      appliedAmountCents,
      remainingAfterCents: null,
      title: incentive.title,
    }
  }

  return { valid: false, error: 'Unrecognized incentive type.' }
}

/**
 * Redeem a voucher/gift card code against an event.
 * WRITES: ledger credit + incentive balance update + audit row via RPC.
 */
export async function redeemIncentiveCodeForTenant(
  tenantId: string,
  code: string,
  eventId: string,
  clientEntityId: string,
  actorId?: string
): Promise<RedemptionResult> {
  const db: any = createServerClient({ admin: true })
  const normalizedCode = code.trim().toUpperCase()

  const validation = await validateIncentiveCodeForTenant(
    tenantId,
    normalizedCode,
    eventId,
    clientEntityId
  )
  if (!validation.valid) throw new Error(validation.error)

  const { incentiveId, type, appliedAmountCents, remainingAfterCents } = validation

  const { data: incentive } = await db
    .from('client_incentives')
    .select('remaining_balance_cents, amount_cents')
    .eq('id', incentiveId)
    .single()

  const balanceBefore =
    type === 'gift_card'
      ? (incentive?.remaining_balance_cents ?? incentive?.amount_cents ?? null)
      : null

  const { data: ledgerEntryId, error: rpcError } = await db.rpc('redeem_incentive', {
    p_incentive_id: incentiveId,
    p_event_id: eventId,
    p_client_id: clientEntityId,
    p_tenant_id: tenantId,
    p_applied_cents: appliedAmountCents,
    p_incentive_type: type,
    p_code: normalizedCode,
    p_balance_before_cents: balanceBefore,
    p_redeemed_by: actorId ?? clientEntityId,
  })

  if (rpcError || !ledgerEntryId) throw new Error('Failed to apply code.')

  const { data: updated } = await db
    .from('event_financial_summary')
    .select('outstanding_balance_cents')
    .eq('event_id', eventId)
    .single()

  const outstandingAfter = updated?.outstanding_balance_cents ?? null
  const eventNowFullyCovered = outstandingAfter !== null && outstandingAfter <= 0

  return {
    success: true,
    appliedAmountCents,
    remainingBalanceCents: remainingAfterCents,
    ledgerEntryId: String(ledgerEntryId),
    eventNowFullyCovered,
  }
}

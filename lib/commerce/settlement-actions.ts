// Commerce Engine V1 — Settlement Actions
// Track Stripe payouts, map payments to settlements, view settlement history.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────

export type RecordSettlementInput = {
  stripePayoutId: string
  stripeTransferId?: string
  payoutAmountCents: number
  payoutCurrency?: string
  payoutStatus?: string
  payoutArrivalDate?: string // YYYY-MM-DD
  grossAmountCents: number
  feeAmountCents: number
  refundAmountCents?: number
  netAmountCents: number
  paymentIds: string[] // UUIDs of commerce_payments settled in this payout
  periodStart?: string // YYYY-MM-DD
  periodEnd?: string // YYYY-MM-DD
  notes?: string
}

// ─── Record Settlement ────────────────────────────────────────────

/**
 * Record a new settlement (Stripe payout) with linked payment IDs.
 * Idempotent on (tenant_id, stripe_payout_id).
 */
export async function recordSettlement(input: RecordSettlementInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('settlement_records')
    .upsert(
      {
        tenant_id: user.tenantId!,
        stripe_payout_id: input.stripePayoutId,
        stripe_transfer_id: input.stripeTransferId ?? null,
        payout_amount_cents: input.payoutAmountCents,
        payout_currency: input.payoutCurrency ?? 'usd',
        payout_status: input.payoutStatus ?? 'pending',
        payout_arrival_date: input.payoutArrivalDate ?? null,
        gross_amount_cents: input.grossAmountCents,
        fee_amount_cents: input.feeAmountCents,
        refund_amount_cents: input.refundAmountCents ?? 0,
        net_amount_cents: input.netAmountCents,
        payment_ids: JSON.stringify(input.paymentIds),
        payment_count: input.paymentIds.length,
        period_start: input.periodStart ?? null,
        period_end: input.periodEnd ?? null,
        notes: input.notes ?? null,
      } as any,
      { onConflict: 'tenant_id,stripe_payout_id' }
    )
    .select('id')
    .single()

  if (error) throw new Error(`Failed to record settlement: ${error.message}`)
  revalidatePath('/commerce/settlements')
  return data
}

// ─── Update Settlement Status ─────────────────────────────────────

/**
 * Update a settlement's payout status (e.g., from pending → paid).
 */
export async function updateSettlementStatus(
  settlementId: string,
  status: string,
  arrivalDate?: string
) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  const updates: Record<string, any> = { payout_status: status }
  if (arrivalDate) updates.payout_arrival_date = arrivalDate

  const { error } = await supabase
    .from('settlement_records')
    .update(updates)
    .eq('id', settlementId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update settlement: ${error.message}`)
  revalidatePath('/commerce/settlements')
}

// ─── List Settlements ─────────────────────────────────────────────

export async function listSettlements(opts?: { limit?: number; offset?: number; status?: string }) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  const limit = opts?.limit ?? 30
  const offset = opts?.offset ?? 0

  let query = supabase
    .from('settlement_records')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts?.status) {
    query = query.eq('payout_status', opts.status)
  }

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to list settlements: ${error.message}`)
  return { settlements: data ?? [], total: count ?? 0 }
}

// ─── Get Single Settlement ────────────────────────────────────────

export async function getSettlement(settlementId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('settlement_records')
    .select('*')
    .eq('id', settlementId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) throw new Error('Settlement not found')
  return data
}

// ─── Get Settlement Summary ───────────────────────────────────────

/**
 * Aggregate settlement statistics for the dashboard.
 */
export async function getSettlementSummary() {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  const { data: all } = await supabase
    .from('settlement_records')
    .select('payout_status, net_amount_cents, payment_count')
    .eq('tenant_id', user.tenantId!)

  const records = (all ?? []) as any[]

  const totalSettled = records
    .filter((r) => r.payout_status === 'paid')
    .reduce((sum, r) => sum + (r.net_amount_cents ?? 0), 0)

  const pendingAmount = records
    .filter((r) => ['pending', 'in_transit'].includes(r.payout_status))
    .reduce((sum, r) => sum + (r.net_amount_cents ?? 0), 0)

  const totalPayouts = records.length
  const totalPaymentsSettled = records.reduce((sum, r) => sum + (r.payment_count ?? 0), 0)

  return {
    totalSettledCents: totalSettled,
    pendingAmountCents: pendingAmount,
    totalPayouts,
    totalPaymentsSettled,
  }
}

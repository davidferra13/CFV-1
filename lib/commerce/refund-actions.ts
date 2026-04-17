// Commerce Engine V1 - Refund Actions
// Create and process refunds against commerce_payments.
// The DB trigger auto-creates ledger entries for processed refunds.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { canRefund, computeSaleStatus, canTransition } from './sale-fsm'
import { appendPosAuditLog } from './pos-audit-log'
import { assertPosManagerAccess } from './pos-authorization'
import { normalizeManualReason } from './mutation-reason'

// ─── Types ────────────────────────────────────────────────────────

export type CreateRefundInput = {
  paymentId: string
  saleId?: string
  amountCents: number
  reason: string
  idempotencyKey: string
  stripeRefundId?: string
}

// ─── Create Refund ────────────────────────────────────────────────

/**
 * Create a refund against a commerce payment.
 * Sets status to 'processed' immediately for manual refunds.
 * Stripe refunds are created with 'pending' and updated via webhook.
 * The DB trigger `commerce_refund_to_ledger` auto-creates a ledger entry.
 */
export async function createRefund(input: CreateRefundInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  const normalizedReason = normalizeManualReason({
    reason: input.reason,
    actionLabel: 'Refund',
  })

  await assertPosManagerAccess({
    db,
    user,
    action: 'issue a refund',
  })

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Refund amount must be a positive integer (cents)')
  }
  // Fetch the original payment
  const { data: payment, error: paymentErr } = await db
    .from('commerce_payments')
    .select('id, sale_id, amount_cents, tip_cents, status, tenant_id')
    .eq('id', input.paymentId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (paymentErr || !payment) throw new Error('Payment not found')

  // Validate payment can be refunded
  if (!['captured', 'settled'].includes((payment as any).status)) {
    throw new Error('Only captured or settled payments can be refunded')
  }

  // Validate refund amount doesn't exceed payment
  const { data: existingRefunds } = await db
    .from('commerce_refunds')
    .select('amount_cents')
    .eq('payment_id', input.paymentId)
    .in('status', ['pending', 'processed'])

  const alreadyRefunded = (existingRefunds ?? []).reduce(
    (sum: number, r: any) => sum + r.amount_cents,
    0
  )
  const maxRefundable = (payment as any).amount_cents + (payment as any).tip_cents - alreadyRefunded

  if (input.amountCents > maxRefundable) {
    throw new Error(
      `Refund amount ($${(input.amountCents / 100).toFixed(2)}) exceeds ` +
        `refundable balance ($${(maxRefundable / 100).toFixed(2)})`
    )
  }

  // Determine sale_id
  const saleId = input.saleId ?? (payment as any).sale_id

  // If sale exists, check it can be refunded
  if (saleId) {
    const { data: sale } = await db
      .from('sales')
      .select('status')
      .eq('id', saleId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (sale && !canRefund((sale as any).status)) {
      throw new Error(`Cannot refund a sale in ${(sale as any).status} status`)
    }
  }

  // Determine initial status - manual refunds are immediate, Stripe ones are pending
  const refundStatus = input.stripeRefundId ? 'pending' : 'processed'

  const { data: refund, error } = await db
    .from('commerce_refunds')
    .insert({
      tenant_id: user.tenantId!,
      payment_id: input.paymentId,
      sale_id: saleId ?? null,
      amount_cents: input.amountCents,
      reason: normalizedReason,
      status: refundStatus,
      stripe_refund_id: input.stripeRefundId ?? null,
      idempotency_key: input.idempotencyKey,
      processed_at: refundStatus === 'processed' ? new Date().toISOString() : null,
      created_by: user.id,
    } as any)
    .select('id, ledger_entry_id')
    .single()

  if (error) {
    // Idempotency: if duplicate key, return existing
    if (error.code === '23505' && error.message.includes('idempotency')) {
      const { data: existing } = await db
        .from('commerce_refunds')
        .select('id, ledger_entry_id')
        .eq('idempotency_key', input.idempotencyKey)
        .single()
      if (existing) return existing
    }
    throw new Error(`Failed to create refund: ${error.message}`)
  }

  let postRefundSaleStatus: string | null = null
  // Update sale status if this is a processed refund
  if (refundStatus === 'processed' && saleId) {
    await updateSaleStatusAfterRefund(saleId, user.tenantId!)
    const { data: updatedSale } = await db
      .from('sales')
      .select('status')
      .eq('id', saleId)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle()
    postRefundSaleStatus = updatedSale?.status ?? null
  }

  await appendPosAuditLog({
    tenantId: user.tenantId!,
    action: 'refund_created',
    tableName: 'commerce_refunds',
    recordId: refund.id,
    changedBy: user.id,
    summary: 'Refund created from commerce flow',
    afterValues: {
      sale_id: saleId ?? null,
      payment_id: input.paymentId,
      amount_cents: input.amountCents,
      reason: normalizedReason,
      status: refundStatus,
      sale_status_after_refund: postRefundSaleStatus,
    },
  })

  revalidatePath('/commerce')
  return refund
}

// ─── Get Refunds for Sale ─────────────────────────────────────────

export async function getRefundsForSale(saleId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data, error } = await db
    .from('commerce_refunds')
    .select('*')
    .eq('sale_id', saleId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch refunds: ${error.message}`)
  return data ?? []
}

// ─── Internal: Update Sale Status After Refund ────────────────────

async function updateSaleStatusAfterRefund(saleId: string, tenantId: string) {
  const db: any = createServerClient()

  const { data: sale } = await db
    .from('sales')
    .select('total_cents, status')
    .eq('id', saleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!sale) return

  // Get total paid
  const { data: payments } = await db
    .from('commerce_payments')
    .select('amount_cents, status')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)

  const totalPaid = (payments ?? [])
    .filter((p: any) => ['captured', 'settled'].includes(p.status))
    .reduce((sum: number, p: any) => sum + p.amount_cents, 0)

  // Get total refunded
  const { data: refunds } = await db
    .from('commerce_refunds')
    .select('amount_cents, status')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)

  const totalRefunded = (refunds ?? [])
    .filter((r: any) => r.status === 'processed')
    .reduce((sum: number, r: any) => sum + r.amount_cents, 0)

  // Derive status from FSM (single source of truth, no hardcoded strings)
  const desiredStatus = computeSaleStatus({
    currentStatus: (sale as any).status,
    totalCents: (sale as any).total_cents,
    totalPaidCents: totalPaid,
    totalRefundedCents: totalRefunded,
  })

  if (
    desiredStatus !== (sale as any).status &&
    canTransition((sale as any).status, desiredStatus as any)
  ) {
    await db
      .from('sales')
      .update({ status: desiredStatus } as any)
      .eq('id', saleId)
      .eq('tenant_id', tenantId)
  }
}

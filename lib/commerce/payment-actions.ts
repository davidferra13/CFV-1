// Commerce Engine V1 — Payment Actions
// Record payments for sales. The DB trigger auto-creates ledger entries
// for captured/settled payments with a client_id.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod } from '@/lib/ledger/append'
import type { CommercePaymentStatus } from './constants'
import { computeSaleStatus } from './sale-fsm'

// ─── Types ────────────────────────────────────────────────────────

export type RecordPaymentInput = {
  saleId: string
  amountCents: number
  tipCents?: number
  paymentMethod: PaymentMethod
  idempotencyKey: string
  status?: CommercePaymentStatus
  processorType?: string
  processorReferenceId?: string
  stripePaymentIntentId?: string
  stripeChargeId?: string
  notes?: string
}

// ─── Record Payment ───────────────────────────────────────────────

/**
 * Record a payment against a sale.
 * The DB trigger `commerce_payment_to_ledger` auto-creates a ledger entry
 * for captured/settled payments that have a client_id.
 */
export async function recordPayment(input: RecordPaymentInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Amount must be a positive integer (cents)')
  }

  // Fetch sale to get context
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, tenant_id, client_id, event_id, total_cents, tip_cents, status')
    .eq('id', input.saleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (saleErr || !sale) throw new Error('Sale not found')

  // Determine payment status — POS counter sales are immediately captured
  const paymentStatus = input.status ?? 'captured'

  // Build transaction reference for idempotency with existing ledger
  const txnRef = input.stripePaymentIntentId
    ? `commerce_${input.stripePaymentIntentId}`
    : `commerce_${input.idempotencyKey}`

  const { data: payment, error } = await supabase
    .from('commerce_payments')
    .insert({
      tenant_id: user.tenantId!,
      sale_id: input.saleId,
      event_id: (sale as any).event_id ?? null,
      client_id: (sale as any).client_id ?? null,
      amount_cents: input.amountCents,
      tip_cents: input.tipCents ?? 0,
      payment_method: input.paymentMethod,
      status: paymentStatus,
      processor_type: input.processorType ?? 'manual',
      processor_reference_id: input.processorReferenceId ?? null,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      stripe_charge_id: input.stripeChargeId ?? null,
      idempotency_key: input.idempotencyKey,
      transaction_reference: txnRef,
      captured_at: paymentStatus === 'captured' ? new Date().toISOString() : null,
      notes: input.notes ?? null,
      created_by: user.id,
    } as any)
    .select('id, ledger_entry_id')
    .single()

  if (error) {
    // Idempotency: if duplicate key, return existing
    if (error.code === '23505' && error.message.includes('idempotency')) {
      const { data: existing } = await supabase
        .from('commerce_payments')
        .select('id, ledger_entry_id')
        .eq('idempotency_key', input.idempotencyKey)
        .single()
      if (existing) return existing
    }
    throw new Error(`Failed to record payment: ${error.message}`)
  }

  // Update sale status based on total paid
  await updateSaleStatusAfterPayment(input.saleId, user.tenantId!)

  // Update sale tip
  if (input.tipCents && input.tipCents > 0) {
    await supabase
      .from('sales')
      .update({ tip_cents: (sale as any).tip_cents + input.tipCents } as any)
      .eq('id', input.saleId)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/commerce')
  return payment
}

// ─── Get Payments for Sale ────────────────────────────────────────

export async function getPaymentsForSale(saleId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('commerce_payments')
    .select('*')
    .eq('sale_id', saleId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch payments: ${error.message}`)
  return data ?? []
}

// ─── Update Payment Status ────────────────────────────────────────

export async function updatePaymentStatus(paymentId: string, status: CommercePaymentStatus) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const updates: Record<string, any> = { status }
  if (status === 'captured') updates.captured_at = new Date().toISOString()
  if (status === 'settled') updates.settled_at = new Date().toISOString()

  const { data: payment, error } = await supabase
    .from('commerce_payments')
    .update(updates)
    .eq('id', paymentId)
    .eq('tenant_id', user.tenantId!)
    .select('sale_id')
    .single()

  if (error) throw new Error(`Failed to update payment: ${error.message}`)

  // Recalculate sale status
  if (payment && (payment as any).sale_id) {
    await updateSaleStatusAfterPayment((payment as any).sale_id, user.tenantId!)
  }

  revalidatePath('/commerce')
}

// ─── Internal: Update Sale Status After Payment ───────────────────

async function updateSaleStatusAfterPayment(saleId: string, tenantId: string) {
  const supabase: any = createServerClient()

  // Get sale totals
  const { data: sale } = await supabase
    .from('sales')
    .select('total_cents, status')
    .eq('id', saleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!sale) return

  // Get total paid
  const { data: payments } = await supabase
    .from('commerce_payments')
    .select('amount_cents, status')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)

  const totalPaid = (payments ?? [])
    .filter((p: any) => ['captured', 'settled'].includes(p.status))
    .reduce((sum: number, p: any) => sum + p.amount_cents, 0)

  // Get total refunded
  const { data: refunds } = await supabase
    .from('commerce_refunds')
    .select('amount_cents, status')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)

  const totalRefunded = (refunds ?? [])
    .filter((r: any) => r.status === 'processed')
    .reduce((sum: number, r: any) => sum + r.amount_cents, 0)

  const newStatus = computeSaleStatus({
    currentStatus: (sale as any).status,
    totalCents: (sale as any).total_cents,
    totalPaidCents: totalPaid,
    totalRefundedCents: totalRefunded,
  })

  if (newStatus !== (sale as any).status) {
    await supabase
      .from('sales')
      .update({ status: newStatus } as any)
      .eq('id', saleId)
      .eq('tenant_id', tenantId)
  }
}

// Commerce Engine V1 — Payment Schedule Actions
// Installment plans for events and large orders.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ScheduleStatus } from './constants'

// ─── Types ────────────────────────────────────────────────────────

export type CreateScheduleInput = {
  saleId?: string
  eventId?: string
  installments: Array<{
    dueDate: string // YYYY-MM-DD
    amountCents: number
  }>
}

// ─── Create Schedule ──────────────────────────────────────────────

/**
 * Create a payment schedule (installment plan) for a sale or event.
 * Each installment is a separate row with a due date and amount.
 */
export async function createPaymentSchedule(input: CreateScheduleInput) {
  const user = await requireChef()
  const supabase = createServerClient()

  if (!input.saleId && !input.eventId) {
    throw new Error('Either saleId or eventId is required')
  }
  if (input.installments.length === 0) {
    throw new Error('At least one installment is required')
  }

  // Validate all amounts are positive integers
  for (const inst of input.installments) {
    if (!Number.isInteger(inst.amountCents) || inst.amountCents <= 0) {
      throw new Error('All installment amounts must be positive integers (cents)')
    }
  }

  const rows = input.installments.map((inst, i) => ({
    tenant_id: user.tenantId!,
    sale_id: input.saleId ?? null,
    event_id: input.eventId ?? null,
    installment_number: i + 1,
    due_date: inst.dueDate,
    amount_cents: inst.amountCents,
    status: 'pending' as const,
  }))

  const { data, error } = await supabase
    .from('commerce_payment_schedules')
    .insert(rows as any)
    .select('id, installment_number, due_date, amount_cents')

  if (error) throw new Error(`Failed to create schedule: ${error.message}`)

  revalidatePath('/commerce')
  return data ?? []
}

// ─── Mark Installment Paid ────────────────────────────────────────

export async function markInstallmentPaid(installmentId: string, paymentId?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('commerce_payment_schedules')
    .update({
      status: 'paid',
      payment_id: paymentId ?? null,
    } as any)
    .eq('id', installmentId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to mark installment paid: ${error.message}`)

  revalidatePath('/commerce')
}

// ─── Waive Installment ────────────────────────────────────────────

export async function waiveInstallment(installmentId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('commerce_payment_schedules')
    .update({ status: 'waived' } as any)
    .eq('id', installmentId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to waive installment: ${error.message}`)

  revalidatePath('/commerce')
}

// ─── Get Schedule ─────────────────────────────────────────────────

export async function getPaymentSchedule(filters: { saleId?: string; eventId?: string }) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('commerce_payment_schedules')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('installment_number', { ascending: true })

  if (filters.saleId) query = query.eq('sale_id', filters.saleId)
  if (filters.eventId) query = query.eq('event_id', filters.eventId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch schedule: ${error.message}`)
  return data ?? []
}

// ─── Get Overdue Installments ─────────────────────────────────────

export async function getOverdueInstallments() {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('commerce_payment_schedules')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'pending')
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch overdue installments: ${error.message}`)
  return data ?? []
}

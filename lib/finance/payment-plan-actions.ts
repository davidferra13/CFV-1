'use server'

// Payment Plan Actions - CRUD for payment_plan_installments.
// Allows chefs to define installment schedules for large events.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export interface PaymentPlanInstallment {
  id: string
  eventId: string
  installmentNum: number
  label: string
  amountCents: number
  dueDate: string
  paidAt: string | null
  paymentMethod: string | null
  notes: string | null
}

export async function getPaymentPlan(eventId: string): Promise<PaymentPlanInstallment[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('payment_plan_installments' as any)
    .select(
      'id, event_id, installment_num, label, amount_cents, due_date, paid_at, payment_method, notes'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('installment_num')

  return ((data ?? []) as any[]).map(
    (r: any): PaymentPlanInstallment => ({
      id: r.id,
      eventId: r.event_id,
      installmentNum: r.installment_num,
      label: r.label,
      amountCents: r.amount_cents,
      dueDate: r.due_date,
      paidAt: r.paid_at,
      paymentMethod: r.payment_method,
      notes: r.notes,
    })
  )
}

export async function addInstallment(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const eventId = formData.get('eventId') as string
  const label = formData.get('label') as string
  const amountDollars = parseFloat(formData.get('amountDollars') as string)
  const dueDate = formData.get('dueDate') as string
  const notes = (formData.get('notes') as string) || null

  if (!eventId || !label || isNaN(amountDollars) || !dueDate) {
    return {
      success: false,
      error: 'Invalid input: event ID, label, amount, and due date are required',
    }
  }

  // Get next installment number
  const { count } = await db
    .from('payment_plan_installments' as any)
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  const installmentNum = (count ?? 0) + 1
  const amountCents = Math.round(amountDollars * 100)

  const { error } = await db.from('payment_plan_installments' as any).insert({
    event_id: eventId,
    tenant_id: user.tenantId!,
    installment_num: installmentNum,
    label,
    amount_cents: amountCents,
    due_date: dueDate,
    notes,
  })

  if (error) {
    throw new Error('Failed to add installment')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function markInstallmentPaid(
  installmentId: string,
  eventId: string,
  paymentMethod?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('payment_plan_installments' as any)
    .update({
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod ?? null,
    })
    .eq('id', installmentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error('Failed to mark installment as paid')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function deleteInstallment(
  installmentId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('payment_plan_installments' as any)
    .delete()
    .eq('id', installmentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error('Failed to delete installment')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

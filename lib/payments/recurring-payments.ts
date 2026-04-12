import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const RecurringPaymentSchema = z.object({
  client_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  description: z.string().max(500).optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']).default('monthly'),
  next_send_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  late_fee_cents: z.number().int().min(0).default(0),
  late_fee_days: z.number().int().min(0).default(0),
})

export type RecurringPaymentPlan = {
  id: string
  chef_id: string
  client_id: string
  amount_cents: number
  description: string | null
  frequency: string
  is_active: boolean
  next_send_date: string | null
  last_sent_at: string | null
}

function addFrequencyDays(date: string, frequency: string): string {
  const [_y, _m, _d] = date.split('-').map(Number)
  let result: Date
  if (frequency === 'weekly') {
    result = new Date(_y, _m - 1, _d + 7)
  } else if (frequency === 'biweekly') {
    result = new Date(_y, _m - 1, _d + 14)
  } else {
    result = new Date(_y, _m, _d) // next month, same day
  }
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`
}

export async function listRecurringPaymentPlans(): Promise<RecurringPaymentPlan[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('recurring_invoices')
    .select(
      'id, chef_id, client_id, amount_cents, description, frequency, is_active, next_send_date, last_sent_at'
    )
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load recurring payment plans: ${error.message}`)
  }

  return (data || []) as RecurringPaymentPlan[]
}

export async function createRecurringPaymentPlan(input: z.infer<typeof RecurringPaymentSchema>) {
  const user = await requireChef()
  const validated = RecurringPaymentSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('recurring_invoices')
    .insert({
      chef_id: user.tenantId!,
      client_id: validated.client_id,
      amount_cents: validated.amount_cents,
      description: validated.description || null,
      frequency: validated.frequency,
      next_send_date: validated.next_send_date,
      late_fee_cents: validated.late_fee_cents,
      late_fee_days: validated.late_fee_days,
      is_active: true,
    })
    .select(
      'id, chef_id, client_id, amount_cents, description, frequency, is_active, next_send_date, last_sent_at'
    )
    .single()

  if (error || !data) {
    throw new Error(`Failed to create recurring payment plan: ${error?.message || 'Unknown error'}`)
  }

  revalidatePath('/finance/recurring')
  return data as RecurringPaymentPlan
}

export async function setRecurringPaymentPlanActive(planId: string, active: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('recurring_invoices')
    .update({
      is_active: active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to update recurring payment plan state: ${error.message}`)
  }

  revalidatePath('/finance/recurring')
  return { success: true }
}

export async function listDueRecurringPayments(daysAhead = 7) {
  const user = await requireChef()
  const db: any = createServerClient()
  const _now = new Date()
  const fromDate = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  const _toD = new Date(
    _now.getFullYear(),
    _now.getMonth(),
    _now.getDate() + Math.max(daysAhead, 0)
  )
  const toDate = `${_toD.getFullYear()}-${String(_toD.getMonth() + 1).padStart(2, '0')}-${String(_toD.getDate()).padStart(2, '0')}`

  const { data, error } = await db
    .from('recurring_invoices')
    .select(
      'id, chef_id, client_id, amount_cents, description, frequency, next_send_date, is_active, clients(full_name, email)'
    )
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)
    .gte('next_send_date', fromDate)
    .lte('next_send_date', toDate)
    .order('next_send_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to load due recurring payments: ${error.message}`)
  }

  return (data || []) as Array<any>
}

export async function markRecurringPaymentSent(planId: string, sentDate: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: plan, error: fetchError } = await db
    .from('recurring_invoices')
    .select('id, frequency, next_send_date')
    .eq('id', planId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !plan) {
    throw new Error('Recurring payment plan not found')
  }

  const nextDate = addFrequencyDays(plan.next_send_date || sentDate, plan.frequency)

  const { error } = await db
    .from('recurring_invoices')
    .update({
      last_sent_at: `${sentDate}T00:00:00`,
      next_send_date: nextDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to mark recurring payment as sent: ${error.message}`)
  }

  revalidatePath('/finance/recurring')
  return { success: true, nextDate }
}

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type RecurringInvoice = {
  id: string
  clientId: string
  clientName?: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  amountCents: number
  description: string | null
  nextSendDate: string
  lastSentAt: string | null
  isActive: boolean
  lateFeeCents: number
  lateFeeDays: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreateSchema = z.object({
  clientId: z.string().uuid(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']),
  amountCents: z.number().int().min(0),
  description: z.string().optional(),
  nextSendDate: z.string().min(1),
  lateFeeCents: z.number().int().min(0).default(0),
  lateFeeDays: z.number().int().min(0).default(0),
})

const UpdateSchema = z.object({
  id: z.string().uuid(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  amountCents: z.number().int().min(0).optional(),
  description: z.string().optional(),
  nextSendDate: z.string().optional(),
  lateFeeCents: z.number().int().min(0).optional(),
  lateFeeDays: z.number().int().min(0).optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────

function mapRow(row: any): RecurringInvoice {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.clients?.full_name || undefined,
    frequency: row.frequency,
    amountCents: row.amount_cents,
    description: row.description,
    nextSendDate: row.next_send_date,
    lastSentAt: row.last_sent_at,
    isActive: row.is_active,
    lateFeeCents: row.late_fee_cents || 0,
    lateFeeDays: row.late_fee_days || 0,
  }
}

function nextDate(current: string, frequency: string): string {
  const [y, m, day] = current.split('-').map(Number)
  let result: Date
  switch (frequency) {
    case 'weekly':
      result = new Date(y, m - 1, day + 7)
      break
    case 'biweekly':
      result = new Date(y, m - 1, day + 14)
      break
    case 'monthly':
      result = new Date(y, m, day)
      break
    case 'quarterly':
      result = new Date(y, m + 2, day)
      break
    default:
      result = new Date(y, m - 1, day)
  }
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`
}

// ─── Actions ─────────────────────────────────────────────────────

export async function createRecurringInvoice(
  input: z.infer<typeof CreateSchema>
): Promise<RecurringInvoice> {
  const user = await requireChef()
  const parsed = CreateSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('recurring_invoices')
    .insert({
      chef_id: user.tenantId!,
      client_id: parsed.clientId,
      frequency: parsed.frequency,
      amount_cents: parsed.amountCents,
      description: parsed.description || null,
      next_send_date: parsed.nextSendDate,
      is_active: true,
      late_fee_cents: parsed.lateFeeCents,
      late_fee_days: parsed.lateFeeDays,
    })
    .select('*, clients(full_name)')
    .single()

  if (error) throw new Error(`Failed to create recurring invoice: ${error.message}`)

  revalidatePath('/finance/recurring')
  return mapRow(data)
}

export async function updateRecurringInvoice(
  input: z.infer<typeof UpdateSchema>
): Promise<RecurringInvoice> {
  const user = await requireChef()
  const parsed = UpdateSchema.parse(input)
  const db: any = createServerClient()

  const updates: Record<string, any> = {}
  if (parsed.frequency !== undefined) updates.frequency = parsed.frequency
  if (parsed.amountCents !== undefined) updates.amount_cents = parsed.amountCents
  if (parsed.description !== undefined) updates.description = parsed.description
  if (parsed.nextSendDate !== undefined) updates.next_send_date = parsed.nextSendDate
  if (parsed.lateFeeCents !== undefined) updates.late_fee_cents = parsed.lateFeeCents
  if (parsed.lateFeeDays !== undefined) updates.late_fee_days = parsed.lateFeeDays

  const { data, error } = await db
    .from('recurring_invoices')
    .update(updates)
    .eq('id', parsed.id)
    .eq('chef_id', user.tenantId!)
    .select('*, clients(full_name)')
    .single()

  if (error) throw new Error(`Failed to update recurring invoice: ${error.message}`)

  revalidatePath('/finance/recurring')
  return mapRow(data)
}

export async function pauseRecurringInvoice(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('recurring_invoices')
    .update({ is_active: false })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to pause invoice: ${error.message}`)
  revalidatePath('/finance/recurring')
}

export async function getRecurringInvoices(activeOnly = true): Promise<RecurringInvoice[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('recurring_invoices')
    .select('*, clients(full_name)')
    .eq('chef_id', user.tenantId!)
    .order('next_send_date', { ascending: true })

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch recurring invoices: ${error.message}`)

  return (data || []).map(mapRow)
}

export async function processRecurringInvoices(): Promise<{
  processed: number
  errors: string[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const _t = new Date()
  const today = `${_t.getFullYear()}-${String(_t.getMonth() + 1).padStart(2, '0')}-${String(_t.getDate()).padStart(2, '0')}`

  // Get all active recurring invoices due today or earlier
  const { data: due } = await db
    .from('recurring_invoices')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)
    .lte('next_send_date', today)

  let processed = 0
  const errors: string[] = []

  for (const invoice of due || []) {
    try {
      // Advance the next_send_date
      const newNextDate = nextDate(invoice.next_send_date, invoice.frequency)

      await db
        .from('recurring_invoices')
        .update({
          next_send_date: newNextDate,
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)
        .eq('chef_id', user.tenantId!)

      processed++
    } catch (e: any) {
      errors.push(`Invoice ${invoice.id}: ${e.message}`)
    }
  }

  revalidatePath('/finance/recurring')
  return { processed, errors }
}

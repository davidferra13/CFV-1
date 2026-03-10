'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import {
  computeNextInvoiceDate,
  getRecurringPeriod,
  estimateMonthlyRevenue,
  type RecurringFrequency,
} from '@/lib/recurring/scheduler'
import { generateInvoiceNumber } from '@/lib/events/invoice-actions'

// ─── Types ───────────────────────────────────────────────────────

export type RecurringInvoice = {
  id: string
  clientId: string
  clientName?: string
  name: string | null
  frequency: RecurringFrequency
  amountCents: number
  description: string | null
  nextSendDate: string
  lastSentAt: string | null
  isActive: boolean
  status: 'active' | 'paused' | 'cancelled'
  lateFeeCents: number
  lateFeeDays: number
  dayOfWeek: number | null
  dayOfMonth: number | null
  startDate: string | null
  endDate: string | null
  isAutopay: boolean
  stripePaymentMethodId: string | null
  createdAt: string
}

export type RecurringInvoiceHistoryEntry = {
  id: string
  scheduleId: string
  clientName?: string
  invoiceNumber: string
  amountCents: number
  periodStart: string
  periodEnd: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  paidAt: string | null
  stripePaymentIntentId: string | null
  createdAt: string
}

export type RecurringRevenueSummary = {
  activeSchedules: number
  totalSchedules: number
  monthlyRecurringRevenueCents: number
  overdueCount: number
  nextDueInvoices: Array<{
    id: string
    name: string | null
    clientName: string
    amountCents: number
    nextSendDate: string
  }>
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreateSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().max(200).optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']),
  amountCents: z.number().int().min(1),
  description: z.string().max(1000).optional(),
  nextSendDate: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isAutopay: z.boolean().default(false),
  stripePaymentMethodId: z.string().nullable().optional(),
  lateFeeCents: z.number().int().min(0).default(0),
  lateFeeDays: z.number().int().min(0).default(30),
})

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(200).optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  amountCents: z.number().int().min(1).optional(),
  description: z.string().max(1000).optional(),
  nextSendDate: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  endDate: z.string().nullable().optional(),
  isAutopay: z.boolean().optional(),
  stripePaymentMethodId: z.string().nullable().optional(),
  lateFeeCents: z.number().int().min(0).optional(),
  lateFeeDays: z.number().int().min(0).optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────

function mapRow(row: any): RecurringInvoice {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.clients?.full_name || undefined,
    name: row.name || null,
    frequency: row.frequency,
    amountCents: row.amount_cents,
    description: row.description,
    nextSendDate: row.next_send_date,
    lastSentAt: row.last_sent_at,
    isActive: row.is_active,
    status: row.status || (row.is_active ? 'active' : 'paused'),
    lateFeeCents: row.late_fee_cents || 0,
    lateFeeDays: row.late_fee_days || 0,
    dayOfWeek: row.day_of_week ?? null,
    dayOfMonth: row.day_of_month ?? null,
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    isAutopay: row.is_autopay ?? false,
    stripePaymentMethodId: row.stripe_payment_method_id || null,
    createdAt: row.created_at,
  }
}

function mapHistoryRow(row: any): RecurringInvoiceHistoryEntry {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    clientName: row.clients?.full_name || undefined,
    invoiceNumber: row.invoice_number,
    amountCents: row.amount_cents,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    paidAt: row.paid_at,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    createdAt: row.created_at,
  }
}

function revalidateRecurringPaths() {
  revalidatePath('/finance/recurring')
  revalidatePath('/finance')
  revalidatePath('/dashboard')
}

// ─── CRUD Actions ────────────────────────────────────────────────

export async function createRecurringSchedule(
  input: z.infer<typeof CreateSchema>
): Promise<RecurringInvoice> {
  const user = await requireChef()
  const parsed = CreateSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('recurring_invoices')
    .insert({
      chef_id: user.tenantId!,
      client_id: parsed.clientId,
      name: parsed.name || null,
      frequency: parsed.frequency,
      amount_cents: parsed.amountCents,
      description: parsed.description || null,
      next_send_date: parsed.nextSendDate,
      day_of_week: parsed.dayOfWeek ?? null,
      day_of_month: parsed.dayOfMonth ?? null,
      start_date: parsed.startDate || null,
      end_date: parsed.endDate || null,
      is_active: true,
      status: 'active',
      is_autopay: parsed.isAutopay,
      stripe_payment_method_id: parsed.stripePaymentMethodId || null,
      late_fee_cents: parsed.lateFeeCents,
      late_fee_days: parsed.lateFeeDays,
    })
    .select('*, clients(full_name)')
    .single()

  if (error) throw new Error(`Failed to create recurring schedule: ${error.message}`)

  // Activity log (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'recurring_invoice_created' as any,
      domain: 'financial' as any,
      entityType: 'recurring_invoice',
      entityId: data.id,
      summary: `Created recurring invoice "${parsed.name || 'Unnamed'}" for $${(parsed.amountCents / 100).toFixed(2)} ${parsed.frequency}`,
      context: { amountCents: parsed.amountCents, frequency: parsed.frequency },
      clientId: parsed.clientId,
    })
  } catch (err) {
    console.error('[non-blocking] Activity log failed', err)
  }

  revalidateRecurringPaths()
  return mapRow(data)
}

// Backward-compatible alias
export const createRecurringInvoice = createRecurringSchedule

export async function updateRecurringSchedule(
  input: z.infer<typeof UpdateSchema>
): Promise<RecurringInvoice> {
  const user = await requireChef()
  const parsed = UpdateSchema.parse(input)
  const supabase: any = createServerClient()

  const updates: Record<string, any> = {}
  if (parsed.name !== undefined) updates.name = parsed.name
  if (parsed.frequency !== undefined) updates.frequency = parsed.frequency
  if (parsed.amountCents !== undefined) updates.amount_cents = parsed.amountCents
  if (parsed.description !== undefined) updates.description = parsed.description
  if (parsed.nextSendDate !== undefined) updates.next_send_date = parsed.nextSendDate
  if (parsed.dayOfWeek !== undefined) updates.day_of_week = parsed.dayOfWeek
  if (parsed.dayOfMonth !== undefined) updates.day_of_month = parsed.dayOfMonth
  if (parsed.endDate !== undefined) updates.end_date = parsed.endDate
  if (parsed.isAutopay !== undefined) updates.is_autopay = parsed.isAutopay
  if (parsed.stripePaymentMethodId !== undefined)
    updates.stripe_payment_method_id = parsed.stripePaymentMethodId
  if (parsed.lateFeeCents !== undefined) updates.late_fee_cents = parsed.lateFeeCents
  if (parsed.lateFeeDays !== undefined) updates.late_fee_days = parsed.lateFeeDays

  const { data, error } = await supabase
    .from('recurring_invoices')
    .update(updates)
    .eq('id', parsed.id)
    .eq('chef_id', user.tenantId!)
    .select('*, clients(full_name)')
    .single()

  if (error) throw new Error(`Failed to update recurring schedule: ${error.message}`)

  revalidateRecurringPaths()
  return mapRow(data)
}

// Backward-compatible alias
export const updateRecurringInvoice = updateRecurringSchedule

export async function pauseRecurringSchedule(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('recurring_invoices')
    .update({ is_active: false, status: 'paused' })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to pause schedule: ${error.message}`)
  revalidateRecurringPaths()
}

// Backward-compatible alias
export const pauseRecurringInvoice = pauseRecurringSchedule

export async function resumeRecurringSchedule(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch current schedule to compute next date if it's in the past
  const { data: schedule, error: fetchError } = await supabase
    .from('recurring_invoices')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !schedule) throw new Error('Schedule not found')
  if (schedule.status === 'cancelled') throw new Error('Cannot resume a cancelled schedule')

  const today = new Date()
  const nextSendDate = new Date(schedule.next_send_date)
  let newNextDate = schedule.next_send_date

  // If the next send date is in the past, advance it to the future
  if (nextSendDate < today) {
    const computed = computeNextInvoiceDate(
      schedule.frequency as RecurringFrequency,
      schedule.day_of_week,
      schedule.day_of_month,
      today
    )
    newNextDate = format(computed, 'yyyy-MM-dd')
  }

  const { error } = await supabase
    .from('recurring_invoices')
    .update({
      is_active: true,
      status: 'active',
      next_send_date: newNextDate,
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to resume schedule: ${error.message}`)
  revalidateRecurringPaths()
}

export async function cancelRecurringSchedule(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('recurring_invoices')
    .update({ is_active: false, status: 'cancelled' })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to cancel schedule: ${error.message}`)
  revalidateRecurringPaths()
}

// ─── Query Actions ───────────────────────────────────────────────

export async function getRecurringSchedules(
  filter: 'all' | 'active' | 'paused' | 'cancelled' = 'all'
): Promise<RecurringInvoice[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('recurring_invoices')
    .select('*, clients(full_name)')
    .eq('chef_id', user.tenantId!)
    .order('next_send_date', { ascending: true })

  if (filter === 'active') {
    query = query.eq('is_active', true)
  } else if (filter === 'paused') {
    query = query.eq('status', 'paused')
  } else if (filter === 'cancelled') {
    query = query.eq('status', 'cancelled')
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch recurring schedules: ${error.message}`)

  return (data || []).map(mapRow)
}

// Backward-compatible alias
export async function getRecurringInvoices(activeOnly = true): Promise<RecurringInvoice[]> {
  return getRecurringSchedules(activeOnly ? 'active' : 'all')
}

export async function getRecurringScheduleHistory(
  scheduleId: string
): Promise<RecurringInvoiceHistoryEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('recurring_invoice_history')
    .select('*, clients(full_name)')
    .eq('schedule_id', scheduleId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch invoice history: ${error.message}`)

  return (data || []).map(mapHistoryRow)
}

export async function getRecurringRevenueSummary(): Promise<RecurringRevenueSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch all schedules
  const { data: schedules, error: schedError } = await supabase
    .from('recurring_invoices')
    .select('*, clients(full_name)')
    .eq('chef_id', user.tenantId!)
    .order('next_send_date', { ascending: true })

  if (schedError) throw new Error(`Failed to fetch schedules: ${schedError.message}`)

  const all = (schedules || []) as any[]
  const active = all.filter((s: any) => s.is_active && s.status !== 'cancelled')

  // MRR from active schedules
  const monthlyRecurringRevenueCents = active.reduce(
    (sum: number, s: any) => sum + estimateMonthlyRevenue(s.amount_cents, s.frequency),
    0
  )

  // Overdue history count
  const { count: overdueCount } = await supabase
    .from('recurring_invoice_history')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', user.tenantId!)
    .eq('status', 'overdue')

  // Next 7 days of invoices
  const today = new Date()
  const sevenDaysOut = new Date(today)
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  const todayStr = format(today, 'yyyy-MM-dd')
  const sevenDaysStr = format(sevenDaysOut, 'yyyy-MM-dd')

  const nextDueInvoices = active
    .filter(
      (s: any) =>
        s.next_send_date && s.next_send_date >= todayStr && s.next_send_date <= sevenDaysStr
    )
    .map((s: any) => ({
      id: s.id,
      name: s.name || null,
      clientName: s.clients?.full_name || 'Client',
      amountCents: s.amount_cents,
      nextSendDate: s.next_send_date,
    }))

  return {
    activeSchedules: active.length,
    totalSchedules: all.length,
    monthlyRecurringRevenueCents,
    overdueCount: overdueCount ?? 0,
    nextDueInvoices,
  }
}

// ─── Invoice Generation ──────────────────────────────────────────

/**
 * Generate all due invoices for the authenticated chef.
 * Finds active schedules where next_invoice_date <= today.
 * For each:
 *   1. Creates a recurring_invoice_history row with a new invoice number
 *   2. If autopay is enabled, attempts to charge via Stripe
 *   3. If not autopay, marks as "sent" (email notification is a future feature)
 *   4. Advances next_send_date on the schedule
 *   5. If end_date is reached, deactivates the schedule
 */
export async function generateDueInvoices(): Promise<{
  generated: number
  autopaySuccesses: number
  autopayFailures: number
  errors: string[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Fetch all active schedules due today or earlier
  const { data: due, error: dueError } = await supabase
    .from('recurring_invoices')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)
    .lte('next_send_date', todayStr)

  if (dueError) throw new Error(`Failed to fetch due invoices: ${dueError.message}`)

  let generated = 0
  let autopaySuccesses = 0
  let autopayFailures = 0
  const errors: string[] = []

  for (const schedule of due || []) {
    try {
      // Check if end_date has passed
      if (schedule.end_date && schedule.end_date < todayStr) {
        await supabase
          .from('recurring_invoices')
          .update({ is_active: false, status: 'cancelled' })
          .eq('id', schedule.id)
          .eq('chef_id', user.tenantId!)
        continue
      }

      // Compute billing period
      const invoiceDate = new Date(schedule.next_send_date)
      const { periodStart, periodEnd } = getRecurringPeriod(
        schedule.frequency as RecurringFrequency,
        invoiceDate
      )

      // Generate invoice number (uses the same sequence as event invoices)
      const invoiceNumber = await generateInvoiceNumber(user.tenantId!)

      // Determine initial status
      let status: 'sent' | 'paid' = 'sent'
      let paidAt: string | null = null
      let stripePaymentIntentId: string | null = null
      let ledgerEntryId: string | null = null

      // If autopay is enabled and payment method exists, attempt charge
      if (schedule.is_autopay && schedule.stripe_payment_method_id) {
        try {
          const result = await processAutopaymentInternal({
            chefId: user.tenantId!,
            clientId: schedule.client_id,
            amountCents: schedule.amount_cents,
            stripePaymentMethodId: schedule.stripe_payment_method_id,
            description: schedule.name || schedule.description || 'Recurring invoice payment',
            invoiceNumber,
            userId: user.id,
          })
          status = 'paid'
          paidAt = new Date().toISOString()
          stripePaymentIntentId = result.paymentIntentId
          ledgerEntryId = result.ledgerEntryId
          autopaySuccesses++
        } catch (err) {
          // Autopay failed, mark as sent (overdue will be handled later)
          console.error('[recurring] Autopay failed for schedule', schedule.id, err)
          autopayFailures++
          // Still create the history entry as 'sent', chef will be notified
        }
      }

      // Create history entry
      const { error: histError } = await supabase.from('recurring_invoice_history').insert({
        schedule_id: schedule.id,
        chef_id: user.tenantId!,
        client_id: schedule.client_id,
        invoice_number: invoiceNumber,
        amount_cents: schedule.amount_cents,
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        status,
        paid_at: paidAt,
        stripe_payment_intent_id: stripePaymentIntentId,
        ledger_entry_id: ledgerEntryId,
      })

      if (histError) {
        errors.push(`Schedule ${schedule.id}: Failed to create history - ${histError.message}`)
        continue
      }

      // Advance next_send_date
      const nextDate = computeNextInvoiceDate(
        schedule.frequency as RecurringFrequency,
        schedule.day_of_week,
        schedule.day_of_month,
        invoiceDate
      )
      const nextDateStr = format(nextDate, 'yyyy-MM-dd')

      // Check if next date would exceed end_date
      const shouldDeactivate = schedule.end_date && nextDateStr > schedule.end_date

      await supabase
        .from('recurring_invoices')
        .update({
          next_send_date: nextDateStr,
          last_sent_at: new Date().toISOString(),
          ...(shouldDeactivate ? { is_active: false, status: 'cancelled' } : {}),
        })
        .eq('id', schedule.id)
        .eq('chef_id', user.tenantId!)

      generated++
    } catch (e: any) {
      errors.push(`Schedule ${schedule.id}: ${e.message}`)
    }
  }

  revalidateRecurringPaths()
  return { generated, autopaySuccesses, autopayFailures, errors }
}

// ─── Autopay Processing ──────────────────────────────────────────

/**
 * Process an autopayment for a recurring invoice history entry.
 * Charges the saved Stripe payment method and creates a ledger entry.
 */
export async function processAutopayment(historyId: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the history entry
  const { data: history, error: histError } = await supabase
    .from('recurring_invoice_history')
    .select('*, recurring_invoices(stripe_payment_method_id, name, description)')
    .eq('id', historyId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (histError || !history) {
    return { success: false, error: 'Invoice history entry not found' }
  }

  if (history.status === 'paid') {
    return { success: false, error: 'Invoice is already paid' }
  }

  if (history.status === 'cancelled') {
    return { success: false, error: 'Invoice has been cancelled' }
  }

  const paymentMethodId = history.recurring_invoices?.stripe_payment_method_id
  if (!paymentMethodId) {
    return { success: false, error: 'No payment method on file for this schedule' }
  }

  try {
    const result = await processAutopaymentInternal({
      chefId: user.tenantId!,
      clientId: history.client_id,
      amountCents: history.amount_cents,
      stripePaymentMethodId: paymentMethodId,
      description:
        history.recurring_invoices?.name ||
        history.recurring_invoices?.description ||
        'Recurring invoice payment',
      invoiceNumber: history.invoice_number,
      userId: user.id,
    })

    // Update history entry
    await supabase
      .from('recurring_invoice_history')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: result.paymentIntentId,
        ledger_entry_id: result.ledgerEntryId,
      })
      .eq('id', historyId)
      .eq('chef_id', user.tenantId!)

    revalidateRecurringPaths()
    return { success: true }
  } catch (err: any) {
    // Mark as overdue on failure
    await supabase
      .from('recurring_invoice_history')
      .update({ status: 'overdue' })
      .eq('id', historyId)
      .eq('chef_id', user.tenantId!)

    // Notify chef (non-blocking)
    try {
      const { createNotification } = await import('@/lib/notifications/actions')
      await createNotification({
        title: 'Recurring payment failed',
        message: `Autopayment for ${history.invoice_number} ($${(history.amount_cents / 100).toFixed(2)}) failed. The client's card may need to be updated.`,
        type: 'warning',
      })
    } catch (notifErr) {
      console.error('[non-blocking] Notification failed', notifErr)
    }

    revalidateRecurringPaths()
    return { success: false, error: err.message || 'Payment processing failed' }
  }
}

/**
 * Internal autopayment processing. Not a server action.
 * Charges Stripe and creates a ledger entry.
 */
async function processAutopaymentInternal(params: {
  chefId: string
  clientId: string
  amountCents: number
  stripePaymentMethodId: string
  description: string
  invoiceNumber: string
  userId: string
}): Promise<{ paymentIntentId: string; ledgerEntryId: string }> {
  // Dynamic import to avoid loading Stripe in contexts that don't need it
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  const stripe = new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia',
  })

  // Create and confirm a PaymentIntent with the saved payment method
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: 'usd',
    payment_method: params.stripePaymentMethodId,
    confirm: true,
    off_session: true,
    description: `${params.description} (${params.invoiceNumber})`,
    metadata: {
      recurring_invoice_number: params.invoiceNumber,
      tenant_id: params.chefId,
      client_id: params.clientId,
      type: 'recurring_invoice',
    },
  })

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Payment not successful: ${paymentIntent.status}`)
  }

  // Create ledger entry
  const { appendLedgerEntryForChef } = await import('@/lib/ledger/append')
  const ledgerResult = await appendLedgerEntryForChef({
    client_id: params.clientId,
    entry_type: 'payment',
    amount_cents: params.amountCents,
    payment_method: 'card',
    description: `Recurring: ${params.description} (${params.invoiceNumber})`,
    transaction_reference: `recurring_${paymentIntent.id}`,
  })

  return {
    paymentIntentId: paymentIntent.id,
    ledgerEntryId: ledgerResult.entry?.id || '',
  }
}

// ─── Legacy compat ───────────────────────────────────────────────

/**
 * @deprecated Use generateDueInvoices() instead
 */
export async function processRecurringInvoices(): Promise<{
  processed: number
  errors: string[]
}> {
  const result = await generateDueInvoices()
  return {
    processed: result.generated,
    errors: result.errors,
  }
}

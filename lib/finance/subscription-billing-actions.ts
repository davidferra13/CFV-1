'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import {
  computeNextInvoiceDate,
  getRecurringPeriod,
  estimateMonthlyRevenue,
  type RecurringFrequency,
} from '@/lib/recurring/scheduler'
import { generateInvoiceNumber } from '@/lib/events/invoice-actions'
import type Stripe from 'stripe'

// ─── Types ───────────────────────────────────────────────────────

export type SubscriptionBillingResult = {
  processed: number
  paid: number
  sent: number
  failed: number
  errors: Array<{ invoiceId: string; error: string }>
}

export type SubscriptionBillingSummary = {
  activeSubscriptions: number
  monthlyRecurringRevenueCents: number
  nextBillingDate: string | null
  overdueCount: number
}

// ─── Stripe Helper ───────────────────────────────────────────────

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

// ─── Process Subscription Billing ────────────────────────────────

/**
 * Batch process all recurring invoices that are due today or earlier.
 * For autopay clients: attempts Stripe off-session charge.
 * For non-autopay clients: creates invoice history and sends email.
 *
 * This is designed to be called by a cron job or manual trigger.
 */
export async function processSubscriptionBilling(): Promise<SubscriptionBillingResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = format(new Date(), 'yyyy-MM-dd')

  // Find all active recurring invoices that are due
  const { data: dueInvoices, error: fetchErr } = await supabase
    .from('recurring_invoices')
    .select('*, clients(id, full_name, email)')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)
    .eq('status', 'active')
    .lte('next_send_date', today)

  if (fetchErr || !dueInvoices || dueInvoices.length === 0) {
    return { processed: 0, paid: 0, sent: 0, failed: 0, errors: [] }
  }

  const result: SubscriptionBillingResult = {
    processed: dueInvoices.length,
    paid: 0,
    sent: 0,
    failed: 0,
    errors: [],
  }

  for (const invoice of dueInvoices) {
    try {
      // Compute billing period
      const invoiceDate = new Date(invoice.next_send_date)
      const { periodStart, periodEnd } = getRecurringPeriod(
        invoice.frequency as RecurringFrequency,
        invoiceDate
      )

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(user.tenantId!)

      // Create history record
      const { data: historyEntry, error: histErr } = await supabase
        .from('recurring_invoice_history')
        .insert({
          schedule_id: invoice.id,
          chef_id: user.tenantId!,
          client_id: invoice.client_id,
          invoice_number: invoiceNumber,
          amount_cents: invoice.amount_cents,
          period_start: format(periodStart, 'yyyy-MM-dd'),
          period_end: format(periodEnd, 'yyyy-MM-dd'),
          status: 'draft',
        })
        .select()
        .single()

      if (histErr || !historyEntry) {
        result.failed++
        result.errors.push({
          invoiceId: invoice.id,
          error: `Failed to create history: ${histErr?.message || 'Unknown error'}`,
        })
        continue
      }

      if (invoice.is_autopay && invoice.stripe_payment_method_id) {
        // Attempt off-session Stripe charge
        await processAutopayInvoice(supabase, user, invoice, historyEntry, result)
      } else {
        // Mark as sent, send email
        await processManualInvoice(supabase, user, invoice, historyEntry, result)
      }

      // Advance next_send_date regardless of payment outcome
      await advanceNextSendDate(invoice.id)
    } catch (err: any) {
      result.failed++
      result.errors.push({
        invoiceId: invoice.id,
        error: err?.message || 'Unexpected error',
      })
    }
  }

  revalidatePath('/finance/recurring')
  revalidatePath('/finance')
  revalidatePath('/dashboard')
  revalidatePath('/meal-prep')

  return result
}

async function processAutopayInvoice(
  supabase: any,
  user: any,
  invoice: any,
  historyEntry: any,
  result: SubscriptionBillingResult
) {
  const stripe = getStripe()

  try {
    // Create off-session PaymentIntent
    // TODO: If Stripe is not configured, skip the charge and mark as sent instead.
    // The workflow, ledger entry, and notification are real even without Stripe.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: invoice.amount_cents,
      currency: 'usd',
      payment_method: invoice.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: {
        recurring_invoice_id: invoice.id,
        history_id: historyEntry.id,
        tenant_id: user.tenantId,
        client_id: invoice.client_id,
        payment_type: 'recurring_subscription',
      },
    })

    if (paymentIntent.status === 'succeeded') {
      // Update history to paid
      await supabase
        .from('recurring_invoice_history')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq('id', historyEntry.id)

      // Create ledger entry
      try {
        const { appendLedgerEntryForChef } = await import('@/lib/ledger/append')
        await appendLedgerEntryForChef({
          client_id: invoice.client_id,
          entry_type: 'payment',
          amount_cents: invoice.amount_cents,
          payment_method: 'card',
          description: `Recurring subscription payment: ${invoice.name || 'Subscription'}`,
          transaction_reference: `stripe_${paymentIntent.id}`,
        })
      } catch (err) {
        console.error('[non-blocking] Ledger entry failed for autopay', err)
      }

      result.paid++
    } else {
      // Payment requires additional action or failed
      await handlePaymentFailure(
        supabase,
        user,
        invoice,
        historyEntry,
        'Payment requires additional confirmation'
      )
      result.failed++
      result.errors.push({
        invoiceId: invoice.id,
        error: `Payment status: ${paymentIntent.status}`,
      })
    }
  } catch (stripeErr: any) {
    await handlePaymentFailure(
      supabase,
      user,
      invoice,
      historyEntry,
      stripeErr?.message || 'Stripe charge failed'
    )
    result.failed++
    result.errors.push({
      invoiceId: invoice.id,
      error: stripeErr?.message || 'Stripe charge failed',
    })
  }
}

async function processManualInvoice(
  supabase: any,
  user: any,
  invoice: any,
  historyEntry: any,
  result: SubscriptionBillingResult
) {
  // Update history to sent
  await supabase
    .from('recurring_invoice_history')
    .update({ status: 'sent' })
    .eq('id', historyEntry.id)

  // Send invoice email (non-blocking)
  try {
    await sendSubscriptionInvoiceEmail(
      invoice.clients?.email,
      invoice.clients?.full_name || 'Client',
      invoice.amount_cents,
      historyEntry.period_start,
      historyEntry.period_end,
      user.tenantId!
    )
  } catch (err) {
    console.error('[non-blocking] Invoice email failed', err)
  }

  result.sent++
}

async function handlePaymentFailure(
  supabase: any,
  user: any,
  invoice: any,
  historyEntry: any,
  reason: string
) {
  // Update history to overdue
  await supabase
    .from('recurring_invoice_history')
    .update({ status: 'overdue' })
    .eq('id', historyEntry.id)

  // Notify chef (non-blocking)
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: user.tenantId!,
      recipientId: user.tenantId!,
      category: 'payment',
      action: 'payment_failed',
      title: 'Subscription payment failed',
      body: `Auto-payment failed for ${invoice.clients?.full_name || 'a client'}: ${reason}`,
      actionUrl: '/finance/recurring',
      clientId: invoice.client_id,
    })
  } catch (err) {
    console.error('[non-blocking] Payment failure notification failed', err)
  }

  // Send payment failed email to client (non-blocking)
  try {
    await sendPaymentFailedNotification(
      invoice.clients?.email,
      invoice.clients?.full_name || 'Client',
      invoice.amount_cents,
      user.tenantId!
    )
  } catch (err) {
    console.error('[non-blocking] Payment failed email failed', err)
  }
}

// ─── Retry Failed Payment ────────────────────────────────────────

export async function retryFailedPayment(
  historyId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch history entry
  const { data: history, error: histErr } = await supabase
    .from('recurring_invoice_history')
    .select('*, schedule:recurring_invoices(*)')
    .eq('id', historyId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (histErr || !history) {
    return { success: false, error: 'Invoice history not found' }
  }

  if (history.status !== 'overdue') {
    return { success: false, error: 'Only overdue invoices can be retried' }
  }

  const schedule = history.schedule
  if (!schedule?.is_autopay || !schedule?.stripe_payment_method_id) {
    return { success: false, error: 'This invoice is not set up for autopay' }
  }

  const stripe = getStripe()

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: history.amount_cents,
      currency: 'usd',
      payment_method: schedule.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: {
        recurring_invoice_id: schedule.id,
        history_id: historyId,
        tenant_id: user.tenantId,
        client_id: schedule.client_id,
        payment_type: 'recurring_subscription_retry',
      },
    })

    if (paymentIntent.status === 'succeeded') {
      await supabase
        .from('recurring_invoice_history')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq('id', historyId)

      // Ledger entry (non-blocking)
      try {
        const { appendLedgerEntryForChef } = await import('@/lib/ledger/append')
        await appendLedgerEntryForChef({
          client_id: schedule.client_id,
          entry_type: 'payment',
          amount_cents: history.amount_cents,
          payment_method: 'card',
          description: `Recurring subscription payment (retry): ${schedule.name || 'Subscription'}`,
          transaction_reference: `stripe_${paymentIntent.id}`,
        })
      } catch (err) {
        console.error('[non-blocking] Ledger entry failed for retry', err)
      }

      revalidatePath('/finance/recurring')
      return { success: true }
    }

    return { success: false, error: `Payment status: ${paymentIntent.status}` }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Stripe charge failed' }
  }
}

// ─── Billing Summary ─────────────────────────────────────────────

export async function getSubscriptionBillingSummary(): Promise<SubscriptionBillingSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Active schedules
  const { data: activeSchedules, error: schedErr } = await supabase
    .from('recurring_invoices')
    .select('id, frequency, amount_cents, next_send_date')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)
    .eq('status', 'active')

  if (schedErr || !activeSchedules) {
    return {
      activeSubscriptions: 0,
      monthlyRecurringRevenueCents: 0,
      nextBillingDate: null,
      overdueCount: 0,
    }
  }

  // Compute MRR
  let mrrCents = 0
  for (const s of activeSchedules) {
    mrrCents += estimateMonthlyRevenue(s.amount_cents, s.frequency as RecurringFrequency)
  }

  // Next billing date
  let nextBillingDate: string | null = null
  if (activeSchedules.length > 0) {
    const sorted = activeSchedules.map((s: any) => s.next_send_date).sort()
    nextBillingDate = sorted[0] || null
  }

  // Overdue count
  const { count: overdueCount } = await supabase
    .from('recurring_invoice_history')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', user.tenantId!)
    .eq('status', 'overdue')

  return {
    activeSubscriptions: activeSchedules.length,
    monthlyRecurringRevenueCents: mrrCents,
    nextBillingDate,
    overdueCount: overdueCount || 0,
  }
}

// ─── Advance Next Send Date ──────────────────────────────────────

export async function advanceNextSendDate(invoiceId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: schedule, error } = await supabase
    .from('recurring_invoices')
    .select('frequency, day_of_week, day_of_month, next_send_date, end_date')
    .eq('id', invoiceId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !schedule) return

  const currentDate = new Date(schedule.next_send_date)
  const nextDate = computeNextInvoiceDate(
    schedule.frequency as RecurringFrequency,
    schedule.day_of_week,
    schedule.day_of_month,
    currentDate
  )

  const updates: Record<string, any> = {
    next_send_date: format(nextDate, 'yyyy-MM-dd'),
    last_sent_at: new Date().toISOString(),
  }

  // If end date passed, deactivate
  if (schedule.end_date && nextDate > new Date(schedule.end_date)) {
    updates.is_active = false
    updates.status = 'cancelled'
  }

  await supabase
    .from('recurring_invoices')
    .update(updates)
    .eq('id', invoiceId)
    .eq('chef_id', user.tenantId!)
}

// ─── Email Helpers ───────────────────────────────────────────────

async function sendSubscriptionInvoiceEmail(
  clientEmail: string | undefined,
  clientName: string,
  amountCents: number,
  periodStart: string,
  periodEnd: string,
  tenantId: string
) {
  if (!clientEmail) return

  const { createElement } = await import('react')
  const { sendEmail } = await import('@/lib/email/send')
  const { getEmailBrand } = await import('@/lib/email/brand-helpers')
  const { SubscriptionInvoiceEmail } = await import('@/lib/email/templates/subscription-invoice')

  const { brand, fromName } = await getEmailBrand(tenantId)
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

  await sendEmail({
    to: clientEmail,
    subject: `Your meal prep invoice: ${amountFormatted}`,
    fromName,
    react: createElement(SubscriptionInvoiceEmail, {
      clientName,
      amountFormatted,
      periodStart,
      periodEnd,
      brand,
    }),
  })
}

async function sendPaymentFailedNotification(
  clientEmail: string | undefined,
  clientName: string,
  amountCents: number,
  tenantId: string
) {
  if (!clientEmail) return

  const { createElement } = await import('react')
  const { sendEmail } = await import('@/lib/email/send')
  const { getEmailBrand } = await import('@/lib/email/brand-helpers')
  const { SubscriptionPaymentFailedEmail } =
    await import('@/lib/email/templates/subscription-payment-failed')

  const { brand, fromName } = await getEmailBrand(tenantId)
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

  await sendEmail({
    to: clientEmail,
    subject: 'We could not process your payment',
    fromName,
    react: createElement(SubscriptionPaymentFailedEmail, {
      clientName,
      amountFormatted,
      updateUrl: `${appUrl}/my-spending`,
      brand,
    }),
  })
}

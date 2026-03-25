'use server'

// Deposit Management - Feature 3.3
// 50% non-refundable deposit standard, balance due before event.
// All financial state derived from ledger (System Law #3).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { appendLedgerEntryForChef } from '@/lib/ledger/append'
import type { PaymentMethod } from '@/lib/ledger/append'
import { differenceInDays, subDays, format } from 'date-fns'
import { log } from '@/lib/logger'

// ─── Types ──────────────────────────────────────────────────────

export type DepositStatus = 'not_required' | 'pending' | 'partial' | 'paid' | 'overdue'
export type BalanceStatus = 'not_due' | 'pending' | 'paid' | 'overdue'

export type DepositPayment = {
  id: string
  amountCents: number
  date: string
  type: 'deposit' | 'balance' | 'payment'
}

export type DepositSummary = {
  quotedAmountCents: number
  depositAmountCents: number
  depositPercentage: number
  balanceDueCents: number
  depositDueDate: string | null
  balanceDueDate: string
  depositStatus: DepositStatus
  balanceStatus: BalanceStatus
  payments: DepositPayment[]
}

export type DepositSettings = {
  depositPercentage: number
  balanceDueDaysBefore: number
  depositRequired: boolean
  autoReminder: boolean
  reminderDaysBefore: number[]
  paymentTermsText: string | null
}

// ─── Calculate Deposit ──────────────────────────────────────────

/**
 * Calculate deposit details for an event, derived from ledger entries
 * and the chef's deposit settings.
 */
export async function calculateDeposit(eventId: string): Promise<DepositSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event details
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, quoted_price_cents, event_date, deposit_amount_cents, client_id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or does not belong to your account')
  }

  // Get chef's deposit settings (or defaults)
  const settings = await getDepositSettings()

  const quotedAmountCents = event.quoted_price_cents ?? 0

  // Use event-level deposit_amount_cents if set, otherwise calculate from settings
  const depositPercentage = settings.depositPercentage
  const depositAmountCents =
    event.deposit_amount_cents ?? Math.round((quotedAmountCents * depositPercentage) / 100)

  // Balance due date = event_date minus balanceDueDaysBefore
  const eventDate = new Date(event.event_date + 'T12:00:00')
  const balanceDueDate = subDays(eventDate, settings.balanceDueDaysBefore)

  // Fetch ledger entries for this event to classify payments
  const { data: ledgerEntries, error: ledgerError } = await db
    .from('ledger_entries')
    .select('id, entry_type, amount_cents, created_at, is_refund')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .eq('is_refund', false)
    .order('created_at', { ascending: true })

  if (ledgerError) {
    log.ledger.error('Failed to fetch ledger for deposit calc', { error: ledgerError })
    throw new Error('Failed to calculate deposit')
  }

  const entries = ledgerEntries || []

  // Classify payments into deposit vs balance
  const payments: DepositPayment[] = []
  let totalPaidCents = 0

  for (const entry of entries) {
    // Skip non-payment types (tips, adjustments used for other purposes)
    if (entry.entry_type === 'tip') continue

    totalPaidCents += entry.amount_cents

    let paymentType: 'deposit' | 'balance' | 'payment' = 'payment'
    if (entry.entry_type === 'deposit') {
      paymentType = 'deposit'
    } else if (entry.entry_type === 'final_payment') {
      paymentType = 'balance'
    } else if (totalPaidCents <= depositAmountCents) {
      // If total paid so far is within deposit range, classify as deposit
      paymentType = 'deposit'
    } else {
      paymentType = 'balance'
    }

    payments.push({
      id: entry.id,
      amountCents: entry.amount_cents,
      date: entry.created_at,
      type: paymentType,
    })
  }

  // Calculate deposit-specific payments
  const depositPaidCents = payments
    .filter((p) => p.type === 'deposit')
    .reduce((sum, p) => sum + p.amountCents, 0)

  const balanceDueCents = Math.max(0, quotedAmountCents - totalPaidCents)
  const now = new Date()

  // Determine deposit status
  let depositStatus: DepositStatus = 'pending'
  if (!settings.depositRequired || depositAmountCents === 0) {
    depositStatus = 'not_required'
  } else if (depositPaidCents >= depositAmountCents) {
    depositStatus = 'paid'
  } else if (depositPaidCents > 0) {
    depositStatus = 'partial'
  } else if (event.event_date && now > eventDate) {
    depositStatus = 'overdue'
  } else {
    depositStatus = 'pending'
  }

  // Determine balance status
  let balanceStatus: BalanceStatus = 'not_due'
  if (balanceDueCents === 0) {
    balanceStatus = 'paid'
  } else if (now > balanceDueDate) {
    balanceStatus = 'overdue'
  } else if (differenceInDays(balanceDueDate, now) <= settings.balanceDueDaysBefore) {
    balanceStatus = 'pending'
  } else {
    balanceStatus = 'not_due'
  }

  return {
    quotedAmountCents,
    depositAmountCents,
    depositPercentage,
    balanceDueCents,
    depositDueDate: null, // Deposit due immediately upon booking (no separate due date)
    balanceDueDate: format(balanceDueDate, 'yyyy-MM-dd'),
    depositStatus,
    balanceStatus,
    payments,
  }
}

// ─── Record Deposit ─────────────────────────────────────────────

/**
 * Record a deposit payment for an event via the ledger.
 */
export async function recordDeposit(
  eventId: string,
  amountCents: number,
  method: PaymentMethod = 'cash'
) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Amount must be a positive integer (cents)')
  }

  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event to get client_id and validate ownership
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, client_id, occasion, quoted_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or does not belong to your account')
  }

  const result = await appendLedgerEntryForChef({
    client_id: event.client_id,
    entry_type: 'deposit',
    amount_cents: amountCents,
    payment_method: method,
    description: `Deposit for ${event.occasion || 'event'}`,
    event_id: eventId,
    transaction_reference: `dep_${eventId}_${Date.now()}`,
  })

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'ledger_entry_created',
      domain: 'financial',
      entityType: 'ledger_entry',
      entityId: result.entry?.id,
      summary: `Recorded deposit: $${(amountCents / 100).toFixed(2)} for ${event.occasion || 'event'}`,
      context: {
        amount_cents: amountCents,
        entry_type: 'deposit',
        payment_method: method,
        event_id: eventId,
      },
      clientId: event.client_id,
    })
  } catch (err) {
    log.ledger.warn('Activity log failed (non-blocking)', { error: err })
  }

  return result
}

// ─── Record Balance Payment ─────────────────────────────────────

/**
 * Record a balance payment for an event via the ledger.
 */
export async function recordBalancePayment(
  eventId: string,
  amountCents: number,
  method: PaymentMethod = 'cash'
) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Amount must be a positive integer (cents)')
  }

  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event to get client_id and validate ownership
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, client_id, occasion, quoted_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or does not belong to your account')
  }

  const result = await appendLedgerEntryForChef({
    client_id: event.client_id,
    entry_type: 'final_payment',
    amount_cents: amountCents,
    payment_method: method,
    description: `Balance payment for ${event.occasion || 'event'}`,
    event_id: eventId,
    transaction_reference: `bal_${eventId}_${Date.now()}`,
  })

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'ledger_entry_created',
      domain: 'financial',
      entityType: 'ledger_entry',
      entityId: result.entry?.id,
      summary: `Recorded balance payment: $${(amountCents / 100).toFixed(2)} for ${event.occasion || 'event'}`,
      context: {
        amount_cents: amountCents,
        entry_type: 'final_payment',
        payment_method: method,
        event_id: eventId,
      },
      clientId: event.client_id,
    })
  } catch (err) {
    log.ledger.warn('Activity log failed (non-blocking)', { error: err })
  }

  return result
}

// ─── Deposit Settings ───────────────────────────────────────────

/**
 * Get the current chef's deposit settings.
 * Returns defaults if no settings have been saved.
 */
export async function getDepositSettings(): Promise<DepositSettings> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_deposit_settings')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !data) {
    // Return defaults
    return {
      depositPercentage: 50,
      balanceDueDaysBefore: 7,
      depositRequired: true,
      autoReminder: true,
      reminderDaysBefore: [14, 7, 3],
      paymentTermsText: null,
    }
  }

  return {
    depositPercentage: data.deposit_percentage,
    balanceDueDaysBefore: data.balance_due_days_before,
    depositRequired: data.deposit_required,
    autoReminder: data.auto_reminder,
    reminderDaysBefore: data.reminder_days_before ?? [14, 7, 3],
    paymentTermsText: data.payment_terms_text ?? null,
  }
}

/**
 * Save the chef's deposit configuration.
 */
export async function updateDepositSettings(settings: {
  depositPercentage: number
  balanceDueDaysBefore: number
  depositRequired: boolean
  autoReminder: boolean
  reminderDaysBefore: number[]
  paymentTermsText: string | null
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Validate
  if (settings.depositPercentage < 0 || settings.depositPercentage > 100) {
    throw new Error('Deposit percentage must be between 0 and 100')
  }
  if (settings.balanceDueDaysBefore < 0) {
    throw new Error('Balance due days must be non-negative')
  }

  const { error } = await db.from('chef_deposit_settings').upsert(
    {
      chef_id: user.tenantId!,
      deposit_percentage: settings.depositPercentage,
      balance_due_days_before: settings.balanceDueDaysBefore,
      deposit_required: settings.depositRequired,
      auto_reminder: settings.autoReminder,
      reminder_days_before: settings.reminderDaysBefore,
      payment_terms_text: settings.paymentTermsText,
    },
    { onConflict: 'chef_id' }
  )

  if (error) {
    log.ledger.error('Failed to save deposit settings', { error })
    throw new Error('Failed to save deposit settings')
  }

  return { success: true }
}

// ─── Overdue Deposits ───────────────────────────────────────────

export type OverdueDepositEvent = {
  eventId: string
  occasion: string | null
  eventDate: string
  clientName: string | null
  quotedAmountCents: number
  depositAmountCents: number
  totalPaidCents: number
  overdueAmountCents: number
  overdueType: 'deposit' | 'balance' | 'both'
  daysOverdue: number
}

/**
 * Get all events with overdue deposits or balances for the current chef.
 * Uses deterministic calculation from event data + ledger (Formula > AI).
 */
export async function getOverdueDeposits(): Promise<OverdueDepositEvent[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const settings = await getDepositSettings()

  if (!settings.depositRequired) return []

  // Fetch non-terminal events with outstanding balances
  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id,
      occasion,
      event_date,
      quoted_price_cents,
      deposit_amount_cents,
      status,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .not('status', 'in', '("completed","cancelled")')
    .not('quoted_price_cents', 'is', null)
    .gt('quoted_price_cents', 0)
    .order('event_date', { ascending: true })

  if (error) {
    log.ledger.error('getOverdueDeposits failed', { error })
    throw new Error('Failed to load overdue deposits')
  }

  if (!events) return []

  // For each event, check ledger to determine payment state
  const now = new Date()
  const overdueEvents: OverdueDepositEvent[] = []

  for (const event of events) {
    const eventDate = new Date(event.event_date + 'T12:00:00')
    const balanceDueDate = subDays(eventDate, settings.balanceDueDaysBefore)

    const depositRequired =
      event.deposit_amount_cents ??
      Math.round(((event.quoted_price_cents ?? 0) * settings.depositPercentage) / 100)

    // Get total paid from ledger for this event
    const { data: ledger } = await db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('event_id', event.id)
      .eq('is_refund', false)
      .neq('entry_type', 'tip')

    const totalPaidCents = (ledger || []).reduce((sum: number, e: any) => sum + e.amount_cents, 0)

    const depositOverdue = totalPaidCents < depositRequired && now > eventDate
    const balanceOverdue = totalPaidCents < (event.quoted_price_cents ?? 0) && now > balanceDueDate

    if (!depositOverdue && !balanceOverdue) continue

    let overdueType: 'deposit' | 'balance' | 'both' = 'balance'
    if (depositOverdue && balanceOverdue) overdueType = 'both'
    else if (depositOverdue) overdueType = 'deposit'

    const overdueAmountCents = (event.quoted_price_cents ?? 0) - totalPaidCents

    overdueEvents.push({
      eventId: event.id,
      occasion: event.occasion ?? null,
      eventDate: event.event_date,
      clientName: event.client?.full_name ?? null,
      quotedAmountCents: event.quoted_price_cents ?? 0,
      depositAmountCents: depositRequired,
      totalPaidCents,
      overdueAmountCents,
      overdueType,
      daysOverdue: Math.abs(
        differenceInDays(overdueType === 'deposit' ? eventDate : balanceDueDate, now)
      ),
    })
  }

  return overdueEvents
}

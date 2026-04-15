'use server'

// Cash Flow Calendar
// Returns a month's worth of daily cash flow - payments in (ledger_entries)
// and upcoming event payment plan installments due.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'

export interface CashFlowDay {
  date: string // YYYY-MM-DD
  incomeCents: number // Payments actually received
  outgoingCents: number // Expenses logged on that date
  eventCount: number // Number of events on that date
  installmentsDueCents: number // Payment plan installments due (unpaid)
}

export interface CashFlowCalendarData {
  year: number
  month: number
  days: CashFlowDay[]
  totalIncomeCents: number
  totalOutgoingCents: number
  totalInstallmentsDueCents: number
}

export async function getCashFlowCalendar(
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1
): Promise<CashFlowCalendarData> {
  const user = await requireChef()
  const db: any = createServerClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endYear = month === 12 ? year + 1 : year
  const endMonth = month === 12 ? 1 : month + 1
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  const [ledgerRes, expensesRes, eventsRes, installmentsRes] = await Promise.all([
    // Income: payments received
    db
      .from('ledger_entries')
      .select('amount_cents, received_at, created_at, entry_type')
      .eq('tenant_id', user.tenantId!)
      .in('entry_type', ['payment', 'deposit', 'installment', 'final_payment', 'tip'])
      .or(`received_at.gte.${startDate},created_at.gte.${startDate}`)
      .or(`received_at.lt.${endDate},created_at.lt.${endDate}`)
      .limit(200),

    // Outgoing: expenses
    db
      .from('expenses')
      .select('amount_cents, expense_date')
      .eq('tenant_id', user.tenantId!)
      .gte('expense_date', startDate)
      .lt('expense_date', endDate)
      .limit(200),

    // Events on each date
    db
      .from('events')
      .select('event_date')
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', startDate)
      .lt('event_date', endDate)
      .not('status', 'in', '("cancelled","draft")'),

    // Upcoming installments due
    db
      .from('payment_plan_installments' as any)
      .select('amount_cents, due_date')
      .eq('tenant_id', user.tenantId!)
      .gte('due_date', startDate)
      .lt('due_date', endDate)
      .is('paid_at', null),
  ])

  // Build a map of date → CashFlowDay
  const dayMap = new Map<string, CashFlowDay>()

  function getOrCreate(date: string): CashFlowDay {
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        incomeCents: 0,
        outgoingCents: 0,
        eventCount: 0,
        installmentsDueCents: 0,
      })
    }
    return dayMap.get(date)!
  }

  for (const entry of ledgerRes.data ?? []) {
    const date = dateToDateString((entry.received_at ?? entry.created_at) as Date | string)
    if (date >= startDate && date < endDate) {
      getOrCreate(date).incomeCents += Number((entry as any).amount_cents) || 0
    }
  }

  for (const exp of expensesRes.data ?? []) {
    const date = dateToDateString((exp as any).expense_date as Date | string)
    getOrCreate(date).outgoingCents += Number((exp as any).amount_cents) || 0
  }

  for (const event of eventsRes.data ?? []) {
    const date = dateToDateString((event as any).event_date as Date | string)
    getOrCreate(date).eventCount++
  }

  for (const inst of (installmentsRes.data ?? []) as any[]) {
    const date = dateToDateString(inst.due_date as Date | string)
    getOrCreate(date).installmentsDueCents += Number(inst.amount_cents) || 0
  }

  const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  return {
    year,
    month,
    days,
    totalIncomeCents: days.reduce((s, d) => s + d.incomeCents, 0),
    totalOutgoingCents: days.reduce((s, d) => s + d.outgoingCents, 0),
    totalInstallmentsDueCents: days.reduce((s, d) => s + d.installmentsDueCents, 0),
  }
}

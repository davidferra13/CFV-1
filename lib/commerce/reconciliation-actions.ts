// Commerce reconciliation actions.
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { recordPosAlert } from './observability-actions'
import type { PosAlertSeverity } from './observability-core'

const DEFAULT_TIME_ZONE = 'America/New_York'
const REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type ReconciliationFlag = {
  type: string
  severity: 'info' | 'warning' | 'error'
  message: string
  status: 'open' | 'resolved' | 'ignored'
  resolvedAt?: string
  resolvedBy?: string
}

export type GenerateReportInput = {
  reportDate?: string
  referenceTimestamp?: string
}

function mapReconciliationSeverityToAlert(value: ReconciliationFlag['severity']): PosAlertSeverity {
  if (value === 'error') return 'error'
  if (value === 'warning') return 'warning'
  return 'info'
}

function buildReconciliationAlertDedupeKey(reportDate: string, flagType: string) {
  return `reconciliation_${reportDate}_${flagType}`
}

async function syncReconciliationFlagsToAlerts(input: {
  tenantScopeId: string
  reportDate: string
  flags: ReconciliationFlag[]
}) {
  for (const flag of input.flags) {
    if (flag.status !== 'open') continue
    try {
      await recordPosAlert({
        tenantId: input.tenantScopeId,
        source: 'reconciliation',
        eventType: `reconciliation_${flag.type}`,
        severity: mapReconciliationSeverityToAlert(flag.severity),
        message: flag.message,
        dedupeKey: buildReconciliationAlertDedupeKey(input.reportDate, flag.type),
        context: {
          report_date: input.reportDate,
          flag_type: flag.type,
          flag_status: flag.status,
        },
      })
    } catch (error) {
      console.error('[non-blocking] Failed to sync reconciliation flag to POS alerts:', error)
    }
  }
}

function isValidReportDate(value: string | null | undefined): value is string {
  return !!value && REPORT_DATE_PATTERN.test(value)
}

function normalizeTimeZone(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return DEFAULT_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw })
    return raw
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

function getLocalDateString(input: string | Date, timeZone: string): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timestamp for report date generation')

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Failed to compute local report date')
  }

  return `${year}-${month}-${day}`
}

function shiftReportDate(reportDate: string, deltaDays: number): string {
  const [year, month, day] = reportDate.split('-').map((value) => Number.parseInt(value, 10))
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays, 12, 0, 0))
  return shifted.toISOString().slice(0, 10)
}

function getWideUtcWindow(reportDate: string) {
  return {
    fromIso: `${shiftReportDate(reportDate, -1)}T00:00:00.000Z`,
    toIso: `${shiftReportDate(reportDate, 1)}T23:59:59.999Z`,
  }
}

function isIsoOnReportDate(value: unknown, reportDate: string, timeZone: string) {
  if (typeof value !== 'string' || value.length === 0) return false
  try {
    return getLocalDateString(value, timeZone) === reportDate
  } catch {
    return false
  }
}

function parseFlags(raw: unknown): ReconciliationFlag[] {
  if (Array.isArray(raw)) return raw as ReconciliationFlag[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ReconciliationFlag[]) : []
    } catch {
      return []
    }
  }
  return []
}

function resolveReportDate(input: GenerateReportInput, timeZone: string): string {
  if (isValidReportDate(input.reportDate)) {
    return input.reportDate
  }
  if (input.reportDate) {
    throw new Error('reportDate must be in YYYY-MM-DD format')
  }

  if (input.referenceTimestamp) {
    return getLocalDateString(input.referenceTimestamp, timeZone)
  }

  return getLocalDateString(new Date(), timeZone)
}

export async function generateDailyReconciliation(input: GenerateReportInput = {}) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: tenant } = await (db
    .from('chefs')
    .select('timezone')
    .eq('id', tenantId)
    .maybeSingle() as any)

  const timeZone = normalizeTimeZone((tenant as any)?.timezone)
  const reportDate = resolveReportDate(input, timeZone)
  const { fromIso, toIso } = getWideUtcWindow(reportDate)

  const { data: sales } = await (db
    .from('sales')
    .select('id, tax_cents, total_cents, tip_cents, status, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', fromIso)
    .lte('created_at', toIso) as any)

  const localDaySales = (sales ?? []).filter((row: any) =>
    isIsoOnReportDate(row.created_at, reportDate, timeZone)
  )
  const validSales = localDaySales.filter(
    (row: any) => row.status !== 'voided' && row.status !== 'draft'
  )
  const totalSalesCount = validSales.length
  const totalRevenueCents = validSales.reduce(
    (sum: number, row: any) => sum + (row.total_cents ?? 0),
    0
  )
  const totalTipsCents = validSales.reduce((sum: number, row: any) => sum + (row.tip_cents ?? 0), 0)
  const totalTaxCents = validSales.reduce((sum: number, row: any) => sum + (row.tax_cents ?? 0), 0)

  const { data: payments } = await (db
    .from('commerce_payments')
    .select('amount_cents, payment_method, status, created_at')
    .eq('tenant_id', tenantId)
    .in('status', ['captured', 'settled'])
    .gte('created_at', fromIso)
    .lte('created_at', toIso) as any)

  const localDayPayments = (payments ?? []).filter((row: any) =>
    isIsoOnReportDate(row.created_at, reportDate, timeZone)
  )

  let cashTotalCents = 0
  let cardTotalCents = 0
  let otherTotalCents = 0

  for (const payment of localDayPayments as any[]) {
    if (payment.payment_method === 'cash') cashTotalCents += payment.amount_cents ?? 0
    else if (payment.payment_method === 'card') cardTotalCents += payment.amount_cents ?? 0
    else otherTotalCents += payment.amount_cents ?? 0
  }

  const { data: refunds } = await (db
    .from('commerce_refunds')
    .select('amount_cents, status, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'processed')
    .gte('created_at', fromIso)
    .lte('created_at', toIso) as any)

  const localDayRefunds = (refunds ?? []).filter((row: any) =>
    isIsoOnReportDate(row.created_at, reportDate, timeZone)
  )
  const totalRefundsCents = localDayRefunds.reduce(
    (sum: number, row: any) => sum + (row.amount_cents ?? 0),
    0
  )

  const netRevenueCents = totalRevenueCents - totalRefundsCents

  let openingCashCents: number | null = null
  let closingCashCents: number | null = null
  let expectedCashCents: number | null = null
  let cashVarianceCents: number | null = null

  const { data: sessions } = await (db
    .from('register_sessions' as any)
    .select(
      'opening_cash_cents, closing_cash_cents, expected_cash_cents, cash_variance_cents, closed_at'
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'closed')
    .gte('closed_at', fromIso)
    .lte('closed_at', toIso) as any)

  const localDaySessions = (sessions ?? []).filter((row: any) =>
    isIsoOnReportDate(row.closed_at, reportDate, timeZone)
  )
  if (localDaySessions.length > 0) {
    openingCashCents = localDaySessions.reduce(
      (sum: number, row: any) => sum + (row.opening_cash_cents ?? 0),
      0
    )
    closingCashCents = localDaySessions.reduce(
      (sum: number, row: any) => sum + (row.closing_cash_cents ?? 0),
      0
    )
    expectedCashCents = localDaySessions.reduce(
      (sum: number, row: any) => sum + (row.expected_cash_cents ?? 0),
      0
    )
    cashVarianceCents = localDaySessions.reduce(
      (sum: number, row: any) => sum + (row.cash_variance_cents ?? 0),
      0
    )
  }

  const { data: ledgerEntries } = await (db
    .from('ledger_entries')
    .select('amount_cents, entry_type, is_refund, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', fromIso)
    .lte('created_at', toIso) as any)

  const localDayLedgerEntries = (ledgerEntries ?? []).filter((row: any) =>
    isIsoOnReportDate(row.created_at, reportDate, timeZone)
  )

  const ledgerTotalCents = localDayLedgerEntries.reduce((sum: number, row: any) => {
    if (row.is_refund) return sum - (row.amount_cents ?? 0)
    if (row.entry_type === 'expense') return sum - (row.amount_cents ?? 0)
    return sum + (row.amount_cents ?? 0)
  }, 0)

  const paymentLedgerDiffCents =
    cashTotalCents + cardTotalCents + otherTotalCents - ledgerTotalCents

  const flags: ReconciliationFlag[] = []
  if (cashVarianceCents !== null && Math.abs(cashVarianceCents) > 100) {
    flags.push({
      type: 'cash_variance',
      severity: Math.abs(cashVarianceCents) > 1000 ? 'error' : 'warning',
      message: `Cash drawer variance: $${(cashVarianceCents / 100).toFixed(2)}`,
      status: 'open',
    })
  }

  if (Math.abs(paymentLedgerDiffCents) > 0) {
    flags.push({
      type: 'payment_ledger_mismatch',
      severity: Math.abs(paymentLedgerDiffCents) > 1000 ? 'error' : 'warning',
      message: `Payment vs ledger difference: $${(paymentLedgerDiffCents / 100).toFixed(2)}`,
      status: 'open',
    })
  }

  if (totalRevenueCents > 0 && totalRefundsCents / totalRevenueCents > 0.15) {
    flags.push({
      type: 'high_refund_ratio',
      severity: 'warning',
      message: `Refunds are ${((totalRefundsCents / totalRevenueCents) * 100).toFixed(1)}% of revenue`,
      status: 'open',
    })
  }

  const { data: report, error } = await (db
    .from('daily_reconciliation_reports' as any)
    .upsert(
      {
        tenant_id: tenantId,
        report_date: reportDate,
        total_sales_count: totalSalesCount,
        total_revenue_cents: totalRevenueCents,
        total_tips_cents: totalTipsCents,
        total_tax_cents: totalTaxCents,
        total_refunds_cents: totalRefundsCents,
        net_revenue_cents: netRevenueCents,
        cash_total_cents: cashTotalCents,
        card_total_cents: cardTotalCents,
        other_total_cents: otherTotalCents,
        opening_cash_cents: openingCashCents,
        closing_cash_cents: closingCashCents,
        expected_cash_cents: expectedCashCents,
        cash_variance_cents: cashVarianceCents,
        ledger_total_cents: ledgerTotalCents,
        payment_ledger_diff_cents: paymentLedgerDiffCents,
        flags,
        reviewed: false,
        reviewed_by: null,
        reviewed_at: null,
      } as any,
      { onConflict: 'tenant_id,report_date' }
    )
    .select('id')
    .single() as any)

  if (error) throw new Error(`Failed to generate reconciliation report: ${error.message}`)

  await syncReconciliationFlagsToAlerts({
    tenantScopeId: tenantId,
    reportDate,
    flags,
  })

  revalidatePath('/commerce/reconciliation')
  return { reportId: (report as any)?.id, reportDate, flags }
}

export async function listReconciliationReports(opts?: { limit?: number; offset?: number }) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const limit = opts?.limit ?? 30
  const offset = opts?.offset ?? 0

  const { data, error, count } = await (db
    .from('daily_reconciliation_reports' as any)
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .order('report_date', { ascending: false })
    .range(offset, offset + limit - 1) as any)

  if (error) throw new Error(`Failed to list reports: ${error.message}`)
  return { reports: data ?? [], total: count ?? 0 }
}

export async function getReconciliationReport(reportId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data, error } = await (db
    .from('daily_reconciliation_reports' as any)
    .select('*')
    .eq('id', reportId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (error || !data) throw new Error('Report not found')
  return data
}

export async function reviewReconciliationReport(reportId: string, notes?: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { error } = await (db
    .from('daily_reconciliation_reports' as any)
    .update({
      reviewed: true,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      notes: notes ?? null,
    } as any)
    .eq('id', reportId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to review report: ${error.message}`)
  revalidatePath('/commerce/reconciliation')
}

export async function resolveReconciliationFlag(
  reportId: string,
  flagIndex: number,
  resolution: 'resolved' | 'ignored'
) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: report, error: fetchErr } = await (db
    .from('daily_reconciliation_reports' as any)
    .select('flags, report_date')
    .eq('id', reportId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (fetchErr || !report) throw new Error('Report not found')

  const flags = parseFlags((report as any).flags)
  if (flagIndex < 0 || flagIndex >= flags.length) {
    throw new Error('Invalid flag index')
  }

  const targetFlag = flags[flagIndex]
  flags[flagIndex].status = resolution
  flags[flagIndex].resolvedAt = new Date().toISOString()
  flags[flagIndex].resolvedBy = user.id

  const { error } = await (db
    .from('daily_reconciliation_reports' as any)
    .update({ flags } as any)
    .eq('id', reportId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to resolve flag: ${error.message}`)

  const dedupeKey = buildReconciliationAlertDedupeKey(
    String((report as any).report_date ?? '').slice(0, 10),
    targetFlag.type
  )
  await (db
    .from('pos_alert_events' as any)
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user.id,
    } as any)
    .eq('tenant_id', user.tenantId!)
    .eq('dedupe_key', dedupeKey)
    .in('status', ['open', 'acknowledged']) as any)

  revalidatePath('/commerce/reconciliation')
  revalidatePath('/commerce/observability')
}

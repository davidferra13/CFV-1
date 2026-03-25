// Commerce Engine V1 - Export Actions
// CSV export for sales, payments, refunds, and tax data.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { SALE_STATUS_LABELS, SALE_CHANNEL_LABELS } from './constants'
import type { SaleStatus, SaleChannel } from './constants'
import { csvRowSafe as toCsvRow } from '@/lib/security/csv-sanitize'

// ─── CSV Helpers ──────────────────────────────────────────────────

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

function formatNullableCents(cents: number | null | undefined): string {
  if (typeof cents !== 'number') return ''
  return formatCents(cents)
}

function parseReconciliationFlags(raw: unknown): Array<{ status?: string; message?: string }> {
  if (Array.isArray(raw)) return raw as Array<{ status?: string; message?: string }>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as Array<{ status?: string; message?: string }>) : []
    } catch {
      return []
    }
  }
  return []
}

// ─── Export Sales ─────────────────────────────────────────────────

export async function exportSalesCsv(from: string, to: string): Promise<string> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: sales } = await (db
    .from('sales')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`)
    .order('created_at', { ascending: false }) as any)

  const header = [
    'Sale Number',
    'Date',
    'Status',
    'Channel',
    'Subtotal',
    'Tax',
    'Discount',
    'Tips',
    'Total',
    'Client ID',
    'Event ID',
    'Notes',
  ]

  const rows = (sales ?? []).map((s: any) =>
    toCsvRow([
      s.sale_number,
      new Date(s.created_at).toISOString(),
      SALE_STATUS_LABELS[s.status as SaleStatus] ?? s.status,
      SALE_CHANNEL_LABELS[s.channel as SaleChannel] ?? s.channel,
      formatCents(s.subtotal_cents ?? 0),
      formatCents(s.tax_cents ?? 0),
      formatCents(s.discount_cents ?? 0),
      formatCents(s.tip_cents ?? 0),
      formatCents(s.total_cents ?? 0),
      s.client_id,
      s.event_id,
      s.notes,
    ])
  )

  return [toCsvRow(header), ...rows].join('\n')
}

// ─── Export Payments ──────────────────────────────────────────────

export async function exportPaymentsCsv(from: string, to: string): Promise<string> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: payments } = await (db
    .from('commerce_payments')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`)
    .order('created_at', { ascending: false }) as any)

  const header = [
    'Date',
    'Sale ID',
    'Amount',
    'Tips',
    'Method',
    'Status',
    'Processor',
    'Stripe PI',
    'Idempotency Key',
  ]

  const rows = (payments ?? []).map((p: any) =>
    toCsvRow([
      new Date(p.created_at).toISOString(),
      p.sale_id,
      formatCents(p.amount_cents ?? 0),
      formatCents(p.tip_cents ?? 0),
      p.payment_method,
      p.status,
      p.processor_type,
      p.stripe_payment_intent_id,
      p.idempotency_key,
    ])
  )

  return [toCsvRow(header), ...rows].join('\n')
}

// ─── Export Refunds ───────────────────────────────────────────────

export async function exportRefundsCsv(from: string, to: string): Promise<string> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: refunds } = await (db
    .from('commerce_refunds')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`)
    .order('created_at', { ascending: false }) as any)

  const header = ['Date', 'Sale ID', 'Payment ID', 'Amount', 'Reason', 'Status']

  const rows = (refunds ?? []).map((r: any) =>
    toCsvRow([
      new Date(r.created_at).toISOString(),
      r.sale_id,
      r.payment_id,
      formatCents(r.amount_cents ?? 0),
      r.reason,
      r.status,
    ])
  )

  return [toCsvRow(header), ...rows].join('\n')
}

// ─── Export Tax Summary ───────────────────────────────────────────

export async function exportTaxSummaryCsv(from: string, to: string): Promise<string> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: taxRows } = await (db
    .from('daily_tax_summary' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('report_date', from)
    .lte('report_date', to)
    .order('report_date', { ascending: false }) as any)

  const header = [
    'Date',
    'Jurisdiction',
    'State',
    'County',
    'City',
    'Tax Class',
    'Taxable Amount',
    'Tax Collected',
    'Tax Rate',
    'State Tax',
    'County Tax',
    'City Tax',
    'Transactions',
  ]

  const rows = (taxRows ?? []).map((t: any) =>
    toCsvRow([
      t.report_date,
      t.tax_jurisdiction,
      t.state,
      t.county,
      t.city,
      t.tax_class,
      formatCents(t.taxable_amount_cents ?? 0),
      formatCents(t.tax_collected_cents ?? 0),
      t.tax_rate,
      formatCents(t.state_tax_cents ?? 0),
      formatCents(t.county_tax_cents ?? 0),
      formatCents(t.city_tax_cents ?? 0),
      t.transaction_count,
    ])
  )

  return [toCsvRow(header), ...rows].join('\n')
}

export async function exportReconciliationCsv(from: string, to: string): Promise<string> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: reports } = await (db
    .from('daily_reconciliation_reports' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('report_date', from)
    .lte('report_date', to)
    .order('report_date', { ascending: false }) as any)

  const header = [
    'Report Date',
    'Sales Count',
    'Revenue',
    'Tips',
    'Tax',
    'Refunds',
    'Net Revenue',
    'Cash',
    'Card',
    'Other',
    'Opening Cash',
    'Expected Cash',
    'Closing Cash',
    'Cash Variance',
    'Ledger Total',
    'Payment-Ledger Diff',
    'Open Flag Count',
    'Open Flag Messages',
    'Reviewed',
    'Reviewed At',
  ]

  const rows = (reports ?? []).map((report: any) => {
    const flags = parseReconciliationFlags(report.flags)
    const openFlags = flags.filter((flag) => flag?.status === 'open')
    return toCsvRow([
      report.report_date,
      report.total_sales_count ?? 0,
      formatCents(report.total_revenue_cents ?? 0),
      formatCents(report.total_tips_cents ?? 0),
      formatCents(report.total_tax_cents ?? 0),
      formatCents(report.total_refunds_cents ?? 0),
      formatCents(report.net_revenue_cents ?? 0),
      formatCents(report.cash_total_cents ?? 0),
      formatCents(report.card_total_cents ?? 0),
      formatCents(report.other_total_cents ?? 0),
      formatNullableCents(report.opening_cash_cents),
      formatNullableCents(report.expected_cash_cents),
      formatNullableCents(report.closing_cash_cents),
      formatNullableCents(report.cash_variance_cents),
      formatNullableCents(report.ledger_total_cents),
      formatNullableCents(report.payment_ledger_diff_cents),
      openFlags.length,
      openFlags
        .map((flag) => String(flag.message ?? '').trim())
        .filter(Boolean)
        .join(' | '),
      report.reviewed ? 'yes' : 'no',
      report.reviewed_at ? new Date(report.reviewed_at).toISOString() : '',
    ])
  })

  return [toCsvRow(header), ...rows].join('\n')
}

export async function exportShiftSessionsCsv(from: string, to: string): Promise<string> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const fromIso = `${from}T00:00:00.000Z`
  const toIso = `${to}T23:59:59.999Z`

  const { data: sessions } = await (db
    .from('register_sessions' as any)
    .select(
      'id, session_name, status, opened_at, closed_at, opening_cash_cents, expected_cash_cents, closing_cash_cents, cash_variance_cents, total_sales_count, total_revenue_cents, total_tips_cents, close_notes'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'closed')
    .gte('closed_at', fromIso)
    .lte('closed_at', toIso)
    .order('closed_at', { ascending: false }) as any)

  const header = [
    'Session ID',
    'Session Name',
    'Opened At',
    'Closed At',
    'Sales Count',
    'Revenue',
    'Tips',
    'Opening Cash',
    'Expected Cash',
    'Closing Cash',
    'Cash Variance',
    'Close Notes',
  ]

  const rows = (sessions ?? []).map((session: any) =>
    toCsvRow([
      session.id,
      session.session_name ?? 'Shift',
      session.opened_at ? new Date(session.opened_at).toISOString() : '',
      session.closed_at ? new Date(session.closed_at).toISOString() : '',
      session.total_sales_count ?? 0,
      formatCents(session.total_revenue_cents ?? 0),
      formatCents(session.total_tips_cents ?? 0),
      formatCents(session.opening_cash_cents ?? 0),
      formatNullableCents(session.expected_cash_cents),
      formatNullableCents(session.closing_cash_cents),
      formatNullableCents(session.cash_variance_cents),
      session.close_notes ?? '',
    ])
  )

  return [toCsvRow(header), ...rows].join('\n')
}

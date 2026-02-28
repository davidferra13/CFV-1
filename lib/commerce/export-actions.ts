// Commerce Engine V1 — Export Actions
// CSV export for sales, payments, refunds, and tax data.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { SALE_STATUS_LABELS, SALE_CHANNEL_LABELS } from './constants'
import type { SaleStatus, SaleChannel } from './constants'

// ─── CSV Helpers ──────────────────────────────────────────────────

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsv).join(',')
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

// ─── Export Sales ─────────────────────────────────────────────────

export async function exportSalesCsv(from: string, to: string): Promise<string> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: sales } = await (supabase
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
  const supabase: any = createServerClient()

  const { data: payments } = await (supabase
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
  const supabase: any = createServerClient()

  const { data: refunds } = await (supabase
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
  const supabase: any = createServerClient()

  const { data: taxRows } = await (supabase
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

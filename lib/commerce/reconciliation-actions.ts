// Commerce Engine V1 — Reconciliation Actions
// Generate daily reconciliation reports, review flags, ledger cross-checks.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────

export type ReconciliationFlag = {
  type: string
  severity: 'info' | 'warning' | 'error'
  message: string
  status: 'open' | 'resolved' | 'ignored'
  resolvedAt?: string
  resolvedBy?: string
}

export type GenerateReportInput = {
  reportDate: string // YYYY-MM-DD
}

// ─── Generate Daily Reconciliation Report ─────────────────────────

/**
 * Generate (or regenerate) the daily reconciliation report for a given date.
 * Aggregates sales, payments, refunds, cash drawer, and cross-checks with the ledger.
 */
export async function generateDailyReconciliation(input: GenerateReportInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()
  const tenantId = user.tenantId!
  const { reportDate } = input

  // Date range for the report day
  const dayStart = `${reportDate}T00:00:00.000Z`
  const dayEnd = `${reportDate}T23:59:59.999Z`

  // ─── 1. Sales totals ─────────────────────────────────────────
  const { data: sales } = await supabase
    .from('sales')
    .select('id, subtotal_cents, tax_cents, total_cents, tip_cents, discount_cents, status')
    .eq('tenant_id', tenantId)
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)

  const validSales = (sales ?? []).filter((s: any) => s.status !== 'voided' && s.status !== 'draft')
  const totalSalesCount = validSales.length
  const totalRevenueCents = validSales.reduce(
    (sum: number, s: any) => sum + (s.total_cents ?? 0),
    0
  )
  const totalTipsCents = validSales.reduce((sum: number, s: any) => sum + (s.tip_cents ?? 0), 0)
  const totalTaxCents = validSales.reduce((sum: number, s: any) => sum + (s.tax_cents ?? 0), 0)

  // ─── 2. Payment method breakdown ─────────────────────────────
  const { data: payments } = await supabase
    .from('commerce_payments')
    .select('amount_cents, payment_method, status')
    .eq('tenant_id', tenantId)
    .in('status', ['captured', 'settled'])
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)

  let cashTotalCents = 0
  let cardTotalCents = 0
  let otherTotalCents = 0

  for (const p of (payments ?? []) as any[]) {
    if (p.payment_method === 'cash') cashTotalCents += p.amount_cents
    else if (p.payment_method === 'card') cardTotalCents += p.amount_cents
    else otherTotalCents += p.amount_cents
  }

  // ─── 3. Refunds ──────────────────────────────────────────────
  const { data: refunds } = await supabase
    .from('commerce_refunds')
    .select('amount_cents, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'processed')
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)

  const totalRefundsCents = (refunds ?? []).reduce(
    (sum: number, r: any) => sum + (r.amount_cents ?? 0),
    0
  )

  const netRevenueCents = totalRevenueCents - totalRefundsCents

  // ─── 4. Cash drawer (from register sessions closed today) ────
  let openingCashCents: number | null = null
  let closingCashCents: number | null = null
  let expectedCashCents: number | null = null
  let cashVarianceCents: number | null = null

  const { data: sessions } = await supabase
    .from('register_sessions')
    .select('opening_cash_cents, closing_cash_cents, expected_cash_cents, cash_variance_cents')
    .eq('tenant_id', tenantId)
    .eq('status', 'closed')
    .gte('closed_at', dayStart)
    .lte('closed_at', dayEnd)

  if (sessions && sessions.length > 0) {
    openingCashCents = (sessions as any[]).reduce((sum, s) => sum + (s.opening_cash_cents ?? 0), 0)
    closingCashCents = (sessions as any[]).reduce((sum, s) => sum + (s.closing_cash_cents ?? 0), 0)
    expectedCashCents = (sessions as any[]).reduce(
      (sum, s) => sum + (s.expected_cash_cents ?? 0),
      0
    )
    cashVarianceCents = (sessions as any[]).reduce(
      (sum, s) => sum + (s.cash_variance_cents ?? 0),
      0
    )
  }

  // ─── 5. Ledger cross-check ───────────────────────────────────
  const { data: ledgerEntries } = await supabase
    .from('ledger_entries')
    .select('amount_cents, entry_type, is_refund')
    .eq('tenant_id', tenantId)
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)

  const ledgerTotalCents = (ledgerEntries ?? []).reduce((sum: number, e: any) => {
    if (e.is_refund) return sum - (e.amount_cents ?? 0)
    if (e.entry_type === 'expense') return sum - (e.amount_cents ?? 0)
    return sum + (e.amount_cents ?? 0)
  }, 0)

  const paymentLedgerDiffCents =
    cashTotalCents + cardTotalCents + otherTotalCents - ledgerTotalCents

  // ─── 6. Generate flags ───────────────────────────────────────
  const flags: ReconciliationFlag[] = []

  // Cash variance flag
  if (cashVarianceCents !== null && Math.abs(cashVarianceCents) > 100) {
    flags.push({
      type: 'cash_variance',
      severity: Math.abs(cashVarianceCents) > 1000 ? 'error' : 'warning',
      message: `Cash drawer variance: $${(cashVarianceCents / 100).toFixed(2)}`,
      status: 'open',
    })
  }

  // Payment-ledger mismatch flag
  if (Math.abs(paymentLedgerDiffCents) > 0) {
    flags.push({
      type: 'payment_ledger_mismatch',
      severity: Math.abs(paymentLedgerDiffCents) > 1000 ? 'error' : 'warning',
      message: `Payment vs ledger difference: $${(paymentLedgerDiffCents / 100).toFixed(2)}`,
      status: 'open',
    })
  }

  // High refund ratio flag
  if (totalRevenueCents > 0 && totalRefundsCents / totalRevenueCents > 0.15) {
    flags.push({
      type: 'high_refund_ratio',
      severity: 'warning',
      message: `Refunds are ${((totalRefundsCents / totalRevenueCents) * 100).toFixed(1)}% of revenue`,
      status: 'open',
    })
  }

  // ─── 7. Upsert the report ───────────────────────────────────
  const { data: report, error } = await supabase
    .from('daily_reconciliation_reports')
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
        flags: JSON.stringify(flags),
        reviewed: false,
        reviewed_by: null,
        reviewed_at: null,
      } as any,
      { onConflict: 'tenant_id,report_date' }
    )
    .select('id')
    .single()

  if (error) throw new Error(`Failed to generate reconciliation report: ${error.message}`)

  revalidatePath('/commerce/reconciliation')
  return { reportId: (report as any)?.id, flags }
}

// ─── List Reconciliation Reports ──────────────────────────────────

export async function listReconciliationReports(opts?: { limit?: number; offset?: number }) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  const limit = opts?.limit ?? 30
  const offset = opts?.offset ?? 0

  const { data, error, count } = await supabase
    .from('daily_reconciliation_reports')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .order('report_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`Failed to list reports: ${error.message}`)
  return { reports: data ?? [], total: count ?? 0 }
}

// ─── Get Single Report ────────────────────────────────────────────

export async function getReconciliationReport(reportId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('daily_reconciliation_reports')
    .select('*')
    .eq('id', reportId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) throw new Error('Report not found')
  return data
}

// ─── Mark Report as Reviewed ──────────────────────────────────────

export async function reviewReconciliationReport(reportId: string, notes?: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  const { error } = await supabase
    .from('daily_reconciliation_reports')
    .update({
      reviewed: true,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      notes: notes ?? null,
    } as any)
    .eq('id', reportId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to review report: ${error.message}`)
  revalidatePath('/commerce/reconciliation')
}

// ─── Resolve a Flag ───────────────────────────────────────────────

export async function resolveReconciliationFlag(
  reportId: string,
  flagIndex: number,
  resolution: 'resolved' | 'ignored'
) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  // Fetch current flags
  const { data: report, error: fetchErr } = await supabase
    .from('daily_reconciliation_reports')
    .select('flags')
    .eq('id', reportId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !report) throw new Error('Report not found')

  const flags: ReconciliationFlag[] = JSON.parse(
    typeof (report as any).flags === 'string'
      ? (report as any).flags
      : JSON.stringify((report as any).flags)
  )

  if (flagIndex < 0 || flagIndex >= flags.length) {
    throw new Error('Invalid flag index')
  }

  flags[flagIndex].status = resolution
  flags[flagIndex].resolvedAt = new Date().toISOString()
  flags[flagIndex].resolvedBy = user.id

  const { error } = await supabase
    .from('daily_reconciliation_reports')
    .update({ flags: JSON.stringify(flags) } as any)
    .eq('id', reportId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to resolve flag: ${error.message}`)
  revalidatePath('/commerce/reconciliation')
}

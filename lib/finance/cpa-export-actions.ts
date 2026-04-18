'use server'
// Canonical CPA Export Actions
// Single authoritative read model, validation, and export-package builder.
// All CPA-facing surfaces must use this module. Never use quoted_price_cents
// or event status as revenue truth here.

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { buildCsvSafe } from '@/lib/security/csv-sanitize'
import { strFromU8, zipSync } from 'fflate'

// ============================================================
// Types
// ============================================================

export type CpaReadinessBlocker = {
  code: string
  message: string
  repairPath?: string
  context?: Record<string, unknown>
}

export type CpaReadinessWarning = {
  code: string
  message: string
}

export type ScheduleCSummary = {
  taxYear: number
  serviceRevenueCents: number
  tipsCents: number
  posRevenueCents: number
  totalGrossRevenueCents: number
  totalRefundsCents: number
  netRevenueCents: number
  salesTaxLiabilityCents: number
  paymentProcessingFeesCents: number
  cogsExpensesCents: number
  otherBusinessExpensesCents: number
  totalDeductibleExpensesCents: number
  payrollCents: number
  contractorPaymentsCents: number
  mileageDeductionCents: number
  netProfitCents: number
  ownerDrawsTotalCents: number
}

export type AccountingDetailRow = {
  rowType: string
  sourceTable: string
  sourceId: string
  accountingDate: string
  channel: string
  clientName: string
  eventOrInvoice: string
  grossCents: number
  feeCents: number
  refundCents: number
  netCents: number
  tipCents: number
  salesTaxCents: number
  cogsCents: number
  scheduleCLine: string
  taxClassification: string
  hasReceipt: boolean
  isOwnerDraw: boolean
  notes: string
}

export type CpaExportManifest = {
  schemaVersion: string
  taxYear: number
  generatedAt: string
  tenantId: string
  blockerCount: number
  warningCount: number
  detailRowCount: number
  checksumSeed: string
}

export type CpaExportDataset = {
  readiness: {
    blockers: CpaReadinessBlocker[]
    warnings: CpaReadinessWarning[]
    isExportReady: boolean
  }
  scheduleCSummary: ScheduleCSummary
  accountingDetailRows: AccountingDetailRow[]
  manifest: CpaExportManifest
  lastExportRun?: {
    id: string
    exportNumber: number
    generatedAt: string
    filename: string
    detailRowCount: number
  } | null
}

// ============================================================
// Internal helpers
// ============================================================

const SCHEMA_VERSION = '1.0'

// Categories that map deterministically to a single Schedule C line.
// "equipment" and "other" are ambiguous and require explicit mapping.
const DETERMINISTIC_CATEGORY_MAP: Record<string, string> = {
  groceries: 'cogs',
  alcohol: 'cogs',
  specialty_items: 'cogs',
  gas_mileage: 'line_9',
  vehicle: 'line_9',
  supplies: 'line_22',
  venue_rental: 'line_27a',
  labor: 'line_26',
  uniforms: 'line_27a',
  subscriptions: 'line_27a',
  marketing: 'line_8',
  insurance_licenses: 'line_15',
  professional_services: 'line_17',
  education: 'line_27a',
  utilities: 'line_25',
}

// Categories that require an explicit mapping in expense_tax_categories before export.
const AMBIGUOUS_CATEGORIES = new Set(['equipment', 'other'])

function canonicalDate(primary: string | null, fallback: string | null): string {
  return (primary ?? fallback ?? '').slice(0, 10)
}

function simpleChecksum(value: string): string {
  let h = 0
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(16).padStart(8, '0')
}

// ============================================================
// buildCpaExportDataset
// Pure read + validation. No writes.
// ============================================================

export async function buildCpaExportDataset(year: number): Promise<CpaExportDataset> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // ---- Parallel data fetches ----
  const [
    ledgerResult,
    expensesResult,
    taxCatResult,
    salesResult,
    saleItemsResult,
    commercePaymentsResult,
    commerceRefundsResult,
    settlementResult,
    dailyTaxResult,
    eventSalesTaxResult,
    payrollResult,
    contractorResult,
    mileageResult,
    ownerDrawsResult,
    lastExportResult,
  ] = await Promise.all([
    db
      .from('ledger_entries')
      .select(
        'id, entry_type, amount_cents, is_refund, received_at, created_at, event_id, client_id, payment_method, description, transaction_reference'
      )
      .eq('tenant_id', tenantId)
      .gte('created_at', yearStart + 'T00:00:00Z')
      .lte('created_at', yearEnd + 'T23:59:59Z')
      .limit(100_000),

    db
      .from('expenses')
      .select(
        'id, amount_cents, category, expense_date, vendor_name, description, is_business, tax_deductible, event_id, receipt_photo_url, receipt_uploaded'
      )
      .eq('tenant_id', tenantId)
      .gte('expense_date', yearStart)
      .lte('expense_date', yearEnd)
      .limit(100_000),

    db
      .from('expense_tax_categories')
      .select('id, source_id, schedule_c_line, amount_cents, tax_year, source')
      .eq('tenant_id', tenantId)
      .eq('tax_year', year)
      .eq('source', 'expense'),

    db
      .from('sales')
      .select('id, sale_date, total_cents, tax_cents, net_cents, channel, location_id')
      .eq('tenant_id', tenantId)
      .gte('sale_date', yearStart)
      .lte('sale_date', yearEnd)
      .limit(100_000),

    db
      .from('sale_items')
      .select('id, sale_id, unit_cost_cents, quantity')
      .eq('tenant_id', tenantId)
      .limit(200_000),

    db
      .from('commerce_payments')
      .select(
        'id, sale_id, amount_cents, fee_cents, net_amount_cents, payment_method, settled_at, captured_at, created_at'
      )
      .eq('tenant_id', tenantId)
      .gte('created_at', yearStart + 'T00:00:00Z')
      .lte('created_at', yearEnd + 'T23:59:59Z')
      .limit(100_000),

    db
      .from('commerce_refunds')
      .select('id, sale_id, amount_cents, processed_at, created_at, reason')
      .eq('tenant_id', tenantId)
      .gte('created_at', yearStart + 'T00:00:00Z')
      .lte('created_at', yearEnd + 'T23:59:59Z')
      .limit(100_000),

    db
      .from('settlement_records')
      .select('id, total_fees_cents, payout_date, period_start, period_end')
      .eq('tenant_id', tenantId)
      .gte('payout_date', yearStart)
      .lte('payout_date', yearEnd)
      .limit(10_000),

    db
      .from('daily_tax_summary')
      .select('id, summary_date, tax_collected_cents, tax_remitted_cents')
      .eq('tenant_id', tenantId)
      .gte('summary_date', yearStart)
      .lte('summary_date', yearEnd)
      .limit(10_000),

    db
      .from('event_sales_tax')
      .select('id, event_id, tax_amount_cents, collected_at')
      .eq('tenant_id', tenantId)
      .limit(10_000),

    db
      .from('payroll_records')
      .select('id, pay_date, gross_pay_cents, employee_id')
      .eq('tenant_id', tenantId)
      .gte('pay_date', yearStart)
      .lte('pay_date', yearEnd)
      .limit(10_000),

    db
      .from('contractor_payments')
      .select('id, payment_date, amount_cents, description')
      .eq('tenant_id', tenantId)
      .gte('payment_date', yearStart)
      .lte('payment_date', yearEnd)
      .limit(10_000),

    db
      .from('mileage_logs')
      .select('id, log_date, miles, deduction_cents, purpose')
      .eq('chef_id', tenantId)
      .gte('log_date', yearStart)
      .lte('log_date', yearEnd)
      .limit(10_000),

    db
      .from('owner_draws')
      .select('id, draw_date, amount_cents, payment_method, description')
      .eq('tenant_id', tenantId)
      .gte('draw_date', yearStart)
      .lte('draw_date', yearEnd)
      .limit(10_000),

    db
      .from('tax_export_runs')
      .select('id, export_number, generated_at, filename, detail_row_count')
      .eq('tenant_id', tenantId)
      .eq('tax_year', year)
      .order('export_number', { ascending: false })
      .limit(1),
  ])

  // ---- Fail closed on critical fetch errors ----
  const blockers: CpaReadinessBlocker[] = []
  const warnings: CpaReadinessWarning[] = []

  if (ledgerResult.error) {
    blockers.push({
      code: 'ledger_fetch_failed',
      message: 'Could not load ledger entries. Revenue figures are unavailable.',
    })
  }
  if (expensesResult.error) {
    blockers.push({
      code: 'expenses_fetch_failed',
      message: 'Could not load expenses. Expense deductions are unavailable.',
    })
  }
  if (payrollResult.error) {
    blockers.push({
      code: 'payroll_fetch_failed',
      message: 'Could not load payroll records. Payroll deductions are unavailable.',
      repairPath: '/finance/payroll',
    })
  }

  if (blockers.length > 0) {
    return {
      readiness: { blockers, warnings, isExportReady: false },
      scheduleCSummary: buildEmptySummary(year),
      accountingDetailRows: [],
      manifest: buildManifest(year, tenantId, blockers.length, warnings.length, 0),
      lastExportRun: null,
    }
  }

  const ledgerEntries: any[] = ledgerResult.data ?? []
  const expenses: any[] = expensesResult.data ?? []
  const taxCatRows: any[] = taxCatResult.data ?? []
  const sales: any[] = salesResult.data ?? []
  const saleItems: any[] = saleItemsResult.data ?? []
  const commercePayments: any[] = commercePaymentsResult.data ?? []
  const commerceRefunds: any[] = commerceRefundsResult.data ?? []
  const settlements: any[] = settlementResult.data ?? []
  const eventSalesTaxRows: any[] = eventSalesTaxResult.data ?? []
  const payrollRows: any[] = payrollResult.data ?? []
  const contractorRows: any[] = contractorResult.data ?? []
  const mileageLogs: any[] = mileageResult.data ?? []
  const ownerDraws: any[] = ownerDrawsResult.data ?? []
  const lastExportRun = lastExportResult.data?.[0] ?? null

  // ---- Build expense -> tax-category index ----
  // The authoritative mapping per expense row is in expense_tax_categories.
  // If a row exists there for an expense id, that wins. Otherwise fall back to
  // the deterministic map. Ambiguous categories with no mapping block export.
  const taxCatByExpenseId = new Map<string, string>()
  for (const row of taxCatRows) {
    if (row.source_id) {
      taxCatByExpenseId.set(row.source_id, row.schedule_c_line)
    }
  }

  // ---- Check for unresolved ambiguous expense categories ----
  const unresolvedExpenses: any[] = []
  for (const exp of expenses) {
    if (!exp.is_business) continue
    if (!taxCatByExpenseId.has(exp.id)) {
      if (AMBIGUOUS_CATEGORIES.has(exp.category)) {
        unresolvedExpenses.push(exp)
      }
    }
  }

  if (unresolvedExpenses.length > 0) {
    blockers.push({
      code: 'unresolved_tax_categories',
      message: `${unresolvedExpenses.length} expense(s) have ambiguous categories and need explicit Schedule C line assignment before export.`,
      repairPath: '/expenses',
      context: {
        expenseIds: unresolvedExpenses.map((e) => e.id),
        descriptions: unresolvedExpenses.map((e) => e.description).slice(0, 5),
      },
    })
  }

  // ---- Revenue: ledger entries ----
  let serviceRevenueCents = 0
  let tipsCents = 0
  let ledgerRefundsCents = 0
  let salesTaxLiabilityFromEvents = 0

  for (const row of eventSalesTaxRows) {
    salesTaxLiabilityFromEvents += row.tax_amount_cents ?? 0
  }

  // ---- POS revenue ----
  let posRevenueCents = 0
  let posRefundsCents = 0
  let posCogsCents = 0
  let posSalesTaxCents = 0

  // Build sale -> items cost map
  const saleCostMap = new Map<string, number>()
  for (const item of saleItems) {
    const cost = (item.unit_cost_cents ?? 0) * (item.quantity ?? 1)
    saleCostMap.set(item.sale_id, (saleCostMap.get(item.sale_id) ?? 0) + cost)
  }

  // Settlement fees - total for the year, allocated proportionally
  const totalSettlementFeesCents = settlements.reduce(
    (s: number, r: any) => s + (r.total_fees_cents ?? 0),
    0
  )

  // Daily tax summary for POS
  for (const dts of dailyTaxResult.data ?? []) {
    posSalesTaxCents += dts.tax_collected_cents ?? 0
  }

  // ---- Build accounting detail rows ----
  const detailRows: AccountingDetailRow[] = []

  // Ledger revenue rows
  for (const entry of ledgerEntries) {
    const isRefund = entry.is_refund || entry.entry_type === 'refund'
    const isTip = entry.entry_type === 'tip'
    const accountingDate = canonicalDate(entry.received_at, entry.created_at)

    if (isRefund) {
      ledgerRefundsCents += Math.abs(entry.amount_cents ?? 0)
      detailRows.push({
        rowType: 'refund',
        sourceTable: 'ledger_entries',
        sourceId: entry.id,
        accountingDate,
        channel: 'service',
        clientName: '',
        eventOrInvoice: entry.event_id ?? '',
        grossCents: 0,
        feeCents: 0,
        refundCents: Math.abs(entry.amount_cents ?? 0),
        netCents: -Math.abs(entry.amount_cents ?? 0),
        tipCents: 0,
        salesTaxCents: 0,
        cogsCents: 0,
        scheduleCLine: '',
        taxClassification: '',
        hasReceipt: false,
        isOwnerDraw: false,
        notes: entry.description ?? '',
      })
    } else if (isTip) {
      tipsCents += entry.amount_cents ?? 0
      detailRows.push({
        rowType: 'tip',
        sourceTable: 'ledger_entries',
        sourceId: entry.id,
        accountingDate,
        channel: 'service',
        clientName: '',
        eventOrInvoice: entry.event_id ?? '',
        grossCents: 0,
        feeCents: 0,
        refundCents: 0,
        netCents: entry.amount_cents ?? 0,
        tipCents: entry.amount_cents ?? 0,
        salesTaxCents: 0,
        cogsCents: 0,
        scheduleCLine: '',
        taxClassification: '',
        hasReceipt: false,
        isOwnerDraw: false,
        notes: entry.description ?? '',
      })
    } else {
      serviceRevenueCents += entry.amount_cents ?? 0
      detailRows.push({
        rowType: 'service_revenue',
        sourceTable: 'ledger_entries',
        sourceId: entry.id,
        accountingDate,
        channel: 'service',
        clientName: '',
        eventOrInvoice: entry.event_id ?? '',
        grossCents: entry.amount_cents ?? 0,
        feeCents: 0,
        refundCents: 0,
        netCents: entry.amount_cents ?? 0,
        tipCents: 0,
        salesTaxCents: 0,
        cogsCents: 0,
        scheduleCLine: '',
        taxClassification: '',
        hasReceipt: false,
        isOwnerDraw: false,
        notes: entry.description ?? '',
      })
    }
  }

  // POS payments
  for (const cp of commercePayments) {
    const accountingDate = canonicalDate(cp.settled_at ?? cp.captured_at, cp.created_at)
    const net = cp.net_amount_cents ?? cp.amount_cents ?? 0
    posRevenueCents += cp.amount_cents ?? 0
    detailRows.push({
      rowType: 'pos_payment',
      sourceTable: 'commerce_payments',
      sourceId: cp.id,
      accountingDate,
      channel: 'pos',
      clientName: '',
      eventOrInvoice: cp.sale_id ?? '',
      grossCents: cp.amount_cents ?? 0,
      feeCents: cp.fee_cents ?? 0,
      refundCents: 0,
      netCents: net,
      tipCents: 0,
      salesTaxCents: 0,
      cogsCents: 0,
      scheduleCLine: '',
      taxClassification: '',
      hasReceipt: false,
      isOwnerDraw: false,
      notes: '',
    })
  }

  // POS refunds
  for (const ref of commerceRefunds) {
    const accountingDate = canonicalDate(ref.processed_at, ref.created_at)
    posRefundsCents += ref.amount_cents ?? 0
    detailRows.push({
      rowType: 'pos_refund',
      sourceTable: 'commerce_refunds',
      sourceId: ref.id,
      accountingDate,
      channel: 'pos',
      clientName: '',
      eventOrInvoice: ref.sale_id ?? '',
      grossCents: 0,
      feeCents: 0,
      refundCents: ref.amount_cents ?? 0,
      netCents: -(ref.amount_cents ?? 0),
      tipCents: 0,
      salesTaxCents: 0,
      cogsCents: 0,
      scheduleCLine: '',
      taxClassification: '',
      hasReceipt: false,
      isOwnerDraw: false,
      notes: ref.reason ?? '',
    })
  }

  // POS COGS from sale items
  for (const [saleId, costCents] of saleCostMap) {
    if (costCents > 0) {
      posCogsCents += costCents
    }
  }

  // Expenses (use authoritative tax mapping where available)
  let cogsExpensesCents = 0
  let otherBusinessExpensesCents = 0

  for (const exp of expenses) {
    if (!exp.is_business) continue
    const accountingDate = exp.expense_date ?? ''
    const scheduleLine =
      taxCatByExpenseId.get(exp.id) ?? DETERMINISTIC_CATEGORY_MAP[exp.category] ?? 'line_27a'

    // Only count toward deductible totals if tax_deductible is true (default).
    // Non-deductible business expenses still appear in the detail rows for
    // accounting completeness but are excluded from Schedule C deductions.
    const isDeductible = exp.tax_deductible !== false
    if (isDeductible) {
      if (scheduleLine === 'cogs') {
        cogsExpensesCents += exp.amount_cents ?? 0
      } else {
        otherBusinessExpensesCents += exp.amount_cents ?? 0
      }
    }

    detailRows.push({
      rowType: 'expense',
      sourceTable: 'expenses',
      sourceId: exp.id,
      accountingDate,
      channel: 'expense',
      clientName: '',
      eventOrInvoice: exp.event_id ?? '',
      grossCents: 0,
      feeCents: 0,
      refundCents: 0,
      netCents: -(exp.amount_cents ?? 0),
      tipCents: 0,
      salesTaxCents: 0,
      cogsCents: scheduleLine === 'cogs' ? (exp.amount_cents ?? 0) : 0,
      scheduleCLine: scheduleLine,
      taxClassification: scheduleLine,
      hasReceipt: !!(exp.receipt_photo_url || exp.receipt_uploaded),
      isOwnerDraw: false,
      notes: [exp.vendor_name, exp.description].filter(Boolean).join(' - '),
    })
  }

  // Payroll
  let payrollCents = 0
  for (const pr of payrollRows) {
    payrollCents += pr.gross_pay_cents ?? 0
    detailRows.push({
      rowType: 'payroll',
      sourceTable: 'payroll_records',
      sourceId: pr.id,
      accountingDate: pr.pay_date ?? '',
      channel: 'payroll',
      clientName: '',
      eventOrInvoice: '',
      grossCents: 0,
      feeCents: 0,
      refundCents: 0,
      netCents: -(pr.gross_pay_cents ?? 0),
      tipCents: 0,
      salesTaxCents: 0,
      cogsCents: 0,
      scheduleCLine: 'line_26',
      taxClassification: 'line_26',
      hasReceipt: false,
      isOwnerDraw: false,
      notes: '',
    })
  }

  // Contractor payments
  let contractorPaymentsCents = 0
  for (const cp of contractorRows) {
    contractorPaymentsCents += cp.amount_cents ?? 0
    detailRows.push({
      rowType: 'contractor_payment',
      sourceTable: 'contractor_payments',
      sourceId: cp.id,
      accountingDate: cp.payment_date ?? '',
      channel: 'contractor',
      clientName: '',
      eventOrInvoice: '',
      grossCents: 0,
      feeCents: 0,
      refundCents: 0,
      netCents: -(cp.amount_cents ?? 0),
      tipCents: 0,
      salesTaxCents: 0,
      cogsCents: 0,
      scheduleCLine: 'line_11',
      taxClassification: 'line_11',
      hasReceipt: false,
      isOwnerDraw: false,
      notes: cp.description ?? '',
    })
  }

  // Mileage
  let mileageDeductionCents = 0
  for (const ml of mileageLogs) {
    mileageDeductionCents += ml.deduction_cents ?? 0
    detailRows.push({
      rowType: 'mileage',
      sourceTable: 'mileage_logs',
      sourceId: ml.id,
      accountingDate: ml.log_date ?? '',
      channel: 'mileage',
      clientName: '',
      eventOrInvoice: '',
      grossCents: 0,
      feeCents: 0,
      refundCents: 0,
      netCents: -(ml.deduction_cents ?? 0),
      tipCents: 0,
      salesTaxCents: 0,
      cogsCents: 0,
      scheduleCLine: 'line_9',
      taxClassification: 'line_9',
      hasReceipt: false,
      isOwnerDraw: false,
      notes: ml.purpose ?? '',
    })
  }

  // Owner draws (excluded from P&L totals, detail only)
  let ownerDrawsTotalCents = 0
  for (const od of ownerDraws) {
    ownerDrawsTotalCents += od.amount_cents ?? 0
    detailRows.push({
      rowType: 'owner_draw',
      sourceTable: 'owner_draws',
      sourceId: od.id,
      accountingDate: od.draw_date ?? '',
      channel: 'owner_draw',
      clientName: '',
      eventOrInvoice: '',
      grossCents: 0,
      feeCents: 0,
      refundCents: 0,
      netCents: -(od.amount_cents ?? 0),
      tipCents: 0,
      salesTaxCents: 0,
      cogsCents: 0,
      scheduleCLine: '',
      taxClassification: 'owner_draw',
      hasReceipt: false,
      isOwnerDraw: true,
      notes: od.description ?? '',
    })
  }

  // ---- Compute summary totals ----
  const totalGrossRevenueCents = serviceRevenueCents + posRevenueCents
  const totalRefundsCents = ledgerRefundsCents + posRefundsCents
  const salesTaxLiabilityCents = salesTaxLiabilityFromEvents + posSalesTaxCents
  const netRevenueCents = totalGrossRevenueCents - totalRefundsCents
  const totalDeductibleExpensesCents =
    cogsExpensesCents +
    otherBusinessExpensesCents +
    payrollCents +
    contractorPaymentsCents +
    mileageDeductionCents +
    posCogsCents
  const netProfitCents = netRevenueCents + tipsCents - totalDeductibleExpensesCents

  const summary: ScheduleCSummary = {
    taxYear: year,
    serviceRevenueCents,
    tipsCents,
    posRevenueCents,
    totalGrossRevenueCents,
    totalRefundsCents,
    netRevenueCents,
    salesTaxLiabilityCents,
    paymentProcessingFeesCents: totalSettlementFeesCents,
    cogsExpensesCents: cogsExpensesCents + posCogsCents,
    otherBusinessExpensesCents,
    totalDeductibleExpensesCents,
    payrollCents,
    contractorPaymentsCents,
    mileageDeductionCents,
    netProfitCents,
    ownerDrawsTotalCents,
  }

  // ---- Warnings (non-blocking) ----
  if (mileageLogs.length === 0 && mileageDeductionCents === 0) {
    warnings.push({
      code: 'no_mileage_logged',
      message: 'No mileage was logged this year. If you drove for business, add mileage entries.',
    })
  }

  const checksumSeed = simpleChecksum(
    `${tenantId}:${year}:${serviceRevenueCents}:${tipsCents}:${totalDeductibleExpensesCents}:${detailRows.length}`
  )

  const manifest = buildManifest(
    year,
    tenantId,
    blockers.length,
    warnings.length,
    detailRows.length,
    checksumSeed
  )

  return {
    readiness: {
      blockers,
      warnings,
      isExportReady: blockers.length === 0,
    },
    scheduleCSummary: summary,
    accountingDetailRows: detailRows,
    manifest,
    lastExportRun: lastExportRun
      ? {
          id: lastExportRun.id,
          exportNumber: lastExportRun.export_number,
          generatedAt: lastExportRun.generated_at,
          filename: lastExportRun.filename,
          detailRowCount: lastExportRun.detail_row_count,
        }
      : null,
  }
}

// ============================================================
// generateCpaExportPackage
// Persists a tax_export_runs row and returns zip bytes.
// ============================================================

export async function generateCpaExportPackage(
  year: number
): Promise<{ filename: string; bytes: Uint8Array; checksum: string; exportRunId: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const dataset = await buildCpaExportDataset(year)

  if (!dataset.readiness.isExportReady) {
    const first = dataset.readiness.blockers[0]
    throw new Error(`Export blocked: ${first?.message ?? 'unresolved issues remain'}`)
  }

  const { scheduleCSummary: summary, accountingDetailRows: detailRows, manifest } = dataset

  // ---- Build schedule_c_summary.csv ----
  const summaryHeaders = [
    'Tax Year',
    'Service Revenue ($)',
    'Tips ($)',
    'POS Revenue ($)',
    'Total Gross Revenue ($)',
    'Total Refunds ($)',
    'Net Revenue ($)',
    'Sales Tax Liability ($)',
    'Payment Processing Fees ($)',
    'COGS Expenses ($)',
    'Other Business Expenses ($)',
    'Payroll ($)',
    'Contractor Payments ($)',
    'Mileage Deduction ($)',
    'Total Deductible Expenses ($)',
    'Net Profit ($)',
    'Owner Draws ($)',
  ]
  const cents2d = (c: number) => (c / 100).toFixed(2)
  const summaryRow = [
    summary.taxYear,
    cents2d(summary.serviceRevenueCents),
    cents2d(summary.tipsCents),
    cents2d(summary.posRevenueCents),
    cents2d(summary.totalGrossRevenueCents),
    cents2d(summary.totalRefundsCents),
    cents2d(summary.netRevenueCents),
    cents2d(summary.salesTaxLiabilityCents),
    cents2d(summary.paymentProcessingFeesCents),
    cents2d(summary.cogsExpensesCents),
    cents2d(summary.otherBusinessExpensesCents),
    cents2d(summary.payrollCents),
    cents2d(summary.contractorPaymentsCents),
    cents2d(summary.mileageDeductionCents),
    cents2d(summary.totalDeductibleExpensesCents),
    cents2d(summary.netProfitCents),
    cents2d(summary.ownerDrawsTotalCents),
  ]
  const summaryCsv = buildCsvSafe(summaryHeaders, [summaryRow])

  // ---- Build accounting_detail.csv ----
  const detailHeaders = [
    'Row Type',
    'Source Table',
    'Source ID',
    'Accounting Date',
    'Channel',
    'Client / Event',
    'Gross ($)',
    'Fee ($)',
    'Refund ($)',
    'Net ($)',
    'Tip ($)',
    'Sales Tax ($)',
    'COGS ($)',
    'Schedule C Line',
    'Tax Classification',
    'Has Receipt',
    'Owner Draw',
    'Notes',
  ]
  const detailRows2d = detailRows.map((r) => [
    r.rowType,
    r.sourceTable,
    r.sourceId,
    r.accountingDate,
    r.channel,
    r.eventOrInvoice || r.clientName,
    cents2d(r.grossCents),
    cents2d(r.feeCents),
    cents2d(r.refundCents),
    cents2d(r.netCents),
    cents2d(r.tipCents),
    cents2d(r.salesTaxCents),
    cents2d(r.cogsCents),
    r.scheduleCLine,
    r.taxClassification,
    r.hasReceipt ? 'YES' : 'NO',
    r.isOwnerDraw ? 'YES' : 'NO',
    r.notes,
  ])
  const detailCsv = buildCsvSafe(detailHeaders, detailRows2d)

  // ---- Build manifest.json ----
  const checksumSeed = simpleChecksum(summaryCsv + detailCsv)
  const fullManifest: CpaExportManifest = {
    ...manifest,
    checksumSeed,
  }
  const manifestJson = JSON.stringify(fullManifest, null, 2)

  // ---- Package into zip ----
  const encoder = new TextEncoder()
  const zipFiles: Record<string, Uint8Array> = {
    [`cpa-export-${year}/schedule_c_summary.csv`]: encoder.encode(summaryCsv),
    [`cpa-export-${year}/accounting_detail.csv`]: encoder.encode(detailCsv),
    [`cpa-export-${year}/manifest.json`]: encoder.encode(manifestJson),
  }
  const bytes = zipSync(zipFiles)

  // ---- Determine export number ----
  const { data: existing } = await db
    .from('tax_export_runs')
    .select('export_number')
    .eq('tenant_id', tenantId)
    .eq('tax_year', year)
    .order('export_number', { ascending: false })
    .limit(1)

  const nextExportNumber = ((existing?.[0]?.export_number ?? 0) as number) + 1
  const filename = `chefflow-cpa-export-${year}-v${nextExportNumber}.zip`

  // ---- Create or confirm period lock for past years ----
  const currentYear = new Date().getFullYear()
  let lockedPeriodId: string | null = null
  if (year < currentYear) {
    const periodStart = `${year}-01-01`
    const periodEnd = `${year}-12-31`
    const { data: lock } = await db
      .from('accounting_period_locks')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('period_type', 'tax_year')
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .limit(1)

    if (lock && lock.length > 0) {
      lockedPeriodId = lock[0].id
    } else {
      const { data: newLock } = await db
        .from('accounting_period_locks')
        .insert({
          tenant_id: tenantId,
          period_type: 'tax_year',
          period_start: periodStart,
          period_end: periodEnd,
          locked_by: user.id,
          reason: `Auto-locked on first CPA export for ${year}`,
        })
        .select('id')
        .single()
      lockedPeriodId = newLock?.id ?? null
    }
  }

  // ---- Persist tax_export_runs row ----
  const { data: exportRun, error: runError } = await db
    .from('tax_export_runs')
    .insert({
      tenant_id: tenantId,
      tax_year: year,
      export_number: nextExportNumber,
      schema_version: SCHEMA_VERSION,
      locked_period_id: lockedPeriodId,
      checksum: checksumSeed,
      filename,
      detail_row_count: detailRows.length,
      summary_json: summary,
      generated_by: user.id,
    })
    .select('id')
    .single()

  if (runError) {
    throw new Error(`Failed to record export run: ${runError.message}`)
  }

  revalidatePath('/finance/year-end')
  revalidatePath('/finance/tax')

  return {
    filename,
    bytes,
    checksum: checksumSeed,
    exportRunId: exportRun.id,
  }
}

// ============================================================
// Helper: get export readiness summary for UI display
// ============================================================

export async function getCpaExportReadiness(year: number): Promise<{
  isReady: boolean
  blockers: CpaReadinessBlocker[]
  warnings: CpaReadinessWarning[]
  lastExportRun: CpaExportDataset['lastExportRun']
  scheduleCSummary: ScheduleCSummary
}> {
  const dataset = await buildCpaExportDataset(year)
  return {
    isReady: dataset.readiness.isExportReady,
    blockers: dataset.readiness.blockers,
    warnings: dataset.readiness.warnings,
    lastExportRun: dataset.lastExportRun ?? null,
    scheduleCSummary: dataset.scheduleCSummary,
  }
}

// ============================================================
// Helpers
// ============================================================

function buildEmptySummary(year: number): ScheduleCSummary {
  return {
    taxYear: year,
    serviceRevenueCents: 0,
    tipsCents: 0,
    posRevenueCents: 0,
    totalGrossRevenueCents: 0,
    totalRefundsCents: 0,
    netRevenueCents: 0,
    salesTaxLiabilityCents: 0,
    paymentProcessingFeesCents: 0,
    cogsExpensesCents: 0,
    otherBusinessExpensesCents: 0,
    totalDeductibleExpensesCents: 0,
    payrollCents: 0,
    contractorPaymentsCents: 0,
    mileageDeductionCents: 0,
    netProfitCents: 0,
    ownerDrawsTotalCents: 0,
  }
}

function buildManifest(
  year: number,
  tenantId: string,
  blockerCount: number,
  warningCount: number,
  detailRowCount: number,
  checksumSeed = ''
): CpaExportManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    taxYear: year,
    generatedAt: new Date().toISOString(),
    tenantId,
    blockerCount,
    warningCount,
    detailRowCount,
    checksumSeed,
  }
}

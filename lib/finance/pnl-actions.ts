'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getPayrollReportForPeriod } from '@/lib/staffing/actions'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PnLPeriod = 'monthly' | 'quarterly' | 'annual'

export type PnLLineItem = {
  label: string
  amountCents: number
  percentOfRevenue: number
}

export type PnLSection = {
  label: string
  items: PnLLineItem[]
  totalCents: number
  totalPercentOfRevenue: number
}

export type PnLStatement = {
  period: PnLPeriod
  year: number
  month?: number
  quarter?: number
  startDate: string
  endDate: string
  revenue: PnLSection
  cogs: PnLSection
  grossProfitCents: number
  grossMarginPercent: number
  operatingExpenses: PnLSection
  netIncomeCents: number
  netMarginPercent: number
  refundsCents: number
  tipsCents: number
}

export type PnLComparison = {
  current: PnLStatement
  previous: PnLStatement
  changes: {
    revenueDeltaCents: number
    revenueDeltaPercent: number
    cogsDeltaCents: number
    cogsDeltaPercent: number
    grossProfitDeltaCents: number
    grossProfitDeltaPercent: number
    opexDeltaCents: number
    opexDeltaPercent: number
    netIncomeDeltaCents: number
    netIncomeDeltaPercent: number
  }
}

export type PnLTrendPoint = {
  label: string
  startDate: string
  endDate: string
  revenueCents: number
  cogsCents: number
  netIncomeCents: number
  netMarginPercent: number
}

export type ExpenseBreakdownItem = {
  category: string
  label: string
  amountCents: number
  percentOfRevenue: number
  percentOfTotal: number
}

export type CategoryTransaction = {
  id: string
  date: string
  description: string
  amountCents: number
  vendor?: string
  eventId?: string
  eventOccasion?: string
}

// ─── Category Mapping ───────────────────────────────────────────────────────

// Map DB expense_category enum values to P&L sections
const COGS_CATEGORIES = new Set(['groceries', 'alcohol', 'specialty_items', 'supplies'])

const OPEX_CATEGORY_LABELS: Record<string, string> = {
  labor: 'Labor',
  venue_rental: 'Rent / Venue Rental',
  utilities: 'Utilities',
  insurance_licenses: 'Insurance & Licenses',
  marketing: 'Marketing',
  equipment: 'Equipment',
  vehicle: 'Vehicle',
  gas_mileage: 'Gas / Mileage',
  subscriptions: 'Software / Subscriptions',
  professional_services: 'Professional Services',
  education: 'Education / Training',
  uniforms: 'Uniforms',
  other: 'Other Expenses',
}

const COGS_CATEGORY_LABELS: Record<string, string> = {
  groceries: 'Food & Groceries',
  alcohol: 'Alcohol / Beverages',
  specialty_items: 'Specialty Items',
  supplies: 'Supplies & Packaging',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPeriodDates(
  period: PnLPeriod,
  year: number,
  month?: number,
  quarter?: number
): { startDate: string; endDate: string } {
  if (period === 'monthly') {
    const m = month ?? 1
    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 0) // last day of the month
    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
    }
  }
  if (period === 'quarterly') {
    const q = quarter ?? 1
    const startMonth = (q - 1) * 3
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, startMonth + 3, 0)
    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
    }
  }
  // annual
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  }
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function pctOf(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 1000) / 10
}

// ─── Core P&L Generation ────────────────────────────────────────────────────

export async function generatePnL(
  period: PnLPeriod,
  year: number,
  month?: number,
  quarter?: number
): Promise<PnLStatement> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { startDate, endDate } = getPeriodDates(period, year, month, quarter)

  // Fetch all data sources in parallel
  const [ledgerResult, expenseResult, poResult, payroll] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select('entry_type, amount_cents, is_refund')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .limit(50_000),
    supabase
      .from('expenses')
      .select('amount_cents, category')
      .eq('tenant_id', user.tenantId!)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .limit(50_000),
    supabase
      .from('purchase_orders')
      .select('status, actual_total_cents, estimated_total_cents')
      .eq('chef_id', user.tenantId!)
      .in('status', ['partially_received', 'received'])
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .limit(50_000),
    getPayrollReportForPeriod(startDate, endDate).catch(() => ({
      totalLaborCostCents: 0,
    })),
  ])

  if (ledgerResult.error) throw new Error(`Failed to load ledger: ${ledgerResult.error.message}`)
  if (expenseResult.error)
    throw new Error(`Failed to load expenses: ${expenseResult.error.message}`)
  if (poResult.error) throw new Error(`Failed to load purchase orders: ${poResult.error.message}`)

  // ── Revenue from ledger entries ──
  let eventRevenueCents = 0
  let refundsCents = 0
  let tipsCents = 0

  for (const entry of ledgerResult.data ?? []) {
    if (entry.is_refund || entry.entry_type === 'refund') {
      refundsCents += Math.abs(entry.amount_cents)
    } else if (entry.entry_type === 'tip') {
      tipsCents += entry.amount_cents
    } else {
      eventRevenueCents += entry.amount_cents
    }
  }

  const totalRevenueCents = eventRevenueCents - refundsCents

  // ── COGS from expenses table + purchase orders ──
  const cogsByCategory = new Map<string, number>()
  const opexByCategory = new Map<string, number>()

  for (const exp of expenseResult.data ?? []) {
    const cat = exp.category || 'other'
    if (COGS_CATEGORIES.has(cat)) {
      cogsByCategory.set(cat, (cogsByCategory.get(cat) || 0) + exp.amount_cents)
    } else {
      opexByCategory.set(cat, (opexByCategory.get(cat) || 0) + exp.amount_cents)
    }
  }

  // Add purchase orders to COGS (tracked separately as "Purchase Orders")
  const poCents = (poResult.data ?? []).reduce((sum: number, row: any) => {
    return sum + (row.actual_total_cents ?? row.estimated_total_cents ?? 0)
  }, 0)
  if (poCents > 0) {
    cogsByCategory.set('purchase_orders', (cogsByCategory.get('purchase_orders') || 0) + poCents)
  }

  // Add payroll labor to operating expenses
  const laborPayrollCents = (payroll as any).totalLaborCostCents ?? 0
  if (laborPayrollCents > 0) {
    opexByCategory.set('labor', (opexByCategory.get('labor') || 0) + laborPayrollCents)
  }

  // Build COGS section
  const cogsItems: PnLLineItem[] = []
  let totalCogsCents = 0
  for (const [cat, amt] of cogsByCategory) {
    const label =
      cat === 'purchase_orders'
        ? 'Purchase Orders'
        : COGS_CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ')
    cogsItems.push({
      label,
      amountCents: amt,
      percentOfRevenue: pctOf(amt, totalRevenueCents),
    })
    totalCogsCents += amt
  }
  cogsItems.sort((a, b) => b.amountCents - a.amountCents)

  // Build Operating Expenses section
  const opexItems: PnLLineItem[] = []
  let totalOpexCents = 0
  for (const [cat, amt] of opexByCategory) {
    opexItems.push({
      label: OPEX_CATEGORY_LABELS[cat] || cat.replace(/_/g, ' '),
      amountCents: amt,
      percentOfRevenue: pctOf(amt, totalRevenueCents),
    })
    totalOpexCents += amt
  }
  opexItems.sort((a, b) => b.amountCents - a.amountCents)

  // Build Revenue section
  const revenueItems: PnLLineItem[] = [
    {
      label: 'Event Revenue',
      amountCents: eventRevenueCents,
      percentOfRevenue: pctOf(eventRevenueCents, totalRevenueCents),
    },
  ]
  if (refundsCents > 0) {
    revenueItems.push({
      label: 'Refunds',
      amountCents: -refundsCents,
      percentOfRevenue: pctOf(-refundsCents, totalRevenueCents),
    })
  }
  if (tipsCents > 0) {
    revenueItems.push({
      label: 'Tips',
      amountCents: tipsCents,
      percentOfRevenue: pctOf(tipsCents, totalRevenueCents),
    })
  }

  const grossProfitCents = totalRevenueCents - totalCogsCents
  const netIncomeCents = grossProfitCents - totalOpexCents

  return {
    period,
    year,
    month,
    quarter,
    startDate,
    endDate,
    revenue: {
      label: 'Revenue',
      items: revenueItems,
      totalCents: totalRevenueCents,
      totalPercentOfRevenue: 100,
    },
    cogs: {
      label: 'Cost of Goods Sold',
      items: cogsItems,
      totalCents: totalCogsCents,
      totalPercentOfRevenue: pctOf(totalCogsCents, totalRevenueCents),
    },
    grossProfitCents,
    grossMarginPercent: pctOf(grossProfitCents, totalRevenueCents),
    operatingExpenses: {
      label: 'Operating Expenses',
      items: opexItems,
      totalCents: totalOpexCents,
      totalPercentOfRevenue: pctOf(totalOpexCents, totalRevenueCents),
    },
    netIncomeCents,
    netMarginPercent: pctOf(netIncomeCents, totalRevenueCents),
    refundsCents,
    tipsCents,
  }
}

// ─── Year-over-Year Comparison ──────────────────────────────────────────────

export async function getPnLComparison(
  period: PnLPeriod,
  year: number,
  compareYear: number,
  month?: number,
  quarter?: number
): Promise<PnLComparison> {
  const [current, previous] = await Promise.all([
    generatePnL(period, year, month, quarter),
    generatePnL(period, compareYear, month, quarter),
  ])

  function delta(curr: number, prev: number) {
    return {
      cents: curr - prev,
      pct: prev === 0 ? (curr > 0 ? 100 : 0) : pctOf(curr - prev, Math.abs(prev)),
    }
  }

  const revDelta = delta(current.revenue.totalCents, previous.revenue.totalCents)
  const cogsDelta = delta(current.cogs.totalCents, previous.cogs.totalCents)
  const gpDelta = delta(current.grossProfitCents, previous.grossProfitCents)
  const opexDelta = delta(
    current.operatingExpenses.totalCents,
    previous.operatingExpenses.totalCents
  )
  const niDelta = delta(current.netIncomeCents, previous.netIncomeCents)

  return {
    current,
    previous,
    changes: {
      revenueDeltaCents: revDelta.cents,
      revenueDeltaPercent: revDelta.pct,
      cogsDeltaCents: cogsDelta.cents,
      cogsDeltaPercent: cogsDelta.pct,
      grossProfitDeltaCents: gpDelta.cents,
      grossProfitDeltaPercent: gpDelta.pct,
      opexDeltaCents: opexDelta.cents,
      opexDeltaPercent: opexDelta.pct,
      netIncomeDeltaCents: niDelta.cents,
      netIncomeDeltaPercent: niDelta.pct,
    },
  }
}

// ─── Monthly Trend ──────────────────────────────────────────────────────────

export async function getPnLTrend(months = 12): Promise<PnLTrendPoint[]> {
  const points: PnLTrendPoint[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

    try {
      const pnl = await generatePnL('monthly', year, month)
      points.push({
        label,
        startDate: pnl.startDate,
        endDate: pnl.endDate,
        revenueCents: pnl.revenue.totalCents,
        cogsCents: pnl.cogs.totalCents,
        netIncomeCents: pnl.netIncomeCents,
        netMarginPercent: pnl.netMarginPercent,
      })
    } catch {
      points.push({
        label,
        startDate: '',
        endDate: '',
        revenueCents: 0,
        cogsCents: 0,
        netIncomeCents: 0,
        netMarginPercent: 0,
      })
    }
  }

  return points
}

// ─── Expense Breakdown ──────────────────────────────────────────────────────

export async function getExpenseBreakdown(
  period: PnLPeriod,
  year: number,
  month?: number,
  quarter?: number
): Promise<ExpenseBreakdownItem[]> {
  const pnl = await generatePnL(period, year, month, quarter)
  const allItems = [...pnl.cogs.items, ...pnl.operatingExpenses.items]
  const totalExpenses = pnl.cogs.totalCents + pnl.operatingExpenses.totalCents

  return allItems
    .map((item) => ({
      category: item.label,
      label: item.label,
      amountCents: item.amountCents,
      percentOfRevenue: item.percentOfRevenue,
      percentOfTotal: pctOf(item.amountCents, totalExpenses),
    }))
    .sort((a, b) => b.amountCents - a.amountCents)
}

// ─── Category Drill-Down ────────────────────────────────────────────────────

export async function getCategoryDetails(
  categoryLabel: string,
  period: PnLPeriod,
  year: number,
  month?: number,
  quarter?: number
): Promise<CategoryTransaction[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { startDate, endDate } = getPeriodDates(period, year, month, quarter)

  // Map the display label back to DB category
  const allLabels = { ...COGS_CATEGORY_LABELS, ...OPEX_CATEGORY_LABELS }
  let dbCategory: string | null = null
  for (const [key, val] of Object.entries(allLabels)) {
    if (val === categoryLabel) {
      dbCategory = key
      break
    }
  }

  // Handle "Purchase Orders" separately
  if (categoryLabel === 'Purchase Orders') {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, order_date, vendor_name, actual_total_cents, estimated_total_cents, status')
      .eq('chef_id', user.tenantId!)
      .in('status', ['partially_received', 'received'])
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .order('order_date', { ascending: false })
      .limit(500)

    if (error) throw new Error(`Failed to load PO details: ${error.message}`)

    return (data ?? []).map((po: any) => ({
      id: po.id,
      date: po.order_date,
      description: `PO from ${po.vendor_name || 'Unknown vendor'}`,
      amountCents: po.actual_total_cents ?? po.estimated_total_cents ?? 0,
      vendor: po.vendor_name || undefined,
    }))
  }

  if (!dbCategory) {
    // Try matching as-is (for "other" etc.)
    dbCategory = categoryLabel.toLowerCase().replace(/ /g, '_')
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('id, expense_date, description, amount_cents, vendor_name, event_id')
    .eq('tenant_id', user.tenantId!)
    .eq('category', dbCategory)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false })
    .limit(500)

  if (error) throw new Error(`Failed to load category details: ${error.message}`)

  return (data ?? []).map((exp: any) => ({
    id: exp.id,
    date: exp.expense_date,
    description: exp.description,
    amountCents: exp.amount_cents,
    vendor: exp.vendor_name || undefined,
    eventId: exp.event_id || undefined,
  }))
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

export async function exportPnLCSV(
  period: PnLPeriod,
  year: number,
  month?: number,
  quarter?: number
): Promise<string> {
  const pnl = await generatePnL(period, year, month, quarter)

  const rows: string[][] = []
  const c = (cents: number) => (cents / 100).toFixed(2)

  // Header
  let periodLabel = `${year}`
  if (period === 'monthly' && month) {
    const d = new Date(year, month - 1, 1)
    periodLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  } else if (period === 'quarterly' && pnl.quarter) {
    periodLabel = `Q${pnl.quarter} ${year}`
  }

  rows.push(['ChefFlow Profit & Loss Statement'])
  rows.push([`Period: ${periodLabel}`])
  rows.push([`${pnl.startDate} to ${pnl.endDate}`])
  rows.push([])
  rows.push(['', 'Amount', '% of Revenue'])

  // Revenue
  rows.push(['REVENUE', '', ''])
  for (const item of pnl.revenue.items) {
    rows.push([`  ${item.label}`, c(item.amountCents), `${item.percentOfRevenue}%`])
  }
  rows.push(['Total Revenue', c(pnl.revenue.totalCents), '100%'])
  rows.push([])

  // COGS
  rows.push(['COST OF GOODS SOLD', '', ''])
  for (const item of pnl.cogs.items) {
    rows.push([`  ${item.label}`, c(item.amountCents), `${item.percentOfRevenue}%`])
  }
  rows.push(['Total COGS', c(pnl.cogs.totalCents), `${pnl.cogs.totalPercentOfRevenue}%`])
  rows.push([])

  // Gross Profit
  rows.push(['GROSS PROFIT', c(pnl.grossProfitCents), `${pnl.grossMarginPercent}%`])
  rows.push([])

  // Operating Expenses
  rows.push(['OPERATING EXPENSES', '', ''])
  for (const item of pnl.operatingExpenses.items) {
    rows.push([`  ${item.label}`, c(item.amountCents), `${item.percentOfRevenue}%`])
  }
  rows.push([
    'Total Operating Expenses',
    c(pnl.operatingExpenses.totalCents),
    `${pnl.operatingExpenses.totalPercentOfRevenue}%`,
  ])
  rows.push([])

  // Net Income
  rows.push(['NET INCOME', c(pnl.netIncomeCents), `${pnl.netMarginPercent}%`])

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

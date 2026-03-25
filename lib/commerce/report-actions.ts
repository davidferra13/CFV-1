// Commerce Engine V1 - Report Actions
// Shift reports, daily sales summaries, by-product reports, by-channel reports.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'

// ─── Types ────────────────────────────────────────────────────────

export type ShiftReport = {
  sessionId: string
  sessionName: string | null
  openedAt: string
  closedAt: string | null
  openingCashCents: number
  closingCashCents: number | null
  expectedCashCents: number | null
  cashVarianceCents: number | null
  totalSalesCount: number
  totalRevenueCents: number
  totalTipsCents: number
  paymentBreakdown: { method: string; count: number; totalCents: number }[]
  topProducts: { name: string; quantity: number; revenueCents: number }[]
}

export type DailySalesReport = {
  date: string
  salesCount: number
  revenueCents: number
  taxCents: number
  tipsCents: number
  refundsCents: number
  netRevenueCents: number
  averageOrderCents: number
}

export type ProductReport = {
  productName: string
  productId: string | null
  category: string | null
  quantitySold: number
  revenueCents: number
  costCents: number
  marginCents: number
  marginPercent: number
}

export type ChannelReport = {
  channel: string
  salesCount: number
  revenueCents: number
  averageOrderCents: number
  percentOfTotal: number
}

export type PaymentMixRow = {
  method: string
  paymentCount: number
  grossCents: number
  tipCents: number
  totalCents: number
  averageTenderCents: number
  percentOfTotal: number
}

export type PaymentMixReport = {
  rows: PaymentMixRow[]
  totals: {
    paymentCount: number
    grossCents: number
    tipCents: number
    totalCents: number
  }
}

// ─── Shift Report ─────────────────────────────────────────────────

/**
 * Generate a detailed shift report for a specific register session.
 */
export async function getShiftReport(sessionId: string): Promise<ShiftReport> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  // Fetch session
  const { data: session, error: sessErr } = await (db
    .from('register_sessions' as any)
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (sessErr || !session) throw new Error('Register session not found')
  const s = session as any

  // Fetch sales for this session
  const { data: sales } = await (db
    .from('sales')
    .select('id')
    .eq('register_session_id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'voided') as any)

  const saleIds = (sales ?? []).map((sl: any) => sl.id)

  // Payment breakdown
  let paymentBreakdown: ShiftReport['paymentBreakdown'] = []
  if (saleIds.length > 0) {
    const { data: payments } = await (db
      .from('commerce_payments')
      .select('payment_method, amount_cents')
      .eq('tenant_id', user.tenantId!)
      .in('sale_id', saleIds)
      .in('status', ['captured', 'settled']) as any)

    const methodMap = new Map<string, { count: number; totalCents: number }>()
    for (const p of (payments ?? []) as any[]) {
      const existing = methodMap.get(p.payment_method) ?? { count: 0, totalCents: 0 }
      existing.count++
      existing.totalCents += p.amount_cents
      methodMap.set(p.payment_method, existing)
    }
    paymentBreakdown = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      ...data,
    }))
  }

  // Top products
  let topProducts: ShiftReport['topProducts'] = []
  if (saleIds.length > 0) {
    const { data: items } = await (db
      .from('sale_items')
      .select('name, quantity, line_total_cents')
      .eq('tenant_id', user.tenantId!)
      .in('sale_id', saleIds) as any)

    const productMap = new Map<string, { quantity: number; revenueCents: number }>()
    for (const item of (items ?? []) as any[]) {
      const existing = productMap.get(item.name) ?? { quantity: 0, revenueCents: 0 }
      existing.quantity += item.quantity
      existing.revenueCents += item.line_total_cents
      productMap.set(item.name, existing)
    }
    topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10)
  }

  return {
    sessionId,
    sessionName: s.session_name,
    openedAt: s.opened_at,
    closedAt: s.closed_at,
    openingCashCents: s.opening_cash_cents ?? 0,
    closingCashCents: s.closing_cash_cents,
    expectedCashCents: s.expected_cash_cents,
    cashVarianceCents: s.cash_variance_cents,
    totalSalesCount: s.total_sales_count ?? saleIds.length,
    totalRevenueCents: s.total_revenue_cents ?? 0,
    totalTipsCents: s.total_tips_cents ?? 0,
    paymentBreakdown,
    topProducts,
  }
}

// ─── Daily Sales Report ───────────────────────────────────────────

/**
 * Get a daily sales summary for a date range.
 */
export async function getDailySalesReport(from: string, to: string): Promise<DailySalesReport[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: sales } = await (db
    .from('sales')
    .select('created_at, subtotal_cents, tax_cents, total_cents, tip_cents, status')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`)
    .neq('status', 'voided')
    .neq('status', 'draft') as any)

  const { data: refunds } = await (db
    .from('commerce_refunds')
    .select('created_at, amount_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'processed')
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`) as any)

  // Group by date
  const dayMap = new Map<
    string,
    {
      salesCount: number
      revenueCents: number
      taxCents: number
      tipsCents: number
      refundsCents: number
    }
  >()

  for (const s of (sales ?? []) as any[]) {
    const day = s.created_at.substring(0, 10)
    const existing = dayMap.get(day) ?? {
      salesCount: 0,
      revenueCents: 0,
      taxCents: 0,
      tipsCents: 0,
      refundsCents: 0,
    }
    existing.salesCount++
    existing.revenueCents += s.total_cents ?? 0
    existing.taxCents += s.tax_cents ?? 0
    existing.tipsCents += s.tip_cents ?? 0
    dayMap.set(day, existing)
  }

  for (const r of (refunds ?? []) as any[]) {
    const day = r.created_at.substring(0, 10)
    const existing = dayMap.get(day) ?? {
      salesCount: 0,
      revenueCents: 0,
      taxCents: 0,
      tipsCents: 0,
      refundsCents: 0,
    }
    existing.refundsCents += r.amount_cents ?? 0
    dayMap.set(day, existing)
  }

  return Array.from(dayMap.entries())
    .map(([date, d]) => ({
      date,
      salesCount: d.salesCount,
      revenueCents: d.revenueCents,
      taxCents: d.taxCents,
      tipsCents: d.tipsCents,
      refundsCents: d.refundsCents,
      netRevenueCents: d.revenueCents - d.refundsCents,
      averageOrderCents: d.salesCount > 0 ? Math.round(d.revenueCents / d.salesCount) : 0,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

// ─── Product Report ───────────────────────────────────────────────

/**
 * Get sales breakdown by product for a date range.
 */
export async function getProductReport(from: string, to: string): Promise<ProductReport[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: items } = await (db
    .from('sale_items')
    .select(
      'name, product_projection_id, category, quantity, line_total_cents, unit_cost_cents, sale_id'
    )
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`) as any)

  // Filter out voided sales
  const saleIds = [...new Set((items ?? []).map((i: any) => i.sale_id))]
  let validSaleIds = new Set<string>()

  if (saleIds.length > 0) {
    const { data: sales } = await (db
      .from('sales')
      .select('id, status')
      .eq('tenant_id', user.tenantId!)
      .in('id', saleIds)
      .neq('status', 'voided')
      .neq('status', 'draft') as any)

    validSaleIds = new Set((sales ?? []).map((s: any) => s.id))
  }

  // Aggregate by product name
  const productMap = new Map<
    string,
    {
      productId: string | null
      category: string | null
      quantitySold: number
      revenueCents: number
      costCents: number
    }
  >()

  for (const item of (items ?? []) as any[]) {
    if (!validSaleIds.has(item.sale_id)) continue

    const key = item.name
    const existing = productMap.get(key) ?? {
      productId: item.product_projection_id,
      category: item.category,
      quantitySold: 0,
      revenueCents: 0,
      costCents: 0,
    }
    existing.quantitySold += item.quantity
    existing.revenueCents += item.line_total_cents ?? 0
    existing.costCents += (item.unit_cost_cents ?? 0) * item.quantity
    productMap.set(key, existing)
  }

  return Array.from(productMap.entries())
    .map(([name, d]) => {
      const marginCents = d.revenueCents - d.costCents
      const marginPercent = d.revenueCents > 0 ? (marginCents / d.revenueCents) * 100 : 0
      return {
        productName: name,
        productId: d.productId,
        category: d.category,
        quantitySold: d.quantitySold,
        revenueCents: d.revenueCents,
        costCents: d.costCents,
        marginCents,
        marginPercent: Math.round(marginPercent * 10) / 10,
      }
    })
    .sort((a, b) => b.revenueCents - a.revenueCents)
}

// ─── Channel Report ───────────────────────────────────────────────

/**
 * Get sales breakdown by channel for a date range.
 */
export async function getChannelReport(from: string, to: string): Promise<ChannelReport[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: sales } = await (db
    .from('sales')
    .select('channel, total_cents')
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'voided')
    .neq('status', 'draft')
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`) as any)

  const channelMap = new Map<string, { salesCount: number; revenueCents: number }>()
  let grandTotal = 0

  for (const s of (sales ?? []) as any[]) {
    const existing = channelMap.get(s.channel) ?? { salesCount: 0, revenueCents: 0 }
    existing.salesCount++
    existing.revenueCents += s.total_cents ?? 0
    grandTotal += s.total_cents ?? 0
    channelMap.set(s.channel, existing)
  }

  return Array.from(channelMap.entries())
    .map(([channel, d]) => ({
      channel,
      salesCount: d.salesCount,
      revenueCents: d.revenueCents,
      averageOrderCents: d.salesCount > 0 ? Math.round(d.revenueCents / d.salesCount) : 0,
      percentOfTotal: grandTotal > 0 ? Math.round((d.revenueCents / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
}

/**
 * Get payment mix and tender breakdown for a date range.
 */
export async function getPaymentMixReport(from: string, to: string): Promise<PaymentMixReport> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: payments } = await (db
    .from('commerce_payments')
    .select('payment_method, amount_cents, tip_cents')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['captured', 'settled', 'authorized'])
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`) as any)

  const methodMap = new Map<
    string,
    { paymentCount: number; grossCents: number; tipCents: number }
  >()
  for (const payment of (payments ?? []) as any[]) {
    const method = String(payment.payment_method ?? 'unknown')
    const current = methodMap.get(method) ?? { paymentCount: 0, grossCents: 0, tipCents: 0 }
    current.paymentCount += 1
    current.grossCents += Number(payment.amount_cents ?? 0)
    current.tipCents += Number(payment.tip_cents ?? 0)
    methodMap.set(method, current)
  }

  const totals = Array.from(methodMap.values()).reduce<PaymentMixReport['totals']>(
    (acc, row) => {
      acc.paymentCount += row.paymentCount
      acc.grossCents += row.grossCents
      acc.tipCents += row.tipCents
      acc.totalCents += row.grossCents + row.tipCents
      return acc
    },
    { paymentCount: 0, grossCents: 0, tipCents: 0, totalCents: 0 }
  )

  const rows: PaymentMixRow[] = Array.from(methodMap.entries())
    .map(([method, row]) => {
      const totalCents = row.grossCents + row.tipCents
      return {
        method,
        paymentCount: row.paymentCount,
        grossCents: row.grossCents,
        tipCents: row.tipCents,
        totalCents,
        averageTenderCents: row.paymentCount > 0 ? Math.round(totalCents / row.paymentCount) : 0,
        percentOfTotal:
          totals.totalCents > 0 ? Math.round((totalCents / totals.totalCents) * 1000) / 10 : 0,
      }
    })
    .sort((a, b) => b.totalCents - a.totalCents)

  return { rows, totals }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// Vendor Scorecard - computed from existing data, no new tables needed.
// Module: operations (supply-chain nav group)

export type VendorScorecard = {
  vendorId: string
  vendorName: string
  overallScore: number // 0-100
  metrics: {
    orderHistory: { score: number; invoiceCount: number; totalSpendCents: number }
    catalogDepth: { score: number; itemCount: number }
    priceStability: { score: number; avgVariancePct: number }
    qualityRating: { score: number; manualRating: number | null }
    eventReliability: { score: number; eventCount: number }
    dataCompleteness: { score: number; filledFields: number; totalFields: number }
  }
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}

export type VendorExpenseStats = {
  totalSpendCents: number
  expenseCount: number
  avgPerVisitCents: number
  firstExpenseDate: string | null
  lastExpenseDate: string | null
  categoryBreakdown: Array<{ category: string; totalCents: number; count: number }>
  monthlyTrend: Array<{ month: string; totalCents: number; count: number }>
}

/**
 * Pull spending stats from the expenses table for a given vendor.
 * Requires the vendor_id FK on expenses (migration 20260510000004).
 */
export async function getVendorExpenseStats(vendorId: string): Promise<VendorExpenseStats> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Fetch all expenses for this vendor + tenant
  const rows = await db
    .from('expenses')
    .select('amount_cents, expense_date, category')
    .eq('vendor_id', vendorId)
    .eq('tenant_id', tenantId)

  if (!rows.length) {
    return {
      totalSpendCents: 0,
      expenseCount: 0,
      avgPerVisitCents: 0,
      firstExpenseDate: null,
      lastExpenseDate: null,
      categoryBreakdown: [],
      monthlyTrend: [],
    }
  }

  const expenseCount = rows.length
  const totalSpendCents = rows.reduce((sum: number, r: any) => sum + (r.amount_cents || 0), 0)

  // Unique dates as "visits"
  const uniqueDates = new Set(rows.map((r: any) => r.expense_date))
  const visitCount = uniqueDates.size || 1
  const avgPerVisitCents = Math.round(totalSpendCents / visitCount)

  // Date range
  const dates = rows.map((r: any) => r.expense_date as string).sort()
  const firstExpenseDate = dates[0] ?? null
  const lastExpenseDate = dates[dates.length - 1] ?? null

  // Category breakdown
  const catMap = new Map<string, { totalCents: number; count: number }>()
  for (const r of rows) {
    const cat = (r as any).category || 'uncategorized'
    const existing = catMap.get(cat) || { totalCents: 0, count: 0 }
    existing.totalCents += (r as any).amount_cents || 0
    existing.count += 1
    catMap.set(cat, existing)
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.totalCents - a.totalCents)

  // Monthly trend (last 6 months)
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const cutoff = sixMonthsAgo.toISOString().slice(0, 10)

  const monthMap = new Map<string, { totalCents: number; count: number }>()
  for (const r of rows) {
    const d = (r as any).expense_date as string
    if (d < cutoff) continue
    const month = d.slice(0, 7) // YYYY-MM
    const existing = monthMap.get(month) || { totalCents: 0, count: 0 }
    existing.totalCents += (r as any).amount_cents || 0
    existing.count += 1
    monthMap.set(month, existing)
  }
  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    totalSpendCents,
    expenseCount,
    avgPerVisitCents,
    firstExpenseDate,
    lastExpenseDate,
    categoryBreakdown,
    monthlyTrend,
  }
}

/**
 * Compute a vendor scorecard from existing data.
 * Pure math, no AI. Formula > AI.
 */
export async function getVendorScorecard(vendorId: string): Promise<VendorScorecard | null> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Fetch vendor base
  const vendorRows = await db
    .from('vendors')
    .select(
      'id, name, phone, email, contact_name, notes, rating, is_preferred, status, website, address, minimum_order_cents, logo_url'
    )
    .eq('id', vendorId)
    .eq('chef_id', tenantId)

  if (!vendorRows.length) return null
  const vendor = vendorRows[0]

  // Parallel data fetches
  const [invoiceRows, itemRows, pricePointRows, eventRows] = await Promise.all([
    db
      .from('vendor_invoices')
      .select('id, total_cents')
      .eq('vendor_id', vendorId)
      .eq('chef_id', tenantId),
    db.from('vendor_items').select('id').eq('vendor_id', vendorId).eq('chef_id', tenantId),
    db
      .from('vendor_price_points')
      .select('id, item_name, price_cents')
      .eq('vendor_id', vendorId)
      .eq('chef_id', tenantId),
    db
      .from('vendor_event_assignments')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('tenant_id', tenantId),
  ])

  // 1. Order History (0-25 points)
  // More invoices + higher spend = better score
  const invoiceCount = invoiceRows.length
  const totalSpendCents = invoiceRows.reduce((sum: number, r: any) => sum + (r.total_cents || 0), 0)
  // 10+ invoices = max invoice points (15), $5000+ spend = max spend points (10)
  const invoiceScore = Math.min(15, invoiceCount * 1.5)
  const spendScore = Math.min(10, (totalSpendCents / 100 / 500) * 10)
  const orderHistoryScore = Math.round(invoiceScore + spendScore)

  // 2. Catalog Depth (0-15 points)
  // More tracked items = better organized vendor relationship
  const itemCount = itemRows.length
  const catalogScore = Math.round(Math.min(15, itemCount * 1.5))

  // 3. Price Stability (0-20 points)
  // Group price points by item, compute variance
  const pricesByItem: Record<string, number[]> = {}
  for (const pp of pricePointRows) {
    const key = (pp as any).item_name || 'unknown'
    if (!pricesByItem[key]) pricesByItem[key] = []
    pricesByItem[key].push((pp as any).price_cents)
  }
  let totalVariance = 0
  let itemsWithMultiple = 0
  for (const prices of Object.values(pricesByItem)) {
    if (prices.length < 2) continue
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length
    const variance = prices.reduce((sum, p) => sum + Math.abs(p - mean) / mean, 0) / prices.length
    totalVariance += variance
    itemsWithMultiple++
  }
  const avgVariancePct = itemsWithMultiple > 0 ? (totalVariance / itemsWithMultiple) * 100 : 0
  // Lower variance = higher score. 0% = 20, 20%+ = 0
  const priceStabilityScore = Math.round(Math.max(0, 20 - avgVariancePct))

  // 4. Quality Rating (0-20 points)
  // Manual 1-5 star rating maps to 0-20
  const manualRating = (vendor as any).rating as number | null
  const qualityScore = manualRating ? Math.round((manualRating / 5) * 20) : 0

  // 5. Event Reliability (0-10 points)
  // More event assignments = more trusted
  const eventCount = eventRows.length
  const eventScore = Math.round(Math.min(10, eventCount * 2))

  // 6. Data Completeness (0-10 points)
  // How much info is filled in on the vendor record
  const checkFields = ['phone', 'email', 'contact_name', 'website', 'address', 'notes']
  const filledFields = checkFields.filter((f) => !!(vendor as any)[f]).length
  const completenessScore = Math.round((filledFields / checkFields.length) * 10)

  // Overall score (0-100)
  const overallScore = Math.min(
    100,
    orderHistoryScore +
      catalogScore +
      priceStabilityScore +
      qualityScore +
      eventScore +
      completenessScore
  )

  // Grade
  const grade =
    overallScore >= 85
      ? 'A'
      : overallScore >= 70
        ? 'B'
        : overallScore >= 55
          ? 'C'
          : overallScore >= 40
            ? 'D'
            : 'F'

  return {
    vendorId,
    vendorName: (vendor as any).name,
    overallScore,
    metrics: {
      orderHistory: { score: orderHistoryScore, invoiceCount, totalSpendCents },
      catalogDepth: { score: catalogScore, itemCount },
      priceStability: {
        score: priceStabilityScore,
        avgVariancePct: Math.round(avgVariancePct * 10) / 10,
      },
      qualityRating: { score: qualityScore, manualRating },
      eventReliability: { score: eventScore, eventCount },
      dataCompleteness: { score: completenessScore, filledFields, totalFields: checkFields.length },
    },
    grade,
  }
}

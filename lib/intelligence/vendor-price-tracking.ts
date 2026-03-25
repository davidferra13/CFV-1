'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VendorPriceTrend {
  vendorName: string
  totalSpendCents: number
  transactionCount: number
  avgTransactionCents: number
  recentAvgCents: number // last 3 months
  priorAvgCents: number // 3-6 months ago
  priceChange: 'rising' | 'stable' | 'falling'
  changePercent: number
  categories: string[]
}

export interface CategorySpend {
  category: string
  totalCents: number
  transactionCount: number
  avgPerEventCents: number
  topVendor: string | null
  trend: 'rising' | 'stable' | 'falling'
}

export interface VendorPriceAlert {
  vendorName: string
  alertType: 'price_increase' | 'concentration_risk' | 'no_recent_purchase'
  title: string
  description: string
}

export interface VendorPriceIntelligence {
  vendors: VendorPriceTrend[]
  categories: CategorySpend[]
  alerts: VendorPriceAlert[]
  totalVendors: number
  topVendorBySpend: string | null
  avgExpensePerEventCents: number
  totalSpendLast12MonthsCents: number
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getVendorPriceIntelligence(): Promise<VendorPriceIntelligence | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const twelveMonthsAgo = new Date(Date.now() - 365 * 86400000).toISOString()

  const { data: expenses, error } = await db
    .from('expenses')
    .select('id, vendor_name, category, amount_cents, created_at, event_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', twelveMonthsAgo)
    .order('created_at', { ascending: true })

  if (error || !expenses || expenses.length < 5) return null

  const threeMonthsAgo = Date.now() - 90 * 86400000
  const sixMonthsAgo = Date.now() - 180 * 86400000

  // Vendor analysis
  const vendorMap = new Map<
    string,
    {
      totalCents: number
      count: number
      recentAmounts: number[]
      priorAmounts: number[]
      categories: Set<string>
    }
  >()

  for (const exp of expenses) {
    const vendor = (exp.vendor_name || 'Unknown').trim()
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, {
        totalCents: 0,
        count: 0,
        recentAmounts: [],
        priorAmounts: [],
        categories: new Set(),
      })
    }
    const v = vendorMap.get(vendor)!
    v.totalCents += exp.amount_cents || 0
    v.count++
    if (exp.category) v.categories.add(exp.category)

    const expTime = new Date(exp.created_at).getTime()
    if (expTime >= threeMonthsAgo) v.recentAmounts.push(exp.amount_cents || 0)
    else if (expTime >= sixMonthsAgo) v.priorAmounts.push(exp.amount_cents || 0)
  }

  const vendors: VendorPriceTrend[] = Array.from(vendorMap.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => {
      const recentAvg =
        v.recentAmounts.length > 0
          ? Math.round(v.recentAmounts.reduce((s, a) => s + a, 0) / v.recentAmounts.length)
          : 0
      const priorAvg =
        v.priorAmounts.length > 0
          ? Math.round(v.priorAmounts.reduce((s, a) => s + a, 0) / v.priorAmounts.length)
          : 0
      const changePercent = priorAvg > 0 ? Math.round(((recentAvg - priorAvg) / priorAvg) * 100) : 0
      const priceChange: VendorPriceTrend['priceChange'] =
        changePercent > 10 ? 'rising' : changePercent < -10 ? 'falling' : 'stable'

      return {
        vendorName: name,
        totalSpendCents: v.totalCents,
        transactionCount: v.count,
        avgTransactionCents: Math.round(v.totalCents / v.count),
        recentAvgCents: recentAvg,
        priorAvgCents: priorAvg,
        priceChange,
        changePercent,
        categories: Array.from(v.categories),
      }
    })
    .sort((a, b) => b.totalSpendCents - a.totalSpendCents)

  // Category analysis
  const categoryMap = new Map<
    string,
    {
      totalCents: number
      count: number
      eventIds: Set<string>
      topVendorSpend: Map<string, number>
      recentTotal: number
      priorTotal: number
    }
  >()

  for (const exp of expenses) {
    const cat = exp.category || 'uncategorized'
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        totalCents: 0,
        count: 0,
        eventIds: new Set(),
        topVendorSpend: new Map(),
        recentTotal: 0,
        priorTotal: 0,
      })
    }
    const c = categoryMap.get(cat)!
    c.totalCents += exp.amount_cents || 0
    c.count++
    if (exp.event_id) c.eventIds.add(exp.event_id)

    const vendor = (exp.vendor_name || 'Unknown').trim()
    c.topVendorSpend.set(vendor, (c.topVendorSpend.get(vendor) || 0) + (exp.amount_cents || 0))

    const expTime = new Date(exp.created_at).getTime()
    if (expTime >= threeMonthsAgo) c.recentTotal += exp.amount_cents || 0
    else if (expTime >= sixMonthsAgo) c.priorTotal += exp.amount_cents || 0
  }

  const categories: CategorySpend[] = Array.from(categoryMap.entries())
    .map(([category, c]) => {
      const topVendor =
        c.topVendorSpend.size > 0
          ? Array.from(c.topVendorSpend.entries()).sort((a, b) => b[1] - a[1])[0][0]
          : null
      const changePct = c.priorTotal > 0 ? ((c.recentTotal - c.priorTotal) / c.priorTotal) * 100 : 0
      return {
        category,
        totalCents: c.totalCents,
        transactionCount: c.count,
        avgPerEventCents: c.eventIds.size > 0 ? Math.round(c.totalCents / c.eventIds.size) : 0,
        topVendor,
        trend:
          changePct > 15
            ? ('rising' as const)
            : changePct < -15
              ? ('falling' as const)
              : ('stable' as const),
      }
    })
    .sort((a, b) => b.totalCents - a.totalCents)

  // Alerts
  const alerts: VendorPriceAlert[] = []

  // Price increase alerts
  for (const v of vendors) {
    if (v.priceChange === 'rising' && v.changePercent > 15 && v.transactionCount >= 3) {
      alerts.push({
        vendorName: v.vendorName,
        alertType: 'price_increase',
        title: `${v.vendorName} prices up ${v.changePercent}%`,
        description: `Average transaction went from $${Math.round(v.priorAvgCents / 100)} to $${Math.round(v.recentAvgCents / 100)} in the last 3 months`,
      })
    }
  }

  // Concentration risk (single vendor > 40% of a category)
  for (const [category, c] of categoryMap.entries()) {
    for (const [vendor, spend] of c.topVendorSpend.entries()) {
      if (c.totalCents > 0 && spend / c.totalCents > 0.6 && c.count >= 5) {
        alerts.push({
          vendorName: vendor,
          alertType: 'concentration_risk',
          title: `${vendor} dominates ${category} spending`,
          description: `${Math.round((spend / c.totalCents) * 100)}% of your ${category} spend goes to one vendor. Consider diversifying.`,
        })
      }
    }
  }

  const totalSpend = expenses.reduce((s: number, e: any) => s + (e.amount_cents || 0), 0)
  const eventIds = new Set(expenses.filter((e: any) => e.event_id).map((e: any) => e.event_id))
  const avgPerEvent = eventIds.size > 0 ? Math.round(totalSpend / eventIds.size) : 0

  return {
    vendors: vendors.slice(0, 15),
    categories,
    alerts: alerts.slice(0, 10),
    totalVendors: vendors.length,
    topVendorBySpend: vendors.length > 0 ? vendors[0].vendorName : null,
    avgExpensePerEventCents: avgPerEvent,
    totalSpendLast12MonthsCents: totalSpend,
  }
}

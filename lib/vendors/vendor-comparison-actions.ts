'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// Vendor-to-vendor spending and price comparison.
// Compares expense totals and shared catalog items between two vendors.

export type VendorComparison = {
  vendorA: { id: string; name: string; totalSpendCents: number; expenseCount: number }
  vendorB: { id: string; name: string; totalSpendCents: number; expenseCount: number }
  sharedItems: Array<{
    itemName: string
    ingredientId: string | null
    vendorAPriceCents: number
    vendorBPriceCents: number
    cheaperVendor: 'A' | 'B' | 'tie'
    savingsPercent: number
  }>
  summary: {
    vendorAWins: number
    vendorBWins: number
    ties: number
    potentialSavingsCents: number
    recommendation: string
  }
}

export type VendorSpendingSummary = {
  vendorId: string
  vendorName: string
  totalSpendCents: number
  expenseCount: number
  avgPerVisitCents: number
  monthlyBreakdown: Array<{ month: string; totalCents: number; count: number }>
  categoryBreakdown: Array<{ category: string; totalCents: number; count: number }>
}

/**
 * Compare two vendors: expense totals in a date range, shared item prices,
 * and a recommendation on which is cheaper overall.
 */
export async function compareVendors(
  vendorIdA: string,
  vendorIdB: string,
  opts?: { category?: string; startDate?: string; endDate?: string }
): Promise<VendorComparison> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Fetch vendor names
  const [vendorRowsA, vendorRowsB] = await Promise.all([
    db.from('vendors').select('name').eq('id', vendorIdA).eq('chef_id', tenantId),
    db.from('vendors').select('name').eq('id', vendorIdB).eq('chef_id', tenantId),
  ])

  const vendorAName: string = vendorRowsA[0]?.name ?? 'Unknown Vendor A'
  const vendorBName: string = vendorRowsB[0]?.name ?? 'Unknown Vendor B'

  // Fetch expenses for both vendors (parallel)
  const [expensesA, expensesB, itemsA, itemsB] = await Promise.all([
    fetchVendorExpenses(db, vendorIdA, tenantId, opts),
    fetchVendorExpenses(db, vendorIdB, tenantId, opts),
    db
      .from('vendor_items')
      .select('id, vendor_item_name, unit_price_cents, ingredient_id')
      .eq('vendor_id', vendorIdA)
      .eq('chef_id', tenantId),
    db
      .from('vendor_items')
      .select('id, vendor_item_name, unit_price_cents, ingredient_id')
      .eq('vendor_id', vendorIdB)
      .eq('chef_id', tenantId),
  ])

  // Compute expense totals
  const totalA = expensesA.reduce((s: number, r: any) => s + (r.amount_cents || 0), 0)
  const totalB = expensesB.reduce((s: number, r: any) => s + (r.amount_cents || 0), 0)

  // Find shared items by ingredient_id
  const sharedItems = buildSharedItems(itemsA, itemsB)

  // Tally wins
  let vendorAWins = 0
  let vendorBWins = 0
  let ties = 0
  let potentialSavingsCents = 0

  for (const item of sharedItems) {
    if (item.cheaperVendor === 'A') {
      vendorAWins++
      potentialSavingsCents += item.vendorBPriceCents - item.vendorAPriceCents
    } else if (item.cheaperVendor === 'B') {
      vendorBWins++
      potentialSavingsCents += item.vendorAPriceCents - item.vendorBPriceCents
    } else {
      ties++
    }
  }

  // Build recommendation
  const recommendation = buildRecommendation(
    vendorAName,
    vendorBName,
    vendorAWins,
    vendorBWins,
    sharedItems.length
  )

  return {
    vendorA: {
      id: vendorIdA,
      name: vendorAName,
      totalSpendCents: totalA,
      expenseCount: expensesA.length,
    },
    vendorB: {
      id: vendorIdB,
      name: vendorBName,
      totalSpendCents: totalB,
      expenseCount: expensesB.length,
    },
    sharedItems,
    summary: {
      vendorAWins,
      vendorBWins,
      ties,
      potentialSavingsCents,
      recommendation,
    },
  }
}

/**
 * Spending summary for a single vendor over the last N months.
 * Monthly totals, category breakdown, average per visit.
 */
export async function getVendorSpendingSummary(
  vendorId: string,
  opts?: { months?: number }
): Promise<VendorSpendingSummary> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()
  const months = opts?.months ?? 6

  // Vendor name
  const vendorRows = await db
    .from('vendors')
    .select('name')
    .eq('id', vendorId)
    .eq('chef_id', tenantId)
  const vendorName: string = vendorRows[0]?.name ?? 'Unknown Vendor'

  // Cutoff date
  const now = new Date()
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  const cutoff = cutoffDate.toISOString().slice(0, 10)

  // Fetch expenses in range
  const rows = await db
    .from('expenses')
    .select('amount_cents, expense_date, category')
    .eq('vendor_id', vendorId)
    .eq('tenant_id', tenantId)
    .gte('expense_date', cutoff)

  if (!rows.length) {
    return {
      vendorId,
      vendorName,
      totalSpendCents: 0,
      expenseCount: 0,
      avgPerVisitCents: 0,
      monthlyBreakdown: [],
      categoryBreakdown: [],
    }
  }

  const totalSpendCents = rows.reduce((sum: number, r: any) => sum + (r.amount_cents || 0), 0)
  const expenseCount = rows.length

  // Unique dates as visits
  const uniqueDates = new Set(rows.map((r: any) => r.expense_date))
  const visitCount = uniqueDates.size || 1
  const avgPerVisitCents = Math.round(totalSpendCents / visitCount)

  // Monthly breakdown
  const monthMap = new Map<string, { totalCents: number; count: number }>()
  for (const r of rows) {
    const month = ((r as any).expense_date as string).slice(0, 7)
    const existing = monthMap.get(month) || { totalCents: 0, count: 0 }
    existing.totalCents += (r as any).amount_cents || 0
    existing.count += 1
    monthMap.set(month, existing)
  }
  const monthlyBreakdown = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))

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

  return {
    vendorId,
    vendorName,
    totalSpendCents,
    expenseCount,
    avgPerVisitCents,
    monthlyBreakdown,
    categoryBreakdown,
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function fetchVendorExpenses(
  db: any,
  vendorId: string,
  tenantId: string,
  opts?: { category?: string; startDate?: string; endDate?: string }
) {
  let query = db
    .from('expenses')
    .select('amount_cents, expense_date, category')
    .eq('vendor_id', vendorId)
    .eq('tenant_id', tenantId)

  if (opts?.category) {
    query = query.eq('category', opts.category)
  }
  if (opts?.startDate) {
    query = query.gte('expense_date', opts.startDate)
  }
  if (opts?.endDate) {
    query = query.lte('expense_date', opts.endDate)
  }

  return query
}

function buildSharedItems(itemsA: any[], itemsB: any[]): VendorComparison['sharedItems'] {
  // Index vendor B items by ingredient_id
  const bByIngredient = new Map<string, any>()
  for (const item of itemsB) {
    if (item.ingredient_id) {
      bByIngredient.set(item.ingredient_id, item)
    }
  }

  const shared: VendorComparison['sharedItems'] = []

  for (const itemA of itemsA) {
    if (!itemA.ingredient_id) continue
    const itemB = bByIngredient.get(itemA.ingredient_id)
    if (!itemB) continue

    const priceA: number = itemA.unit_price_cents || 0
    const priceB: number = itemB.unit_price_cents || 0

    let cheaperVendor: 'A' | 'B' | 'tie' = 'tie'
    if (priceA < priceB) cheaperVendor = 'A'
    else if (priceB < priceA) cheaperVendor = 'B'

    const maxPrice = Math.max(priceA, priceB)
    const savingsPercent =
      maxPrice > 0 ? Math.round((Math.abs(priceA - priceB) / maxPrice) * 1000) / 10 : 0

    shared.push({
      itemName: itemA.vendor_item_name || 'Unknown Item',
      ingredientId: itemA.ingredient_id,
      vendorAPriceCents: priceA,
      vendorBPriceCents: priceB,
      cheaperVendor,
      savingsPercent,
    })
  }

  return shared.sort((a, b) => b.savingsPercent - a.savingsPercent)
}

function buildRecommendation(
  nameA: string,
  nameB: string,
  winsA: number,
  winsB: number,
  sharedCount: number
): string {
  if (sharedCount === 0) {
    return 'No shared items to compare; review expense totals for overall spending differences.'
  }

  const totalCompared = winsA + winsB
  if (totalCompared === 0) {
    return `All ${sharedCount} shared items are identically priced.`
  }

  if (winsA > winsB) {
    const pct = Math.round((winsA / sharedCount) * 100)
    return `${nameA} is cheaper on ${winsA} of ${sharedCount} shared items (${pct}%).`
  }

  if (winsB > winsA) {
    const pct = Math.round((winsB / sharedCount) * 100)
    return `${nameB} is cheaper on ${winsB} of ${sharedCount} shared items (${pct}%).`
  }

  return `${nameA} and ${nameB} split evenly, each winning on ${winsA} of ${sharedCount} shared items.`
}

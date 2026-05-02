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

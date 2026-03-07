'use server'

// Vendor Price Comparison — Deterministic Ranking
// Sorts vendors by price-per-unit, applies quality tier adjustment, returns ranked list.
// No AI needed: price comparison is arithmetic. The chef decides which vendor to use.
//
// Previously used Gemini to generate a narrative comparison.
// Removed: the talk on LLM limitations showed AI regresses to anchors and
// pattern-matches on labels rather than reasoning about value. Arithmetic
// ranking is strictly more reliable for price comparison.

import { requireChef } from '@/lib/auth/get-user'

export interface VendorEntry {
  vendorName: string
  itemDescription: string
  priceCents: number
  unit: string
  quality: 'premium' | 'standard' | 'budget' | 'unknown'
  notes: string | null
  lastPurchased: string | null
}

export interface VendorComparisonResult {
  category: string
  bestValueVendor: string
  bestValueRationale: string
  vendorRankings: {
    rank: number
    vendorName: string
    pricePer100g: number | null
    valueScore: number
    pros: string[]
    cons: string[]
  }[]
  recommendation: string
  priceDifferenceNote: string
  generatedAt: string
}

// Quality tier multiplier: premium costs more but may be worth it.
// A premium item at 1.3x the price of a standard item is "equal value."
const QUALITY_MULTIPLIER: Record<string, number> = {
  premium: 0.77, // 1/1.3 — premium gets a 23% "discount" in value scoring
  standard: 1.0,
  budget: 1.15, // budget gets a 15% "penalty" — cheap doesn't always mean value
  unknown: 1.0,
}

export async function compareVendors(
  vendors: VendorEntry[],
  category: string
): Promise<VendorComparisonResult> {
  await requireChef()

  if (vendors.length < 2) {
    throw new Error('Need at least 2 vendor entries to compare')
  }

  // 1. Compute price-per-unit and quality-adjusted value score for each vendor
  const scored = vendors.map((v) => {
    const priceDollars = v.priceCents / 100
    const qualityAdj = QUALITY_MULTIPLIER[v.quality] ?? 1.0
    // Value score: lower adjusted price = higher score (0-100 scale)
    const adjustedPrice = priceDollars * qualityAdj
    return { vendor: v, priceDollars, adjustedPrice }
  })

  // Find min/max adjusted price for normalization
  const prices = scored.map((s) => s.adjustedPrice)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1 // avoid division by zero

  // Score: 100 = cheapest (best value), 0 = most expensive
  const ranked = scored
    .map((s) => ({
      ...s,
      valueScore: Math.round(((maxPrice - s.adjustedPrice) / priceRange) * 100),
    }))
    .sort((a, b) => b.valueScore - a.valueScore)

  // 2. Build rankings with pros/cons
  const vendorRankings = ranked.map((r, i) => {
    const pros: string[] = []
    const cons: string[] = []

    if (i === 0) pros.push('Best overall value')
    if (r.vendor.quality === 'premium') pros.push('Premium quality')
    if (r.vendor.quality === 'budget') pros.push('Lowest price point')
    if (r.vendor.lastPurchased) {
      const daysSince = Math.round(
        (Date.now() - new Date(r.vendor.lastPurchased).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSince < 30) pros.push('Recently purchased (reliable supply)')
      if (daysSince > 180) cons.push('Not purchased in 6+ months')
    }
    if (r.vendor.quality === 'budget') cons.push('Budget tier quality')
    if (i === ranked.length - 1 && ranked.length > 1) cons.push('Highest cost per unit')

    return {
      rank: i + 1,
      vendorName: r.vendor.vendorName,
      pricePer100g: null, // only meaningful for weight-based items
      valueScore: r.valueScore,
      pros,
      cons,
    }
  })

  // 3. Build result
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  const priceDiffPct =
    worst.priceDollars > 0
      ? Math.round(((worst.priceDollars - best.priceDollars) / worst.priceDollars) * 100)
      : 0

  const bestValueRationale =
    best.vendor.quality === 'premium'
      ? `${best.vendor.vendorName} offers premium quality at a competitive price point.`
      : best.vendor.quality === 'budget'
        ? `${best.vendor.vendorName} has the lowest price. Quality is budget tier, so verify it meets your standards.`
        : `${best.vendor.vendorName} offers the best balance of price and quality.`

  const priceDifferenceNote =
    priceDiffPct > 0
      ? `${best.vendor.vendorName} saves ${priceDiffPct}% compared to ${worst.vendor.vendorName}.`
      : 'Prices are similar across vendors.'

  const recommendation =
    ranked.length === 2
      ? `Go with ${best.vendor.vendorName} for ${category}. ${priceDifferenceNote}`
      : `${best.vendor.vendorName} is your best bet for ${category}. Check ${ranked[1].vendor.vendorName} as a backup.`

  return {
    category,
    bestValueVendor: best.vendor.vendorName,
    bestValueRationale,
    vendorRankings,
    recommendation,
    priceDifferenceNote,
    generatedAt: new Date().toISOString(),
  }
}

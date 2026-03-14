export type VendorOption = {
  vendorName: string
  priceCents: number
  unit: string
}

export type VendorComparisonRecommendation = {
  bestValueVendor: string
  bestValueRationale: string
  vendorRankings: Array<{
    rank: number
    vendorName: string
    valueScore: number
    pricePerUnitCents: number
  }>
  recommendation: string
  priceDifferenceNote: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function buildVendorRecommendation(
  options: VendorOption[]
): VendorComparisonRecommendation | null {
  if (options.length < 2) return null

  const sorted = [...options].sort((a, b) => a.priceCents - b.priceCents)
  const cheapest = sorted[0]
  const second = sorted[1]
  const highest = sorted[sorted.length - 1]
  const spreadPercent =
    second.priceCents > 0
      ? ((second.priceCents - cheapest.priceCents) / second.priceCents) * 100
      : 0
  const fullSpreadPercent =
    highest.priceCents > 0
      ? ((highest.priceCents - cheapest.priceCents) / highest.priceCents) * 100
      : 0

  const rankings = sorted.map((option, index) => {
    const penaltyPercent =
      cheapest.priceCents > 0
        ? ((option.priceCents - cheapest.priceCents) / cheapest.priceCents) * 100
        : 0
    const valueScore = clamp(Math.round(100 - penaltyPercent), 1, 100)

    return {
      rank: index + 1,
      vendorName: option.vendorName,
      valueScore,
      pricePerUnitCents: option.priceCents,
    }
  })

  return {
    bestValueVendor: cheapest.vendorName,
    bestValueRationale: `${cheapest.vendorName} has the lowest normalized price (${(
      cheapest.priceCents / 100
    ).toFixed(
      2
    )} per ${cheapest.unit}) and is about ${spreadPercent.toFixed(1)}% below the next option.`,
    vendorRankings: rankings,
    recommendation: `Use ${cheapest.vendorName} for this item unless quality or availability requirements justify a higher-priced vendor.`,
    priceDifferenceNote: `${cheapest.vendorName} is ${spreadPercent.toFixed(
      1
    )}% lower than #2 and ${fullSpreadPercent.toFixed(1)}% lower than the highest priced option.`,
  }
}

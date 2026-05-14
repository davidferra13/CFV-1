export interface QuoteTruthInput {
  quotedTotalCents: number
  projectedFoodCostCents: number
  laborCostCents?: number
  rentalCostCents?: number
  packagingCostCents?: number
  targetMarginPercent: number
  pieConfidence?: number
}

export function buildQuoteTruth(input: QuoteTruthInput) {
  const projectedCostCents =
    input.projectedFoodCostCents +
    (input.laborCostCents ?? 0) +
    (input.rentalCostCents ?? 0) +
    (input.packagingCostCents ?? 0)
  const marginPercent =
    input.quotedTotalCents > 0
      ? Math.round(
          ((input.quotedTotalCents - projectedCostCents) / input.quotedTotalCents) * 10_000
        ) / 100
      : 0
  const protectsMargin = marginPercent >= input.targetMarginPercent

  return {
    projectedCostCents,
    marginPercent,
    protectsMargin,
    warnings: [
      protectsMargin ? null : 'target_margin_not_protected',
      (input.pieConfidence ?? 1) < 0.55 ? 'low_pie_confidence' : null,
    ].filter(Boolean) as string[],
  }
}

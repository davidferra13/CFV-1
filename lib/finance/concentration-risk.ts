// Client Revenue Concentration Risk - pure computation, no server action.
// Identifies over-reliance on a single client for revenue.

export type ConcentrationRisk = {
  topClientId: string
  topClientName: string
  topClientRevenuePct: number // 0-100
  riskLevel: 'safe' | 'moderate' | 'high' // safe <30%, moderate 30-50%, high >50%
  distribution: Array<{
    clientId: string
    name: string
    revenuePct: number
    amountCents: number
  }>
}

export function computeConcentrationRisk(
  revenues: Array<{ clientId: string; name: string; totalCents: number }>
): ConcentrationRisk | null {
  if (!revenues || revenues.length === 0) return null

  const totalCents = revenues.reduce((sum, r) => sum + r.totalCents, 0)
  if (totalCents === 0) return null

  // Sort by revenue descending
  const sorted = [...revenues].sort((a, b) => b.totalCents - a.totalCents)

  const distribution = sorted.map((r) => ({
    clientId: r.clientId,
    name: r.name,
    revenuePct: Math.round((r.totalCents / totalCents) * 1000) / 10, // one decimal
    amountCents: r.totalCents,
  }))

  const top = distribution[0]

  let riskLevel: 'safe' | 'moderate' | 'high'
  if (top.revenuePct < 30) {
    riskLevel = 'safe'
  } else if (top.revenuePct <= 50) {
    riskLevel = 'moderate'
  } else {
    riskLevel = 'high'
  }

  return {
    topClientId: top.clientId,
    topClientName: top.name,
    topClientRevenuePct: top.revenuePct,
    riskLevel,
    distribution,
  }
}

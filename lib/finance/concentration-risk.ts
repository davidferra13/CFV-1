// Client Revenue Concentration Risk — pure computation, no server action.
// Identifies over-reliance on a single client for revenue.

export type ConcentrationRisk = {
  topClientId: string
  topClientName: string
  topClientRevenuePct: number // 0-100
  top3RevenuePct: number // 0-100 — sum of top 3 clients
  riskLevel: 'safe' | 'moderate' | 'high' // safe <30%, moderate 30-50%, high >50%
  top3RiskLevel: 'safe' | 'concentrated' // concentrated when top 3 > 70%
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

  // Top-3 concentration: sum of top 3 clients as % of total
  const top3RevenuePct = distribution.slice(0, 3).reduce((sum, d) => sum + d.revenuePct, 0)
  const top3RiskLevel: 'safe' | 'concentrated' = top3RevenuePct > 70 ? 'concentrated' : 'safe'

  return {
    topClientId: top.clientId,
    topClientName: top.name,
    topClientRevenuePct: top.revenuePct,
    top3RevenuePct: Math.round(top3RevenuePct * 10) / 10,
    riskLevel,
    top3RiskLevel,
    distribution,
  }
}

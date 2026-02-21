// Chargeback Rate Monitor — pure computation, no server action.
// Tracks dispute/chargeback rate against industry safe thresholds.

export type ChargebackRate = {
  disputeCount: number
  totalTransactions: number
  rate: number // 0.0-1.0
  riskLevel: 'green' | 'amber' | 'red' // green <0.005, amber 0.005-0.01, red >0.01
}

export function computeChargebackRate(
  disputeCount: number,
  totalTransactions: number
): ChargebackRate {
  const rate = totalTransactions > 0 ? disputeCount / totalTransactions : 0

  let riskLevel: 'green' | 'amber' | 'red'
  if (rate < 0.005) {
    riskLevel = 'green'
  } else if (rate <= 0.01) {
    riskLevel = 'amber'
  } else {
    riskLevel = 'red'
  }

  return {
    disputeCount,
    totalTransactions,
    rate,
    riskLevel,
  }
}

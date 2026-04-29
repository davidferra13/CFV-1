export type ConstraintRadarData = {
  logistics: {
    groceryDeadlinePassed: boolean
    daysUntilEvent: number | null
    hasPrepTimeline: boolean
    prepStartDate: string | null
  }
  financial: {
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'unknown'
    budgetStatus: 'critical' | 'warning' | 'ok' | 'unknown'
    foodCostPct: number | null
  }
  dietary: {
    complexityLevel: 'no_client' | 'unknown' | 'high' | 'critical' | 'moderate' | 'low'
    criticalConflicts: number
    activeConflicts: number
    unconfirmedAllergies: boolean
  }
  completion: {
    blockingCount: number
    score: number
    topBlocker: { label: string; url: string } | null
  }
}

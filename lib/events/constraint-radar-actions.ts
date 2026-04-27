'use server'

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

export async function getEventConstraintRadar(eventId: string): Promise<ConstraintRadarData> {
  // TODO: implement real constraint radar logic
  return {
    logistics: {
      groceryDeadlinePassed: false,
      daysUntilEvent: null,
      hasPrepTimeline: false,
      prepStartDate: null,
    },
    financial: { paymentStatus: 'unknown', budgetStatus: 'unknown', foodCostPct: null },
    dietary: {
      complexityLevel: 'unknown',
      criticalConflicts: 0,
      activeConflicts: 0,
      unconfirmedAllergies: false,
    },
    completion: { blockingCount: 0, score: 0, topBlocker: null },
  }
}

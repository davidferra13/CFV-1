export type RevenueGoalNudgeLevel = 'gentle' | 'standard' | 'aggressive'

export type RevenueGoalRecommendationSeverity = 'high' | 'normal' | 'low'

export type RevenueGoalRecommendation = {
  id: string
  title: string
  description: string
  href: string
  severity: RevenueGoalRecommendationSeverity
  confidence: number
  metadata?: Record<string, unknown>
}

export type RevenueGoalRangeProgress = {
  start: string
  end: string
  targetCents: number
  realizedCents: number
  projectedCents: number
  gapCents: number
  progressPercent: number
}

export type RevenueGoalCustomProgress = {
  id: string
  label: string
  enabled: boolean
  range: RevenueGoalRangeProgress
}

export type RevenueGoalSnapshot = {
  enabled: boolean
  nudgeLevel: RevenueGoalNudgeLevel
  monthly: RevenueGoalRangeProgress
  annual: RevenueGoalRangeProgress | null
  custom: RevenueGoalCustomProgress[]
  avgBookingValueCents: number
  dinnersNeededThisMonth: number
  openDatesThisMonth: string[]
  recommendations: RevenueGoalRecommendation[]
  computedAt: string
}

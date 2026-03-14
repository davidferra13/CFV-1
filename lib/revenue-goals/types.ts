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

export type PaceStatus = 'ahead' | 'on_track' | 'behind' | 'critical'

export type RevenueGoalTrend = {
  previousMonthRealizedCents: number
  deltaPercent: number
  direction: 'up' | 'flat' | 'down'
}

export type YoYComparison = {
  lastYearSamePeriodCents: number
  currentPeriodCents: number
  deltaPercent: number
  direction: 'up' | 'flat' | 'down'
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
  smartOpenDatesThisMonth: string[]
  typicalBookingDays: number[]
  recommendations: RevenueGoalRecommendation[]
  monthlyPaceStatus: PaceStatus
  monthlyPaceRatio: number
  annualRunRateCents: number | null
  trend: RevenueGoalTrend | null
  yoy: YoYComparison | null
  computedAt: string
}

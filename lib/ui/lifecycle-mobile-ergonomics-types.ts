export type ThumbZone = 'easy' | 'stretch' | 'hard'

export type MobileErgonomicsRule = {
  id: string
  tenantId: string
  route: string
  component: string | null
  minTouchTarget: number
  thumbZone: ThumbZone
  swipeEnabled: boolean
  swipeAction: string | null
  mobileOverride: Record<string, unknown> | null
  createdAt: Date
}

export type MobileErgonomicsAudit = {
  id: string
  tenantId: string
  route: string
  totalComponents: number
  passingComponents: number
  failingTargets: number
  thumbZoneDistribution: Record<ThumbZone, number>
  score: number
  auditedAt: Date
}

export type MobileErgonomicsSummary = {
  totalRules: number
  totalAudits: number
  avgScore: number
  worstRoutes: Array<{ route: string; score: number }>
}

export type A11yCategory =
  | 'keyboard'
  | 'focus'
  | 'aria'
  | 'screen-reader'
  | 'color-contrast'
  | 'motion'
  | 'tab-order'

export type A11ySeverity = 'critical' | 'major' | 'minor'

export interface A11yAuditEntry {
  id: string
  tenantId: string
  route: string
  category: A11yCategory
  element: string
  issue: string
  severity: A11ySeverity
  wcagCriterion: string | null
  recommendation: string | null
  resolvedAt: Date | null
  createdAt: Date
}

export interface A11yRouteScore {
  id: string
  tenantId: string
  route: string
  keyboardScore: number
  focusScore: number
  ariaScore: number
  overallScore: number
  auditedAt: Date
}

export interface A11ySummary {
  totalIssues: number
  unresolvedIssues: number
  routesAudited: number
  avgScore: number
  criticalCount: number
  categoryBreakdown: Record<A11yCategory, number>
}

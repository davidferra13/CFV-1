export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'wide'

export interface ViewportAudit {
  id: string
  tenantId: string
  route: string
  viewport: ViewportSize
  aboveFoldElements: number
  criticalContentVisible: boolean
  scrollRequired: boolean
  loadTime?: number
  score: number
  auditedAt: string
}

export interface ViewportRule {
  id: string
  tenantId: string
  viewport: ViewportSize
  maxAboveFoldElements: number
  requiredElements: string[]
  maxLoadTimeMs: number
  createdAt: string
}

export interface ViewportSummary {
  totalAudits: number
  byViewport: Record<ViewportSize, number>
  avgScore: number
  passingRoutes: string[]
  failingRoutes: string[]
}

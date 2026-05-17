export type SkeletonType = 'card' | 'list' | 'table' | 'form' | 'chart' | 'custom'

export type AnimationType = 'pulse' | 'wave' | 'none'

export interface SkeletonConfig {
  id: string
  tenantId: string
  route: string
  component: string
  skeletonType: SkeletonType
  layoutHint: Record<string, unknown> | null
  animationType: AnimationType
  createdAt: Date
}

export interface PerformanceBudget {
  id: string
  tenantId: string
  route: string
  maxFcp: number
  maxLcp: number
  maxTti: number
  maxCls: number
  maxBundleSize: number
  createdAt: Date
}

export interface PerformanceMetric {
  id: string
  tenantId: string
  route: string
  fcp: number | null
  lcp: number | null
  tti: number | null
  cls: number | null
  bundleSize: number | null
  viewport: string | null
  measuredAt: Date
  createdAt: Date
}

export interface PerformanceSummary {
  totalRoutes: number
  routesWithSkeletons: number
  routesWithBudgets: number
  avgFcp: number | null
  avgLcp: number | null
  budgetViolations: number
}

// Layout Grid & Responsive Container System - Type Definitions

/** Responsive breakpoint names */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/** Grid configuration for consistent column layouts */
export type GridConfig = {
  id: string
  tenantId: string
  name: string
  columns: number
  gutter: string
  margin: string
  maxWidth: string
  breakpoints: Record<Breakpoint, number>
  createdAt: string
}

/** Container configuration for responsive wrappers */
export type ContainerConfig = {
  id: string
  tenantId: string
  name: string
  maxWidth: string
  padding: string
  responsive: boolean
  breakpointOverrides?: Record<string, unknown> | null
  createdAt: string
}

/** Audit result for a route's layout compliance */
export type LayoutAudit = {
  id: string
  tenantId: string
  route: string
  gridCompliant: boolean
  containerCompliant: boolean
  issues: Array<{ rule: string; element: string; detail: string }>
  score: number
  auditedAt: string
}

/** Summary stats for layout grid system health */
export type LayoutGridSummary = {
  totalGrids: number
  totalContainers: number
  totalAudits: number
  avgScore: number
  nonCompliantRoutes: string[]
}
